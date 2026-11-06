/**
 * =============================================================================
 * DASHBOARD DE SEGUIMIENTO LÍNEA C BRP — PLANTA KOLBEN SCHMIDT CELAYA
 * Archivo de Datos Sincronizados Automáticamente vía OCR Telegram
 * Última Hora Registrada: 14:00 - 15:00 | Producto: WOLF V1
 * =============================================================================
 */

const BRP_DATA = {
  "planta": {
    "nombre": "BRP ROTAX MÉXICO S.A. de C.V.",
    "plantaId": "PLANTA KOLBEN SCHMIDT CELAYA - LÍNEA C",
    "linea": "Línea C — Ensamble y Mecanizado de Pistón WOLF V1",
    "versionSistema": "v2.7.0-OCR-LIVE",
    "tiempoCicloTargetSeg": 45.0,
    "metaTurnoUnidades": 480,
    "supervisorActual": "Líder Antonia",
    "productoActual": "WOLF V1 (Pistón BRP)",
    "turnoActual": 1
  },
  "resumenKpis": {
    "produccionDia": 185,
    "metaDiaria": 480,
    "porcentajeAvance": 38.5,
    "unidadesCompletadas": 185,
    "unidadesPendientes": 295,
    "eficienciaOee": 33.7,
    "disponibilidad": 87.5,
    "rendimiento": 65.8,
    "calidadFpy": 58.54,
    "parosAcumuladosMin": 60,
    "eventosParo": 3,
    "taktTimeSeg": 58.2,
    "scrapPiezas": 131,
    "scrapPorcentaje": 41.46,
    "estadoLinea": "PRODUCCION_DEFICIENTE"
  },
  "turnos": [
    {
      "id": 1,
      "nombre": "Turno 1 - Matutino",
      "horario": "06:30 - 15:00",
      "supervisor": "Antonia",
      "meta": 480,
      "real": 185,
      "oee": 33.7,
      "activo": true
    },
    {
      "id": 2,
      "nombre": "Turno 2 - Vespertino",
      "horario": "15:00 - 23:00",
      "supervisor": "Ing. Roberto Garza",
      "meta": 450,
      "real": 0,
      "oee": 0.0,
      "activo": false
    },
    {
      "id": 3,
      "nombre": "Turno 3 - Nocturno",
      "horario": "23:00 - 06:30",
      "supervisor": "Ing. Diana Soto",
      "meta": 420,
      "real": 0,
      "oee": 0.0,
      "activo": false
    }
  ],
  "modelos": [
    {
      "id": "M01",
      "codigo": "PISTON-WOLF-V1",
      "nombre": "Pistón WOLF V1 (Línea C)",
      "cilindros": 1,
      "hp": 0,
      "plataforma": "BRP Rotax Engine Program",
      "activo": true
    }
  ],
  "produccionHoraria": [
    {
      "hora": "06:30 - 08:00",
      "meta": 90,
      "real": 96,
      "acumMeta": 90,
      "acumReal": 80,
      "oeeHora": 88.9,
      "parosMin": 0,
      "malas": 16,
      "comentario": "Inicio de turno, 16 pzas scrap"
    },
    {
      "hora": "08:00 - 09:00",
      "meta": 60,
      "real": 42,
      "acumMeta": 150,
      "acumReal": 100,
      "oeeHora": 70.0,
      "parosMin": 25,
      "malas": 22,
      "comentario": "* Golpe en cabeza op 20 (22 scrap)"
    },
    {
      "hora": "09:00 - 10:00",
      "meta": 60,
      "real": 19,
      "acumMeta": 210,
      "acumReal": 100,
      "oeeHora": 31.7,
      "parosMin": 20,
      "malas": 19,
      "comentario": "* Golpe en cabeza * marca de rebarba (19 scrap)"
    },
    {
      "hora": "10:00 - 11:00",
      "meta": 60,
      "real": 16,
      "acumMeta": 270,
      "acumReal": 100,
      "oeeHora": 26.7,
      "parosMin": 0,
      "malas": 16,
      "comentario": "Cadencia frenada, 16 scrap (estancado en 100 venta)"
    },
    {
      "hora": "11:00 - 12:00",
      "meta": 30,
      "real": 18,
      "acumMeta": 300,
      "acumReal": 100,
      "oeeHora": 60.0,
      "parosMin": 15,
      "malas": 18,
      "comentario": "Ajuste DNs en TF (18 scrap)"
    },
    {
      "hora": "12:00 - 13:00",
      "meta": 60,
      "real": 36,
      "acumMeta": 360,
      "acumReal": 120,
      "oeeHora": 60.0,
      "parosMin": 0,
      "malas": 16,
      "comentario": "Reinicio tras ajuste (16 scrap)"
    },
    {
      "hora": "13:00 - 14:00",
      "meta": 60,
      "real": 59,
      "acumMeta": 420,
      "acumReal": 165,
      "oeeHora": 98.3,
      "parosMin": 0,
      "malas": 14,
      "comentario": "Recuperación de cadencia (14 scrap)"
    },
    {
      "hora": "14:00 - 15:00",
      "meta": 60,
      "real": 30,
      "acumMeta": 480,
      "acumReal": 185,
      "oeeHora": 50.0,
      "parosMin": 0,
      "malas": 10,
      "comentario": "Cierre de Turno 1 con déficit severo (-295 uds)"
    }
  ],
  "parosIncidencias": [
    {
      "id": "P-01",
      "estacion": "OP20",
      "causa": "Golpe en cabeza OP 20 (22 pzas scrap)",
      "duracionMin": 25,
      "categoria": "Mecánico / Herramental",
      "tipo": "Incidencia Pizarra",
      "hora": "08:00",
      "estatus": "Reportado en Pizarra"
    },
    {
      "id": "P-02",
      "estacion": "OP20",
      "causa": "Golpe en cabeza * marca de rebarba (19 pzas scrap)",
      "duracionMin": 20,
      "categoria": "Calidad / Geometría",
      "tipo": "Incidencia Pizarra",
      "hora": "09:00",
      "estatus": "Reportado en Pizarra"
    },
    {
      "id": "P-03",
      "estacion": "TF",
      "causa": "Ajuste DNs en TF (18 pzas scrap)",
      "duracionMin": 15,
      "categoria": "Ajuste / Setup",
      "tipo": "Incidencia Pizarra",
      "hora": "11:00",
      "estatus": "Reportado en Pizarra"
    }
  ],
  "estaciones": [
    {
      "id": "OP10",
      "nombre": "Mecanizado de Falda y Corona WOLF V1",
      "equipo": "Torno / Centro CNC OP10",
      "operador": "Téc. Línea C",
      "metaPzas": 480,
      "buenasPzas": 190,
      "scrapPzas": 16,
      "cicloSeg": 44.0,
      "estado": "OK",
      "buffer": "Buffer OK",
      "eficiencia": 88.0,
      "ultimaLiberacion": "15:00"
    },
    {
      "id": "OP20",
      "nombre": "Ranurado de Anillos y Barrenado de Perno",
      "equipo": "Ranuradora de Precisión OP20",
      "operador": "Téc. Línea C",
      "metaPzas": 480,
      "buenasPzas": 145,
      "scrapPzas": 41,
      "cicloSeg": 55.0,
      "estado": "PEND",
      "buffer": "Paro / Scrap",
      "eficiencia": 52.0,
      "ultimaLiberacion": "15:00"
    },
    {
      "id": "OP30",
      "nombre": "Lavado Térmico y Desengrase",
      "equipo": "Lavadora Ultrasónica OP30",
      "operador": "Téc. Línea C",
      "metaPzas": 480,
      "buenasPzas": 188,
      "scrapPzas": 18,
      "cicloSeg": 43.0,
      "estado": "OK",
      "buffer": "En rack",
      "eficiencia": 85.0,
      "ultimaLiberacion": "15:00"
    },
    {
      "id": "OP40",
      "nombre": "Acabado de Superficie / Recubrimiento",
      "equipo": "Cabina de Grafito / Moly OP40",
      "operador": "Téc. Línea C",
      "metaPzas": 480,
      "buenasPzas": 186,
      "scrapPzas": 16,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Secado",
      "eficiencia": 82.0,
      "ultimaLiberacion": "15:00"
    },
    {
      "id": "OP50",
      "nombre": "Inspección Dimensional Neumática",
      "equipo": "Gage de Aire Multidiametral OP50",
      "operador": "Téc. Calidad",
      "metaPzas": 480,
      "buenasPzas": 185,
      "scrapPzas": 20,
      "cicloSeg": 46.0,
      "estado": "OK",
      "buffer": "Gage OK",
      "eficiencia": 80.0,
      "ultimaLiberacion": "15:00"
    },
    {
      "id": "OP60",
      "nombre": "Inspección Final EOL & Marcado Láser",
      "equipo": "Estación de Visión y Embalaje OP60",
      "operador": "Antonia",
      "metaPzas": 480,
      "buenasPzas": 185,
      "scrapPzas": 20,
      "cicloSeg": 44.5,
      "estado": "OK",
      "buffer": "Caja empaque",
      "eficiencia": 78.0,
      "ultimaLiberacion": "15:00"
    }
  ],
  "alertas": [
    {
      "id": "ALT-CRIT-META",
      "tipo": "CRITICA",
      "titulo": "Incumplimiento Crítico de Meta del Turno (-295 UDS)",
      "descripcion": "El Turno 1 cerró con 185 unidades de 480 programadas (38.5% de avance). Se acumula un déficit de 295 pistones WOLF V1.",
      "estacion": "LÍNEA C",
      "hora": "15:00",
      "tiempoTranscurrido": "Cierre de Turno",
      "resuelta": false
    },
    {
      "id": "ALT-SCRAP-131",
      "tipo": "CALIDAD",
      "titulo": "Alerta Roja por Scrap: 131 Piezas Defectuosas (41.5%)",
      "descripcion": "Total acumulado de 131 piezas malas en el turno (Pizarra: 'Scrap: 131'). El First Pass Yield (FPY) cayó a 58.54%.",
      "estacion": "LÍNEA C / OP20",
      "hora": "15:00",
      "tiempoTranscurrido": "Turno 1",
      "resuelta": false
    },
    {
      "id": "ALT-OP20-GOLPE",
      "tipo": "CRITICA",
      "titulo": "Falla Mayor en OP20: Golpe en Cabeza y Rebarba",
      "descripcion": "Reporte manuscrito en pizarra en intervalo 08:00-10:00: 'Golpe en cabeza op 20' y 'Marca de rebarba'. Causa raíz del scrap masivo.",
      "estacion": "OP20",
      "hora": "08:00 - 10:00",
      "tiempoTranscurrido": "Reportado",
      "resuelta": false
    },
    {
      "id": "ALT-TF-AJUSTE",
      "tipo": "ADVERTENCIA",
      "titulo": "Paro por Ajuste de Herramental en TF",
      "descripcion": "Ajuste de DNs en estación TF. Se detuvo la adición de venta neta acumulada entre 11:00 y 12:00 hrs.",
      "estacion": "TF / RANURADO",
      "hora": "11:00",
      "tiempoTranscurrido": "Reportado",
      "resuelta": true
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BRP_DATA;
}
