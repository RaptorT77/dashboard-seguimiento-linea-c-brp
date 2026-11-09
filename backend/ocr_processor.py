"""
Motor de OCR Avanzado de Alta Precisión Multiespectral para Pizarras BRP.
Combina RapidOCR (PP-OCRv4 ONNX) con escaneo multicanal (BGR + Canal Verde + Grayscale CLAHE)
y análisis focalizado en cabecera y cuadrícula de producción para capturar trazos
en tinta negra, azul, morada y roja.
"""

import time
import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from rapidocr_onnxruntime import RapidOCR
from .config import MIN_OCR_CONFIDENCE_THRESHOLD


class OcrProcessor:
    """Procesador de OCR multiespectral con cálculo de confianza espacial y mapeo de coordenadas."""

    def __init__(self):
        self.engine = RapidOCR()

    def process_image(self, bgr_image: np.ndarray) -> Dict[str, Any]:
        """
        Ejecuta OCR sobre la imagen completa y sub-regiones críticas con múltiples canales:
        1. Pase BGR imagen completa.
        2. Pase cabecera (Fecha, Modelo, Línea).
        3. Pase cuadrícula tabla BGR.
        4. Pase cuadrícula tabla Canal Verde (absorbe tinta morada/púrpura, haciéndola negra con alto contraste).
        5. Pase cuadrícula tabla Grayscale CLAHE (realza tinta roja de scrap y trazos tenues).
        6. Pase columna de incidencias/paros.
        Combina y desduplica espacialmente todos los bloques detectados.
        """
        start_time = time.time()
        H, W = bgr_image.shape[:2]

        all_blocks: List[Dict[str, Any]] = []

        # 1. Pase BGR completo
        b_full = self._run_pass(bgr_image, 0, 0, "FULL_BGR")
        all_blocks.extend(b_full)

        # 2. Pase de cabecera (y: 0..22% H, x: 25%..100% W)
        head_x1, head_y1 = int(0.20 * W), 0
        head_x2, head_y2 = W, int(0.25 * H)
        head_crop = bgr_image[head_y1:head_y2, head_x1:head_x2]
        if head_crop.size > 0:
            b_head = self._run_pass(head_crop, head_x1, head_y1, "HEADER")
            all_blocks.extend(b_head)

        # 3. Región de tabla numérica (y: 14%..98% H, x: 4%..58% W)
        tbl_x1, tbl_y1 = int(0.04 * W), int(0.14 * H)
        tbl_x2, tbl_y2 = int(0.58 * W), int(0.98 * H)
        table_crop = bgr_image[tbl_y1:tbl_y2, tbl_x1:tbl_x2]

        if table_crop.size > 0:
            # 3a. Tabla BGR
            all_blocks.extend(self._run_pass(table_crop, tbl_x1, tbl_y1, "TBL_BGR"))

            # 3b. Canal Verde (Purple Marker absorber)
            b, g, r = cv2.split(table_crop)
            green_3ch = cv2.merge([g, g, g])
            all_blocks.extend(self._run_pass(green_3ch, tbl_x1, tbl_y1, "TBL_GREEN"))

            # 3c. Grayscale con CLAHE (Red Marker / Scrap enhancer)
            gray = cv2.cvtColor(table_crop, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            cl_enhanced = clahe.apply(gray)
            cl_3ch = cv2.cvtColor(cl_enhanced, cv2.COLOR_GRAY2BGR)
            all_blocks.extend(self._run_pass(cl_3ch, tbl_x1, tbl_y1, "TBL_CLAHE"))

        # 4. Región de Paros / Incidencias (y: 15%..98% H, x: 50%..98% W)
        paros_x1, paros_y1 = int(0.50 * W), int(0.14 * H)
        paros_x2, paros_y2 = int(0.98 * W), int(0.98 * H)
        paros_crop = bgr_image[paros_y1:paros_y2, paros_x1:paros_x2]
        if paros_crop.size > 0:
            all_blocks.extend(self._run_pass(paros_crop, paros_x1, paros_y1, "PAROS_BGR"))
            # Canal rojo para marcadores celestes/cian de paros
            b, g, r = cv2.split(paros_crop)
            red_3ch = cv2.merge([r, r, r])
            all_blocks.extend(self._run_pass(red_3ch, paros_x1, paros_y1, "PAROS_RED"))

        # Fusión y desduplicación espacial inteligente
        # Si dos bloques están a menos de 18px en X y 14px en Y, se conserva el de mayor confianza
        merged_blocks: List[Dict[str, Any]] = []
        for blk in all_blocks:
            cx, cy = blk["center"]
            dup_idx = None
            for idx, existing in enumerate(merged_blocks):
                ex_cx, ex_cy = existing["center"]
                if abs(cx - ex_cx) < 18 and abs(cy - ex_cy) < 14:
                    dup_idx = idx
                    break

            if dup_idx is not None:
                if blk["confidence"] > merged_blocks[dup_idx]["confidence"]:
                    merged_blocks[dup_idx] = blk
            else:
                merged_blocks.append(blk)

        elapsed_ms = (time.time() - start_time) * 1000.0

        raw_lines = [f"{b['text']} (conf: {b['confidence']:.2f})" for b in merged_blocks]
        raw_text = "\n".join(raw_lines)

        return {
            "blocks": merged_blocks,
            "raw_text": raw_text,
            "total_blocks": len(merged_blocks),
            "image_width": int(W),
            "image_height": int(H),
            "execution_time_ms": elapsed_ms
        }

    def _run_pass(
        self, img: np.ndarray, offset_x: int, offset_y: int, pass_name: str
    ) -> List[Dict[str, Any]]:
        """Ejecuta una pasada de RapidOCR y traslada las coordenadas al espacio global."""
        results, _ = self.engine(img)
        blocks: List[Dict[str, Any]] = []

        if results:
            for item in results:
                box, text, score = item
                score_val = float(score) if score is not None else 0.0
                t_str = text.strip()
                if not t_str:
                    continue

                xs = [p[0] + offset_x for p in box]
                ys = [p[1] + offset_y for p in box]
                min_x, max_x = min(xs), max(xs)
                min_y, max_y = min(ys), max(ys)
                cx = (min_x + max_x) / 2.0
                cy = (min_y + max_y) / 2.0

                block = {
                    "text": t_str,
                    "confidence": score_val,
                    "box": [[p[0] + offset_x, p[1] + offset_y] for p in box],
                    "bbox": [int(min_x), int(min_y), int(max_x - min_x), int(max_y - min_y)],
                    "center": (cx, cy),
                    "min_y": min_y,
                    "max_y": max_y,
                    "min_x": min_x,
                    "max_x": max_x,
                    "source_pass": pass_name
                }
                blocks.append(block)

        return blocks

    def ocr_cell(self, cell_crop: np.ndarray) -> Tuple[str, float]:
        """Ejecuta OCR enfocado en una celda individual con relleno y reescalado."""
        if cell_crop is None or cell_crop.size == 0:
            return "", 0.0

        padded = cv2.copyMakeBorder(
            cell_crop, 16, 16, 16, 16, cv2.BORDER_CONSTANT, value=[255, 255, 255]
        )
        scaled = cv2.resize(padded, (0, 0), fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)

        results, _ = self.engine(scaled)
        if results and len(results) > 0:
            text = results[0][1].strip()
            score = float(results[0][2])
            return text, score

        return "", 0.0
