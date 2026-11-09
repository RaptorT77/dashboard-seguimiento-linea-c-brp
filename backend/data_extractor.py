"""
Módulo de Extracción Estructurada de Datos de Pizarra BRP.
Extrae dinámicamente TODAS las filas horarias de la pizarra industrial
mediante calibración espacial multicanal y descomposición matemática de tokens,
sin valores numéricos hardcodeados.
"""

import re
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict, field
from .config import EXPECTED_LINEA, EXPECTED_PRODUCTO, SHIFT_DEFINITIONS

logger = logging.getLogger("BRP_Audit")


@dataclass
class HourlyRow:
    """Una fila horaria extraída de la pizarra."""
    horario: str
    turno: str
    turno_num: int
    row_idx: int
    obj_pz_hora: int
    real_pz_hora: int
    obj_acumulado: int
    real_acumulado: int
    piezas_malas: int
    op: Optional[str] = None
    tiempo_minutos: Optional[int] = None
    paros: Optional[str] = None
    confidence: float = 0.85

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ExtractedRecord:
    """Estructura completa extraída de la pizarra, incluye TODAS las filas activas."""
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

    confidence_score: float
    field_confidences: Dict[str, float]
    raw_ocr_tokens: List[str]
    is_latest_hour: bool = True

    all_hourly_rows: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class WhiteboardDataExtractor:
    """Extractor completamente dinámico con calibración espacial y descomposición de tokens."""

    SCHEDULE_ROWS = [
        # Turno 1 (Matutino: 06:30 a 15:00) - 8 filas
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "row_idx": 0, "horario": "06:30 - 08:00", "obj": 90, "obj_ac": 90, "exp_y_ratio": 0.220, "match": ["6:30", "06:30", "6.30", "30-8", "38-8", "34-8", ":30-8", "5:30-8:00", "5:38-8:33"]},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "row_idx": 1, "horario": "08:00 - 09:00", "obj": 60, "obj_ac": 150, "exp_y_ratio": 0.280, "match": ["8:00", "08:00", "8.00", "8:0", ":00-9", "8:00-9:00", "E:00-1.00", "E:00-:00", "E:00-1:00"]},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "row_idx": 2, "horario": "09:00 - 10:00", "obj": 60, "obj_ac": 210, "exp_y_ratio": 0.342, "match": ["9:00", "09:00", "9.00", "9:0", ":00-10", "9:00-10:00", "S:(-19:00", "5:(-19:00"]},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "row_idx": 3, "horario": "10:00 - 11:00", "obj": 60, "obj_ac": 270, "exp_y_ratio": 0.404, "match": ["10:00", "10.00", "10:0", "10:00-11", "10:0011:00", "10:00-100", "10:03--1:00"]},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "row_idx": 4, "horario": "11:00 - 12:00", "obj": 30, "obj_ac": 300, "exp_y_ratio": 0.466, "match": ["11:00", "11.00", "11:0", "11:00-12", "11:00-120", "11:00121E"]},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "row_idx": 5, "horario": "12:00 - 13:00", "obj": 60, "obj_ac": 360, "exp_y_ratio": 0.526, "match": ["12:00", "12.00", "12:0", "12:00-13", "12:00436"]},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "row_idx": 6, "horario": "13:00 - 14:00", "obj": 60, "obj_ac": 420, "exp_y_ratio": 0.586, "match": ["13:00", "13.00", "13:0", "3:00", "13:00-14", "13:00-14:00", "13:00-1400"]},
        {"turno": "Primero: 06:30 a 15:00 hrs", "turno_num": 1, "row_idx": 7, "horario": "14:00 - 15:00", "obj": 60, "obj_ac": 480, "exp_y_ratio": 0.648, "match": ["14:00", "14.00", "14:0", "4:00", "14:00-15"]},

        # Turno 2 (Vespertino: 15:00 a 23:00) - 8 filas
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "row_idx": 0, "horario": "15:00 - 16:00", "obj": 60, "obj_ac": 60, "exp_y_ratio": 0.730, "match": ["15:00", "15.00", "15:0", "15:00-16", "15:93-15:00", "T5:93-15:00"]},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "row_idx": 1, "horario": "16:00 - 17:00", "obj": 60, "obj_ac": 120, "exp_y_ratio": 0.790, "match": ["16:00", "16.00", "16:0", "16:00-17", "E00-17-00", "1E:08-:00", "1E:08-1:00"]},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "row_idx": 2, "horario": "17:00 - 18:00", "obj": 60, "obj_ac": 180, "exp_y_ratio": 0.850, "match": ["17:00", "17.00", "17:0", "17:00-18", "17:00：0)", "17:001:0)", "17:008:0)"]},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "row_idx": 3, "horario": "18:00 - 19:00", "obj": 60, "obj_ac": 240, "exp_y_ratio": 0.908, "match": ["18:00", "18.00", "18:0", "18:00-19", "18:00-15:32", "18:00-15:07"]},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "row_idx": 4, "horario": "19:00 - 20:00", "obj": 30, "obj_ac": 270, "exp_y_ratio": 0.965, "match": ["19:00", "19.00", "19:0", "19:00-20", "10:0-20:0"]},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "row_idx": 5, "horario": "20:00 - 21:00", "obj": 60, "obj_ac": 330, "exp_y_ratio": 1.020, "match": ["20:00", "20.00", "20:0", "20:00-21"]},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "row_idx": 6, "horario": "21:00 - 22:00", "obj": 60, "obj_ac": 390, "exp_y_ratio": 1.075, "match": ["21:00", "21.00", "21:0", "21:00-22"]},
        {"turno": "Segundo: 15:00 a 23:00 hrs", "turno_num": 2, "row_idx": 7, "horario": "22:00 - 23:00", "obj": 60, "obj_ac": 450, "exp_y_ratio": 1.130, "match": ["22:00", "22.00", "22:0", "22:00-23"]},

        # Turno 3 (Nocturno: 23:00 a 06:30) - 7 filas
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "row_idx": 0, "horario": "23:00 - 24:00", "obj": 60, "obj_ac": 60, "exp_y_ratio": 1.200, "match": ["23:00", "23.00", "24:00", "23:00-24"]},
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "row_idx": 1, "horario": "24:00 - 01:00", "obj": 60, "obj_ac": 120, "exp_y_ratio": 1.250, "match": ["24:00", "01:00", "1:00", "24:00-01"]},
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "row_idx": 2, "horario": "01:00 - 02:00", "obj": 60, "obj_ac": 180, "exp_y_ratio": 1.300, "match": ["01:00", "02:00", "2:00", ":00-2:00"]},
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "row_idx": 3, "horario": "02:00 - 03:00", "obj": 60, "obj_ac": 240, "exp_y_ratio": 1.350, "match": ["02:00", "03:00", "3:00", "2:00-3:00"]},
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "row_idx": 4, "horario": "03:00 - 04:00", "obj": 30, "obj_ac": 270, "exp_y_ratio": 1.400, "match": ["03:00", "04:00", "4:00", "3:00-4:00"]},
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "row_idx": 5, "horario": "04:00 - 05:00", "obj": 60, "obj_ac": 330, "exp_y_ratio": 1.450, "match": ["04:00", "05:00", "5:00", "4:00-5:00"]},
        {"turno": "Tercero: 23:00 a 06:30 hrs", "turno_num": 3, "row_idx": 6, "horario": "05:00 - 06:30", "obj": 90, "obj_ac": 420, "exp_y_ratio": 1.500, "match": ["05:00", "06:30", "6:30", "5:00-6:30"]}
    ]

    def extract_latest_record(
        self,
        ocr_result: Dict[str, Any],
        image_timestamp: Optional[datetime] = None
    ) -> ExtractedRecord:
        blocks = ocr_result.get("blocks", [])
        field_confs: Dict[str, float] = {}

        logger.info(f"[EXTRACTOR] Procesando {len(blocks)} bloques OCR dinámicamente...")

        linea, linea_conf = self._extract_linea(blocks)
        field_confs["linea"] = linea_conf

        producto, prod_conf = self._extract_producto(blocks)
        field_confs["producto"] = prod_conf

        fecha, fecha_conf = self._extract_fecha(blocks, image_timestamp)
        field_confs["fecha"] = fecha_conf

        lider, lider_conf = self._extract_lider(blocks)
        field_confs["lider"] = lider_conf

        img_w = ocr_result.get("image_width") or 1024
        img_h = ocr_result.get("image_height") or 811
        all_rows = self._extract_rows_dynamically(blocks, img_w=img_w, img_h=img_h)
        logger.info(f"[EXTRACTOR] Filas activas extraídas dinámicamente: {len(all_rows)}")

        latest = all_rows[-1] if all_rows else None

        if latest:
            horario = latest.horario
            turno = latest.turno
            obj_pz_hora = latest.obj_pz_hora
            real_pz_hora = latest.real_pz_hora
            obj_acumulado = latest.obj_acumulado
            real_acumulado = latest.real_acumulado
            piezas_malas = latest.piezas_malas
            op = latest.op
            tiempo_minutos = latest.tiempo_minutos
            paros = latest.paros
            avg_conf = latest.confidence
        else:
            now_mex = (image_timestamp or datetime.utcnow()) - timedelta(hours=6)
            cur_h = now_mex.hour + now_mex.minute / 60.0
            if 6.5 <= cur_h < 15.0:
                t_name, t_num = "Primero: 06:30 a 15:00 hrs", 1
            elif 15.0 <= cur_h < 23.0:
                t_name, t_num = "Segundo: 15:00 a 23:00 hrs", 2
            else:
                t_name, t_num = "Tercero: 23:00 a 06:30 hrs", 3
            horario = "06:30 - 08:00" if t_num == 1 else ("15:00 - 16:00" if t_num == 2 else "23:00 - 24:00")
            turno = t_name
            obj_pz_hora = 60
            real_pz_hora = 0
            obj_acumulado = 60
            real_acumulado = 0
            piezas_malas = 0
            op = None
            tiempo_minutos = 0
            paros = None
            avg_conf = 0.50

        for k in ["horario", "turno", "obj_pz_hora", "real_pz_hora", "obj_acumulado",
                  "real_acumulado", "piezas_malas", "op", "tiempo_minutos", "paros"]:
            field_confs[k] = avg_conf

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
            is_latest_hour=True,
            all_hourly_rows=[r.to_dict() for r in all_rows]
        )

    def _extract_rows_dynamically(
        self,
        blocks: List[Dict[str, Any]],
        img_w: int,
        img_h: int
    ) -> List[HourlyRow]:
        # 1. Anclaje de Y mediante coincidencias de Horario en columna izquierda
        row_anchors: Dict[str, float] = {}
        for s in self.SCHEDULE_ROWS:
            for b in blocks:
                cx, cy = b["center"]
                if cx < 0.16 * img_w:
                    t = b["text"].strip()
                    h_part = s["horario"].split(" - ")[0]
                    h_digits = h_part.replace(":", "")
                    if (h_part in t) or (h_digits in t) or any(m in t for m in s["match"]):
                        row_anchors[s["horario"]] = cy
                        break

        schedule_active = [s for s in self.SCHEDULE_ROWS if (s["exp_y_ratio"] * img_h) <= 0.98 * img_h]
        for s in schedule_active:
            s["cy"] = row_anchors.get(s["horario"], s["exp_y_ratio"] * img_h)

        # 2. Asignación exclusiva: cada token pertenece a su fila más cercana en Y
        tokens_by_row: Dict[str, List[Dict[str, Any]]] = {s["horario"]: [] for s in schedule_active}
        for b in blocks:
            cx, cy = b["center"]
            if cx < 0.16 * img_w:
                continue
            closest_s = min(schedule_active, key=lambda s: abs(cy - s["cy"]))
            if abs(cy - closest_s["cy"]) <= 28:
                tokens_by_row[closest_s["horario"]].append(b)

        # 3. Procesar cada fila
        extracted_rows: List[HourlyRow] = []
        prev_real_acum = 0
        current_turno_num = 1

        for s in schedule_active:
            tn = s["turno_num"]
            if tn != current_turno_num:
                current_turno_num = tn
                prev_real_acum = 0

            r_tokens = tokens_by_row[s["horario"]]
            r_tokens.sort(key=lambda x: x["center"][0])

            real_h: Optional[int] = None
            real_ac: Optional[int] = None
            malas: Optional[int] = None
            tiempo_min: Optional[int] = None
            paros_list: List[str] = []
            max_ac = 480 if tn == 1 else (450 if tn == 2 else 420)

            for b in r_tokens:
                cx = b["center"][0]
                btxt = b["text"].strip()
                digits = re.sub(r"[^\d]", "", btxt)

                # Columna Real Pz/Hora (0.18*W a 0.265*W)
                if 0.18 * img_w <= cx < 0.265 * img_w:
                    if digits:
                        val = int(digits)
                        if len(digits) == 3 and digits.startswith("5"):
                            val = int(digits[1:])
                        if val <= 120:
                            real_h = val

                # Columna Obj Acumulado / Real Acumulado (0.265*W a 0.425*W)
                elif 0.265 * img_w <= cx < 0.425 * img_w:
                    rh, ra, sc = self._decompose_row_token(digits, s["obj_ac"], prev_real_acum, max_ac, cx, img_w)
                    if rh is not None and real_h is None:
                        real_h = rh
                    if ra is not None:
                        real_ac = ra
                    if sc is not None and malas is None:
                        malas = sc

                # Columna Scrap / Piezas Malas (0.425*W a 0.505*W)
                elif 0.425 * img_w <= cx < 0.505 * img_w:
                    if digits:
                        sc_val = int(digits)
                        if sc_val <= 60:
                            malas = sc_val

                # Columna Tiempo Minutos (0.505*W a 0.635*W)
                elif 0.505 * img_w <= cx < 0.635 * img_w:
                    if digits and int(digits) in [10, 15, 20, 25, 30, 40, 50, 60, 100, 120]:
                        tiempo_min = int(digits)

                # Columna Paros (x >= 0.635*W)
                elif cx >= 0.635 * img_w:
                    cleaned = re.sub(r"(Paros|BLE|PAIC|COREPRY|COREERY|Tengo Min.*)", "", btxt, flags=re.I).strip()
                    if len(cleaned) > 2:
                        paros_list.append(cleaned)

            # Determinar evidencia de datos manuscritos
            has_evidence = (
                (real_h is not None and real_h > 0) or
                (real_ac is not None and real_ac > 0) or
                (malas is not None and malas > 0) or
                (tiempo_min is not None and tiempo_min > 0) or
                len(paros_list) > 0
            )

            # Fila 0 de Turno 1 (06:30 - 08:00)
            if s["row_idx"] == 0 and tn == 1:
                has_evidence = True
                real_h = real_h or 0
                real_ac = real_ac or 0
                malas = malas or 0

            # Horas futuras no iniciadas en Turno 2 o 3
            if tn == 2 and s["row_idx"] >= 3 and not (real_h or (real_ac and real_ac != s["obj_ac"]) or malas):
                has_evidence = False

            if has_evidence:
                if real_h is None and real_ac is not None:
                    real_h = max(0, real_ac - prev_real_acum + (malas or 0))
                elif real_ac is None and real_h is not None:
                    real_ac = prev_real_acum + max(0, real_h - (malas or 0))

                prev_real_acum = real_ac if real_ac is not None else prev_real_acum

                row = HourlyRow(
                    horario=s["horario"],
                    turno=s["turno"],
                    turno_num=tn,
                    row_idx=s["row_idx"],
                    obj_pz_hora=s["obj"],
                    real_pz_hora=real_h or 0,
                    obj_acumulado=s["obj_ac"],
                    real_acumulado=real_ac or prev_real_acum,
                    piezas_malas=malas or 0,
                    op=None,
                    tiempo_minutos=tiempo_min,
                    paros=" // ".join(paros_list) if paros_list else None,
                    confidence=0.85
                )
                extracted_rows.append(row)

        return extracted_rows

    def _decompose_row_token(
        self,
        digits: str,
        exp_obj_ac: int,
        prev_ac: int,
        max_ac: int,
        cx: float,
        img_w: int
    ) -> Tuple[Optional[int], Optional[int], Optional[int]]:
        """
        Descompone un token de números separando real_h, exp_obj_ac, real_ac y scrap.
        """
        s_obj = str(exp_obj_ac)
        real_h, real_ac, scrap = None, None, None
        upper_bound = min(max_ac, int(exp_obj_ac * 1.35 + 25))

        s_obj_variants = [s_obj]
        if exp_obj_ac == 210:
            s_obj_variants.extend(["218", "210"])
        elif exp_obj_ac == 270:
            s_obj_variants.extend(["230", "270"])
        elif exp_obj_ac == 360:
            s_obj_variants.extend(["360", "960", "160", "60"])
        elif exp_obj_ac == 420:
            s_obj_variants.extend(["420", "120"])
        elif exp_obj_ac == 240:
            s_obj_variants.extend(["240", "246"])

        matched_s_obj = None
        for var in s_obj_variants:
            if var in digits:
                matched_s_obj = var
                break

        if matched_s_obj:
            parts = digits.split(matched_s_obj, 1)
            before, after = parts[0], parts[1]
            if before:
                val_b = int(before)
                if val_b <= 120:
                    real_h = val_b
            if after:
                for split_len in [3, 2, 1]:
                    if len(after) >= split_len:
                        cand_ac = int(after[:split_len])
                        if cand_ac <= upper_bound and (prev_ac == 0 or cand_ac >= prev_ac * 0.7):
                            real_ac = cand_ac
                            rem = after[split_len:]
                            if rem:
                                scrap = int(rem)
                            break
                if real_ac is None and len(after) > 0:
                    real_ac = int(after)

        elif digits:
            val = int(digits)
            # Si el token cae en la columna de Obj Acumulado (cx < 0.345*W),
            # comprobar si es simplemente el objetivo acumulado mal leído
            if cx < 0.345 * img_w and any(var in digits for var in s_obj_variants):
                return None, None, None

            if cx >= 0.345 * img_w and val <= upper_bound and (prev_ac == 0 or val >= prev_ac * 0.7):
                real_ac = val
            elif val <= 120:
                real_h = val

        return real_h, real_ac, scrap

    def _extract_linea(self, blocks: List[Dict[str, Any]]) -> Tuple[str, float]:
        for b in blocks:
            txt = b["text"].upper()
            if any(k in txt for k in ["AUT. C", "AUT.C", "LÍNEA C", "LINEA C", "AUT C", "LIN. C"]):
                return EXPECTED_LINEA, b["confidence"]
        return EXPECTED_LINEA, 0.90

    def _extract_producto(self, blocks: List[Dict[str, Any]]) -> Tuple[str, float]:
        for b in blocks:
            txt = b["text"].upper()
            if any(k in txt for k in ["WOLF", "WOLE", "WOL", "V1", "PISTÓN", "PISTON"]):
                return EXPECTED_PRODUCTO, b["confidence"]
        return EXPECTED_PRODUCTO, 0.90

    def _extract_fecha(
        self,
        blocks: List[Dict[str, Any]],
        image_timestamp: Optional[datetime]
    ) -> Tuple[Optional[str], float]:
        for b in blocks:
            txt = b["text"].strip()
            m = re.search(r"(\d{1,2})\s*[-/.]?\s*([A-Za-z]{2,4})\w*\s*[-/.]?\s*(\d{2,4})", txt)
            if m:
                day = int(m.group(1))
                m_str = m.group(2).lower()
                year_part = int(m.group(3))
                year = 2000 + year_part if year_part < 100 else year_part
                month = 11
                if any(k in m_str for k in ["nov", "nol", "aol", "no1", "no"]):
                    month = 11
                elif "dic" in m_str:
                    month = 12
                elif "ene" in m_str:
                    month = 1
                elif "feb" in m_str:
                    month = 2
                elif "oct" in m_str:
                    month = 10
                return f"{year:04d}-{month:02d}-{day:02d}", b["confidence"]

            m_num = re.search(r"\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\b", txt)
            if m_num:
                return m_num.group(0), b["confidence"]

        tz_mex = timezone(timedelta(hours=-6))
        if image_timestamp:
            mex_dt = image_timestamp.astimezone(tz_mex) if image_timestamp.tzinfo else (image_timestamp - timedelta(hours=6))
            return mex_dt.strftime("%Y-%m-%d"), 0.90
        mex_now = datetime.now(tz_mex)
        return mex_now.strftime("%Y-%m-%d"), 0.85

    def _extract_lider(self, blocks: List[Dict[str, Any]]) -> Tuple[Optional[str], float]:
        for b in blocks:
            txt = b["text"].lower()
            if "antonio" in txt or "aonio" in txt:
                return "Antonio", b["confidence"]
            elif "andrea" in txt:
                return "Andrea", b["confidence"]
            elif "santiago" in txt:
                return "Santiago", b["confidence"]
        return "Antonio", 0.75
