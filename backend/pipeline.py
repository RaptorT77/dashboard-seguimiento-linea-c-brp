"""
Orquestador Principal del Pipeline de Procesamiento de Pizarras.
Conecta Recepción -> Preprocesamiento -> OCR -> Extracción -> Validación -> Persistencia -> Sincronización.

Versión 4.0 — Detección estricta de duplicados, extracción multicanal dinámica y sincronización 24H.
"""

import hashlib
import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

from .config import RAW_IMAGES_DIR
from .database import SessionLocal, init_db
from .models import RawImage, OcrLog, HourlyProductionRecord, ProductionHistory
from .image_preprocessor import ImagePreprocessor
from .ocr_processor import OcrProcessor
from .data_extractor import WhiteboardDataExtractor, ExtractedRecord
from .data_validator import DataValidator, ValidationStatus
from .dashboard_sync import DashboardSyncService
from .audit_logger import AuditLogger

RAW_IMAGES_DIR.mkdir(parents=True, exist_ok=True)


class WhiteboardProcessingPipeline:
    """Pipeline central de extremo a extremo."""

    def __init__(self):
        init_db()
        self.preprocessor = ImagePreprocessor(debug_save=True)
        self.ocr_processor = OcrProcessor()
        self.extractor = WhiteboardDataExtractor()
        self.validator = DataValidator()
        self.sync_service = DashboardSyncService()

    def process_image_file(
        self,
        source_image_path: Path,
        chat_id: Optional[str] = None,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        received_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Ejecuta el flujo completo de obtención, extracción, validación y sincronización.
        """
        received_at = received_at or datetime.utcnow()
        AuditLogger.log_event("PIPELINE_START", f"Iniciando procesamiento de imagen: {source_image_path.name}")

        # 1. Calcular hash SHA256 para trazabilidad e idempotencia
        with open(source_image_path, "rb") as f:
            file_bytes = f.read()
            file_hash = hashlib.sha256(file_bytes).hexdigest()

        db = SessionLocal()
        try:
            # 2. Comprobar si la imagen es duplicada exacta ya procesada previamente
            existing_img = db.query(RawImage).filter(
                RawImage.file_hash == file_hash,
                RawImage.status == "PROCESADA"
            ).first()

            if existing_img:
                latest_rec = db.query(HourlyProductionRecord).filter(
                    HourlyProductionRecord.raw_image_id == existing_img.id
                ).order_by(HourlyProductionRecord.id.desc()).first()

                AuditLogger.log_event(
                    "DUPLICATE_IMAGE_DETECTED",
                    f"Imagen duplicada descartada con hash {file_hash[:12]} (RawImage ID {existing_img.id})"
                )
                return {
                    "success": True,
                    "is_duplicate": True,
                    "validation_status": "DUPLICADO",
                    "validation_notes": ["Fotografía idéntica a la anterior. No se generaron duplicados."],
                    "extracted_fields": {
                        "fecha": latest_rec.fecha if latest_rec else datetime.utcnow().strftime("%Y-%m-%d"),
                        "linea": latest_rec.linea if latest_rec else "Línea C",
                        "producto": latest_rec.producto if latest_rec else "WOLF V1 (Pistón BRP)",
                        "horario": latest_rec.horario if latest_rec else "17:00 - 18:00",
                        "turno": latest_rec.turno if latest_rec else "Segundo: 15:00 a 23:00 hrs",
                        "real_pz_hora": latest_rec.real_pz_hora if latest_rec else 0,
                        "obj_pz_hora": latest_rec.obj_pz_hora if latest_rec else 60,
                        "real_acumulado": latest_rec.real_acumulado if latest_rec else 0,
                        "obj_acumulado": latest_rec.obj_acumulado if latest_rec else 180,
                        "piezas_malas": latest_rec.piezas_malas if latest_rec else 0,
                        "lider": latest_rec.lider if latest_rec else "Antonio",
                        "paros": latest_rec.paros if latest_rec else None
                    },
                    "dashboard_synced": False
                }

            # 3. Guardar copia inmutable en almacenamiento de imágenes originales
            dest_filename = f"{received_at.strftime('%Y%m%d_%H%M%S')}_{file_hash[:12]}.jpg"
            dest_image_path = RAW_IMAGES_DIR / dest_filename
            if not dest_image_path.exists():
                shutil.copy2(source_image_path, dest_image_path)

            # 4. Crear registro de RawImage en base de datos
            raw_img_rec = RawImage(
                file_path=str(dest_image_path),
                file_hash=file_hash,
                chat_id=chat_id,
                user_id=user_id,
                username=username,
                received_at=received_at,
                status="RECIBIDA"
            )
            db.add(raw_img_rec)
            db.commit()
            db.refresh(raw_img_rec)

            AuditLogger.log_event(
                "RAW_IMAGE_SAVED",
                f"Imagen registrada con ID {raw_img_rec.id}",
                {"file_hash": file_hash, "chat_id": chat_id, "user": username}
            )

            # 5. Preprocesamiento de Imagen
            prep_result = self.preprocessor.preprocess(dest_image_path)
            AuditLogger.log_event(
                "PREPROCESSING_SUCCESS",
                f"Preprocesamiento finalizado para imagen {raw_img_rec.id}",
                {"crop_bbox": prep_result["crop_bbox"]}
            )

            # 6. Ejecución del motor OCR Avanzado Multicanal
            ocr_result = self.ocr_processor.process_image(prep_result["board_crop"])
            AuditLogger.log_event(
                "OCR_SUCCESS",
                f"OCR detectó {ocr_result['total_blocks']} bloques en {ocr_result['execution_time_ms']:.1f}ms",
                {"blocks_count": ocr_result["total_blocks"]}
            )

            # 7. Guardar OcrLog
            ocr_log_rec = OcrLog(
                raw_image_id=raw_img_rec.id,
                raw_text=ocr_result["raw_text"],
                detected_blocks_json=json.dumps(
                    [{"text": b["text"], "conf": b["confidence"], "center": b["center"]} for b in ocr_result["blocks"]],
                    ensure_ascii=False
                ),
                processed_image_path=prep_result["processed_image_path"],
                execution_time_ms=ocr_result["execution_time_ms"],
                processed_at=datetime.utcnow()
            )
            db.add(ocr_log_rec)
            db.commit()

            # 8. Extracción estructurada dinámica de todas las filas
            extracted: ExtractedRecord = self.extractor.extract_latest_record(
                ocr_result,
                image_timestamp=received_at
            )
            AuditLogger.log_event(
                "EXTRACTION_COMPLETED",
                f"Extracción completada. Fecha: {extracted.fecha}, Filas activas: {len(extracted.all_hourly_rows)}",
                {"record": extracted.to_dict()}
            )

            # 9. Validación
            prev_record = db.query(HourlyProductionRecord).filter(
                HourlyProductionRecord.linea == extracted.linea,
                HourlyProductionRecord.fecha == extracted.fecha
            ).order_by(HourlyProductionRecord.id.desc()).first()

            validation_status, validation_notes = self.validator.validate(extracted, prev_record)
            AuditLogger.log_event(
                "VALIDATION_COMPLETED",
                f"Resultado de validación: {validation_status}",
                {"status": validation_status, "notes": validation_notes}
            )

            # 10. Limpiar registros residuales de horas no activas para esta fecha específica
            valid_horarios = [r["horario"] for r in extracted.all_hourly_rows]
            if valid_horarios:
                db.query(HourlyProductionRecord).filter(
                    HourlyProductionRecord.linea == extracted.linea,
                    HourlyProductionRecord.fecha == extracted.fecha,
                    ~HourlyProductionRecord.horario.in_(valid_horarios)
                ).delete(synchronize_session=False)

            # 11. Persistencia de las filas horarias extraídas de la pizarra
            record_to_sync = None
            for row in extracted.all_hourly_rows:
                r_horario = row["horario"]
                r_turno = row["turno"]
                r_obj_h = row["obj_pz_hora"]
                r_real_h = row["real_pz_hora"]
                r_obj_ac = row["obj_acumulado"]
                r_real_ac = row["real_acumulado"]
                r_malas = row["piezas_malas"]
                r_op = row.get("op")
                r_tiempo = row.get("tiempo_minutos")
                r_paros = row.get("paros")

                existing = db.query(HourlyProductionRecord).filter(
                    HourlyProductionRecord.linea == extracted.linea,
                    HourlyProductionRecord.fecha == extracted.fecha,
                    HourlyProductionRecord.turno == r_turno,
                    HourlyProductionRecord.horario == r_horario
                ).first()

                if existing:
                    if (existing.real_pz_hora != r_real_h or
                        existing.real_acumulado != r_real_ac or
                        existing.piezas_malas != r_malas or
                        existing.paros != r_paros):

                        history_entry = ProductionHistory(
                            record_id=existing.id,
                            version=existing.version,
                            snapshot_json=json.dumps({
                                "real_pz_hora": existing.real_pz_hora,
                                "real_acumulado": existing.real_acumulado,
                                "piezas_malas": existing.piezas_malas,
                                "paros": existing.paros,
                                "raw_image_id": existing.raw_image_id
                            }, ensure_ascii=False),
                            update_reason="Actualización/Corrección por nueva foto",
                            archived_at=datetime.utcnow()
                        )
                        db.add(history_entry)

                        existing.raw_image_id = raw_img_rec.id
                        existing.obj_pz_hora = r_obj_h
                        existing.real_pz_hora = r_real_h
                        existing.obj_acumulado = r_obj_ac
                        existing.real_acumulado = r_real_ac
                        existing.piezas_malas = r_malas
                        existing.lider = extracted.lider
                        existing.op = r_op
                        existing.tiempo_minutos = r_tiempo
                        existing.paros = r_paros
                        existing.validation_status = validation_status
                        existing.version += 1
                        existing.updated_at = datetime.utcnow()
                    record_to_sync = existing
                else:
                    new_rec = HourlyProductionRecord(
                        raw_image_id=raw_img_rec.id,
                        linea=extracted.linea,
                        producto=extracted.producto,
                        fecha=extracted.fecha,
                        turno=r_turno,
                        horario=r_horario,
                        obj_pz_hora=r_obj_h,
                        real_pz_hora=r_real_h,
                        obj_acumulado=r_obj_ac,
                        real_acumulado=r_real_ac,
                        piezas_malas=r_malas,
                        lider=extracted.lider,
                        op=r_op,
                        tiempo_minutos=r_tiempo,
                        paros=r_paros,
                        validation_status=validation_status,
                        validation_notes="\n".join(validation_notes),
                        confidence_score=row.get("confidence", 0.85),
                        is_latest=False,
                        version=1,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(new_rec)
                    db.flush()
                    record_to_sync = new_rec

            # Marcar el último registro como is_latest
            if record_to_sync:
                db.query(HourlyProductionRecord).filter(
                    HourlyProductionRecord.linea == extracted.linea,
                    HourlyProductionRecord.fecha == extracted.fecha
                ).update({"is_latest": False})
                record_to_sync.is_latest = True

            db.commit()

            # 12. Sincronización con el Dashboard Web con TODAS las horas de la jornada 24H
            dashboard_synced = False
            all_day_records = db.query(HourlyProductionRecord).filter(
                HourlyProductionRecord.linea == extracted.linea,
                HourlyProductionRecord.fecha == extracted.fecha
            ).order_by(HourlyProductionRecord.id.asc()).all()

            if not record_to_sync and all_day_records:
                record_to_sync = all_day_records[-1]

            if record_to_sync:
                dashboard_synced = self.sync_service.sync_latest_record(record_to_sync, all_day_records)
                AuditLogger.log_event("DASHBOARD_SYNC_SUCCESS", "Datos inyectados exitosamente en mockData.js y JSON (24H acumuladas)")

            raw_img_rec.status = "PROCESADA"
            db.commit()

            return {
                "success": True,
                "is_duplicate": False,
                "raw_image_id": raw_img_rec.id,
                "record_id": record_to_sync.id if record_to_sync else None,
                "validation_status": validation_status,
                "validation_notes": validation_notes,
                "confidence_score": extracted.confidence_score,
                "total_rows_extracted": len(extracted.all_hourly_rows),
                "extracted_fields": extracted.to_dict(),
                "dashboard_synced": dashboard_synced
            }

        except Exception as e:
            db.rollback()
            AuditLogger.log_event("PIPELINE_ERROR", f"Error en pipeline: {str(e)}", level="ERROR")
            raise e
        finally:
            db.close()
