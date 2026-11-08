"""
Módulo de Preprocesamiento de Imágenes para Pizarras Industriales.
Corrige perspectiva, iluminación irregular, reflejos y mejora contraste.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Optional, Dict, Any
from .config import PROCESSED_IMAGES_DIR

PROCESSED_IMAGES_DIR.mkdir(parents=True, exist_ok=True)


class ImagePreprocessor:
    """Preprocesador avanzado basado en OpenCV para fotografías de piso de producción."""

    def __init__(self, debug_save: bool = True):
        self.debug_save = debug_save

    def validate_image(self, image_path: Path) -> Tuple[bool, str]:
        """Valida formato, integridad y dimensiones mínimas de la imagen."""
        if not image_path.exists():
            return False, f"El archivo no existe: {image_path}"

        size_bytes = image_path.stat().st_size
        if size_bytes == 0:
            return False, "El archivo está vacío (0 bytes)"
        if size_bytes > 25 * 1024 * 1024:
            return False, f"El archivo excede el tamaño máximo permitido (25MB): {size_bytes / 1024 / 1024:.2f}MB"

        img = cv2.imread(str(image_path))
        if img is None:
            return False, "No se pudo decodificar la imagen (formato no soportado o archivo corrupto)"

        h, w = img.shape[:2]
        if w < 250 or h < 250:
            return False, f"Resolución insuficiente para OCR ({w}x{h} px, mínimo 250x250)"

        return True, "Imagen válida"

    def preprocess(self, image_path: Path) -> Dict[str, Any]:
        """
        Ejecuta el pipeline completo de preprocesamiento sobre la imagen.
        Retorna diccionario con imagen original, recortada, mejorada y metadatos.
        """
        valid, msg = self.validate_image(image_path)
        if not valid:
            raise ValueError(f"Error de validación de imagen: {msg}")

        img = cv2.imread(str(image_path))
        h_orig, w_orig = img.shape[:2]

        # Redimensionar si la imagen es excesivamente grande para evitar OOM (Out Of Memory) en servidores cloud (512MB RAM)
        MAX_DIM = 1600
        if max(h_orig, w_orig) > MAX_DIM:
            scale = MAX_DIM / float(max(h_orig, w_orig))
            new_w = int(w_orig * scale)
            new_h = int(h_orig * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

        # 1. Corrección de orientación y detección de contorno de la pizarra
        board_crop, bbox = self._detect_and_crop_board(img)

        # 2. Mejora de contraste con CLAHE (Contrast Limited Adaptive Histogram Equalization)
        enhanced_bgr, enhanced_gray = self._enhance_contrast(board_crop)

        # 3. Binarización adaptativa para texto
        adaptive_thresh = self._adaptive_binarization(enhanced_gray)

        # 4. Guardar imagen procesada si está habilitado
        processed_path = None
        if self.debug_save:
            output_filename = f"{image_path.stem}_prep.jpg"
            processed_path = PROCESSED_IMAGES_DIR / output_filename
            cv2.imwrite(str(processed_path), board_crop)

        return {
            "original_shape": (w_orig, h_orig),
            "board_crop": board_crop,
            "enhanced_bgr": enhanced_bgr,
            "enhanced_gray": enhanced_gray,
            "adaptive_thresh": adaptive_thresh,
            "crop_bbox": bbox,
            "processed_image_path": str(processed_path) if processed_path else None
        }

    def _detect_and_crop_board(self, img: np.ndarray) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
        """
        Detecta los límites de la pizarra blanca para eliminar el fondo de nave industrial.
        Si la detección no es concluyente, utiliza el encuadre central con margen seguro.
        """
        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Detección de zonas claras (la pizarra blanca es la mayor masa de brillo)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blur, 150, 255, cv2.THRESH_BINARY)

        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        best_box = None
        max_area = 0

        for c in contours:
            area = cv2.contourArea(c)
            if area > (w * h * 0.25):  # Al menos 25% del encuadre
                x, y, bw, bh = cv2.boundingRect(c)
                # La pizarra suele ser rectangular vertical o cuadrada
                if bh > (h * 0.4) and bw > (w * 0.4):
                    if area > max_area:
                        max_area = area
                        best_box = (x, y, bw, bh)

        if best_box:
            bx, by, bw, bh = best_box
            # Añadir margen de seguridad
            x1 = max(0, bx - 10)
            y1 = max(0, by - 10)
            x2 = min(w, bx + bw + 10)
            y2 = min(h, by + bh + 10)
            return img[y1:y2, x1:x2], (x1, y1, x2 - x1, y2 - y1)

        # Fallback a recorte proporcional de seguridad
        # Descarta el 8% superior y 18% inferior (piso / soporte) y 4% lateral
        y1 = int(h * 0.08)
        y2 = int(h * 0.82)
        x1 = int(w * 0.03)
        x2 = int(w * 0.97)
        return img[y1:y2, x1:x2], (x1, y1, x2 - x1, y2 - y1)

    def _enhance_contrast(self, bgr_img: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Aplica ecualización adaptativa CLAHE en canal L de espacio LAB."""
        lab = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)

        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        l_clahe = clahe.apply(l)

        enhanced_lab = cv2.merge((l_clahe, a, b))
        enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
        enhanced_gray = cv2.cvtColor(enhanced_bgr, cv2.COLOR_BGR2GRAY)

        return enhanced_bgr, enhanced_gray

    def _adaptive_binarization(self, gray_img: np.ndarray) -> np.ndarray:
        """Binarización adaptativa para separar trazos de marcadores del fondo."""
        # Filtro bilateral para preservar bordes y reducir ruido
        filtered = cv2.bilateralFilter(gray_img, 9, 75, 75)
        thresh = cv2.adaptiveThreshold(
            filtered, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 19, 8
        )
        return thresh

