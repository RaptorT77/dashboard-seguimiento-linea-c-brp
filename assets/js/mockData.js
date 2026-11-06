/**
 * =============================================================================
 * DASHBOARD DE SEGUIMIENTO LÍNEA C BRP — PLANTA KOLBEN SCHMIDT CELAYA
 * Archivo de Datos Sincronizados Automáticamente vía OCR Telegram
 * Última Hora Registrada: 13:00 - 14:00 | Producto: WOLF V1
 * =============================================================================
 */

const BRP_DATA = {
  "planta": {
    "nombre": "BRP ROTAX MÉXICO S.A. de C.V.",
    "plantaId": "PLANTA KOLBEN SCHMIDT CELAYA - LÍNEA C",
    "linea": "Línea C — Ensamble y Mecanizado de Pistón WOLF V1",
    "versionSistema": "v2.7.0-OCR-LIVE",
    "updatedAt": "2026-11-06T20:40:41Z",
    "tiempoCicloTargetSeg": 45.0,
    "metaTurnoUnidades": 480,
    "supervisorActual": "Líder Antonia",
    "productoActual": "WOLF V1 (Pistón BRP)",
    "turnoActual": 1
  },
  "resumenKpis": {
    "produccionDia": 25,
    "metaDiaria": 480,
    "porcentajeAvance": 5.2,
    "unidadesCompletadas": 25,
    "unidadesPendientes": 455,
    "eficienciaOee": 1.0,
    "disponibilidad": 17.8,
    "rendimiento": 6.0,
    "calidadFpy": 89.3,
    "parosAcumuladosMin": 370,
    "eventosParo": 5,
    "taktTimeSeg": 58.2,
    "scrapPiezas": 3,
    "scrapPorcentaje": 10.7,
    "estadoLinea": "PRODUCCION_DEFICIENTE"
  },
  "turnos": [
    {
      "id": 1,
      "nombre": "Turno 1 - Matutino",
      "horario": "06:30 - 15:00",
      "supervisor": "Antonia",
      "meta": 480,
      "real": 25,
      "oee": 1.0,
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
      "real": 28,
      "acumMeta": 90,
      "acumReal": 25,
      "oeeHora": 31.1,
      "parosMin": 40,
      "malas": 3,
      "comentario": "Ajuste Ø P/E, offset, mordazas y cambio tornillo (OP40/OP30)"
    },
    {
      "hora": "08:00 - 09:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 150,
      "acumReal": 25,
      "oeeHora": 0.0,
      "parosMin": 60,
      "malas": 0,
      "comentario": "Paro continuo en OP30"
    },
    {
      "hora": "09:00 - 10:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 210,
      "acumReal": 25,
      "oeeHora": 0.0,
      "parosMin": 60,
      "malas": 0,
      "comentario": "Ajuste offset - Manufactura (OP30)"
    },
    {
      "hora": "10:00 - 11:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 270,
      "acumReal": 25,
      "oeeHora": 0.0,
      "parosMin": 60,
      "malas": 0,
      "comentario": "Ajuste offset // Mantto. tornillos, perilla de avance maq. (OP30)"
    },
    {
      "hora": "11:00 - 12:00",
      "meta": 30,
      "real": 0,
      "acumMeta": 300,
      "acumReal": 25,
      "oeeHora": 0.0,
      "parosMin": 30,
      "malas": 0,
      "comentario": "Ajuste de perilla de avance maq. (OP30)"
    },
    {
      "hora": "12:00 - 13:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 360,
      "acumReal": 25,
      "oeeHora": 0.0,
      "parosMin": 60,
      "malas": 0,
      "comentario": "Alineación de barra y herramental (OP30)"
    },
    {
      "hora": "13:00 - 14:00",
      "meta": 60,
      "real": 0,
      "acumMeta": 420,
      "acumReal": 25,
      "oeeHora": 0.0,
      "parosMin": 60,
      "malas": 0,
      "comentario": "Ajuste continuo de herramental (OP30)"
    }
  ],
  "parosIncidencias": [
    {
      "id": "P-01",
      "estacion": "OP40 / OP30",
      "causa": "Ajuste Ø P/E, offset y mordazas, tornillo",
      "duracionMin": 40,
      "categoria": "Mecánico / Setup",
      "tipo": "Incidencia Pizarra",
      "hora": "06:30 - 08:00",
      "estatus": "Reportado en Pizarra"
    },
    {
      "id": "P-02",
      "estacion": "OP30",
      "causa": "Paro continuo en OP30 (Ajuste offset Manufactura)",
      "duracionMin": 180,
      "categoria": "Mecánico / Herramental",
      "tipo": "Incidencia Pizarra",
      "hora": "08:00 - 11:00",
      "estatus": "Reportado en Pizarra"
    },
    {
      "id": "P-03",
      "estacion": "OP30",
      "causa": "Ajuste de perilla de avance de máquina",
      "duracionMin": 30,
      "categoria": "Mantenimiento / Calibración",
      "tipo": "Incidencia Pizarra",
      "hora": "11:00 - 12:00",
      "estatus": "Reportado en Pizarra"
    },
    {
      "id": "P-04",
      "estacion": "OP30",
      "causa": "Alineación de barra y herramental",
      "duracionMin": 60,
      "categoria": "Mecánico / Herramental",
      "tipo": "Incidencia Pizarra",
      "hora": "12:00 - 13:00",
      "estatus": "Reportado en Pizarra"
    },
    {
      "id": "P-05",
      "estacion": "OP30",
      "causa": "Ajuste continuo de herramental",
      "duracionMin": 60,
      "categoria": "Mantenimiento / Ajuste",
      "tipo": "Incidencia Pizarra",
      "hora": "13:00 - 14:00",
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
      "buenasPzas": 28,
      "scrapPzas": 0,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Buffer OK",
      "eficiencia": 70.0,
      "ultimaLiberacion": "08:00"
    },
    {
      "id": "OP20",
      "nombre": "Ranurado de Anillos y Barrenado de Perno",
      "equipo": "Ranuradora de Precisión OP20",
      "operador": "Téc. Línea C",
      "metaPzas": 480,
      "buenasPzas": 28,
      "scrapPzas": 0,
      "cicloSeg": 48.0,
      "estado": "OK",
      "buffer": "Buffer OK",
      "eficiencia": 68.0,
      "ultimaLiberacion": "08:00"
    },
    {
      "id": "OP30",
      "nombre": "Lavado Térmico y Ranurado de Precisión",
      "equipo": "Ranuradora / Lavadora OP30",
      "operador": "Téc. OP30",
      "metaPzas": 480,
      "buenasPzas": 25,
      "scrapPzas": 3,
      "cicloSeg": 120.0,
      "estado": "PEND",
      "buffer": "Paro por Offset / Mantto (Tornillos, perilla)",
      "eficiencia": 15.0,
      "ultimaLiberacion": "08:00"
    },
    {
      "id": "OP40",
      "nombre": "Acabado de Superficie / Recubrimiento",
      "equipo": "Cabina de Grafito / Moly OP40",
      "operador": "Téc. Línea C",
      "metaPzas": 480,
      "buenasPzas": 25,
      "scrapPzas": 0,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Espera material",
      "eficiencia": 20.0,
      "ultimaLiberacion": "08:00"
    },
    {
      "id": "OP50",
      "nombre": "Inspección Dimensional Neumática",
      "equipo": "Gage de Aire Multidiametral OP50",
      "operador": "Téc. Calidad",
      "metaPzas": 480,
      "buenasPzas": 25,
      "scrapPzas": 0,
      "cicloSeg": 46.0,
      "estado": "OK",
      "buffer": "Gage OK",
      "eficiencia": 20.0,
      "ultimaLiberacion": "08:00"
    },
    {
      "id": "OP60",
      "nombre": "Inspección Final EOL & Marcado Láser",
      "equipo": "Estación de Visión y Embalaje OP60",
      "operador": "Antonia",
      "metaPzas": 480,
      "buenasPzas": 25,
      "scrapPzas": 0,
      "cicloSeg": 45.0,
      "estado": "OK",
      "buffer": "Caja empaque",
      "eficiencia": 20.0,
      "ultimaLiberacion": "08:00"
    }
  ],
  "alertas": [
    {
      "id": "ALT-DEFICIT-CRIT",
      "tipo": "CRITICA",
      "titulo": "Déficit Crítico de Producción (-395 Uds vs Plan a las 14:00)",
      "descripcion": "El Turno 1 acumula únicamente 25 unidades producidas de 420 esperadas al corte de las 14:00 hrs (6.0% de avance vs plan a la hora). Se activó alarma Andon.",
      "estacion": "LÍNEA C",
      "hora": "14:00",
      "tiempoTranscurrido": "Turno 1 en curso",
      "resuelta": false
    },
    {
      "id": "ALT-PARO-OP30",
      "tipo": "CRITICA",
      "titulo": "Falla Mayor y Paro Continuo en OP30 (Ranurado/Ajuste Offset)",
      "descripcion": "3 horas consecutivas sin producción (0 pz/h de 08:00 a 11:00). Mantenimiento y manufactura ajustando offset, mordazas y perilla de avance.",
      "estacion": "OP30",
      "hora": "08:00 - 11:00",
      "tiempoTranscurrido": "180 min acumulados",
      "resuelta": false
    },
    {
      "id": "ALT-MAT-NOK",
      "tipo": "ADVERTENCIA",
      "titulo": "Material No Conforme: 23 pzas NOK por Offset (Turno Previo)",
      "descripcion": "Nota escrita en pizarra: '* 23 pzas NOK por offset mat. turno anterior'. Afecta inventario y rendimiento de falda/corona.",
      "estacion": "LÍNEA C / CALIDAD",
      "hora": "11:00",
      "tiempoTranscurrido": "Registrado",
      "resuelta": false
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BRP_DATA;
}
