"""
Motor de OCR Avanzado de Alta Precisión.
Combina RapidOCR (PP-OCRv4 ONNX) con extracción de cuadrícula y soporte para Vision LLM.
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
        """
        start_time = time.time()
        results, _ = self.engine(bgr_image)
        elapsed_ms = (time.time() - start_time) * 1000.0

        blocks: List[Dict[str, Any]] = []
        raw_lines: List[str] = []

        if results:
            for item in results:
                box, text, score = item
                score_val = float(score) if score is not None else 0.0

                # Calcular centroide y límites de la caja
                xs = [p[0] for p in box]
                ys = [p[1] for p in box]
                min_x, max_x = min(xs), max(xs)
                min_y, max_y = min(ys), max(ys)
                cx = (min_x + max_x) / 2.0
                cy = (min_y + max_y) / 2.0

                block = {
                    "text": text.strip(),
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
                raw_lines.append(f"{text} (conf: {score_val:.2f})")

        raw_text = "\n".join(raw_lines)

        return {
            "blocks": blocks,
            "raw_text": raw_text,
            "total_blocks": len(blocks),
            "execution_time_ms": elapsed_ms
        }

    def ocr_cell(self, cell_crop: np.ndarray) -> Tuple[str, float]:
        """
        Ejecuta OCR enfocado en una celda individual aplicando acolchado y escalado 3x.
        """
        if cell_crop is None or cell_crop.size == 0:
            return "", 0.0

        # Agregar borde blanco para evitar que los dígitos toquen el límite
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
