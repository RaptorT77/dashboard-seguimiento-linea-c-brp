"""
Servicio API REST (FastAPI) para el Dashboard y Capa de Integración.
Expone los datos validados de producción y endpoints de auditoría.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

# Servir estáticos del Dashboard Web directamente desde FastAPI
ROOT_DIR = Path(__file__).resolve().parent.parent
ASSETS_DIR = ROOT_DIR / "assets"
DATA_DIR = ROOT_DIR / "data"

if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")
if DATA_DIR.exists():
    app.mount("/data", StaticFiles(directory=str(DATA_DIR)), name="data")


@app.api_route("/", methods=["GET", "HEAD"])
def serve_dashboard():
    """Servir la interfaz web del Dashboard en la raíz."""
    index_path = ROOT_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path, media_type="text/html")
    return {
        "status": "online",
        "service": "BRP Linea C Telemetry Service",
        "health": "/health",
        "api_andon": "/api/andon/state"
    }


@app.api_route("/favicon.ico", methods=["GET", "HEAD"])
def favicon():
    icon_path = ASSETS_DIR / "images" / "LOGO_KS-1.png"
    if icon_path.exists():
        return FileResponse(icon_path, media_type="image/png")
    return Response(status_code=204)


@app.api_route("/health", methods=["GET", "HEAD"])
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


class UpdateRowRequest(BaseModel):
    hora: str
    real: Optional[int] = None
    realAc: Optional[int] = None
    malas: Optional[int] = None
    op: Optional[str] = None
    parosMin: Optional[int] = None
    comentario: Optional[str] = None
    verificado: Optional[bool] = False


@app.post("/api/production/update-row")
def update_production_row(req: UpdateRowRequest, db: Session = Depends(get_db)):
    """
    Actualiza manualmente los valores de una fila horaria y/o marca su estado de verificación.
    Si verificado=True, esta fila queda protegida contra sobreescritura por nuevas fotos de Telegram.
    """
    from .dashboard_sync import DashboardSyncService
    sync_svc = DashboardSyncService()

    # 1. Actualizar en production_data.json y mockData.js
    if sync_svc.json_data_path.exists():
        try:
            with open(sync_svc.json_data_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            found = False
            for h in data.get("produccionHoraria", []):
                if h.get("hora") == req.hora:
                    found = True
                    if req.real is not None:
                        h["real"] = req.real
                        h["isRecorded"] = True
                    if req.realAc is not None:
                        h["shiftAcumReal"] = req.realAc
                        h["acumReal"] = req.realAc
                    if req.malas is not None:
                        h["malas"] = req.malas
                    if req.op is not None:
                        h["op"] = req.op
                    if req.parosMin is not None:
                        h["parosMin"] = req.parosMin
                    if req.comentario is not None:
                        h["comentario"] = req.comentario
                        h["paros"] = req.comentario
                    if req.verificado is not None:
                        h["verificado"] = req.verificado
                    break

            if found:
                # Recalcular métricas
                grand_good = 0
                grand_scrap = 0
                grand_paros = 0
                dia_acum = 0
                shift_acum = 0
                cur_t = 1
                for h in data.get("produccionHoraria", []):
                    t = h.get("turnoNum", 1)
                    if t != cur_t:
                        cur_t = t
                        shift_acum = 0
                    if h.get("isRecorded") and h.get("real") is not None:
                        r_v = h.get("real", 0)
                        m_v = h.get("malas", 0)
                        p_v = h.get("parosMin", 0)
                        good = max(0, r_v - m_v)
                        shift_acum += good
                        dia_acum += good
                        h["shiftAcumReal"] = shift_acum
                        h["acumReal"] = dia_acum
                        grand_good = dia_acum
                        grand_scrap += m_v
                        grand_paros += p_v

                kpis = data.get("resumenKpis", {})
                kpis["produccionDia"] = grand_good
                kpis["unidadesCompletadas"] = grand_good
                kpis["unidadesPendientes"] = max(0, kpis.get("metaDiaria", 1350) - grand_good)
                kpis["scrapPiezas"] = grand_scrap
                kpis["parosAcumuladosMin"] = grand_paros
                tot_b = grand_good + grand_scrap
                kpis["scrapPorcentaje"] = round((grand_scrap / tot_b * 100) if tot_b else 0, 1)
                kpis["porcentajeAvance"] = round((grand_good / 1350 * 100), 1)

                with open(sync_svc.json_data_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)

                js_content = f"const BRP_DATA = {json.dumps(data, indent=2, ensure_ascii=False)};\nif (typeof module !== 'undefined' && module.exports) {{ module.exports = BRP_DATA; }}\n"
                with open(sync_svc.mock_data_path, "w", encoding="utf-8") as f:
                    f.write(js_content)

                sync_svc._git_push_background(f"chore(manual): update row {req.hora} [verificado={req.verificado}] [skip ci]")
        except Exception as e:
            print(f"Error actualizando JSON: {e}")

    # 2. Actualizar en base de datos SQLite si el registro existe
    rec = db.query(HourlyProductionRecord).filter(
        HourlyProductionRecord.horario == req.hora
    ).order_by(HourlyProductionRecord.id.desc()).first()

    if rec:
        if req.real is not None: rec.real_pz_hora = req.real
        if req.realAc is not None: rec.real_acumulado = req.realAc
        if req.malas is not None: rec.piezas_malas = req.malas
        if req.op is not None: rec.op = req.op
        if req.parosMin is not None: rec.tiempo_minutos = req.parosMin
        if req.comentario is not None: rec.paros = req.comentario
        if req.verificado: rec.validation_status = "VERIFICADO_MANUAL"
        db.commit()

    return {"status": "success", "message": f"Fila {req.hora} actualizada correctamente", "verificado": req.verificado}


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

