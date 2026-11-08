/**
 * =============================================================================
 * DASHBOARD DE SEGUIMIENTO LÍNEA C BRP — PLANTA KOLBEN SCHMIDT CELAYA
 * Sincronización Automática 24H — Acumulado Continuo 0:00 a 24:00 hrs
 * Última Actualización: 2026-11-08 22:36:47 UTC
 * =============================================================================
 */

const BRP_DATA = {
  "planta": {
    "nombre": "BRP ROTAX MÉXICO S.A. de C.V.",
    "plantaId": "PLANTA KOLBEN SCHMIDT CELAYA - LÍNEA C",
    "linea": "Línea C — Ensamble y Mecanizado de Pistón WOLF V1",
    "versionSistema": "v3.0.0-24H-LIVE",
    "updatedAt": "2026-11-08T22:36:47Z",
    "fechaProduccion": "2026-11-08",
    "tiempoCicloTargetSeg": 45.0,
    "metaTurnoUnidades": 450,
    "supervisorActual": "Líder Antonia",
    "productoActual": "WOLF V1 (Pistón BRP)",
    "turnoActual": 2
  },
  "resumenKpis": {
    "produccionDia": 365,
    "metaDiaria": 1350,
    "porcentajeAvance": 27.0,
    "unidadesCompletadas": 365,
    "unidadesPendientes": 985,
    "eficienciaOee": 20.9,
    "disponibilidad": 60.9,
    "rendimiento": 42.0,
    "calidadFpy": 81.7,
    "parosAcumuladosMin": 305,
    "eventosParo": 7,
    "taktTimeSeg": 58.2,
    "scrapPiezas": 82,
    "scrapPorcentaje": 18.3,
    "estadoLinea": "PRODUCCION_DEFICIENTE"
  },
  "turnos": [
    {
      "id": 1,
      "nombre": "Turno 1 - Matutino",
      "horario": "06:30 - 15:00",
      "supervisor": "Líder Antonia",
      "meta": 480,
      "real": 285,
      "oee": 59.4,
      "activo": false
    },
    {
      "id": 2,
      "nombre": "Turno 2 - Vespertino",
      "horario": "15:00 - 23:00",
      "supervisor": "Ing. Roberto Garza",
      "meta": 450,
      "real": 80,
      "oee": 17.8,
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
      "hora": "06:30 - 08:00",
      "turno": "Turno 1 - Matutino",
      "turnoNum": 1,
      "meta": 90,
      "real": 107,
      "acumMeta": 90,
      "acumReal": 100,
      "oeeHora": 100.0,
      "parosMin": 0,
      "malas": 7,
      "comentario": "Ruptura hta de caja // Retrabajo // Ajustes"
    },
    {
      "hora": "08:00 - 09:00",
      "turno": "Turno 1 - Matutino",
      "turnoNum": 1,
      "meta": 60,
      "real": 63,
      "acumMeta": 150,
      "acumReal": 150,
      "oeeHora": 100.0,
      "parosMin": 0,
      "malas": 13,
      "comentario": "Ajustes x ruptura hta desbaste y acabado"
    },
    {
      "hora": "09:00 - 10:00",
      "turno": "Turno 1 - Matutino",
      "turnoNum": 1,
      "meta": 60,
      "real": 31,
      "acumMeta": 210,
      "acumReal": 175,
      "oeeHora": 51.7,
      "parosMin": 40,
      "malas": 6,
      "comentario": "Cambio de bujes de brazo por despostillado"
    },
    {
      "hora": "10:00 - 11:00",
      "turno": "Turno 1 - Matutino",
      "turnoNum": 1,
      "meta": 60,
      "real": 58,
      "acumMeta": 270,
      "acumReal": 220,
      "oeeHora": 96.7,
      "parosMin": 0,
      "malas": 13,
      "comentario": "Producción regular"
    },
    {
      "hora": "11:00 - 12:00",
      "turno": "Turno 1 - Matutino",
      "turnoNum": 1,
      "meta": 30,
      "real": 0,
      "acumMeta": 300,
      "acumReal": 220,
      "oeeHora": 0.0,
      "parosMin": 30,
      "malas": 0,
      "comentario": "Comedor"
    },
    {
      "hora": "12:00 - 13:00",
      "turno": "Turno 1 - Matutino",
      "turnoNum": 1,
      "meta": 60,
      "real": 0,
      "acumMeta": 360,
      "acumReal": 220,
      "oeeHora": 0.0,
      "parosMin": 40,
      "malas": 0,
      "comentario": "Cambio de espárragos de brazo // Variación diam. P.S. Ajuste"
    },
    {
      "hora": "13:00 - 14:00",
      "turno": "Turno 1 - Matutino",
      "turnoNum": 1,
      "meta": 60,
      "real": 27,
      "acumMeta": 420,
      "acumReal": 240,
      "oeeHora": 45.0,
      "parosMin": 40,
      "malas": 7,
      "comentario": "c/molde, ajustes"
    },
    {
      "hora": "14:00 - 15:00",
      "turno": "Turno 1 - Matutino",
      "turnoNum": 1,
      "meta": 60,
      "real": 49,
      "acumMeta": 480,
      "acumReal": 285,
      "oeeHora": 81.7,
      "parosMin": 40,
      "malas": 5,
      "comentario": "Ajuste de alabeo P.S."
    },
    {
      "hora": "15:00 - 16:00",
      "turno": "Turno 2 - Vespertino",
      "turnoNum": 2,
      "meta": 60,
      "real": 17,
      "acumMeta": 540,
      "acumReal": 301,
      "oeeHora": 28.3,
      "parosMin": 15,
      "malas": 1,
      "comentario": "Break"
    },
    {
      "hora": "16:00 - 17:00",
      "turno": "Turno 2 - Vespertino",
      "turnoNum": 2,
      "meta": 60,
      "real": 49,
      "acumMeta": 600,
      "acumReal": 346,
      "oeeHora": 81.7,
      "parosMin": 100,
      "malas": 4,
      "comentario": "Falla de lavadora, no da ciclo de lavado por falta de sensor de puerta"
    },
    {
      "hora": "17:00 - 18:00",
      "turno": "Turno 2 - Vespertino",
      "turnoNum": 2,
      "meta": 60,
      "real": 71,
      "acumMeta": 660,
      "acumReal": 401,
      "oeeHora": 100.0,
      "parosMin": 0,
      "malas": 16,
      "comentario": "Ajustes de proceso"
    },
    {
      "hora": "18:00 - 19:00",
      "turno": "Turno 2 - Vespertino",
      "turnoNum": 2,
      "meta": 60,
      "real": 0,
      "acumMeta": 720,
      "acumReal": 401,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Ajuste de línea (anulado en pizarra)"
    },
    {
      "hora": "19:00 - 20:00",
      "turno": "Turno 2 - Vespertino",
      "turnoNum": 2,
      "meta": 30,
      "real": 5,
      "acumMeta": 750,
      "acumReal": 317,
      "oeeHora": 16.7,
      "parosMin": 0,
      "malas": 2,
      "comentario": "Producción en curso"
    },
    {
      "hora": "20:00 - 21:00",
      "turno": "Turno 2 - Vespertino",
      "turnoNum": 2,
      "meta": 60,
      "real": 0,
      "acumMeta": 810,
      "acumReal": 317,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Sin incidencias reportadas"
    },
    {
      "hora": "21:00 - 22:00",
      "turno": "Turno 2 - Vespertino",
      "turnoNum": 2,
      "meta": 60,
      "real": 56,
      "acumMeta": 870,
      "acumReal": 365,
      "oeeHora": 93.3,
      "parosMin": 0,
      "malas": 8,
      "comentario": "Producción en curso"
    },
    {
      "hora": "22:00 - 23:00",
      "turno": "Turno 2 - Vespertino",
      "turnoNum": 2,
      "meta": 60,
      "real": 0,
      "acumMeta": 930,
      "acumReal": 365,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora programada / Por fabricar"
    },
    {
      "hora": "23:00 - 24:00",
      "turno": "Turno 3 - Nocturno",
      "turnoNum": 3,
      "meta": 60,
      "real": 0,
      "acumMeta": 990,
      "acumReal": 365,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora programada / Por fabricar"
    },
    {
      "hora": "24:00 - 01:00",
      "turno": "Turno 3 - Nocturno",
      "turnoNum": 3,
      "meta": 60,
      "real": 0,
      "acumMeta": 1050,
      "acumReal": 365,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora programada / Por fabricar"
    },
    {
      "hora": "01:00 - 02:00",
      "turno": "Turno 3 - Nocturno",
      "turnoNum": 3,
      "meta": 60,
      "real": 0,
      "acumMeta": 1110,
      "acumReal": 365,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora programada / Por fabricar"
    },
    {
      "hora": "02:00 - 03:00",
      "turno": "Turno 3 - Nocturno",
      "turnoNum": 3,
      "meta": 60,
      "real": 0,
      "acumMeta": 1170,
      "acumReal": 365,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora programada / Por fabricar"
    },
    {
      "hora": "03:00 - 04:00",
      "turno": "Turno 3 - Nocturno",
      "turnoNum": 3,
      "meta": 30,
      "real": 0,
      "acumMeta": 1200,
      "acumReal": 365,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora programada / Por fabricar"
    },
    {
      "hora": "04:00 - 05:00",
      "turno": "Turno 3 - Nocturno",
      "turnoNum": 3,
      "meta": 60,
      "real": 0,
      "acumMeta": 1260,
      "acumReal": 365,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora programada / Por fabricar"
    },
    {
      "hora": "05:00 - 06:30",
      "turno": "Turno 3 - Nocturno",
      "turnoNum": 3,
      "meta": 90,
      "real": 0,
      "acumMeta": 1350,
      "acumReal": 365,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora programada / Por fabricar"
    }
  ],
  "parosIncidencias": [
    {
      "id": "P-01",
      "estacion": "OP30",
      "causa": "Cambio de bujes de brazo por despostillado",
      "duracionMin": 40,
      "categoria": "Herramental",
      "tipo": "Incidencia Pizarra",
      "hora": "09:00 - 10:00",
      "estatus": "Reportado en Pizarra"
    },
    {
      "id": "P-02",
      "estacion": "OP30",
      "causa": "Comedor",
      "duracionMin": 30,
      "categoria": "Operación / Descanso",
      "tipo": "Incidencia Pizarra",
      "hora": "11:00 - 12:00",
      "estatus": "Reportado en Pizarra"
    },
    {
      "id": "P-03",
      "estacion": "OP30",
      "causa": "Cambio de espárragos de brazo // Variación diam. P.S. Ajuste",
      "duracionMin": 40,
      "categoria": "Mecánico",
      "tipo": "Incidencia Pizarra",
      "hora": "12:00 - 13:00",
      "estatus": "Reportado en Pizarra"
    },
    {
      "id": "P-04",
      "estacion": "OP30",
      "causa": "c/molde, ajustes",
      "duracionMin": 40,
      "categoria": "Herramental",
      "tipo": "Incidencia Pizarra",
      "hora": "13:00 - 14:00",
      "estatus": "Reportado en Pizarra"
    },
    {
      "id": "P-05",
      "estacion": "OP30",
      "causa": "Ajuste de alabeo P.S.",
      "duracionMin": 40,
      "categoria": "Calibración",
      "tipo": "Incidencia Pizarra",
      "hora": "14:00 - 15:00",
      "estatus": "Reportado en Pizarra"
    },
    {
      "id": "P-06",
      "estacion": "OP20",
      "causa": "Break",
      "duracionMin": 15,
      "categoria": "Operación / Descanso",
      "tipo": "Incidencia Pizarra",
      "hora": "15:00 - 16:00",
      "estatus": "Reportado en Pizarra"
    },
    {
      "id": "P-07",
      "estacion": "OP20",
      "causa": "Falla de lavadora, no da ciclo de lavado por falta de sensor de puerta",
      "duracionMin": 100,
      "categoria": "Mantenimiento / Equipo",
      "tipo": "Incidencia Pizarra",
      "hora": "16:00 - 17:00",
      "estatus": "Reportado en Pizarra"
    }
  ],
  "estaciones": [
    {
      "id": "OP10",
      "nombre": "Mecanizado de Falda y Corona WOLF V1",
      "equipo": "Torno / Centro CNC OP10",
      "operador": "Téc. Línea C",
      "metaPzas": 1350,
      "buenasPzas": 365,
      "scrapPzas": 0,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Buffer OK",
      "eficiencia": 35.9,
      "ultimaLiberacion": "22:00"
    },
    {
      "id": "OP20",
      "nombre": "Ranurado de Anillos y Barrenado de Perno",
      "equipo": "Ranuradora de Precisión OP20",
      "operador": "Téc. Línea C",
      "metaPzas": 1350,
      "buenasPzas": 365,
      "scrapPzas": 0,
      "cicloSeg": 48.0,
      "estado": "OK",
      "buffer": "Buffer OK",
      "eficiencia": 30.9,
      "ultimaLiberacion": "22:00"
    },
    {
      "id": "OP30",
      "nombre": "Lavado Térmico y Ranurado de Precisión",
      "equipo": "Ranuradora / Lavadora OP30",
      "operador": "Téc. OP30",
      "metaPzas": 1350,
      "buenasPzas": 365,
      "scrapPzas": 82,
      "cicloSeg": 120.0,
      "estado": "PARO",
      "buffer": "Atención de paros reportados",
      "eficiencia": 10.899999999999999,
      "ultimaLiberacion": "22:00"
    },
    {
      "id": "OP40",
      "nombre": "Acabado de Superficie / Recubrimiento",
      "equipo": "Cabina de Grafito / Moly OP40",
      "operador": "Téc. Línea C",
      "metaPzas": 1350,
      "buenasPzas": 365,
      "scrapPzas": 0,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Espera material",
      "eficiencia": 20.9,
      "ultimaLiberacion": "22:00"
    },
    {
      "id": "OP50",
      "nombre": "Inspección Dimensional Neumática",
      "equipo": "Gage de Aire Multidiametral OP50",
      "operador": "Téc. Calidad",
      "metaPzas": 1350,
      "buenasPzas": 365,
      "scrapPzas": 0,
      "cicloSeg": 46.0,
      "estado": "OK",
      "buffer": "Gage OK",
      "eficiencia": 20.9,
      "ultimaLiberacion": "22:00"
    },
    {
      "id": "OP60",
      "nombre": "Inspección Final EOL & Marcado Láser",
      "equipo": "Estación de Visión y Embalaje OP60",
      "operador": "Antonia",
      "metaPzas": 1350,
      "buenasPzas": 365,
      "scrapPzas": 0,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Caja empaque",
      "eficiencia": 20.9,
      "ultimaLiberacion": "22:00"
    }
  ],
  "alertas": [
    {
      "id": "ALT-DEFICIT-DIA",
      "tipo": "CRITICA",
      "titulo": "Déficit Acumulado (-505 Uds vs Plan a las 22:00)",
      "descripcion": "La línea acumula 365 unidades de 870 programadas al corte (42.0% de cumplimiento). Paros acumulados: 305 min en la jornada.",
      "estacion": "LÍNEA C / GENERAL",
      "hora": "22:00",
      "tiempoTranscurrido": "Jornada 24h en curso",
      "resuelta": false
    },
    {
      "id": "ALT-P-01",
      "tipo": "CRITICA",
      "titulo": "Paro 40 min — Cambio de bujes de brazo por despostillado",
      "descripcion": "Estación OP30: Cambio de bujes de brazo por despostillado registrado durante el horario 09:00 - 10:00.",
      "estacion": "OP30",
      "hora": "09:00 - 10:00",
      "tiempoTranscurrido": "40 min registrados",
      "resuelta": true
    },
    {
      "id": "ALT-P-02",
      "tipo": "ADVERTENCIA",
      "titulo": "Paro 30 min — Comedor",
      "descripcion": "Estación OP30: Comedor registrado durante el horario 11:00 - 12:00.",
      "estacion": "OP30",
      "hora": "11:00 - 12:00",
      "tiempoTranscurrido": "30 min registrados",
      "resuelta": true
    },
    {
      "id": "ALT-P-03",
      "tipo": "CRITICA",
      "titulo": "Paro 40 min — Cambio de espárragos de brazo // Variación diam. P.S. Ajuste",
      "descripcion": "Estación OP30: Cambio de espárragos de brazo // Variación diam. P.S. Ajuste registrado durante el horario 12:00 - 13:00.",
      "estacion": "OP30",
      "hora": "12:00 - 13:00",
      "tiempoTranscurrido": "40 min registrados",
      "resuelta": true
    },
    {
      "id": "ALT-P-04",
      "tipo": "CRITICA",
      "titulo": "Paro 40 min — c/molde, ajustes",
      "descripcion": "Estación OP30: c/molde, ajustes registrado durante el horario 13:00 - 14:00.",
      "estacion": "OP30",
      "hora": "13:00 - 14:00",
      "tiempoTranscurrido": "40 min registrados",
      "resuelta": true
    },
    {
      "id": "ALT-P-05",
      "tipo": "CRITICA",
      "titulo": "Paro 40 min — Ajuste de alabeo P.S.",
      "descripcion": "Estación OP30: Ajuste de alabeo P.S. registrado durante el horario 14:00 - 15:00.",
      "estacion": "OP30",
      "hora": "14:00 - 15:00",
      "tiempoTranscurrido": "40 min registrados",
      "resuelta": true
    },
    {
      "id": "ALT-P-06",
      "tipo": "ADVERTENCIA",
      "titulo": "Paro 15 min — Break",
      "descripcion": "Estación OP20: Break registrado durante el horario 15:00 - 16:00.",
      "estacion": "OP20",
      "hora": "15:00 - 16:00",
      "tiempoTranscurrido": "15 min registrados",
      "resuelta": true
    },
    {
      "id": "ALT-SCRAP-DIA",
      "tipo": "CALIDAD",
      "titulo": "Piezas Scrap Acumuladas: 82 pzas (18.3%)",
      "descripcion": "Se han registrado 82 unidades defectuosas (NOK) acumuladas en los turnos reportados.",
      "estacion": "LÍNEA C / CALIDAD",
      "hora": "22:00",
      "tiempoTranscurrido": "Acumulado día",
      "resuelta": false
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BRP_DATA;
}
