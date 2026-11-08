import json
from pathlib import Path
from backend.pipeline import WhiteboardProcessingPipeline

pipeline = WhiteboardProcessingPipeline()
img_path = Path('backend/storage/raw_images/20261108_040919_9df09abde333.jpg')

result = pipeline.process_image_file(
    source_image_path=img_path,
    chat_id="123456",
    user_id="tony",
    username="Tony"
)

print("\n--- RESULTADO DE PIPELINE ---")
print(f"Success: {result.get('success')}")
print(f"Validation Status: {result.get('validation_status')}")
print(f"Total Rows Extracted: {result.get('total_rows_extracted')}")
print(f"Dashboard Synced: {result.get('dashboard_synced')}")

fields = result.get('extracted_fields', {})
print(f"Horario: {fields.get('horario')}")
print(f"Turno: {fields.get('turno')}")
print(f"Real Hora: {fields.get('real_pz_hora')}")
print(f"Real Acumulado: {fields.get('real_acumulado')}")
print(f"Scrap: {fields.get('piezas_malas')}")

# Verify production_data.json
with open('data/production_data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

k = d['resumenKpis']
print("\n--- RESUMEN KPIS EN DASHBOARD ---")
print(f"Produccion Real Dia: {k['produccionDia']} / {k['metaDiaria']} ({k['porcentajeAvance']}%)")
print(f"Unidades Completadas: {k['unidadesCompletadas']} | Pendientes: {k['unidadesPendientes']}")
print(f"Scrap Total: {k['scrapPiezas']} pzas ({k['scrapPorcentaje']}%)")
print(f"Paros Minutos: {k['parosAcumuladosMin']} min | Eventos: {k['eventosParo']}")
print(f"OEE Global: {k['eficienciaOee']}% | Estado: {k['estadoLinea']}")

print("\n--- TURNOS ---")
for t in d['turnos']:
    print(f"  {t['nombre']}: Real={t['real']}/{t['meta']} ({t['oee']}%) | Activo={t['activo']}")

