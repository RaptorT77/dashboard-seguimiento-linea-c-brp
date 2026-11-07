/**
 * =============================================================================
 * DASHBOARD DE SEGUIMIENTO LÍNEA C BRP — PLANTA KOLBEN SCHMIDT CELAYA
 * Archivo de Datos Sincronizados Automáticamente vía OCR Telegram
 * Estado: Turno 2 - Vespertino Inicializado | Meta: 450 uds
 * =============================================================================
 */

const BRP_DATA = {
  "planta": {
    "nombre": "BRP ROTAX MÉXICO S.A. de C.V.",
    "plantaId": "PLANTA KOLBEN SCHMIDT CELAYA - LÍNEA C",
    "linea": "Línea C — Ensamble y Mecanizado de Pistón WOLF V1",
    "versionSistema": "v2.7.0-OCR-LIVE",
    "updatedAt": "2026-11-07T22:55:58Z",
    "tiempoCicloTargetSeg": 45.0,
    "metaTurnoUnidades": 450,
    "supervisorActual": "Ing. Roberto Garza",
    "productoActual": "WOLF V1 (Pistón BRP)",
    "turnoActual": 2
  },
  "resumenKpis": {
    "produccionDia": 0,
    "metaDiaria": 450,
    "porcentajeAvance": 0.0,
    "unidadesCompletadas": 0,
    "unidadesPendientes": 450,
    "eficienciaOee": 0.0,
    "disponibilidad": 100.0,
    "rendimiento": 0.0,
    "calidadFpy": 100.0,
    "parosAcumuladosMin": 0,
    "eventosParo": 0,
    "taktTimeSeg": 45.0,
    "scrapPiezas": 0,
    "scrapPorcentaje": 0.0,
    "estadoLinea": "PRODUCCION_EN_ORDEN"
  },
  "turnos": [
    {
      "id": 1,
      "nombre": "Turno 1 - Matutino",
      "horario": "06:30 - 15:00",
      "supervisor": "Líder Antonia",
      "meta": 480,
      "real": 0,
      "oee": 0.0,
      "activo": false
    },
    {
      "id": 2,
      "nombre": "Turno 2 - Vespertino",
      "horario": "15:00 - 23:00",
      "supervisor": "Ing. Roberto Garza",
      "meta": 450,
      "real": 0,
      "oee": 0.0,
      "activo": true
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
      "hora": "15:00 - 16:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 60,
      "acumReal": 0,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "En espera de primer reporte Telegram"
    },
    {
      "hora": "16:00 - 17:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 120,
      "acumReal": 0,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "En espera de primer reporte Telegram"
    },
    {
      "hora": "17:00 - 18:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 180,
      "acumReal": 0,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "En espera de primer reporte Telegram"
    },
    {
      "hora": "18:00 - 19:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 240,
      "acumReal": 0,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "En espera de primer reporte Telegram"
    },
    {
      "hora": "19:00 - 20:00",
      "meta": 30,
      "real": 0,
      "acumMeta": 270,
      "acumReal": 0,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "En espera de primer reporte Telegram"
    },
    {
      "hora": "20:00 - 21:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 330,
      "acumReal": 0,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "En espera de primer reporte Telegram"
    },
    {
      "hora": "21:00 - 22:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 390,
      "acumReal": 0,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "En espera de primer reporte Telegram"
    },
    {
      "hora": "22:00 - 23:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 450,
      "acumReal": 0,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "En espera de primer reporte Telegram"
    }
  ],
  "parosIncidencias": [],
  "estaciones": [
    {
      "id": "OP10",
      "nombre": "Mecanizado de Falda y Corona WOLF V1",
      "equipo": "Torno / Centro CNC OP10",
      "operador": "Téc. Línea C",
      "metaPzas": 450,
      "buenasPzas": 0,
      "scrapPzas": 0,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Línea lista",
      "eficiencia": 100.0,
      "ultimaLiberacion": "--:--"
    },
    {
      "id": "OP20",
      "nombre": "Ranurado de Anillos y Barrenado de Perno",
      "equipo": "Ranuradora de Precisión OP20",
      "operador": "Téc. Línea C",
      "metaPzas": 450,
      "buenasPzas": 0,
      "scrapPzas": 0,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Línea lista",
      "eficiencia": 100.0,
      "ultimaLiberacion": "--:--"
    },
    {
      "id": "OP30",
      "nombre": "Lavado Térmico y Desengrase",
      "equipo": "Lavadora Ultrasónica OP30",
      "operador": "Téc. Línea C",
      "metaPzas": 450,
      "buenasPzas": 0,
      "scrapPzas": 0,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Línea lista",
      "eficiencia": 100.0,
      "ultimaLiberacion": "--:--"
    },
    {
      "id": "OP40",
      "nombre": "Acabado de Superficie / Recubrimiento",
      "equipo": "Cabina de Grafito / Moly OP40",
      "operador": "Téc. Línea C",
      "metaPzas": 450,
      "buenasPzas": 0,
      "scrapPzas": 0,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Línea lista",
      "eficiencia": 100.0,
      "ultimaLiberacion": "--:--"
    },
    {
      "id": "OP50",
      "nombre": "Inspección Dimensional Neumática",
      "equipo": "Gage de Aire Multidiametral OP50",
      "operador": "Téc. Calidad",
      "metaPzas": 450,
      "buenasPzas": 0,
      "scrapPzas": 0,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Línea lista",
      "eficiencia": 100.0,
      "ultimaLiberacion": "--:--"
    },
    {
      "id": "OP60",
      "nombre": "Inspección Final EOL & Marcado Láser",
      "equipo": "Estación de Visión y Embalaje OP60",
      "operador": "Téc. Calidad",
      "metaPzas": 450,
      "buenasPzas": 0,
      "scrapPzas": 0,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Línea lista",
      "eficiencia": 100.0,
      "ultimaLiberacion": "--:--"
    }
  ],
  "alertas": [
    {
      "id": "ALT-NEW-SHIFT",
      "tipo": "INFO",
      "titulo": "Turno 2 - Vespertino Iniciado — Línea C",
      "descripcion": "Dashboard limpio y preparado para Turno 2 - Vespertino (15:00 - 23:00). Meta programada: 450 unidades. En espera de la primera captura vía Telegram.",
      "estacion": "LÍNEA C COMPLETA",
      "hora": "15:00 - 16:00",
      "tiempoTranscurrido": "Inicio de Turno",
      "resuelta": true
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BRP_DATA;
}
