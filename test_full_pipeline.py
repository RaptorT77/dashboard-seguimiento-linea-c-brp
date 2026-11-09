import json
from pathlib import Path
from backend.database import SessionLocal
from backend.models import HourlyProductionRecord, RawImage
from backend.pipeline import WhiteboardProcessingPipeline

# Reset db for clean test
db = SessionLocal()
db.query(HourlyProductionRecord).delete()
db.query(RawImage).delete()
db.commit()
db.close()

pipeline = WhiteboardProcessingPipeline()

print("==================== EXECUTING FULL PIPELINE TEST (8-NOV) ====================")
img_path = Path("backend/storage/raw_images/test_8nov.jpg")
result = pipeline.process_image_file(img_path)

print(f"Success: {result['success']}")
print(f"Is duplicate: {result.get('is_duplicate', False)}")
print(f"Validation Status: {result['validation_status']}")
print(f"Total Rows Extracted: {result['total_rows_extracted']}")

fields = result["extracted_fields"]
print("\nExtracted Fields:")
print(f"  Fecha: {fields['fecha']}")
print(f"  Línea: {fields['linea']}")
print(f"  Producto: {fields['producto']}")
print(f"  Líder: {fields['lider']}")
print(f"  Horario Activo: {fields['horario']}")
print(f"  Real Hora: {fields['real_pz_hora']} / Obj: {fields['obj_pz_hora']}")
print(f"  Acumulado Turno: {fields['real_acumulado']} / Meta: {fields['obj_acumulado']}")
print(f"  Piezas Malas: {fields['piezas_malas']}")

# Inspect mockData.js and production_data.json
with open("data/production_data.json", "r", encoding="utf-8") as f:
    p_data = json.load(f)

planta = p_data.get("planta", {})
kpis = p_data.get("resumenKpis", {})
horarias = p_data.get("produccion24h", [])

print("\n=== DASHBOARD JSON SYNC VERIFICATION ===")
print(f"Fecha en Dashboard: {planta.get('fechaProduccion')}")
print(f"Líder Actual: {planta.get('supervisorActual')}")
print(f"Turno Actual: {planta.get('turnoActual')}")
print(f"Producción Real Día: {kpis.get('produccionDia')} / {kpis.get('metaDiaria')} ({kpis.get('porcentajeAvance')}%)")
print(f"Scrap Total: {kpis.get('scrapPiezas')} pzas ({kpis.get('scrapPorcentaje')}%)")
print(f"Total horas acumuladas en gráfica 24H: {len(horarias)}")

for h in horarias[:12]:
    print(f"  [{h['horario']}] Real: {h['real']:3d} | Meta: {h['meta']:3d} | Acum Real: {h['acumuladoReal']:3d} | Scrap: {h.get('scrap', 0)}")

# Test duplicate detection by re-submitting the same image!
print("\n==================== TESTING DUPLICATE DETECTION ====================")
dup_result = pipeline.process_image_file(img_path)
print(f"Second submission is_duplicate: {dup_result.get('is_duplicate')}")
print(f"Validation status: {dup_result.get('validation_status')}")
print(f"Dashboard synced on duplicate: {dup_result.get('dashboard_synced')}")
