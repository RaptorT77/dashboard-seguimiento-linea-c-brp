"""
Modelos de datos relacionales para auditoría, trazabilidad y persistencia de producción.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class RawImage(Base):
    """Registro de cada fotografía recibida desde Telegram."""
    __tablename__ = "raw_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    file_path = Column(String(512), nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)
    chat_id = Column(String(64), nullable=True)
    user_id = Column(String(64), nullable=True)
    username = Column(String(128), nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(32), default="RECIBIDA", nullable=False)

    ocr_log = relationship("OcrLog", back_populates="raw_image", uselist=False)
    hourly_records = relationship("HourlyProductionRecord", back_populates="raw_image")


class OcrLog(Base):
    """Texto crudo, bloques detectados y metadatos del motor OCR."""
    __tablename__ = "ocr_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    raw_image_id = Column(Integer, ForeignKey("raw_images.id"), nullable=False)
    raw_text = Column(Text, nullable=False)
    detected_blocks_json = Column(Text, nullable=True)
    processed_image_path = Column(String(512), nullable=True)
    execution_time_ms = Column(Float, nullable=True)
    processed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    raw_image = relationship("RawImage", back_populates="ocr_log")


class HourlyProductionRecord(Base):
    """
    Campos estructurados y validados de la última hora registrada en la pizarra.
    Toda extracción es fiel y trazable a la fotografía de origen.
    """
    __tablename__ = "hourly_production_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    raw_image_id = Column(Integer, ForeignKey("raw_images.id"), nullable=False)

    # 14 Campos oficiales
    linea = Column(String(32), nullable=True)
    producto = Column(String(64), nullable=True)
    fecha = Column(String(32), nullable=True)
    turno = Column(String(64), nullable=True)
    horario = Column(String(64), nullable=True, index=True)
    obj_pz_hora = Column(Integer, nullable=True)
    real_pz_hora = Column(Integer, nullable=True)
    obj_acumulado = Column(Integer, nullable=True)
    real_acumulado = Column(Integer, nullable=True)
    piezas_malas = Column(Integer, nullable=True)
    lider = Column(String(128), nullable=True)
    op = Column(String(64), nullable=True)
    tiempo_minutos = Column(Integer, nullable=True)
    paros = Column(Text, nullable=True)

    # Estado de Validación y Confianza
    validation_status = Column(String(32), default="REQUIERE_REVISION", nullable=False)
    validation_notes = Column(Text, nullable=True)
    confidence_score = Column(Float, default=0.0)
    field_confidences_json = Column(Text, nullable=True)
    is_latest = Column(Boolean, default=True, index=True)
    version = Column(Integer, default=1)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    raw_image = relationship("RawImage", back_populates="hourly_records")
    history_entries = relationship("ProductionHistory", back_populates="parent_record")


class ProductionHistory(Base):
    """Historial inmutable de auditoría para versiones modificadas o reemplazadas."""
    __tablename__ = "production_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(Integer, ForeignKey("hourly_production_records.id"), nullable=False)
    version = Column(Integer, nullable=False)
    snapshot_json = Column(Text, nullable=False)
    update_reason = Column(String(256), nullable=True)
    archived_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    parent_record = relationship("HourlyProductionRecord", back_populates="history_entries")


class AuditEvent(Base):
    """Registro secuencial de eventos del sistema, errores y validaciones."""
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(64), nullable=False, index=True)
    message = Column(Text, nullable=False)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

