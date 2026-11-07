"""
Punto de Entrada y Orquestador del Backend — Línea C BRP
Planta Kolben Schmidt Celaya — BRP Rotax México
"""

import os
import sys
import argparse
import subprocess
import threading
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from backend.config import TELEGRAM_BOT_TOKEN
from backend.database import init_db
from backend.pipeline import WhiteboardProcessingPipeline
from backend.telegram_receiver import TelegramPhotoReceiver


def print_banner():
    banner = r"""
=============================================================================
  BRP ROTAX MÉXICO — PLANTA KOLBEN SCHMIDT CELAYA
  SISTEMA DE TELEMETRÍA Y CAPTURA OCR DE PIZARRA — LÍNEA C
  Producto: WOLF V1 (Pistón BRP) | Turnos: 1, 2 y 3
=============================================================================
"""
    print(banner)


def run_keepalive_worker():
    """
    Auto-Keepalive que realiza pings periódicos a la URL pública de Render
    cada 10 minutos para evitar que el contenedor entre en suspensión por inactividad.
    """
    import requests
    time.sleep(25)  # Esperar inicio de FastAPI
    public_url = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("PUBLIC_APP_URL") or "https://dashboard-seguimiento-linea-c-brp.onrender.com"
    health_url = f"{public_url.rstrip('/')}/health"
    print(f"[KEEPALIVE] Auto-Keepalive activado hacia {health_url} (ciclo: cada 10 min)")

    while True:
        try:
            time.sleep(600)  # Cada 10 minutos (Render duerme a los 15 min)
            resp = requests.get(health_url, timeout=15)
            print(f"[KEEPALIVE] Ping exitoso a {health_url} | Código: {resp.status_code}")
        except Exception as e:
            print(f"[KEEPALIVE] Error temporal en ping de mantenimiento: {e}")


def run_telegram_bot():
    """Inicia el receptor de fotografías de Telegram."""
    print("[TELEGRAM] Iniciando receptor de Telegram (@DASHBOARD_BRP_001_bot)...")
    receiver = TelegramPhotoReceiver()
    receiver.start_polling()


def run_api_server(host: str = "0.0.0.0", port: int = 8000):
    """Inicia el servidor API REST con Uvicorn."""
    import uvicorn
    print(f"[API REST] Iniciando servidor FastAPI en http://{host}:{port} ...")
    uvicorn.run("backend.api_service:app", host=host, port=port, reload=False)


def run_tests():
    """Ejecuta la suite completa de pruebas unitarias y de integración."""
    from backend.tests.test_pipeline import run_all_tests
    run_all_tests()


def process_single_image(image_path_str: str):
    """Procesa manualmente una imagen local y muestra el resultado estructurado."""
    image_path = Path(image_path_str)
    if not image_path.exists():
        print(f"[ERROR] El archivo no existe: {image_path}")
        sys.exit(1)

    print(f"[PROCESO MANUAL] Procesando imagen: {image_path}")
    pipeline = WhiteboardProcessingPipeline()
    result = pipeline.process_image_file(
        source_image_path=image_path,
        chat_id="MANUAL_CLI",
        username="Operador_CLI"
    )

    print("\n--- RESULTADO DE LA EXTRACCIÓN ---")
    fields = result["extracted_fields"]
    print(f"Línea:             {fields['linea']}")
    print(f"Producto:          {fields['producto']}")
    print(f"Fecha:             {fields['fecha']}")
    print(f"Turno:             {fields['turno']}")
    print(f"Horario:           {fields['horario']}")
    print(f"Obj. Pz/Hora:      {fields['obj_pz_hora']}")
    print(f"Real Pz/Hora:      {fields['real_pz_hora']}")
    print(f"Obj. Acumulado:    {fields['obj_acumulado']}")
    print(f"Real Acumulado:    {fields['real_acumulado']}")
    print(f"Piezas Malas:      {fields['piezas_malas']}")
    print(f"Líder:             {fields['lider']}")
    print(f"Op:                {fields['op']}")
    print(f"Tiempo Minutos:    {fields['tiempo_minutos']}")
    print(f"Paros:             {fields['paros']}")
    print(f"\nEstado Validación: {result['validation_status']}")
    print(f"Confianza Media:   {result['confidence_score']:.1%}")
    print(f"Sincronizado Web:  {result['dashboard_synced']}")
    if result["validation_notes"]:
        print("\nObservaciones:")
        for n in result["validation_notes"]:
            print(f"  • {n}")


def main():
    print_banner()
    init_db()

    parser = argparse.ArgumentParser(description="Backend de Ingestión y Datos Línea C BRP")
    parser.add_argument(
        "--mode",
        choices=["bot", "api", "all", "test", "process"],
        default="all",
        help="Modo de ejecución: 'bot' (Telegram), 'api' (FastAPI), 'all' (ambos), 'test' (suite de pruebas), 'process' (imagen individual)"
    )
    parser.add_argument("--image", type=str, help="Ruta de imagen para modo 'process'")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host para API REST")
    parser.add_argument("--port", type=int, default=8000, help="Puerto para API REST")

    args = parser.parse_args()
    effective_port = int(os.getenv("PORT", args.port))

    if args.mode == "test":
        run_tests()
    elif args.mode == "process":
        if not args.image:
            print("[ERROR] Debe especificar --image <ruta_de_imagen> para el modo 'process'")
            sys.exit(1)
        process_single_image(args.image)
    elif args.mode == "bot":
        run_telegram_bot()
    elif args.mode == "api":
        run_api_server(args.host, effective_port)
    elif args.mode == "all":
        # Ejecutar Bot y API en paralelo
        bot_thread = threading.Thread(target=run_telegram_bot, daemon=True)
        bot_thread.start()
        print("[SISTEMA] Bot de Telegram iniciado en hilo de fondo.")

        # Iniciar worker de Keepalive para evitar suspensión en Render
        keepalive_thread = threading.Thread(target=run_keepalive_worker, daemon=True)
        keepalive_thread.start()

        time.sleep(1)
        run_api_server(args.host, effective_port)


if __name__ == "__main__":
    main()

