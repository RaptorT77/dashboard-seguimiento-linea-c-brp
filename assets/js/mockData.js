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
    "ordenTrabajo": "OT-2026-11-06-WOLF-V1",
    "turnoActual": 1
  },
  "resumenKpis": {
    "produccionDia": 185,
    "metaDiaria": 480,
    "porcentajeAvance": 38.5,
    "unidadesCompletadas": 185,
    "unidadesPendientes": 295,
    "eficienciaOee": 35.5,
    "disponibilidad": 93.5,
    "rendimiento": 38.5,
    "calidadFpy": 94.87,
    "parosAcumuladosMin": 0,
    "eventosParo": 0,
    "taktTimeSeg": 44.5,
    "scrapPiezas": 10,
    "scrapPorcentaje": 5.13,
    "estadoLinea": "OPERANDO"
  },
  "turnos": [
    {
      "id": 1,
      "nombre": "Turno 1 - Matutino",
      "horario": "06:30 - 15:00",
      "supervisor": "Antonia",
      "meta": 480,
      "real": 185,
      "oee": 89.2,
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
      "hora": "14:00 - 15:00",
      "meta": 60,
      "real": 30,
      "acumMeta": 480,
      "acumReal": 185,
      "oeeHora": 50.0,
      "parosMin": 0,
      "comentario": "Operación normal en Línea C"
    }
  ],
  "parosIncidencias": [
    {
      "id": "P-REG",
      "estacion": "OP10 - OP60",
      "causa": "Operación continua sin paros reportados en la última hora",
      "duracionMin": 0,
      "categoria": "Normal",
      "tipo": "Producción Continua",
      "hora": "14:00",
      "estatus": "OK"
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
      "scrapPzas": 1,
      "cicloSeg": 43.0,
      "estado": "OK",
      "buffer": "Buffer OK",
      "eficiencia": 96.0,
      "ultimaLiberacion": "15:00"
    },
    {
      "id": "OP20",
      "nombre": "Ranurado de Anillos y Barrenado de Perno",
      "equipo": "Ranuradora de Precisión OP20",
      "operador": "Téc. Línea C",
      "metaPzas": 480,
      "buenasPzas": 188,
      "scrapPzas": 10,
      "cicloSeg": 44.2,
      "estado": "OK",
      "buffer": "En proceso",
      "eficiencia": 94.5,
      "ultimaLiberacion": "15:00"
    },
    {
      "id": "OP30",
      "nombre": "Lavado Térmico y Desengrase",
      "equipo": "Lavadora Ultrasónica OP30",
      "operador": "Téc. Línea C",
      "metaPzas": 480,
      "buenasPzas": 187,
      "scrapPzas": 0,
      "cicloSeg": 42.0,
      "estado": "OK",
      "buffer": "En rack",
      "eficiencia": 98.0,
      "ultimaLiberacion": "15:00"
    },
    {
      "id": "OP40",
      "nombre": "Acabado de Superficie / Recubrimiento",
      "equipo": "Cabina de Grafito / Moly OP40",
      "operador": "Téc. Línea C",
      "metaPzas": 480,
      "buenasPzas": 186,
      "scrapPzas": 0,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Secado",
      "eficiencia": 95.0,
      "ultimaLiberacion": "15:00"
    },
    {
      "id": "OP50",
      "nombre": "Inspección Dimensional Neumática",
      "equipo": "Gage de Aire Multidiametral OP50",
      "operador": "Téc. Calidad",
      "metaPzas": 480,
      "buenasPzas": 185,
      "scrapPzas": 0,
      "cicloSeg": 43.5,
      "estado": "OK",
      "buffer": "Gage OK",
      "eficiencia": 97.5,
      "ultimaLiberacion": "15:00"
    },
    {
      "id": "OP60",
      "nombre": "Inspección Final EOL & Marcado Láser",
      "equipo": "Estación de Visión y Embalaje OP60",
      "operador": "Antonia",
      "metaPzas": 480,
      "buenasPzas": 185,
      "scrapPzas": 0,
      "cicloSeg": 42.5,
      "estado": "OK",
      "buffer": "Caja empaque",
      "eficiencia": 99.0,
      "ultimaLiberacion": "15:00"
    }
  ],
  "alertas": [
    {
      "id": "ALT-MALAS-1",
      "tipo": "CALIDAD",
      "titulo": "Registro de 10 Piezas Malas / Scrap",
      "descripcion": "Pizarra reporta 10 piezas no conformes en intervalo 14:00 - 15:00. Acumulado scrap turno: 10 pzas.",
      "estacion": "LÍNEA C",
      "hora": "15:00",
      "tiempoTranscurrido": "Última hora registrada",
      "resuelta": false
    },
    {
      "id": "ALT-SYNC-1",
      "tipo": "INFO",
      "titulo": "Pizarra Digitalizada — Última hora: 14:00 - 15:00",
      "descripcion": "Producto: WOLF V1 | Líder: Antonia | Pz Real: 30 uds | OK Acum: 185 uds.",
      "estacion": "PIZARRA LÍNEA C",
      "hora": "15:00",
      "tiempoTranscurrido": "En vivo",
      "resuelta": true
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BRP_DATA;
}
