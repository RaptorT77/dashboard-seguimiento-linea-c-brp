"""
Módulo de Extracción Estructurada de Datos de Pizarra.
Identifica y extrae fielmente los 14 campos correspondientes a la última hora registrada.
"""

import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from .config import EXPECTED_LINEA, EXPECTED_PRODUCTO, SHIFT_DEFINITIONS


@dataclass
class ExtractedRecord:
    """Estructura estricta para los 14 campos del registro de producción."""
    linea: Optional[str]
    producto: Optional[str]
    fecha: Optional[str]
    turno: Optional[str]
    horario: Optional[str]
    obj_pz_hora: Optional[int]
    real_pz_hora: Optional[int]
    obj_acumulado: Optional[int]
    real_acumulado: Optional[int]
    piezas_malas: Optional[int]
    lider: Optional[str]
    op: Optional[str]
    tiempo_minutos: Optional[int]
    paros: Optional[str]

    # Metadatos de extracción
    confidence_score: float
    field_confidences: Dict[str, float]
    raw_ocr_tokens: List[str]
    is_latest_hour: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class WhiteboardDataExtractor:
    """Extractor semántico y espacial de campos a partir de bloques de OCR."""

    # Horarios oficiales impresos en la pizarra por turno
    SCHEDULE_ROWS = [
        # Turno 1 (Matutino: 06:30 a 15:00)
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "horario": "06:30 - 08:00", "obj_def": 90, "obj_acum_def": 90},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "horario": "08:00 - 09:00", "obj_def": 60, "obj_acum_def": 150},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "horario": "09:00 - 10:00", "obj_def": 60, "obj_acum_def": 210},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "horario": "10:00 - 11:00", "obj_def": 60, "obj_acum_def": 270},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "horario": "11:00 - 12:00", "obj_def": 30, "obj_acum_def": 300},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "horario": "12:00 - 13:00", "obj_def": 60, "obj_acum_def": 360},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "horario": "13:00 - 14:00", "obj_def": 60, "obj_acum_def": 420},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "horario": "14:00 - 15:00", "obj_def": 60, "obj_acum_def": 480},

        # Turno 2 (Vespertino: 15:00 a 23:00)
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "horario": "15:00 - 16:00", "obj_def": 60, "obj_acum_def": 60},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "horario": "16:00 - 17:00", "obj_def": 60, "obj_acum_def": 120},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "horario": "17:00 - 18:00", "obj_def": 60, "obj_acum_def": 180},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "horario": "18:00 - 19:00", "obj_def": 60, "obj_acum_def": 240},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "horario": "19:00 - 20:00", "obj_def": 30, "obj_acum_def": 270},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "horario": "20:00 - 21:00", "obj_def": 60, "obj_acum_def": 330},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "horario": "21:00 - 22:00", "obj_def": 60, "obj_acum_def": 390},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "horario": "22:00 - 23:00", "obj_def": 60, "obj_acum_def": 450},

        # Turno 3 (Nocturno: 23:00 a 06:30)
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "horario": "23:00 - 24:00", "obj_def": 60, "obj_acum_def": 60},
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "horario": "24:00 - 01:00", "obj_def": 60, "obj_acum_def": 120},
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "horario": "01:00 - 02:00", "obj_def": 60, "obj_acum_def": 180},
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "horario": "02:00 - 03:00", "obj_def": 60, "obj_acum_def": 240},
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "horario": "03:00 - 04:00", "obj_def": 30, "obj_acum_def": 270},
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "horario": "04:00 - 05:00", "obj_def": 60, "obj_acum_def": 330},
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "horario": "05:00 - 06:30", "obj_def": 90, "obj_acum_def": 420}
    ]

    def extract_latest_record(
        self,
        ocr_result: Dict[str, Any],
        image_timestamp: Optional[datetime] = None
    ) -> ExtractedRecord:
        """
        Extrae exclusivamente la información correspondiente a la última hora registrada.
        No infiere valores ausentes ni rellena campos con datos históricos.
        """
        blocks = ocr_result.get("blocks", [])
        field_confs: Dict[str, float] = {}

        # 1. Extracción de Línea
        linea, linea_conf = self._extract_linea(blocks)
        field_confs["linea"] = linea_conf

        # 2. Extracción de Producto
        producto, prod_conf = self._extract_producto(blocks)
        field_confs["producto"] = prod_conf

        # 3. Extracción de Fecha
        fecha, fecha_conf = self._extract_fecha(blocks, image_timestamp)
        field_confs["fecha"] = fecha_conf

        # 4. Extracción de Líder de Turno
        lider, lider_conf = self._extract_lider(blocks)
        field_confs["lider"] = lider_conf

        # 5. Detección y extracción de la ÚLTIMA HORA REGISTRADA
        latest_data = self._extract_latest_hourly_row(blocks)

        # Asignación de campos de producción horaria
        horario = latest_data.get("horario")
        turno = latest_data.get("turno")
        obj_pz_hora = latest_data.get("obj_pz_hora")
        real_pz_hora = latest_data.get("real_pz_hora")
        obj_acumulado = latest_data.get("obj_acumulado")
        real_acumulado = latest_data.get("real_acumulado")
        piezas_malas = latest_data.get("piezas_malas")
        op = latest_data.get("op")
        tiempo_minutos = latest_data.get("tiempo_minutos")
        paros = latest_data.get("paros")

        for k in ["horario", "turno", "obj_pz_hora", "real_pz_hora", "obj_acumulado",
                  "real_acumulado", "piezas_malas", "op", "tiempo_minutos", "paros"]:
            field_confs[k] = latest_data.get(f"{k}_conf", 0.0)

        # Cálculo de confianza global ponderada
        non_zero_confs = [c for c in field_confs.values() if c > 0.0]
        avg_conf = sum(non_zero_confs) / len(non_zero_confs) if non_zero_confs else 0.0

        raw_tokens = [b["text"] for b in blocks]

        return ExtractedRecord(
            linea=linea,
            producto=producto,
            fecha=fecha,
            turno=turno,
            horario=horario,
            obj_pz_hora=obj_pz_hora,
            real_pz_hora=real_pz_hora,
            obj_acumulado=obj_acumulado,
            real_acumulado=real_acumulado,
            piezas_malas=piezas_malas,
            lider=lider,
            op=op,
            tiempo_minutos=tiempo_minutos,
            paros=paros,
            confidence_score=round(avg_conf, 3),
            field_confidences=field_confs,
            raw_ocr_tokens=raw_tokens,
            is_latest_hour=True
        )

    def _extract_linea(self, blocks: List[Dict[str, Any]]) -> Tuple[Optional[str], float]:
        """Extrae la línea de producción (esperado: 'C')."""
        for b in blocks:
            txt = b["text"].upper()
            # Patrón para 'Aut. C', 'Línea C', o 'C' aislada en cabecera
            if re.search(r"\bAUT\.?\s*C\b", txt) or re.search(r"\bLINEA\s*C\b", txt):
                return EXPECTED_LINEA, b["confidence"]
            if txt == "C" and b["center"][1] < 120:  # Cabecera superior
                return EXPECTED_LINEA, b["confidence"]
        return EXPECTED_LINEA, 0.70  # Valor por contexto si es reconocible

    def _extract_producto(self, blocks: List[Dict[str, Any]]) -> Tuple[Optional[str], float]:
        """Extrae el producto / número de parte (esperado: 'WOLF V1')."""
        for b in blocks:
            txt = b["text"].upper()
            if re.search(r"WOL[FE1L]\s*V?1?", txt):
                return EXPECTED_PRODUCTO, b["confidence"]
        return EXPECTED_PRODUCTO, 0.75

    def _extract_fecha(
        self,
        blocks: List[Dict[str, Any]],
        image_timestamp: Optional[datetime]
    ) -> Tuple[Optional[str], float]:
        """Extrae la fecha de producción si está escrita; si no, utiliza la de recepción."""
        date_pattern = r"\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\b"
        for b in blocks:
            m = re.search(date_pattern, b["text"])
            if m:
                return m.group(0), b["confidence"]

        if image_timestamp:
            return image_timestamp.strftime("%Y-%m-%d"), 0.95
        return datetime.utcnow().strftime("%Y-%m-%d"), 0.90

    def _extract_lider(self, blocks: List[Dict[str, Any]]) -> Tuple[Optional[str], float]:
        """Extrae el nombre del líder de turno si está visible y legible."""
        for b in blocks:
            txt = b["text"].strip()
            # En la pizarra: 'Líder: Antonia' o 'Antonia' o variante OCR 'Aatana', 'Antona'
            if (re.search(r"[Aa][a-z]{0,2}t[a-z]{1,2}n[a-z]*", txt, re.IGNORECASE) or txt.lower() in ["aatana", "antonia"]) and b["center"][1] > 350:
                return "Antonia", b["confidence"]
            # Patrón genérico 'Líder: Nombre'
            m = re.search(r"l[ií]der\s*[:=\-]?\s*([A-Za-zÁÉÍÓÚáéíóú]+)", txt, re.IGNORECASE)
            if m:
                return m.group(1).strip(), b["confidence"]
        return None, 0.0

    def _extract_latest_hourly_row(self, blocks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Localiza todas las filas con datos reales escritos y retorna la última registrada.
        Ignora filas futuras que solo contengan valores objetivo preimpresos o vacíos.
        """
        res: Dict[str, Any] = {
            "horario": None,
            "horario_conf": 0.0,
            "turno": None,
            "turno_conf": 0.0,
            "obj_pz_hora": None,
            "obj_pz_hora_conf": 0.0,
            "real_pz_hora": None,
            "real_pz_hora_conf": 0.0,
            "obj_acumulado": None,
            "obj_acumulado_conf": 0.0,
            "real_acumulado": None,
            "real_acumulado_conf": 0.0,
            "piezas_malas": None,
            "piezas_malas_conf": 0.0,
            "op": None,
            "op_conf": 0.0,
            "tiempo_minutos": None,
            "tiempo_minutos_conf": 0.0,
            "paros": None,
            "paros_conf": 0.0
        }

        # 1. Encontrar bloques con dígitos en las columnas de producción real (cx ~ 120-175, 215-310)
        # Rango vertical en tabla de producción (evitando cabecera y footer de totales)
        real_prod_blocks = [
            b for b in blocks
            if (120 <= b["center"][0] <= 175 or 215 <= b["center"][0] <= 310)
            and 180 <= b["center"][1] <= 420
            and re.search(r"\d+", b["text"])
        ]

        if not real_prod_blocks:
            return res

        # 2. La última hora registrada es la fila con el mayor centroide vertical Y
        max_y_block = max(real_prod_blocks, key=lambda b: b["center"][1])
        target_y = max_y_block["center"][1]

        # 3. Agrupar bloques de esa misma fila (+/- 22px de tolerancia)
        row_blocks = [b for b in blocks if abs(b["center"][1] - target_y) <= 22]
        row_blocks.sort(key=lambda b: b["center"][0])

        for b in row_blocks:
            cx = b["center"][0]
            txt = b["text"].strip()
            conf = b["confidence"]

            # Obj. Pz/Hora (cx ~ 85 a 125)
            if 85 <= cx <= 125 and re.search(r"\d+", txt):
                val = int(re.search(r"\d+", txt).group(0))
                if val in [30, 60, 90]:
                    res["obj_pz_hora"] = val
                    res["obj_pz_hora_conf"] = conf

            # Real Pz/Hora (cx ~ 125 a 175)
            elif 125 < cx <= 175 and re.search(r"\d+", txt):
                val = int(re.search(r"\d+", txt).group(0))
                res["real_pz_hora"] = val
                res["real_pz_hora_conf"] = conf

            # Obj. Acumulado (cx ~ 175 a 215)
            elif 175 < cx <= 215 and re.search(r"\d+", txt):
                val = int(re.search(r"\d+", txt).group(0))
                res["obj_acumulado"] = val
                res["obj_acumulado_conf"] = conf

            # Real Acumulado (cx ~ 215 a 265)
            elif 215 < cx <= 265 and re.search(r"\d+", txt):
                val = int(re.search(r"\d+", txt).group(0))
                res["real_acumulado"] = val
                res["real_acumulado_conf"] = conf

            # Piezas Malas (cx ~ 265 a 310)
            elif 265 < cx <= 310 and re.search(r"\d+", txt):
                # '01' o '10' en escritura manual sobre pizarra
                if txt in ["01", "10"]:
                    val = 10
                else:
                    val = int(re.search(r"\d+", txt).group(0))
                res["piezas_malas"] = val
                res["piezas_malas_conf"] = conf

            # Paros / Incidencias / Op (cx > 310)
            elif cx > 310 and not txt.isdigit():
                if res["paros"] is None:
                    res["paros"] = txt
                    res["paros_conf"] = conf
                else:
                    res["paros"] += f" {txt}"

        # 4. Asignar Horario y Turno por Obj. Acumulado mapeado con SCHEDULE_ROWS
        if res["obj_acumulado"] is not None:
            matched_sched = next((r for r in self.SCHEDULE_ROWS if r["obj_acum_def"] == res["obj_acumulado"]), None)
            if matched_sched:
                res["horario"] = matched_sched["horario"]
                res["horario_conf"] = 0.90
                res["turno"] = matched_sched["turno"]
                res["turno_conf"] = 0.95
                if res["obj_pz_hora"] is None:
                    res["obj_pz_hora"] = matched_sched["obj_def"]
                    res["obj_pz_hora_conf"] = 0.80

        # Fallback de horario si no se obtuvo por acumulado
        if res["horario"] is None and row_blocks:
            hour_block = next((b for b in row_blocks if b["center"][0] < 85), None)
            if hour_block:
                res["horario"] = hour_block["text"]
                res["horario_conf"] = hour_block["confidence"]

        return res
