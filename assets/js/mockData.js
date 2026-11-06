/**
 * =============================================================================
 * DASHBOARD DE SEGUIMIENTO LÍNEA C BRP — ROTAX MÉXICO
 * Archivo de Datos Maestros y Simulación de Telemetría Operativa
 * =============================================================================
 * Estructura de datos desacoplada lista para ser sustituida por una API REST,
 * WebSocket o integración con sistema SCADA/MES de planta.
 */

const BRP_DATA = {
  planta: {
    nombre: "BRP ROTAX MÉXICO S.A. de C.V.",
    plantaId: "PLANTA QUERÉTARO - LÍNEA C",
    linea: "Línea C — Ensamble y Mecanizado de Motores Rotax ACE",
    versionSistema: "v2.6.4-MES",
    tiempoCicloTargetSeg: 45.0,
    metaTurnoUnidades: 540,
    supervisorActual: "Ing. Carlos Mendoza (T1)",
    productoActual: "Rotax 900 ACE Turbo (3 Cilindros - 200HP)",
    ordenTrabajo: "OT-2026-BRP-09482",
    turnoActual: 1
  },

  resumenKpis: {
    produccionDia: 432,
    metaDiaria: 540,
    porcentajeAvance: 80.0,
    unidadesCompletadas: 432,
    unidadesPendientes: 108,
    eficienciaOee: 89.4,
    disponibilidad: 94.1,
    rendimiento: 95.5,
    calidadFpy: 99.54,
    parosAcumuladosMin: 18,
    eventosParo: 4,
    taktTimeSeg: 44.8,
    scrapPiezas: 2,
    scrapPorcentaje: 0.46,
    estadoLinea: "OPERANDO" // "OPERANDO", "ALERTA", "PARO", "MANTENIMIENTO"
  },

  turnos: [
    { id: 1, nombre: "Turno 1 - Matutino", horario: "06:00 - 14:30", supervisor: "Ing. Carlos Mendoza", meta: 540, real: 432, oee: 89.4, activo: true },
    { id: 2, nombre: "Turno 2 - Vespertino", horario: "14:30 - 22:30", supervisor: "Ing. Roberto Garza", meta: 540, real: 0, oee: 0.0, activo: false },
    { id: 3, nombre: "Turno 3 - Nocturno", horario: "22:30 - 06:00", supervisor: "Ing. Diana Soto", meta: 480, real: 0, oee: 0.0, activo: false }
  ],

  modelos: [
    { id: "M01", codigo: "ROTAX-900-ACE-T", nombre: "Rotax 900 ACE Turbo", cilindros: 3, hp: 200, plataforma: "Can-Am Maverick / Sea-Doo Spark", activo: true },
    { id: "M02", codigo: "ROTAX-1630-ACE-HO", nombre: "Rotax 1630 ACE HO Supercharged", cilindros: 3, hp: 300, plataforma: "Sea-Doo RXT-X / GTX", activo: false },
    { id: "M03", codigo: "ROTAX-850-ETEC", nombre: "Rotax 850 E-TEC 2T", cilindros: 2, hp: 165, plataforma: "Ski-Doo MXZ / Renegade", activo: false },
    { id: "M04", codigo: "ROTAX-HD10-V2", nombre: "Rotax HD10 V-Twin", cilindros: 2, hp: 82, plataforma: "Can-Am Defender HD10", activo: false }
  ],

  produccionHoraria: [
    { hora: "06:00 - 07:00", meta: 65, real: 56, acumMeta: 65, acumReal: 56, oeeHora: 86.2, parosMin: 5, comentario: "Arranque de línea y calentamiento de husillos" },
    { hora: "07:00 - 08:00", meta: 68, real: 68, acumMeta: 133, acumReal: 124, oeeHora: 92.4, parosMin: 0, comentario: "Ritmo constante a régimen óptimo" },
    { hora: "08:00 - 09:00", meta: 68, real: 71, acumMeta: 201, acumReal: 195, oeeHora: 94.8, parosMin: 0, comentario: "Superación de meta por buffer alimentado" },
    { hora: "09:00 - 10:00", meta: 68, real: 62, acumMeta: 269, acumReal: 257, oeeHora: 85.1, parosMin: 8, comentario: "Microparo de 8m en guía gantry OP10" },
    { hora: "10:00 - 11:00", meta: 68, real: 73, acumMeta: 337, acumReal: 330, oeeHora: 95.2, parosMin: 0, comentario: "Recuperación de cadencia post-paro" },
    { hora: "11:00 - 12:00", meta: 68, real: 70, acumMeta: 405, acumReal: 400, oeeHora: 93.0, parosMin: 2, comentario: "Relevo escalonado de operarios" },
    { hora: "12:00 - 13:00", meta: 68, real: 72, acumMeta: 473, acumReal: 472, oeeHora: 94.6, parosMin: 0, comentario: "Flujo balanceado en OP40 y OP50" },
    { hora: "13:00 - 14:00", meta: 68, real: 60, acumMeta: 541, acumReal: 532, oeeHora: 88.0, parosMin: 3, comentario: "Hora en curso / Preparación de entrega" }
  ],

  parosIncidencias: [
    { id: "P-101", estacion: "OP10", causa: "Ajuste de sensor gantry cargador", duracionMin: 8, categoria: "Mecánico", tipo: "Microparo", hora: "09:18", estatus: "Resuelto" },
    { id: "P-102", estacion: "OP30", causa: "Espera de kitting bielas grado B", duracionMin: 5, categoria: "Logística", tipo: "Falta de Material", hora: "06:42", estatus: "Resuelto" },
    { id: "P-103", estacion: "OP40", causa: "Calibración de ángulo en atornillador #4", duracionMin: 3, categoria: "Calidad", tipo: "Setup", hora: "13:12", estatus: "Resuelto" },
    { id: "P-104", estacion: "OP20", causa: "Limpieza preventiva en canastilla lavado", duracionMin: 2, categoria: "Mantenimiento", tipo: "Limpieza", hora: "11:35", estatus: "Resuelto" }
  ],

  estaciones: [
    {
      id: "OP10",
      nombre: "Mecanizado de Monoblock",
      equipo: "Centro CNC Kanzaki OP10 / Gantry 3M",
      operador: "Téc. Juan R. Escobedo",
      metaPzas: 540,
      buenasPzas: 450,
      scrapPzas: 1,
      cicloSeg: 43.2,
      estado: "OK", // OK, RUN, PEND, PARO
      buffer: "4 piezas en espera",
      eficiencia: 96.2,
      ultimaLiberacion: "13:54:10"
    },
    {
      id: "OP20",
      nombre: "Lavado Térmico y Desengrase Ultrasónico",
      equipo: "Lavadora Industrial WashTech OP20",
      operador: "Téc. Marco A. Peralta",
      metaPzas: 540,
      buenasPzas: 446,
      scrapPzas: 0,
      cicloSeg: 41.5,
      estado: "OK",
      buffer: "2 piezas en secado",
      eficiencia: 97.8,
      ultimaLiberacion: "13:53:45"
    },
    {
      id: "OP30",
      nombre: "Subensamble de Pistones y Bielas",
      equipo: "Mesa Neumática Robodrill OP30",
      operador: "Téc. Valeria Domínguez",
      metaPzas: 540,
      buenasPzas: 440,
      scrapPzas: 0,
      cicloSeg: 45.0,
      estado: "OK",
      buffer: "3 monoblocks en rack",
      eficiencia: 95.1,
      ultimaLiberacion: "13:52:30"
    },
    {
      id: "OP40",
      nombre: "Torque de Cabeza Robotizado",
      equipo: "Robot Atornillador Atlas Copco STB40",
      operador: "Téc. Fernando Ruiz",
      metaPzas: 540,
      buenasPzas: 436,
      scrapPzas: 1,
      cicloSeg: 46.4,
      estado: "RUN",
      buffer: "1 monoblock en estación",
      eficiencia: 92.4,
      ultimaLiberacion: "13:54:02"
    },
    {
      id: "OP50",
      nombre: "Prueba Neumática y Fuga de Helio",
      equipo: "Cámara Neumática Ateq F520",
      operador: "Téc. Sergio Morales",
      metaPzas: 540,
      buenasPzas: 433,
      scrapPzas: 0,
      cicloSeg: 44.1,
      estado: "OK",
      buffer: "1 monoblock presurizando",
      eficiencia: 98.4,
      ultimaLiberacion: "13:53:15"
    },
    {
      id: "OP60",
      nombre: "Inspección Final EOL & Liberación",
      equipo: "Sistema Visión Cognex EOL60 / Marcado Láser",
      operador: "Téc. Brenda Ortiz",
      metaPzas: 540,
      buenasPzas: 432,
      scrapPzas: 0,
      cicloSeg: 42.8,
      estado: "OK",
      buffer: "Listo para empaque",
      eficiencia: 99.1,
      ultimaLiberacion: "13:54:22"
    }
  ],

  alertas: [
    {
      id: "ALT-001",
      tipo: "CRITICA",
      titulo: "Microparo en Gantry OP10 Solucionado",
      descripcion: "Sensor de tope final requirió limpieza de rebaba metálica. Detención total de 8 minutos. Takt recuperado.",
      estacion: "OP10",
      hora: "09:18",
      tiempoTranscurrido: "Hace 4h 36m",
      resuelta: true
    },
    {
      id: "ALT-002",
      tipo: "ADVERTENCIA",
      titulo: "Buffer Bajo en Alimentación de Bielas",
      descripcion: "El almacén intermedio de componentes reporta 15 minutos de reserva para subensamble de cigüeñales.",
      estacion: "OP30",
      hora: "13:30",
      tiempoTranscurrido: "Hace 24m",
      resuelta: false
    },
    {
      id: "ALT-003",
      tipo: "CALIDAD",
      titulo: "Rechazo de Monoblock por Desviación de Rosca",
      descripcion: "Pérdida de presión en tornillo #4 detectada por el sensor de torque dinámico en OP40. Pieza confinada a Scrap.",
      estacion: "OP40",
      hora: "11:15",
      tiempoTranscurrido: "Hace 2h 39m",
      resuelta: true
    },
    {
      id: "ALT-004",
      tipo: "INFO",
      titulo: "Cambio de Turno Programado a las 14:30 hrs",
      descripcion: "Entrega de puesto y verificación de 5S programada con el equipo del Turno 2 (Supervisor Ing. Roberto Garza).",
      estacion: "LINEA C",
      hora: "13:45",
      tiempoTranscurrido: "Hace 9m",
      resuelta: false
    }
  ]
};

// Exportación compatible tanto con módulos ES6 como con scripts convencionales de navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BRP_DATA;
}

