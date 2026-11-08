"""
Motor de OCR Avanzado de Alta Precisión.
Combina RapidOCR (PP-OCRv4 ONNX) con escaneo multiespectral (Pase Dual BGR + Canal Rojo)
para capturar trazos de marcadores oscuros, verdes y celestes/cian sobre pizarras blancas industriales.
"""

import time
import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from rapidocr_onnxruntime import RapidOCR
from .config import MIN_OCR_CONFIDENCE_THRESHOLD


class OcrProcessor:
    """Procesador de OCR con cálculo de confianza espacial y mapeo de coordenadas."""

    def __init__(self):
        # Inicializa RapidOCR con soporte de detección, ángulo y reconocimiento
        self.engine = RapidOCR()

    def process_image(self, bgr_image: np.ndarray) -> Dict[str, Any]:
        """
        Ejecuta OCR sobre la imagen completa y genera bloques estructurados con centroides.
        Aplica un pase dual:
        1. Pase estándar BGR (excelente para marcadores negros y azules oscuros).
        2. Pase de Canal Rojo (excelente para marcadores celestes/cian y verdes que absorben luz roja).
        Combina los bloques resultantes para no perder información de ningún turno.
        """
        start_time = time.time()

        # Pase 1: Imagen BGR estándar
        blocks1, raw_lines1 = self._run_ocr_pass(bgr_image)

        # Pase 2: Canal Rojo (absorbe cian/celeste haciendo que resalte con alto contraste)
        b, g, r = cv2.split(bgr_image)
        red_3ch = cv2.merge([r, r, r])
        blocks2, raw_lines2 = self._run_ocr_pass(red_3ch)

        # Fusión espacial de bloques sin duplicar texto coincidente
        merged_blocks = list(blocks1)
        for b2 in blocks2:
            cx2, cy2 = b2["center"]
            # Si no existe ya un bloque a menos de 22 px en X y 16 px en Y
            already_present = any(
                abs(b1["center"][0] - cx2) < 24 and abs(b1["center"][1] - cy2) < 16
                for b1 in blocks1
            )
            if not already_present:
                merged_blocks.append(b2)

        elapsed_ms = (time.time() - start_time) * 1000.0

        raw_lines = [f"{b['text']} (conf: {b['confidence']:.2f})" for b in merged_blocks]
        raw_text = "\n".join(raw_lines)

        return {
            "blocks": merged_blocks,
            "raw_text": raw_text,
            "total_blocks": len(merged_blocks),
            "image_width": int(bgr_image.shape[1]),
            "image_height": int(bgr_image.shape[0]),
            "execution_time_ms": elapsed_ms
        }

    def _run_ocr_pass(self, img: np.ndarray) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Ejecuta una pasada de RapidOCR y extrae cajas y centroides."""
        results, _ = self.engine(img)
        blocks: List[Dict[str, Any]] = []
        raw_lines: List[str] = []

        if results:
            for item in results:
                box, text, score = item
                score_val = float(score) if score is not None else 0.0
                t_str = text.strip()
                if not t_str:
                    continue

                xs = [p[0] for p in box]
                ys = [p[1] for p in box]
                min_x, max_x = min(xs), max(xs)
                min_y, max_y = min(ys), max(ys)
                cx = (min_x + max_x) / 2.0
                cy = (min_y + max_y) / 2.0

                block = {
                    "text": t_str,
                    "confidence": score_val,
                    "box": box,
                    "bbox": [int(min_x), int(min_y), int(max_x - min_x), int(max_y - min_y)],
                    "center": (cx, cy),
                    "min_y": min_y,
                    "max_y": max_y,
                    "min_x": min_x,
                    "max_x": max_x
                }
                blocks.append(block)
                raw_lines.append(f"{t_str} (conf: {score_val:.2f})")

        return blocks, raw_lines

    def ocr_cell(self, cell_crop: np.ndarray) -> Tuple[str, float]:
        """Ejecuta OCR enfocado en una celda individual."""
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
