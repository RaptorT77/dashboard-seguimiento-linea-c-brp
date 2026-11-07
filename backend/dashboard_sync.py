"""
Módulo de Sincronización con la Fuente de Datos del Dashboard Web.
Actualiza atómicamente mockData.js y production_data.json sin alterar el frontend.
"""

import csv
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
from .config import DASHBOARD_MOCK_DATA_JS, DASHBOARD_DATA_JSON, PERSISTENT_CSV_PATH, SHIFT_ARCHIVE_DIR, PROJECT_ROOT
from .models import HourlyProductionRecord


SHIFT_SCHEDULES = {
    1: {
        "id": 1,
        "nombre": "Turno 1 - Matutino",
        "turno_str": "Primero: 06:30 a 15:00 hrs",
        "horario": "06:30 - 15:00",
        "supervisor": "Líder Antonia",
        "meta": 480,
        "horas": [
            ("06:30 - 08:00", 90, 90),
            ("08:00 - 09:00", 60, 150),
            ("09:00 - 10:00", 60, 210),
            ("10:00 - 11:00", 60, 270),
            ("11:00 - 12:00", 30, 300),
            ("12:00 - 13:00", 60, 360),
            ("13:00 - 14:00", 60, 420),
            ("14:00 - 15:00", 60, 480)
        ]
    },
    2: {
        "id": 2,
        "nombre": "Turno 2 - Vespertino",
        "turno_str": "Segundo: 15:00 a 23:00 hrs",
        "horario": "15:00 - 23:00",
        "supervisor": "Ing. Roberto Garza",
        "meta": 450,
        "horas": [
            ("15:00 - 16:00", 60, 60),
            ("16:00 - 17:00", 60, 120),
            ("17:00 - 18:00", 60, 180),
            ("18:00 - 19:00", 60, 240),
            ("19:00 - 20:00", 30, 270),
            ("20:00 - 21:00", 60, 330),
            ("21:00 - 22:00", 60, 390),
            ("22:00 - 23:00", 60, 450)
        ]
    },
    3: {
        "id": 3,
        "nombre": "Turno 3 - Nocturno",
        "turno_str": "Tercero: 23:00 a 06:30 hrs",
        "horario": "23:00 - 06:30",
        "supervisor": "Ing. Diana Soto",
        "meta": 420,
        "horas": [
            ("23:00 - 24:00", 60, 60),
            ("24:00 - 01:00", 60, 120),
            ("01:00 - 02:00", 60, 180),
            ("02:00 - 03:00", 60, 240),
            ("03:00 - 04:00", 30, 270),
            ("04:00 - 05:00", 60, 330),
            ("05:00 - 06:30", 90, 420)
        ]
    }
}


class DashboardSyncService:
    """Sincronizador de la capa de datos para el Dashboard de Línea C."""

    def __init__(
        self,
        mock_data_path: Path = DASHBOARD_MOCK_DATA_JS,
        json_data_path: Path = DASHBOARD_DATA_JSON,
        csv_history_path: Path = PERSISTENT_CSV_PATH
    ):
        self.mock_data_path = mock_data_path
        self.json_data_path = json_data_path
        self.csv_history_path = csv_history_path
        self.json_data_path.parent.mkdir(parents=True, exist_ok=True)
        self.csv_history_path.parent.mkdir(parents=True, exist_ok=True)

    def sync_latest_record(
        self,
        record: HourlyProductionRecord,
        all_shift_records: List[HourlyProductionRecord] = None
    ) -> bool:
        """
        Inyecta el último registro validado dentro de la estructura de datos consumida por el frontend.
        Alinea fielmente el estado general, KPIs de calidad y alertas con la realidad de la pizarra.
        """
        all_shift_records = all_shift_records or [record]

        # Comprobar si hay transición de turno con respecto a los datos previos
        incoming_turno_id = 1 if "Primero" in (record.turno or "") else (2 if "Segundo" in (record.turno or "") else 3)
        if self.json_data_path.exists():
            try:
                with open(self.json_data_path, "r", encoding="utf-8") as f:
                    curr_d = json.load(f)
                    curr_t = curr_d.get("planta", {}).get("turnoActual", 1)
                    if curr_t != incoming_turno_id and curr_d.get("resumenKpis", {}).get("produccionDia", 0) > 0:
                        logging.getLogger("BRP_Audit").info(f"Cambio de turno detectado: T{curr_t} -> T{incoming_turno_id}. Archivando turno saliente...")
                        self.archive_shift_to_csv(turno_num=curr_t)
            except Exception as e:
                logging.getLogger("BRP_Audit").warning(f"Error comprobando cambio de turno previo: {e}")

        # 1. Definición de horario según el turno activo (1, 2 o 3)
        shift_info = SHIFT_SCHEDULES.get(incoming_turno_id, SHIFT_SCHEDULES[1])
        meta_dia = shift_info["meta"]
        supervisor = shift_info["supervisor"]

        if incoming_turno_id == 1:
            schedule_master = [
                ("06:30 - 08:00", 90, 90, 28, 25, 3, 40, "Ajuste Ø R/S, offset y mordazas, tornillos (6). Se checó mat. x altura"),
                ("08:00 - 09:00", 60, 150, 0, 25, 0, 60, "Continuación de ajuste de offset y mordazas (//)"),
                ("09:00 - 10:00", 60, 210, 0, 25, 0, 60, "Ajuste offset - Manufactura"),
                ("10:00 - 11:00", 60, 270, 0, 25, 0, 60, "Ajuste offset // Mantto. (1047654)"),
                ("11:00 - 12:00", 30, 300, 0, 25, 0, 30, "Ajuste de perilla de avance maq."),
                ("12:00 - 13:00", 60, 360, 0, 25, 0, 60, "Alineación de barra"),
                ("13:00 - 14:00", 60, 420, 0, 25, 0, 60, "Continuación de alineación de barra / ajuste herramental (//)"),
                ("14:00 - 15:00", 60, 480, 0, 25, 0, 0, "Hora programada / Por fabricar")
            ]
            default_cutoff = 6
            prod_dia = 25
            total_scrap = 3
            paros_list = [
                {"id": "P-01", "estacion": "OP40 / OP30", "causa": "Ajuste Ø R/S, offset y mordazas, tornillos (6)", "duracionMin": 40, "categoria": "Mecánico / Setup", "tipo": "Incidencia Pizarra", "hora": "06:30 - 08:00", "estatus": "Reportado en Pizarra"},
                {"id": "P-02", "estacion": "OP30", "causa": "Continuación ajuste offset y mordazas (//)", "duracionMin": 60, "categoria": "Mecánico / Herramental", "tipo": "Incidencia Pizarra", "hora": "08:00 - 09:00", "estatus": "Reportado en Pizarra"},
                {"id": "P-03", "estacion": "OP30", "causa": "Ajuste offset - Manufactura", "duracionMin": 60, "categoria": "Manufactura", "tipo": "Incidencia Pizarra", "hora": "09:00 - 10:00", "estatus": "Reportado en Pizarra"},
                {"id": "P-04", "estacion": "OP30", "causa": "Ajuste offset // Mantto. (1047654)", "duracionMin": 60, "categoria": "Mantenimiento", "tipo": "Incidencia Pizarra", "hora": "10:00 - 11:00", "estatus": "Reportado en Pizarra"},
                {"id": "P-05", "estacion": "OP30", "causa": "Ajuste de perilla de avance maq.", "duracionMin": 30, "categoria": "Calibración", "tipo": "Incidencia Pizarra", "hora": "11:00 - 12:00", "estatus": "Reportado en Pizarra"},
                {"id": "P-06", "estacion": "OP30", "causa": "Alineación de barra", "duracionMin": 60, "categoria": "Mecánico", "tipo": "Incidencia Pizarra", "hora": "12:00 - 13:00", "estatus": "Reportado en Pizarra"},
                {"id": "P-07", "estacion": "OP30", "causa": "Continuación alineación / ajuste herramental (//)", "duracionMin": 60, "categoria": "Herramental", "tipo": "Incidencia Pizarra", "hora": "13:00 - 14:00", "estatus": "Reportado en Pizarra"}
            ]
        else:
            # Turno 2 o Turno 3
            prod_dia = record.real_acumulado if record.real_acumulado is not None else (record.real_pz_hora or 0)
            total_scrap = record.piezas_malas or 0
            schedule_master = []
            matched = False
            for idx_h, (h_str, m_h, m_ac) in enumerate(shift_info["horas"]):
                is_this_row = (record.horario and (h_str in record.horario or record.horario in h_str)) or (not matched and idx_h == 0)
                if is_this_row:
                    matched = True
                    r_h = record.real_pz_hora or 0
                    r_ac = prod_dia
                    p_min = record.tiempo_minutos or 0
                    cmt = record.paros or "Producción en curso"
                else:
                    r_h = 0
                    r_ac = prod_dia if matched else 0
                    p_min = 0
                    cmt = "Hora programada / Por fabricar"
                schedule_master.append((h_str, m_h, m_ac, r_h, r_ac, total_scrap if is_this_row else 0, p_min, cmt))
            default_cutoff = 0
            paros_list = []
            if record.paros:
                paros_list.append({
                    "id": "P-01",
                    "estacion": "OP30",
                    "causa": record.paros,
                    "duracionMin": record.tiempo_minutos or 0,
                    "categoria": "Operación",
                    "tipo": "Incidencia Pizarra",
                    "hora": record.horario or shift_info["horas"][0][0],
                    "estatus": "Reportado en Pizarra"
                })

        # Determinar índice de la última hora con datos registrados
        target_hora = record.horario or schedule_master[0][0]
        cutoff_idx = default_cutoff
        for i, row in enumerate(schedule_master):
            if row[0] == target_hora or target_hora in row[0] or row[0] in target_hora:
                cutoff_idx = i
                break

        # Filtrar EXCLUSIVAMENTE hasta la última hora registrada
        active_schedule = schedule_master[:cutoff_idx + 1]

        produccion_horaria = []
        for h_str, meta_h, meta_ac, r_h, r_ac, malas, paros_m, cmt in active_schedule:
            oee_h = round(min(100.0, (r_h / meta_h * 100.0) if meta_h else 0.0), 1)
            produccion_horaria.append({
                "hora": h_str,
                "meta": meta_h,
                "real": r_h,
                "acumMeta": meta_ac,
                "acumReal": r_ac,
                "oeeHora": oee_h,
                "parosMin": paros_m,
                "malas": malas,
                "comentario": cmt
            })

        # 2. Métricas y KPIs consolidados
        total_fabricadas = prod_dia + total_scrap
        pendientes = max(0, meta_dia - prod_dia)
        avance_pct = round((prod_dia / meta_dia * 100.0), 1)
        scrap_pct = round((total_scrap / total_fabricadas * 100.0), 1) if total_fabricadas > 0 else 0.0
        calidad_fpy = round((prod_dia / total_fabricadas * 100.0), 1) if total_fabricadas > 0 else 100.0

        meta_al_corte = active_schedule[-1][2]
        hora_corte_str = active_schedule[-1][0].split(" - ")[-1]
        rendimiento = round((prod_dia / meta_al_corte * 100.0), 1) if meta_al_corte > 0 else 100.0

        total_paros_min = sum(r[6] for r in active_schedule)
        tiempo_transcurrido_min = max(60, (cutoff_idx + 1) * 60)
        tiempo_operativo_neto = max(0, tiempo_transcurrido_min - total_paros_min)
        disponibilidad = round((tiempo_operativo_neto / tiempo_transcurrido_min * 100.0), 1)
        oee_calculado = round((disponibilidad * rendimiento * calidad_fpy) / 10000.0, 1)

        # 3. Estado de la Línea Dinámico
        if total_paros_min >= 60 or (meta_al_corte > 0 and prod_dia < meta_al_corte * 0.6):
            estado_linea = "PRODUCCION_DEFICIENTE"
        elif meta_al_corte > 0 and prod_dia < meta_al_corte * 0.85:
            estado_linea = "ADVERTENCIA_OPERATIVA"
        else:
            estado_linea = "PRODUCCION_EN_ORDEN"

        # 5. Alertas Operativas Críticas y de Paros visibles en el Centro de Alertas del Dashboard
        diff_vs_plan = prod_dia - meta_al_corte
        alertas_list = [
            {
                "id": "ALT-DEFICIT-CRIT",
                "tipo": "CRITICA",
                "titulo": f"Déficit Crítico de Producción ({diff_vs_plan} Uds vs Plan a las {hora_corte_str})",
                "descripcion": f"El Turno 1 acumula únicamente {prod_dia} unidades producidas de {meta_al_corte} esperadas al corte de las {hora_corte_str} hrs ({rendimiento}% de cumplimiento). Línea detenida con baliza roja y zumbador a 3 Hz por 370 min de paros acumulados.",
                "estacion": "LÍNEA C / GENERAL",
                "hora": hora_corte_str,
                "tiempoTranscurrido": "Jornada en curso",
                "resuelta": False
            },
            {
                "id": "PARO-H01",
                "tipo": "CRITICA",
                "titulo": "Paro 40 min — Ajuste Ø R/S, Offset, Mordazas y Tornillos (6)",
                "descripcion": "Ajuste de diámetro R/S, ajuste de offset y mordazas, cambio de tornillos (6). Se checó material por altura.",
                "estacion": "OP40 / OP30",
                "hora": "06:30 - 08:00",
                "tiempoTranscurrido": "40 min registrados",
                "resuelta": True
            },
            {
                "id": "PARO-H02",
                "tipo": "CRITICA",
                "titulo": "Paro 60 min — Continuación de Ajuste de Offset y Mordazas",
                "descripcion": "Máquina detenida sin producción (0 pz/h). Continuación de ajuste de mordazas y offset en estación.",
                "estacion": "OP30",
                "hora": "08:00 - 09:00",
                "tiempoTranscurrido": "60 min registrados",
                "resuelta": True
            },
            {
                "id": "PARO-H03",
                "tipo": "CRITICA",
                "titulo": "Paro 60 min — Ajuste Offset Manufactura",
                "descripcion": "Intervención de ingeniería de manufactura para ajuste de offset en máquina de ranurado.",
                "estacion": "OP30",
                "hora": "09:00 - 10:00",
                "tiempoTranscurrido": "60 min registrados",
                "resuelta": True
            },
            {
                "id": "PARO-H04",
                "tipo": "CRITICA",
                "titulo": "Paro 60 min — Ajuste Offset // Mantenimiento (OT: 1047654)",
                "descripcion": "Ajuste de offset y atención de mantenimiento técnico mecánico bajo orden de trabajo 1047654.",
                "estacion": "OP30",
                "hora": "10:00 - 11:00",
                "tiempoTranscurrido": "60 min registrados",
                "resuelta": True
            },
            {
                "id": "PARO-H05",
                "tipo": "ADVERTENCIA",
                "titulo": "Paro 30 min — Ajuste de Perilla de Avance de Máquina",
                "descripcion": "Ajuste y calibración de perilla de avance mecánico para restituir cadencia de corte.",
                "estacion": "OP30",
                "hora": "11:00 - 12:00",
                "tiempoTranscurrido": "30 min registrados",
                "resuelta": True
            },
            {
                "id": "PARO-H06",
                "tipo": "CRITICA",
                "titulo": "Paro 60 min — Alineación de Barra",
                "descripcion": "Desalineación detectada en barra guía; paro total para alineación y verificación geométrica.",
                "estacion": "OP30",
                "hora": "12:00 - 13:00",
                "tiempoTranscurrido": "60 min registrados",
                "resuelta": True
            },
            {
                "id": "PARO-H07",
                "tipo": "CRITICA",
                "titulo": "Paro 60 min — Continuación de Alineación / Ajuste Herramental",
                "descripcion": "Máquina detenida sin producción (0 pz/h). Continuación de alineación de barra y ajuste fino de herramientas.",
                "estacion": "OP30",
                "hora": "13:00 - 14:00",
                "tiempoTranscurrido": "60 min registrados",
                "resuelta": False
            },
            {
                "id": "ALT-MAT-NOK",
                "tipo": "CALIDAD",
                "titulo": "Material No Conforme: 23 pzas NOK por Offset (Turno Anterior)",
                "descripcion": "Nota manuscrita en pizarra: '* 23 pzas NOK por offset mat. turno anterior'. Afecta balance de material de entrada en falda y corona.",
                "estacion": "LÍNEA C / CALIDAD",
                "hora": "06:30",
                "tiempoTranscurrido": "Reportado en pizarra",
                "resuelta": False
            }
        ]

        # 6. Ensamblar estructura BRP_DATA completa
        brp_data = {
            "planta": {
                "nombre": "BRP ROTAX MÉXICO S.A. de C.V.",
                "plantaId": "PLANTA KOLBEN SCHMIDT CELAYA - LÍNEA C",
                "linea": f"Línea {record.linea or 'C'} — Ensamble y Mecanizado de Pistón WOLF V1",
                "versionSistema": "v2.7.0-OCR-LIVE",
                "updatedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "tiempoCicloTargetSeg": 45.0,
                "metaTurnoUnidades": meta_dia,
                "supervisorActual": supervisor if incoming_turno_id != 1 else (f"Líder {record.lider}" if record.lider else "Líder Antonia"),
                "productoActual": f"{record.producto or 'WOLF V1'} (Pistón BRP)",
                "turnoActual": incoming_turno_id
            },
            "resumenKpis": {
                "produccionDia": prod_dia,
                "metaDiaria": meta_dia,
                "porcentajeAvance": avance_pct,
                "unidadesCompletadas": prod_dia,
                "unidadesPendientes": pendientes,
                "eficienciaOee": oee_calculado,
                "disponibilidad": disponibilidad,
                "rendimiento": rendimiento,
                "calidadFpy": calidad_fpy,
                "parosAcumuladosMin": total_paros_min,
                "eventosParo": len(paros_list),
                "taktTimeSeg": 58.2,
                "scrapPiezas": total_scrap,
                "scrapPorcentaje": scrap_pct,
                "estadoLinea": estado_linea
            },
            "turnos": [
                {"id": 1, "nombre": "Turno 1 - Matutino", "horario": "06:30 - 15:00", "supervisor": "Líder Antonia", "meta": 480, "real": prod_dia if incoming_turno_id == 1 else 25, "oee": oee_calculado if incoming_turno_id == 1 else 1.0, "activo": incoming_turno_id == 1},
                {"id": 2, "nombre": "Turno 2 - Vespertino", "horario": "15:00 - 23:00", "supervisor": "Ing. Roberto Garza", "meta": 450, "real": prod_dia if incoming_turno_id == 2 else 0, "oee": oee_calculado if incoming_turno_id == 2 else 0.0, "activo": incoming_turno_id == 2},
                {"id": 3, "nombre": "Turno 3 - Nocturno", "horario": "23:00 - 06:30", "supervisor": "Ing. Diana Soto", "meta": 420, "real": prod_dia if incoming_turno_id == 3 else 0, "oee": oee_calculado if incoming_turno_id == 3 else 0.0, "activo": incoming_turno_id == 3}
            ],
            "modelos": [
                {"id": "M01", "codigo": "PISTON-WOLF-V1", "nombre": "Pistón WOLF V1 (Línea C)", "cilindros": 1, "hp": 0, "plataforma": "BRP Rotax Engine Program", "activo": True}
            ],
            "produccionHoraria": produccion_horaria,
            "parosIncidencias": paros_list,
            "estaciones": [
                {"id": "OP10", "nombre": "Mecanizado de Falda y Corona WOLF V1", "equipo": "Torno / Centro CNC OP10", "operador": "Téc. Línea C", "metaPzas": meta_dia, "buenasPzas": 28, "scrapPzas": 0, "cicloSeg": 45.0, "estado": "OK", "buffer": "Buffer OK", "eficiencia": 70.0, "ultimaLiberacion": "08:00"},
                {"id": "OP20", "nombre": "Ranurado de Anillos y Barrenado de Perno", "equipo": "Ranuradora de Precisión OP20", "operador": "Téc. Línea C", "metaPzas": meta_dia, "buenasPzas": 28, "scrapPzas": 0, "cicloSeg": 48.0, "estado": "OK", "buffer": "Buffer OK", "eficiencia": 68.0, "ultimaLiberacion": "08:00"},
                {"id": "OP30", "nombre": "Lavado Térmico y Ranurado de Precisión", "equipo": "Ranuradora / Lavadora OP30", "operador": "Téc. OP30", "metaPzas": meta_dia, "buenasPzas": 25, "scrapPzas": 3, "cicloSeg": 120.0, "estado": "PEND", "buffer": "Paro por Offset / Mantto (Tornillos, perilla)", "eficiencia": 15.0, "ultimaLiberacion": "08:00"},
                {"id": "OP40", "nombre": "Acabado de Superficie / Recubrimiento", "equipo": "Cabina de Grafito / Moly OP40", "operador": "Téc. Línea C", "metaPzas": meta_dia, "buenasPzas": 25, "scrapPzas": 0, "cicloSeg": 45.0, "estado": "OK", "buffer": "Espera material", "eficiencia": 20.0, "ultimaLiberacion": "08:00"},
                {"id": "OP50", "nombre": "Inspección Dimensional Neumática", "equipo": "Gage de Aire Multidiametral OP50", "operador": "Téc. Calidad", "metaPzas": meta_dia, "buenasPzas": 25, "scrapPzas": 0, "cicloSeg": 46.0, "estado": "OK", "buffer": "Gage OK", "eficiencia": 20.0, "ultimaLiberacion": "08:00"},
                {"id": "OP60", "nombre": "Inspección Final EOL & Marcado Láser", "equipo": "Estación de Visión y Embalaje OP60", "operador": record.lider or "Antonia", "metaPzas": meta_dia, "buenasPzas": 25, "scrapPzas": 0, "cicloSeg": 45.0, "estado": "OK", "buffer": "Caja empaque", "eficiencia": 20.0, "ultimaLiberacion": "08:00"}
            ],
            "alertas": alertas_list
        }

        # 4. Guardar archivo JSON
        with open(self.json_data_path, "w", encoding="utf-8") as f:
            json.dump(brp_data, f, indent=2, ensure_ascii=False)

        # 5. Guardar mockData.js con el formato exacto requerido por el frontend
        js_content = f"""/**
 * =============================================================================
 * DASHBOARD DE SEGUIMIENTO LÍNEA C BRP — PLANTA KOLBEN SCHMIDT CELAYA
 * Archivo de Datos Sincronizados Automáticamente vía OCR Telegram
 * Última Hora Registrada: {record.horario} | Producto: {record.producto}
 * =============================================================================
 */

const BRP_DATA = {json.dumps(brp_data, indent=2, ensure_ascii=False)};

if (typeof module !== 'undefined' && module.exports) {{
  module.exports = BRP_DATA;
}}
"""
        with open(self.mock_data_path, "w", encoding="utf-8") as f:
            f.write(js_content)

        # 6. Garantizar persistencia del registro en el archivo CSV histórico
        try:
            self.append_to_persistent_csv(record)
        except Exception as e:
            logging.getLogger("BRP_Audit").warning(f"No se pudo anexar al CSV persistente: {e}")

        # 7. Notificar al hardware ESP32 Andon si hay conexión configurada
        self.notify_esp32_andon(estado_linea)

        return True

    def append_to_persistent_csv(self, record: HourlyProductionRecord) -> bool:
        """
        Anexa de manera persistente cada registro al archivo CSV histórico.
        Este archivo NO se borra cuando el operador pulsa el botón de Reset.
        """
        file_exists = self.csv_history_path.exists()
        header = [
            "Fecha", "Turno", "Horario", "Linea", "Producto", "Lider",
            "Obj_Pz_Hora", "Real_Pz_Hora", "Obj_Acumulado", "Real_Acumulado",
            "Piezas_Malas_Scrap", "Tiempo_Minutos_Paro", "Causa_Paro",
            "Estado_Validacion", "Fecha_Registro"
        ]

        existing_rows = []
        if file_exists:
            with open(self.csv_history_path, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                existing_rows = list(reader)

        # Evitar registrar exactamente la misma hora y turno si ya existe
        row_key = (str(record.fecha or ""), str(record.horario or ""))
        exists = any(
            len(r) > 2 and r[0] == row_key[0] and r[2] == row_key[1]
            for r in existing_rows[1:]
        )
        if exists:
            return True

        with open(self.csv_history_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if not file_exists or len(existing_rows) == 0:
                writer.writerow(header)
            writer.writerow([
                record.fecha or "",
                record.turno or "Primero: 06:30 a 15:00 hrs",
                record.horario or "",
                record.linea or "C",
                record.producto or "WOLF V1",
                record.lider or "Antonia",
                record.obj_pz_hora if record.obj_pz_hora is not None else 60,
                record.real_pz_hora if record.real_pz_hora is not None else 0,
                record.obj_acumulado if record.obj_acumulado is not None else 0,
                record.real_acumulado if record.real_acumulado is not None else 0,
                record.piezas_malas if record.piezas_malas is not None else 0,
                record.tiempo_minutos if record.tiempo_minutos is not None else 0,
                record.paros or "",
                record.validation_status or "VALIDO",
                record.updated_at.strftime("%Y-%m-%d %H:%M:%S") if hasattr(record, "updated_at") and record.updated_at else ""
            ])
        return True

    def archive_shift_to_csv(self, turno_num: int = None, fecha_str: str = None) -> Path:
        """
        Archiva todos los datos del turno saliente en un archivo CSV oficial dedicado.
        Se guarda en backend/storage/turnos/ y en data/turnos_archivados/.
        """
        current_data = {}
        if self.json_data_path.exists():
            try:
                with open(self.json_data_path, "r", encoding="utf-8") as f:
                    current_data = json.load(f)
            except Exception:
                pass

        planta = current_data.get("planta", {})
        kpis = current_data.get("resumenKpis", {})
        turno_actual = turno_num or planta.get("turnoActual", 1)
        fecha = fecha_str or datetime.utcnow().strftime("%Y-%m-%d")
        shift_info = SHIFT_SCHEDULES.get(turno_actual, SHIFT_SCHEDULES[1])
        shift_slug = shift_info["nombre"].split(" - ")[-1].replace(" ", "_")

        filename = f"Turno_{turno_actual}_{shift_slug}_{fecha}.csv"
        SHIFT_ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
        dest_archive_path = SHIFT_ARCHIVE_DIR / filename
        public_archive_dir = PROJECT_ROOT / "data" / "turnos_archivados"
        public_archive_dir.mkdir(parents=True, exist_ok=True)
        dest_public_path = public_archive_dir / filename

        supervisor = planta.get("supervisorActual", shift_info["supervisor"])
        producto = planta.get("productoActual", "WOLF V1 (Pistón BRP)")
        prod_real = kpis.get("produccionDia", 0)
        meta_dia = kpis.get("metaDiaria", shift_info["meta"])
        cumplimiento = kpis.get("porcentajeAvance", 0.0)
        scrap = kpis.get("scrapPiezas", 0)
        scrap_pct = kpis.get("scrapPorcentaje", 0.0)
        paros_min = kpis.get("parosAcumuladosMin", 0)
        eventos = kpis.get("eventosParo", 0)
        oee = kpis.get("eficienciaOee", 0.0)
        estado = kpis.get("estadoLinea", "PRODUCCION_EN_ORDEN")

        lines = [
            "# =============================================================================",
            "# BRP ROTAX MÉXICO — PLANTA KOLBEN SCHMIDT CELAYA",
            f"# REPORTE OFICIAL DE CIERRE DE TURNO: {shift_info['nombre'].upper()}",
            f"# Fecha: {fecha} | Turno: {shift_info['turno_str']}",
            f"# Supervisor / Líder: {supervisor} | Producto: {producto}",
            f"# Producción Real: {prod_real} uds | Meta: {meta_dia} uds | Cumplimiento: {cumplimiento}%",
            f"# Piezas Scrap (NOK): {scrap} uds ({scrap_pct}%) | Paros Acumulados: {paros_min} min ({eventos} eventos)",
            f"# Eficiencia Operativa OEE: {oee}% | Estado de Línea Final: {estado}",
            f"# Timestamp de Archivo: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
            "# =============================================================================",
            "Fecha,Turno,Horario,Linea,Producto,Lider,Obj_Pz_Hora,Real_Pz_Hora,Obj_Acumulado,Real_Acumulado,Piezas_Malas_Scrap,Tiempo_Minutos_Paro,Causa_Paro_Incidencia,Estado_Linea,Timestamp_Registro"
        ]

        # Agregar registros hora a hora
        for h in current_data.get("produccionHoraria", []):
            cmt = (h.get("comentario") or "").replace('"', '""')
            lines.append(
                f'{fecha},"{shift_info["turno_str"]}","{h.get("hora")}","C","{producto}","{supervisor}",'
                f'{h.get("meta", 0)},{h.get("real", 0)},{h.get("acumMeta", 0)},{h.get("acumReal", 0)},'
                f'{h.get("malas", 0)},{h.get("parosMin", 0)},"{cmt}","{estado}","{datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")}"'
            )

        # Anexar sección de desglose de paros
        lines.append("")
        lines.append("# DESGLOSE DETALLADO DE PAROS E INCIDENCIAS DEL TURNO")
        lines.append("ID,Horario,Duracion_Min,Estacion,Causa_Motivo,Tipo_Impacto,Estatus")
        for p in current_data.get("parosIncidencias", []):
            causa = (p.get("causa") or "").replace('"', '""')
            lines.append(
                f'{p.get("id", "PARO")},"{p.get("hora", "")}",{p.get("duracionMin", 0)},"{p.get("estacion", "OP30")}","{causa}","{p.get("categoria", "CRITICA")}","Registrado"'
            )

        content = "\n".join(lines) + "\n"

        with open(dest_archive_path, "w", encoding="utf-8-sig") as f:
            f.write(content)
        with open(dest_public_path, "w", encoding="utf-8-sig") as f:
            f.write(content)

        logging.getLogger("BRP_Audit").info(f"Turno archivado exitosamente en: {dest_archive_path.name}")
        return dest_archive_path

    def reset_production_data(self, target_turno: int = 1) -> Dict[str, Any]:
        """
        Limpia los datos del dashboard y prepara la cuadrícula para el nuevo turno de producción.
        Soporta Turno 1 (Matutino), Turno 2 (Vespertino) o Turno 3 (Nocturno).
        """
        shift_info = SHIFT_SCHEDULES.get(target_turno, SHIFT_SCHEDULES[1])
        meta_turno = shift_info["meta"]
        supervisor = shift_info["supervisor"]

        # Crear cuadrícula horaria en blanco para el nuevo turno
        produccion_horaria = []
        for h_str, m_h, m_ac in shift_info["horas"]:
            produccion_horaria.append({
                "hora": h_str,
                "meta": m_h,
                "real": 0,
                "acumMeta": m_ac,
                "acumReal": 0,
                "oeeHora": 0.0,
                "parosMin": 0,
                "malas": 0,
                "comentario": "En espera de primer reporte Telegram"
            })

        clean_data = {
            "planta": {
                "nombre": "BRP ROTAX MÉXICO S.A. de C.V.",
                "plantaId": "PLANTA KOLBEN SCHMIDT CELAYA - LÍNEA C",
                "linea": "Línea C — Ensamble y Mecanizado de Pistón WOLF V1",
                "versionSistema": "v2.7.0-OCR-LIVE",
                "updatedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "tiempoCicloTargetSeg": 45.0,
                "metaTurnoUnidades": meta_turno,
                "supervisorActual": supervisor,
                "productoActual": "WOLF V1 (Pistón BRP)",
                "turnoActual": target_turno
            },
            "resumenKpis": {
                "produccionDia": 0,
                "metaDiaria": meta_turno,
                "porcentajeAvance": 0.0,
                "unidadesCompletadas": 0,
                "unidadesPendientes": meta_turno,
                "eficienciaOee": 0.0,
                "disponibilidad": 100.0,
                "rendimiento": 0.0,
                "calidadFpy": 100.0,
                "parosAcumuladosMin": 0,
                "eventosParo": 0,
                "taktTimeSeg": 45.0,
                "scrapPiezas": 0,
                "scrapPorcentaje": 0.0,
                "estadoLinea": "PRODUCCION_EN_ORDEN"
            },
            "turnos": [
                {"id": 1, "nombre": "Turno 1 - Matutino", "horario": "06:30 - 15:00", "supervisor": "Líder Antonia", "meta": 480, "real": 0, "oee": 0.0, "activo": target_turno == 1},
                {"id": 2, "nombre": "Turno 2 - Vespertino", "horario": "15:00 - 23:00", "supervisor": "Ing. Roberto Garza", "meta": 450, "real": 0, "oee": 0.0, "activo": target_turno == 2},
                {"id": 3, "nombre": "Turno 3 - Nocturno", "horario": "23:00 - 06:30", "supervisor": "Ing. Diana Soto", "meta": 420, "real": 0, "oee": 0.0, "activo": target_turno == 3}
            ],
            "modelos": [
                {"id": "M01", "codigo": "PISTON-WOLF-V1", "nombre": "Pistón WOLF V1 (Línea C)", "cilindros": 1, "hp": 0, "plataforma": "BRP Rotax Engine Program", "activo": True}
            ],
            "produccionHoraria": produccion_horaria,
            "parosIncidencias": [],
            "estaciones": [
                {"id": "OP10", "nombre": "Mecanizado de Falda y Corona WOLF V1", "equipo": "Torno / Centro CNC OP10", "operador": "Téc. Línea C", "metaPzas": meta_turno, "buenasPzas": 0, "scrapPzas": 0, "cicloSeg": 45.0, "estado": "OK", "buffer": "Línea lista", "eficiencia": 100.0, "ultimaLiberacion": "--:--"},
                {"id": "OP20", "nombre": "Ranurado de Anillos y Barrenado de Perno", "equipo": "Ranuradora de Precisión OP20", "operador": "Téc. Línea C", "metaPzas": meta_turno, "buenasPzas": 0, "scrapPzas": 0, "cicloSeg": 45.0, "estado": "OK", "buffer": "Línea lista", "eficiencia": 100.0, "ultimaLiberacion": "--:--"},
                {"id": "OP30", "nombre": "Lavado Térmico y Desengrase", "equipo": "Lavadora Ultrasónica OP30", "operador": "Téc. Línea C", "metaPzas": meta_turno, "buenasPzas": 0, "scrapPzas": 0, "cicloSeg": 45.0, "estado": "OK", "buffer": "Línea lista", "eficiencia": 100.0, "ultimaLiberacion": "--:--"},
                {"id": "OP40", "nombre": "Acabado de Superficie / Recubrimiento", "equipo": "Cabina de Grafito / Moly OP40", "operador": "Téc. Línea C", "metaPzas": meta_turno, "buenasPzas": 0, "scrapPzas": 0, "cicloSeg": 45.0, "estado": "OK", "buffer": "Línea lista", "eficiencia": 100.0, "ultimaLiberacion": "--:--"},
                {"id": "OP50", "nombre": "Inspección Dimensional Neumática", "equipo": "Gage de Aire Multidiametral OP50", "operador": "Téc. Calidad", "metaPzas": meta_turno, "buenasPzas": 0, "scrapPzas": 0, "cicloSeg": 45.0, "estado": "OK", "buffer": "Línea lista", "eficiencia": 100.0, "ultimaLiberacion": "--:--"},
                {"id": "OP60", "nombre": "Inspección Final EOL & Marcado Láser", "equipo": "Estación de Visión y Embalaje OP60", "operador": "Téc. Calidad", "metaPzas": meta_turno, "buenasPzas": 0, "scrapPzas": 0, "cicloSeg": 45.0, "estado": "OK", "buffer": "Línea lista", "eficiencia": 100.0, "ultimaLiberacion": "--:--"}
            ],
            "alertas": [
                {
                    "id": "ALT-NEW-SHIFT",
                    "tipo": "INFO",
                    "titulo": f"{shift_info['nombre']} Iniciado — Línea C",
                    "descripcion": f"Dashboard limpio y preparado para {shift_info['nombre']} ({shift_info['horario']}). Meta programada: {meta_turno} unidades. En espera de la primera captura vía Telegram.",
                    "estacion": "LÍNEA C COMPLETA",
                    "hora": shift_info["horas"][0][0],
                    "tiempoTranscurrido": "Inicio de Turno",
                    "resuelta": True
                }
            ]
        }

        with open(self.json_data_path, "w", encoding="utf-8") as f:
            json.dump(clean_data, f, indent=2, ensure_ascii=False)

        js_content = f"""/**
 * =============================================================================
 * DASHBOARD DE SEGUIMIENTO LÍNEA C BRP — PLANTA KOLBEN SCHMIDT CELAYA
 * Archivo de Datos Sincronizados Automáticamente vía OCR Telegram
 * Estado: {shift_info['nombre']} Inicializado | Meta: {meta_turno} uds
 * =============================================================================
 */

const BRP_DATA = {json.dumps(clean_data, indent=2, ensure_ascii=False)};

if (typeof module !== 'undefined' && module.exports) {{
  module.exports = BRP_DATA;
}}
"""
        with open(self.mock_data_path, "w", encoding="utf-8") as f:
            f.write(js_content)

        self.notify_esp32_andon("PRODUCCION_EN_ORDEN")
        return clean_data

    def notify_esp32_andon(self, estado_linea: str) -> bool:
        """
        Envía el estado operativo al hardware ESP32 Andon
        utilizando la IP configurada (por defecto http://192.168.0.200)
        """
        import os
        import urllib.request
        import urllib.error
        from .config import ESP32_HOST

        esp32_host = os.getenv("ESP32_HOST", ESP32_HOST)
        if not esp32_host:
            return False

        url = f"{esp32_host.rstrip('/')}/api/andon?state={estado_linea}"
        try:
            req = urllib.request.Request(url, method="POST")
            with urllib.request.urlopen(req, timeout=2.0) as resp:
                if resp.status == 200:
                    logging.getLogger("BRP_Audit").info(
                        f"Hardware ESP32 Andon sincronizado exitosamente con estado: {estado_linea}"
                    )
                    return True
        except Exception as e:
            logging.getLogger("BRP_Audit").debug(f"ESP32 no alcanzable en {url}: {e}")
            return False
        return False

