"""
Receptor de Fotografías de Pizarra desde Telegram.
Atiende fotos enviadas por los operadores de piso de planta y ejecuta el pipeline de datos.
"""

import os
import time
import json
import threading
import subprocess
import requests
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Union, List

from .config import TELEGRAM_BOT_TOKEN, RAW_IMAGES_DIR, ESP32_HOST, DASHBOARD_DATA_JSON
from .pipeline import WhiteboardProcessingPipeline
from .audit_logger import AuditLogger


class TelegramPhotoReceiver:
    """Cliente receptor de fotos de Telegram vía Long-Polling seguro."""

    def __init__(self, token: Optional[str] = None):
        self.token = token or TELEGRAM_BOT_TOKEN
        self.api_url = f"https://api.telegram.org/bot{self.token}"
        self.file_url = f"https://api.telegram.org/file/bot{self.token}"
        self.pipeline = WhiteboardProcessingPipeline()
        self.last_update_id = 0
        self.running = False

    def send_message(self, chat_id: str, text: str, reply_to_message_id: Optional[int] = None):
        """Envía respuesta al operador en Telegram con fallback a texto plano si falla Markdown."""
        try:
            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "Markdown"
            }
            if reply_to_message_id:
                payload["reply_to_message_id"] = reply_to_message_id
            resp = requests.post(f"{self.api_url}/sendMessage", json=payload, timeout=10)
            if not resp.ok:
                # Si Telegram rechaza el formato Markdown (ej. guiones bajos o entidades sin cerrar), reenviar en texto plano
                payload.pop("parse_mode", None)
                requests.post(f"{self.api_url}/sendMessage", json=payload, timeout=10)
        except Exception as e:
            AuditLogger.log_event("TELEGRAM_SEND_ERROR", f"Error enviando mensaje: {e}", level="ERROR")

    def send_document(self, chat_id: Union[int, str], file_path: Path, caption: Optional[str] = None):
        """Envía un archivo (por ejemplo un CSV) al chat de Telegram."""
        try:
            with open(file_path, "rb") as f:
                files = {"document": f}
                data = {"chat_id": chat_id}
                if caption:
                    data["caption"] = caption
                    data["parse_mode"] = "Markdown"
                requests.post(f"{self.api_url}/sendDocument", data=data, files=files, timeout=20)
        except Exception as e:
            AuditLogger.log_event("TELEGRAM_SEND_DOC_ERROR", f"Error enviando documento: {e}", level="ERROR")

    def _git_push_background(self):
        """Actualiza el repositorio en segundo plano para reflejar datos en GitHub Pages."""
        def _task():
            try:
                repo_dir = str(Path(__file__).resolve().parent.parent)
                token = os.getenv("GITHUB_TOKEN")
                if token:
                    subprocess.run(["git", "config", "user.name", "BRP Telemetry Bot"], cwd=repo_dir, check=False)
                    subprocess.run(["git", "config", "user.email", "bot@brp-telemetry.local"], cwd=repo_dir, check=False)
                    remote_url = f"https://x-access-token:{token}@github.com/RaptorT77/dashboard-seguimiento-linea-c-brp.git"
                    subprocess.run(["git", "remote", "set-url", "origin", remote_url], cwd=repo_dir, check=False)
                subprocess.run(["git", "add", "data/", "assets/js/mockData.js"], cwd=repo_dir, check=False)
                subprocess.run(["git", "commit", "-m", "chore(telemetry): auto-sync production data from whiteboard photo [skip ci]"], cwd=repo_dir, check=False)
                subprocess.run(["git", "push", "origin", "main"], cwd=repo_dir, check=False, timeout=25)
            except Exception as e:
                AuditLogger.log_event("GIT_PUSH_ERROR", f"Error en sincronización git: {e}", level="WARNING")
        threading.Thread(target=_task, daemon=True).start()

    def get_system_status_summary(self) -> str:
        """Genera un reporte resumido del estado del sistema y torre Andon."""
        try:
            # Consultar hardware ESP32
            res = requests.get(f"{ESP32_HOST.rstrip('/')}/api/status", timeout=2.0).json()
            line_state = res.get("line_state", "DESCONOCIDO")
            uptime = res.get("uptime_str", "--:--:--")
            ip = res.get("ip", "N/A")
            rssi = res.get("rssi", 0)
        except Exception:
            line_state = "DESCONECTADO"
            uptime = "N/A"
            ip = "N/A"
            rssi = 0

        # Consultar datos de producción
        try:
            with open(DASHBOARD_DATA_JSON, "r", encoding="utf-8") as f:
                d = json.load(f)
                k = d.get("resumenKpis", {})
                prod = k.get("produccionDia", 0)
                meta = k.get("metaDiaria", 1350)
                avance = k.get("porcentajeAvance", 0.0)
                scrap = k.get("scrapPiezas", 0)
                turnos = d.get("turnos", [])
                t1_real = turnos[0].get("real", 0) if len(turnos) > 0 else 0
                t2_real = turnos[1].get("real", 0) if len(turnos) > 1 else 0
                t3_real = turnos[2].get("real", 0) if len(turnos) > 2 else 0
                paros_min = k.get("parosAcumuladosMin", 0)
                estado = k.get("estadoLinea", "PRODUCCION_DEFICIENTE")
        except Exception:
            prod, meta, avance, scrap, t1_real, t2_real, t3_real, paros_min, estado = 0, 1350, 0.0, 0, 0, 0, 0, 0, "DESCONOCIDO"

        return (
            "📊 *ESTADO ACTUAL — SISTEMA LÍNEA C BRP (24 HORAS)*\n"
            "Planta Kolben Schmidt Celaya | Producto: WOLF V1\n\n"
            f"🚦 *Semáforo Andon:* `{estado}` (Torre: `{line_state}`)\n"
            f"📦 *Producción Real Total del Día:* *{prod}* / *{meta}* uds ({avance:.1f}%)\n"
            f"  • *Turno 1 (Matutino):* {t1_real} / 480 uds (Cerrado)\n"
            f"  • *Turno 2 (Vespertino):* {t2_real} / 450 uds (En Curso)\n"
            f"  • *Turno 3 (Nocturno):* {t3_real} / 420 uds (Programado)\n\n"
            f"🗑 *Scrap Total Acumulado:* *{scrap}* pzas\n"
            f"⏱ *Paros de Línea:* *{paros_min}* minutos registrados\n"
            f"🌐 *Hardware ESP32:* `{ip}` ({rssi} dBm) | Uptime: `{uptime}`\n"
            "🔗 *Dashboard Web:* [Abrir en Vivo](https://raptort77.github.io/dashboard-seguimiento-linea-c-brp/)"
        )

    def download_photo(self, file_id: str, dest_path: Path) -> bool:
        """Descarga el archivo de imagen original desde los servidores de Telegram."""
        try:
            res = requests.get(f"{self.api_url}/getFile", params={"file_id": file_id}, timeout=15).json()
            if not res.get("ok"):
                return False

            file_path = res["result"]["file_path"]
            download_url = f"{self.file_url}/{file_path}"

            img_data = requests.get(download_url, timeout=30).content
            with open(dest_path, "wb") as f:
                f.write(img_data)
            return True
        except Exception as e:
            AuditLogger.log_event("DOWNLOAD_ERROR", f"Error descargando foto {file_id}: {e}", level="ERROR")
            return False

    def handle_message(self, message: Dict[str, Any]):
        """Procesa un mensaje recibido, validando si contiene una fotografía o comando."""
        msg_id = message.get("message_id")
        chat = message.get("chat", {})
        chat_id = str(chat.get("id"))
        user = message.get("from", {})
        user_id = str(user.get("id"))
        username = user.get("username") or user.get("first_name", "Operador")
        date_ts = message.get("date", int(time.time()))
        received_at = datetime.utcfromtimestamp(date_ts)

        # 1. Comprobar si incluye foto
        photos = message.get("photo")
        if not photos:
            text = (message.get("text") or "").strip()
            if text.startswith("/start") or text.startswith("/help"):
                welcome = (
                    "👋 *Sistema de Telemetría y Captura de Pizarra — Línea C BRP*\n"
                    "Planta Kolben Schmidt Celaya — BRP Rotax México\n\n"
                    "📷 *Instrucciones para Captura de Pizarra:*\n"
                    "1. Toma una fotografía clara de la pizarra de Línea C con buena iluminación.\n"
                    "2. Envíala directamente a este chat de Telegram.\n"
                    "3. El sistema ejecutará el OCR avanzado, extraerá la última hora registrada, "
                    "actualizará el dashboard web y sincronizará la torre Andon física.\n\n"
                    "🚦 *Comandos de Estado Operativo (Torre Andon):*\n"
                    "• /orden — 🟢 Producción en orden (Verde fija ON)\n"
                    "• /advertencia — 🟡 Advertencia operativa (Ámbar a 3 Hz)\n"
                    "• /deficiente — 🚨 Producción deficiente (Roja + Buzzer a 3 Hz)\n"
                    "• /status — 📊 Consultar telemetría y KPIs actuales\n"
                    "• /cambioturno — 📁 Archivar turno en CSV y preparar siguiente turno\n"
                    "• /reset — 🔄 Restablecer dashboard a ceros (conserva historial CSV)\n\n"
                    "🌐 *Dashboard Web en Vivo:* [Ver en GitHub Pages](https://raptort77.github.io/dashboard-seguimiento-linea-c-brp/)"
                )
                self.send_message(chat_id, welcome, reply_to_message_id=msg_id)
            elif text.startswith("/orden"):
                self.pipeline.sync_service.notify_esp32_andon("PRODUCCION_EN_ORDEN")
                self.send_message(
                    chat_id,
                    "🟢 *LÍNEA C: PRODUCCIÓN EN ORDEN*\n"
                    "• Lámpara Verde: FIJA ENCENDIDA\n"
                    "• Baliza Roja: APAGADA\n"
                    "• Lámpara Ámbar: APAGADA\n"
                    "• Zumbador: APAGADO\n\n"
                    "✓ Rates y metas de producción cumpliéndose normalmente.",
                    reply_to_message_id=msg_id
                )
            elif text.startswith("/deficiente"):
                self.pipeline.sync_service.notify_esp32_andon("PRODUCCION_DEFICIENTE")
                self.send_message(
                    chat_id,
                    "🚨 *LÍNEA C: PRODUCCIÓN DEFICIENTE (ALARMA)*\n"
                    "• Baliza Roja: OSCILANDO A 3 Hz\n"
                    "• Zumbador: INTERMITENTE A 3 Hz\n"
                    "• Lámpara Verde: APAGADA\n"
                    "• Lámpara Ámbar: APAGADA\n\n"
                    "⚠️ Rates o metas no cumplidos. Supervisión requerida de inmediato.",
                    reply_to_message_id=msg_id
                )
            elif text.startswith("/advertencia"):
                self.pipeline.sync_service.notify_esp32_andon("ADVERTENCIA_OPERATIVA")
                self.send_message(
                    chat_id,
                    "🟡 *LÍNEA C: ADVERTENCIA OPERATIVA*\n"
                    "• Lámpara Ámbar: OSCILANDO A 3 Hz\n"
                    "• Lámpara Verde: APAGADA\n"
                    "• Baliza Roja: APAGADA\n"
                    "• Zumbador: APAGADO\n\n"
                    "⚡ Rates en promedio cumpliéndose; riesgo próximo de producción deficiente.",
                    reply_to_message_id=msg_id
                )
            elif text.startswith("/status"):
                status_text = self.get_system_status_summary()
                self.send_message(chat_id, status_text, reply_to_message_id=msg_id)
            elif text.startswith("/cambioturno"):
                archived_path = self.pipeline.sync_service.archive_shift_to_csv()
                current_shift = 1
                try:
                    with open(DASHBOARD_DATA_JSON, "r", encoding="utf-8") as f:
                        d = json.load(f)
                        current_shift = d.get("planta", {}).get("turnoActual", 1)
                except Exception:
                    pass
                next_shift = (current_shift % 3) + 1
                self.pipeline.sync_service.reset_production_data(target_turno=next_shift)
                self._git_push_background()

                if archived_path and archived_path.exists():
                    self.send_document(
                        chat_id,
                        archived_path,
                        caption=f"📁 *Reporte Oficial de Cierre — Turno {current_shift}*\nArchivo CSV generado automáticamente para auditoría de Línea C."
                    )
                self.send_message(
                    chat_id,
                    f"🔄 *CAMBIO DE TURNO REALIZADO CON ÉXITO*\n\n"
                    f"• *Turno Saliente:* Turno {current_shift} (Archivado y respaldado en CSV).\n"
                    f"• *Turno Entrante:* Turno {next_shift} (Dashboard limpio a ceros).\n"
                    f"• *Torre Andon:* Restablecida a PRODUCCIÓN EN ORDEN (Verde Fija).\n\n"
                    f"📷 *Listo para recibir la primera fotografía del Turno {next_shift}.*",
                    reply_to_message_id=msg_id
                )
            elif text.startswith("/reset"):
                self.pipeline.sync_service.reset_production_data()
                self.send_message(
                    chat_id,
                    "🔄 *Dashboard Restablecido a Ceros (Nuevo Turno)*\n"
                    "• Se han reiniciado los contadores en pantalla.\n"
                    "• El archivo histórico CSV se mantiene persistente e intacto.\n"
                    "• El sistema queda listo para la primera captura horaria.",
                    reply_to_message_id=msg_id
                )
            return

        # Notificar recepción inmediata
        self.send_message(
            chat_id,
            "📸 *Fotografía de pizarra recibida.*\n"
            "Ejecutando preprocesamiento, OCR avanzado y validación de la última hora...",
            reply_to_message_id=msg_id
        )

        # 2. Obtener la foto de mayor resolución (último elemento del arreglo)
        best_photo = photos[-1]
        file_id = best_photo["file_id"]

        temp_path = RAW_IMAGES_DIR / f"temp_{msg_id}_{int(time.time())}.jpg"
        if not self.download_photo(file_id, temp_path):
            self.send_message(
                chat_id,
                "❌ *Error al descargar la imagen desde Telegram.* Por favor reintenta enviarla.",
                reply_to_message_id=msg_id
            )
            return

        # 3. Procesar a través del pipeline
        try:
            result = self.pipeline.process_image_file(
                source_image_path=temp_path,
                chat_id=chat_id,
                user_id=user_id,
                username=username,
                received_at=received_at
            )

            # Limpiar archivo temporal si ya se guardó la copia permanente
            if temp_path.exists():
                temp_path.unlink()

            fields = result["extracted_fields"]
            status = result["validation_status"]
            is_dup = result.get("is_duplicate", False)

            if is_dup:
                reply = (
                    f"ℹ️ *Información ya registrada (Duplicado Detectado)*\n\n"
                    f"• *Horario:* `{fields['horario']}`\n"
                    f"• *Producto:* `{fields['producto']}`\n"
                    f"Los datos son idénticos a los vigentes. No se generaron duplicados."
                )
            elif status in ["VALIDO", "PARCIAL"]:
                icon = "✅" if status == "VALIDO" else "⚠️"
                total_rows = result.get("total_rows_extracted", 1)
                reply = (
                    f"{icon} *Pizarra Procesada y Sincronizada Exitosamente*\n\n"
                    f"📅 *Fecha:* `{fields['fecha']}` | *Línea:* `{fields['linea']}`\n"
                    f"📦 *Producto:* `{fields['producto']}`\n"
                    f"👤 *Líder:* `{fields['lider'] or 'Antonia'}`\n"
                    f"🕒 *Última Hora:* `{fields['horario']}` ({fields['turno']})\n"
                    f"📋 *Horas procesadas en la jornada:* *{total_rows} horas*\n\n"
                    f"📊 *Producción de la Hora:*\n"
                    f"• Real Hora: *{fields['real_pz_hora']} pzas* (Obj: {fields['obj_pz_hora']})\n"
                    f"• Acumulado Turno: *{fields['real_acumulado']} pzas* (Meta: {fields['obj_acumulado']})\n"
                    f"• Piezas Malas (Scrap): *{fields['piezas_malas'] or 0} pzas*\n"
                )
                if fields.get("paros"):
                    reply += f"⚠️ *Paro Reportado:* `{fields['paros']}`\n"
                if status == "PARCIAL" and result.get("validation_notes"):
                    reply += f"\nℹ️ *Nota:* {result['validation_notes'][0]}\n"
                reply += "\n🌐 *Dashboard web 24H actualizado en vivo.*"
            else:
                notes = "\n".join([f"• {n}" for n in result["validation_notes"]])
                reply = (
                    f"⚠️ *Registro Guardado con Observaciones ({status})*\n\n"
                    f"🕒 *Horario Identificado:* `{fields['horario']}`\n"
                    f"📝 *Detalles de Validación:*\n{notes}\n\n"
                    f"La imagen quedó registrada para auditoría y revisión técnica."
                )

            self.send_message(chat_id, reply, reply_to_message_id=msg_id)
            self._git_push_background()

        except Exception as e:
            AuditLogger.log_event("PROCESSING_ERROR", f"Error procesando imagen: {e}", level="ERROR")
            self.send_message(
                chat_id,
                f"❌ *Error técnico durante el OCR:* {str(e)[:200]}\nEl equipo de ingeniería fue notificado.",
                reply_to_message_id=msg_id
            )

    def start_polling(self, interval_sec: float = 2.0):
        """Inicia ciclo de escucha continua de actualizaciones de Telegram."""
        self.running = True
        AuditLogger.log_event("TELEGRAM_POLLING_STARTED", "Receptor de Telegram en escucha activa")
        print(f"[*] Receptor de Telegram iniciado para bot {self.token[:12]}...")

        while self.running:
            try:
                params = {"offset": self.last_update_id, "timeout": 10}
                res = requests.get(f"{self.api_url}/getUpdates", params=params, timeout=15).json()

                if res.get("ok"):
                    for update in res.get("result", []):
                        uid = update["update_id"]
                        if uid >= self.last_update_id:
                            self.last_update_id = uid + 1

                        if "message" in update:
                            self.handle_message(update["message"])

                time.sleep(interval_sec)
            except Exception as e:
                AuditLogger.log_event("POLLING_LOOP_ERROR", f"Excepción en polling: {e}", level="WARNING")
                time.sleep(5.0)

    def stop(self):
        self.running = False


if __name__ == "__main__":
    receiver = TelegramPhotoReceiver()
    receiver.start_polling()

