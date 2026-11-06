"""
Receptor de Fotografías de Pizarra desde Telegram.
Atiende fotos enviadas por los operadores de piso de planta y ejecuta el pipeline de datos.
"""

import os
import time
import requests
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

from .config import TELEGRAM_BOT_TOKEN, RAW_IMAGES_DIR
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
        """Envía respuesta al operador en Telegram."""
        try:
            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "Markdown"
            }
            if reply_to_message_id:
                payload["reply_to_message_id"] = reply_to_message_id
            requests.post(f"{self.api_url}/sendMessage", json=payload, timeout=10)
        except Exception as e:
            AuditLogger.log_event("TELEGRAM_SEND_ERROR", f"Error enviando mensaje: {e}", level="ERROR")

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
        """Procesa un mensaje recibido, validando si contiene una fotografía."""
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
            text = message.get("text", "")
            if text.startswith("/start") or text.startswith("/help"):
                welcome = (
                    "👋 *Sistema de Captura de Pizarra — Línea C BRP*\n"
                    "Planta Kolben Schmidt Celaya.\n\n"
                    "📷 Envía una fotografía clara de la pizarra de producción para digitalizar "
                    "y actualizar el dashboard automáticamente."
                )
                self.send_message(chat_id, welcome, reply_to_message_id=msg_id)
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
            is_dup = result["is_duplicate"]

            if is_dup:
                reply = (
                    f"ℹ️ *Información ya registrada (Duplicado Detectado)*\n\n"
                    f"• *Horario:* `{fields['horario']}`\n"
                    f"• *Producto:* `{fields['producto']}`\n"
                    f"Los datos son idénticos a los vigentes. No se generaron duplicados."
                )
            elif status == "VALIDO":
                reply = (
                    f"✅ *Pizarra Procesada y Validada Exitosamente*\n\n"
                    f"🕒 *Última Hora:* `{fields['horario']}`\n"
                    f"📦 *Producto:* `{fields['producto']}` (Línea {fields['linea']})\n"
                    f"👤 *Líder:* `{fields['lider'] or 'N/A'}`\n\n"
                    f"📊 *Producción de la Hora:*\n"
                    f"• Real Hora: *{fields['real_pz_hora']} pzas* (Obj: {fields['obj_pz_hora']})\n"
                    f"• Acumulado OK: *{fields['real_acumulado']} pzas* (Meta: {fields['obj_acumulado']})\n"
                    f"• Piezas Malas (Scrap): *{fields['piezas_malas'] or 0} pzas*\n"
                )
                if fields.get("paros"):
                    reply += f"⚠️ *Paro Reportado:* `{fields['paros']}`\n"
                reply += "\n🌐 *Dashboard web actualizado en vivo.*"
            else:
                notes = "\n".join([f"• {n}" for n in result["validation_notes"]])
                reply = (
                    f"⚠️ *Registro Guardado con Observaciones ({status})*\n\n"
                    f"🕒 *Horario Identificado:* `{fields['horario']}`\n"
                    f"📝 *Detalles de Validación:*\n{notes}\n\n"
                    f"La imagen quedó registrada para auditoría y revisión técnica."
                )

            self.send_message(chat_id, reply, reply_to_message_id=msg_id)

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

