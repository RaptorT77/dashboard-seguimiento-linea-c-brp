import cv2
import json
from backend.ocr_processor import OcrProcessor
from backend.data_extractor import WhiteboardDataExtractor

extractor = WhiteboardDataExtractor()
ocr = OcrProcessor()
img_path = 'backend/storage/raw_images/20261108_040919_9df09abde333.jpg'
bgr = cv2.imread(img_path)
ocr_res = ocr.process_image(bgr)

rec = extractor.extract_latest_record(ocr_res)
print(f"Producto: {rec.producto}")
print(f"Linea: {rec.linea}")
print(f"Fecha: {rec.fecha}")
print(f"Lider: {rec.lider}")
print(f"Ultimo Horario Activo: {rec.horario} ({rec.turno})")
print(f"Total filas activas extraidas: {len(rec.all_hourly_rows)}")
print("\n--- FILAS EXTRAIDAS ---")
for r in rec.all_hourly_rows:
    print(f"  {r['horario']} (T{r['turno_num']}): Real={r['real_pz_hora']} | Acum={r['real_acumulado']} | Scrap={r['piezas_malas']} | Paros={r['paros']}")

