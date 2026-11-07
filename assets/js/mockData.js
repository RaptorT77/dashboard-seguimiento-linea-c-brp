const BRP_DATA = {
  "planta": {
    "nombre": "BRP ROTAX MÉXICO S.A. de C.V.",
    "plantaId": "PLANTA KOLBEN SCHMIDT CELAYA - LÍNEA C",
    "linea": "Línea C — Ensamble y Mecanizado de Pistón WOLF V1",
    "versionSistema": "v2.7.0-OCR-LIVE",
    "updatedAt": "2026-11-07T23:20:00Z",
    "tiempoCicloTargetSeg": 45.0,
    "metaTurnoUnidades": 450,
    "supervisorActual": "Ing. Roberto Garza",
    "productoActual": "WOLF V1 (Pistón BRP)",
    "turnoActual": 2
  },
  "resumenKpis": {
    "produccionDia": 61,
    "metaDiaria": 450,
    "porcentajeAvance": 13.6,
    "unidadesCompletadas": 61,
    "unidadesPendientes": 389,
    "eficienciaOee": 48.5,
    "disponibilidad": 58.3,
    "rendimiento": 50.8,
    "calidadFpy": 92.4,
    "parosAcumuladosMin": 50,
    "eventosParo": 2,
    "taktTimeSeg": 54.0,
    "scrapPiezas": 5,
    "scrapPorcentaje": 7.6,
    "estadoLinea": "ADVERTENCIA_OPERATIVA"
  },
  "turnos": [
    {
      "id": 1,
      "nombre": "Turno 1 - Matutino",
      "horario": "06:30 - 15:00",
      "supervisor": "Lider Antonia",
      "meta": 480,
      "real": 280,
      "oee": 58.3,
      "activo": false
    },
    {
      "id": 2,
      "nombre": "Turno 2 - Vespertino",
      "horario": "15:00 - 23:00",
      "supervisor": "Ing. Roberto Garza",
      "meta": 450,
      "real": 61,
      "oee": 48.5,
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
      "real": 19,
      "acumMeta": 60,
      "acumReal": 16,
      "oeeHora": 31.7,
      "parosMin": 35,
      "malas": 1,
      "comentario": "Falta de material (OP30)"
    },
    {
      "hora": "16:00 - 17:00",
      "meta": 60,
      "real": 44,
      "acumMeta": 120,
      "acumReal": 61,
      "oeeHora": 73.3,
      "parosMin": 15,
      "malas": 4,
      "comentario": "Ajuste de perno"
    },
    {
      "hora": "17:00 - 18:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 180,
      "acumReal": 61,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora en curso / Produccion activa"
    },
    {
      "hora": "18:00 - 19:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 240,
      "acumReal": 61,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora programada / Por fabricar"
    },
    {
      "hora": "19:00 - 20:00",
      "meta": 30,
      "real": 0,
      "acumMeta": 270,
      "acumReal": 61,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora programada / Por fabricar"
    },
    {
      "hora": "20:00 - 21:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 330,
      "acumReal": 61,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora programada / Por fabricar"
    },
    {
      "hora": "21:00 - 22:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 390,
      "acumReal": 61,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora programada / Por fabricar"
    },
    {
      "hora": "22:00 - 23:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 450,
      "acumReal": 61,
      "oeeHora": 0.0,
      "parosMin": 0,
      "malas": 0,
      "comentario": "Hora programada / Por fabricar"
    }
  ],
  "parosIncidencias": [
    {
      "id": "P-T2-01",
      "estacion": "OP30",
      "causa": "Falta de material en inicio de turno",
      "duracionMin": 35,
      "categoria": "Materiales",
      "tipo": "Incidencia Pizarra",
      "hora": "15:00 - 16:00",
      "estatus": "Resuelto"
    },
    {
      "id": "P-T2-02",
      "estacion": "OP30",
      "causa": "Ajuste de perno",
      "duracionMin": 15,
      "categoria": "Mecanico",
      "tipo": "Incidencia Pizarra",
      "hora": "16:00 - 17:00",
      "estatus": "Resuelto"
    }
  ],
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
