"""
Configuración central del backend de integración y telemetría de Línea C.
Planta Kolben Schmidt Celaya — BRP Rotax México
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

# Configuración de Telegram Bot
TELEGRAM_BOT_TOKEN = os.getenv(
    "TELEGRAM_BOT_TOKEN",
    "9167994509:AAHrdHq0lCYgP2OcXDR2jLvh74SJGJls5kA"
)

# Rutas de almacenamiento persistente
STORAGE_DIR = BASE_DIR / "storage"
RAW_IMAGES_DIR = STORAGE_DIR / "raw_images"
PROCESSED_IMAGES_DIR = STORAGE_DIR / "processed_images"
AUDIT_LOGS_DIR = STORAGE_DIR / "audit_logs"
SHIFT_ARCHIVE_DIR = STORAGE_DIR / "turnos"
DATABASE_URL = f"sqlite:///{STORAGE_DIR / 'production_data.db'}"

# Rutas de integración con el Dashboard Web existente
DASHBOARD_MOCK_DATA_JS = PROJECT_ROOT / "assets" / "js" / "mockData.js"
DASHBOARD_DATA_JSON = PROJECT_ROOT / "data" / "production_data.json"
PERSISTENT_CSV_PATH = PROJECT_ROOT / "data" / "produccion_linea_c_historial.csv"

# Umbral mínimo de confianza para alertas de revisión
MIN_OCR_CONFIDENCE_THRESHOLD = 0.55

# Definición de turnos oficiales de la planta
SHIFT_DEFINITIONS = {
    1: {"nombre": "Primero", "horario": "06:30 a 15:00 hrs", "start_hour": 6, "end_hour": 15},
    2: {"nombre": "Segundo", "horario": "15:00 a 23:00 hrs", "start_hour": 15, "end_hour": 23},
    3: {"nombre": "Tercero", "horario": "23:00 a 06:30 hrs", "start_hour": 23, "end_hour": 6}
}

# Línea y Producto esperados según especificación
EXPECTED_LINEA = "C"
EXPECTED_PRODUCTO = "WOLF V1"

# Endpoint de Control de Baliza Andon ESP32-S3 (Planta Kolben Schmidt)
ESP32_HOST = os.getenv("ESP32_HOST", "http://192.168.0.200")


