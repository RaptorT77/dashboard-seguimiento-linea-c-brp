"""
Módulo de Trazabilidad, Auditoría y Manejo de Errores.
Registra de forma persistente cada evento del ciclo de vida de la fotografía y extracción.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from .config import AUDIT_LOGS_DIR
from .database import SessionLocal, SessionFactory
from .models import AuditEvent

AUDIT_LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Configuración de Logger en archivo de texto
log_file = AUDIT_LOGS_DIR / f"audit_{datetime.utcnow().strftime('%Y_%m_%d')}.log"
logger = logging.getLogger("BRP_Audit")
logger.setLevel(logging.INFO)

if not logger.handlers:
    file_handler = logging.FileHandler(str(log_file), encoding="utf-8")
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Consola para depuración local
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)


class AuditLogger:
    """Registrador transaccional de auditoría tanto en SQLite como en disco."""

    @staticmethod
    def log_event(
        event_type: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        level: str = "INFO"
    ):
        """Registra un evento atómicamente en BD y en archivo de logs."""
        details_str = json.dumps(details or {}, ensure_ascii=False)

        # 1. Registro en archivo de log
        if level == "ERROR":
            logger.error(f"[{event_type}] {message} | Details: {details_str}")
        elif level == "WARNING":
            logger.warning(f"[{event_type}] {message} | Details: {details_str}")
        else:
            logger.info(f"[{event_type}] {message} | Details: {details_str}")

        # 2. Registro en base de datos SQLite con sesión aislada
        db = SessionFactory()
        try:
            event = AuditEvent(
                event_type=event_type,
                message=message,
                details_json=details_str,
                created_at=datetime.utcnow()
            )
            db.add(event)
            db.commit()
        except Exception as e:
            logger.error(f"Error escribiendo AuditEvent en BD: {e}")
            db.rollback()
        finally:
            db.close()
