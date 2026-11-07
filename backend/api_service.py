"""
Servicio API REST (FastAPI) para el Dashboard y Capa de Integración.
Expone los datos validados de producción y endpoints de auditoría.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import DASHBOARD_DATA_JSON, RAW_IMAGES_DIR, PERSISTENT_CSV_PATH
from .database import get_db, init_db
from .models import HourlyProductionRecord, RawImage, AuditEvent
from .pipeline import WhiteboardProcessingPipeline

app = FastAPI(
    title="API de Telemetría Línea C BRP — Planta Kolben Schmidt Celaya",
    description="Servicio de ingestión OCR y provisión de datos de producción en tiempo real",
    version="2.7.0"
)

# Habilitar CORS para consultas del dashboard web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Inicializar tablas y pipeline
init_db()
pipeline = WhiteboardProcessingPipeline()


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "linea": "C",
        "planta": "Kolben Schmidt Celaya",
        "producto": "WOLF V1"
    }


@app.get("/api/andon/state")
def get_andon_state():
    """
    Endpoint para que el hardware ESP32 consulte el estado operativo de Línea C
    mediante polling saliente seguro HTTPS desde la planta hacia la nube.
    """
    if not DASHBOARD_DATA_JSON.exists():
        return {"state": "PRODUCCION_EN_ORDEN", "timestamp": datetime.utcnow().isoformat()}

    try:
        with open(DASHBOARD_DATA_JSON, "r", encoding="utf-8") as f:
            d = json.load(f)
            estado = d.get("resumenKpis", {}).get("estadoLinea", "PRODUCCION_EN_ORDEN")
            return {
                "state": estado,
                "produccion_dia": d.get("resumenKpis", {}).get("produccionDia", 0),
                "meta_diaria": d.get("resumenKpis", {}).get("metaDiaria", 480),
                "paros_min": d.get("resumenKpis", {}).get("parosAcumuladosMin", 0),
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception:
        return {"state": "PRODUCCION_EN_ORDEN", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/andon/state")
def set_andon_state(state: str):
    """Actualiza manualmente el estado del semáforo Andon."""
    valid_states = ["PRODUCCION_EN_ORDEN", "ADVERTENCIA_OPERATIVA", "PRODUCCION_DEFICIENTE"]
    if state not in valid_states:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {valid_states}")

    from .dashboard_sync import DashboardSyncService
    sync_svc = DashboardSyncService()
    sync_svc.notify_esp32_andon(state)
    return {"status": "success", "new_state": state}


@app.get("/api/production/latest")
def get_latest_production(db: Session = Depends(get_db)):
    """Retorna el último registro horario validado de la pizarra."""
    record = db.query(HourlyProductionRecord).filter(
        HourlyProductionRecord.is_latest == True
    ).order_by(HourlyProductionRecord.id.desc()).first()

    if not record:
        raise HTTPException(status_code=404, detail="No hay registros de producción disponibles")

    return {
        "id": record.id,
        "linea": record.linea,
        "producto": record.producto,
        "fecha": record.fecha,
        "turno": record.turno,
        "horario": record.horario,
        "obj_pz_hora": record.obj_pz_hora,
        "real_pz_hora": record.real_pz_hora,
        "obj_acumulado": record.obj_acumulado,
        "real_acumulado": record.real_acumulado,
        "piezas_malas": record.piezas_malas,
        "lider": record.lider,
        "op": record.op,
        "tiempo_minutos": record.tiempo_minutos,
        "paros": record.paros,
        "validation_status": record.validation_status,
        "confidence_score": record.confidence_score,
        "version": record.version,
        "updated_at": record.updated_at.isoformat()
    }


@app.get("/api/production/history")
def get_production_history(date: Optional[str] = None, db: Session = Depends(get_db)):
    """Retorna todas las horas registradas para una fecha/turno."""
    query = db.query(HourlyProductionRecord)
    if date:
        query = query.filter(HourlyProductionRecord.fecha == date)
    records = query.order_by(HourlyProductionRecord.id.asc()).all()

    return [
        {
            "id": r.id,
            "horario": r.horario,
            "real_pz_hora": r.real_pz_hora,
            "real_acumulado": r.real_acumulado,
            "piezas_malas": r.piezas_malas,
            "paros": r.paros,
            "validation_status": r.validation_status
        }
        for r in records
    ]


@app.get("/api/production/dashboard-data")
def get_dashboard_data():
    """Retorna el objeto completo BRP_DATA generado para el frontend."""
    if not DASHBOARD_DATA_JSON.exists():
        raise HTTPException(status_code=404, detail="Archivo production_data.json no generado aún")

    with open(DASHBOARD_DATA_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


@app.post("/api/reset")
def reset_production_telemetry(db: Session = Depends(get_db)):
    """Restablece los datos de producción a ceros para una nueva captura de turno."""
    db.query(HourlyProductionRecord).update({HourlyProductionRecord.is_latest: False})
    db.commit()

    from .dashboard_sync import DashboardSyncService
    sync_svc = DashboardSyncService()
    clean_data = sync_svc.reset_production_data()

    return {
        "status": "success",
        "message": "Datos de producción de Línea C restablecidos a cero correctamente",
        "data": clean_data
    }


@app.post("/api/shift-change")
def perform_shift_change(target_shift: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Ejecuta el Cambio de Turno Oficial de Línea C:
    1. Archiva todos los datos del turno saliente en un CSV oficial inmutable.
    2. Restablece y limpia los datos del dashboard a ceros.
    3. Inicializa la cuadrícula horaria y KPIs para el turno entrante.
    """
    from .dashboard_sync import DashboardSyncService
    sync_svc = DashboardSyncService()

    # 1. Determinar turno actual
    current_shift = 1
    if sync_svc.json_data_path.exists():
        try:
            with open(sync_svc.json_data_path, "r", encoding="utf-8") as f:
                d = json.load(f)
                current_shift = d.get("planta", {}).get("turnoActual", 1)
        except Exception:
            pass

    # 2. Archivar turno saliente en archivo CSV
    archived_file = sync_svc.archive_shift_to_csv(turno_num=current_shift)

    # 3. Desmarcar registros previos en base de datos
    db.query(HourlyProductionRecord).update({HourlyProductionRecord.is_latest: False})
    db.commit()

    # 4. Determinar siguiente turno
    next_shift = target_shift if target_shift in [1, 2, 3] else ((current_shift % 3) + 1)

    # 5. Limpiar dashboard para el nuevo turno
    new_data = sync_svc.reset_production_data(target_turno=next_shift)

    return {
        "status": "success",
        "message": f"Turno {current_shift} archivado en CSV. Turno {next_shift} inicializado correctamente.",
        "archived_csv": archived_file.name if archived_file else None,
        "next_shift": next_shift,
        "data": new_data
    }


@app.get("/api/shifts/archived")
def list_archived_shifts():
    """Lista todos los turnos archivados en formato CSV disponibles para descarga."""
    from .config import SHIFT_ARCHIVE_DIR
    if not SHIFT_ARCHIVE_DIR.exists():
        return []
    files = sorted(list(SHIFT_ARCHIVE_DIR.glob("Turno_*.csv")), key=lambda f: f.stat().st_mtime, reverse=True)
    return [
        {
            "filename": f.name,
            "size_bytes": f.stat().st_size,
            "modified_at": datetime.fromtimestamp(f.stat().st_mtime).isoformat()
        }
        for f in files
    ]


@app.get("/api/shifts/download/{filename}")
def download_archived_shift(filename: str):
    """Permite descargar un archivo CSV de turno archivado específico."""
    from .config import SHIFT_ARCHIVE_DIR
    target_path = SHIFT_ARCHIVE_DIR / filename
    if not target_path.exists():
        raise HTTPException(status_code=404, detail=f"Archivo {filename} no encontrado")
    return FileResponse(
        target_path,
        media_type="text/csv",
        filename=filename
    )


@app.get("/api/production/export-csv")
def export_persistent_csv():
    """Descarga el archivo CSV acumulado persistente oficial de Línea C."""
    if not PERSISTENT_CSV_PATH.exists():
        raise HTTPException(status_code=404, detail="Archivo CSV histórico no encontrado")
    return FileResponse(
        PERSISTENT_CSV_PATH,
        media_type="text/csv",
        filename=f"BRP_Linea_C_Historial_Produccion_{datetime.utcnow().strftime('%Y-%m-%d')}.csv"
    )


@app.post("/api/upload")
async def upload_whiteboard_image(
    file: UploadFile = File(...),
    username: Optional[str] = Form("API_Uploader"),
    chat_id: Optional[str] = Form("API_DIRECT")
):
    """Permite enviar una fotografía de pizarra directamente vía HTTP POST."""
    dest_path = RAW_IMAGES_DIR / f"upload_{int(datetime.utcnow().timestamp())}_{file.filename}"
    with open(dest_path, "wb") as f:
        content = await file.read()
        f.write(content)

    result = pipeline.process_image_file(
        source_image_path=dest_path,
        chat_id=chat_id,
        user_id="API",
        username=username,
        received_at=datetime.utcnow()
    )

    return result


@app.get("/api/audit/logs")
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    """Retorna los últimos eventos de auditoría registrados."""
    events = db.query(AuditEvent).order_by(AuditEvent.id.desc()).limit(limit).all()
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "message": e.message,
            "details": json.loads(e.details_json or "{}"),
            "created_at": e.created_at.isoformat()
        }
        for e in events
    ]

