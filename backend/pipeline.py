"""
Orquestador Principal del Pipeline de Procesamiento de Pizarras.
Conecta Recepción -> Preprocesamiento -> OCR -> Extracción -> Validación -> Persistencia -> Sincronización.
"""

import hashlib
import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

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

        # 1. Calcular hash SHA256 para trazabilidad e idempotencia de archivo
        with open(source_image_path, "rb") as f:
            file_bytes = f.read()
            file_hash = hashlib.sha256(file_bytes).hexdigest()

        # 2. Guardar copia inmutable en almacenamiento de imágenes originales
        dest_filename = f"{received_at.strftime('%Y%m%d_%H%M%S')}_{file_hash[:12]}.jpg"
        dest_image_path = RAW_IMAGES_DIR / dest_filename
        if not dest_image_path.exists():
            shutil.copy2(source_image_path, dest_image_path)

        db = SessionLocal()
        try:
            # 3. Crear registro de RawImage en base de datos
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

            # 4. Preprocesamiento de Imagen
            prep_result = self.preprocessor.preprocess(dest_image_path)
            AuditLogger.log_event(
                "PREPROCESSING_SUCCESS",
                f"Preprocesamiento finalizado para imagen {raw_img_rec.id}",
                {"crop_bbox": prep_result["crop_bbox"]}
            )

            # 5. Ejecución del motor OCR Avanzado
            ocr_result = self.ocr_processor.process_image(prep_result["board_crop"])
            AuditLogger.log_event(
                "OCR_SUCCESS",
                f"OCR detectó {ocr_result['total_blocks']} bloques en {ocr_result['execution_time_ms']:.1f}ms",
                {"blocks_count": ocr_result["total_blocks"]}
            )

            # 6. Guardar OcrLog
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

            # 7. Extracción de los 14 campos estructurados (Última Hora)
            extracted: ExtractedRecord = self.extractor.extract_latest_record(
                ocr_result,
                image_timestamp=received_at
            )
            AuditLogger.log_event(
                "EXTRACTION_COMPLETED",
                f"Última hora detectada: {extracted.horario} en {extracted.turno}",
                {"record": extracted.to_dict()}
            )

            # 8. Obtener registro previo para validación de coherencia matemática
            prev_record = db.query(HourlyProductionRecord).filter(
                HourlyProductionRecord.linea == extracted.linea,
                HourlyProductionRecord.fecha == extracted.fecha,
                HourlyProductionRecord.turno == extracted.turno,
                HourlyProductionRecord.horario != extracted.horario
            ).order_by(HourlyProductionRecord.id.desc()).first()

            # 9. Validación Estricta
            validation_status, validation_notes = self.validator.validate(extracted, prev_record)
            AuditLogger.log_event(
                "VALIDATION_COMPLETED",
                f"Resultado de validación: {validation_status}",
                {"status": validation_status, "notes": validation_notes}
            )

            # 10. Persistencia con Idempotencia y Versionado
            existing_record = db.query(HourlyProductionRecord).filter(
                HourlyProductionRecord.linea == extracted.linea,
                HourlyProductionRecord.fecha == extracted.fecha,
                HourlyProductionRecord.turno == extracted.turno,
                HourlyProductionRecord.horario == extracted.horario
            ).first()

            record_to_sync = None
            is_duplicate = False

            if existing_record:
                # Comprobar si los datos son idénticos (duplicado exacto)
                identical = (
                    existing_record.real_pz_hora == extracted.real_pz_hora and
                    existing_record.real_acumulado == extracted.real_acumulado and
                    existing_record.piezas_malas == extracted.piezas_malas and
                    existing_record.paros == extracted.paros
                )

                if identical:
                    is_duplicate = True
                    record_to_sync = existing_record
                    raw_img_rec.status = "DUPLICADO_IGNORADO"
                    db.commit()
                    AuditLogger.log_event(
                        "IDEMPOTENCY_DUPLICATE",
                        f"Imagen idéntica para horario {extracted.horario}; se ignora duplicado.",
                        {"record_id": existing_record.id}
                    )
                else:
                    # Actualización de hora: archivar versión anterior en historial
                    history_entry = ProductionHistory(
                        record_id=existing_record.id,
                        version=existing_record.version,
                        snapshot_json=json.dumps({
                            "real_pz_hora": existing_record.real_pz_hora,
                            "real_acumulado": existing_record.real_acumulado,
                            "piezas_malas": existing_record.piezas_malas,
                            "paros": existing_record.paros,
                            "raw_image_id": existing_record.raw_image_id
                        }, ensure_ascii=False),
                        update_reason="Actualización/Corrección recibida por nueva foto",
                        archived_at=datetime.utcnow()
                    )
                    db.add(history_entry)

                    # Actualizar valores del registro existente
                    existing_record.raw_image_id = raw_img_rec.id
                    existing_record.obj_pz_hora = extracted.obj_pz_hora
                    existing_record.real_pz_hora = extracted.real_pz_hora
                    existing_record.obj_acumulado = extracted.obj_acumulado
                    existing_record.real_acumulado = extracted.real_acumulado
                    existing_record.piezas_malas = extracted.piezas_malas
                    existing_record.lider = extracted.lider
                    existing_record.op = extracted.op
                    existing_record.tiempo_minutos = extracted.tiempo_minutos
                    existing_record.paros = extracted.paros
                    existing_record.validation_status = validation_status
                    existing_record.validation_notes = "\n".join(validation_notes)
                    existing_record.confidence_score = extracted.confidence_score
                    existing_record.field_confidences_json = json.dumps(extracted.field_confidences)
                    existing_record.version += 1
                    existing_record.updated_at = datetime.utcnow()

                    db.commit()
                    record_to_sync = existing_record
                    AuditLogger.log_event(
                        "RECORD_UPDATED",
                        f"Registro ID {existing_record.id} actualizado a versión {existing_record.version}",
                        {"record_id": existing_record.id, "version": existing_record.version}
                    )
            else:
                # Nuevo registro horario
                # Desmarcar anterior is_latest
                db.query(HourlyProductionRecord).filter(
                    HourlyProductionRecord.linea == extracted.linea,
                    HourlyProductionRecord.fecha == extracted.fecha,
                    HourlyProductionRecord.is_latest == True
                ).update({"is_latest": False})

                new_record = HourlyProductionRecord(
                    raw_image_id=raw_img_rec.id,
                    linea=extracted.linea,
                    producto=extracted.producto,
                    fecha=extracted.fecha,
                    turno=extracted.turno,
                    horario=extracted.horario,
                    obj_pz_hora=extracted.obj_pz_hora,
                    real_pz_hora=extracted.real_pz_hora,
                    obj_acumulado=extracted.obj_acumulado,
                    real_acumulado=extracted.real_acumulado,
                    piezas_malas=extracted.piezas_malas,
                    lider=extracted.lider,
                    op=extracted.op,
                    tiempo_minutos=extracted.tiempo_minutos,
                    paros=extracted.paros,
                    validation_status=validation_status,
                    validation_notes="\n".join(validation_notes),
                    confidence_score=extracted.confidence_score,
                    field_confidences_json=json.dumps(extracted.field_confidences),
                    is_latest=True,
                    version=1,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_record)
                db.commit()
                db.refresh(new_record)
                record_to_sync = new_record

                AuditLogger.log_event(
                    "RECORD_CREATED",
                    f"Nuevo registro horario creado con ID {new_record.id} para {new_record.horario}",
                    {"record_id": new_record.id}
                )

            # 11. Sincronización con el Dashboard Web
            dashboard_synced = False
            if record_to_sync and validation_status != ValidationStatus.REQUIERE_REVISION:
                all_shift_records = db.query(HourlyProductionRecord).filter(
                    HourlyProductionRecord.linea == record_to_sync.linea,
                    HourlyProductionRecord.fecha == record_to_sync.fecha,
                    HourlyProductionRecord.turno == record_to_sync.turno
                ).order_by(HourlyProductionRecord.id.asc()).all()

                dashboard_synced = self.sync_service.sync_latest_record(record_to_sync, all_shift_records)
                AuditLogger.log_event("DASHBOARD_SYNC_SUCCESS", "Datos inyectados exitosamente en mockData.js y JSON")

            raw_img_rec.status = "PROCESADA" if validation_status == ValidationStatus.VALIDO else validation_status
            db.commit()

            return {
                "success": True,
                "raw_image_id": raw_img_rec.id,
                "record_id": record_to_sync.id if record_to_sync else None,
                "is_duplicate": is_duplicate,
                "validation_status": validation_status,
                "validation_notes": validation_notes,
                "confidence_score": extracted.confidence_score,
                "extracted_fields": extracted.to_dict(),
                "dashboard_synced": dashboard_synced
            }

        except Exception as e:
            db.rollback()
            AuditLogger.log_event("PIPELINE_ERROR", f"Error en pipeline: {str(e)}", level="ERROR")
            raise e
        finally:
            db.close()
