/**
 * =============================================================================
 * DASHBOARD DE SEGUIMIENTO LÍNEA C BRP — ROTAX MÉXICO
 * Motor de Interacción, Gráficas y Telemetría en Tiempo Real
 * =============================================================================
 */

(function () {
  'use strict';

  // Referencias a instancias de gráficas Chart.js
  let chartHourly = null;
  let chartCumulative = null;
  let chartOee = null;
  let chartDowntime = null;

  // Estado reactivo local del Dashboard
  let state = {
    data: JSON.parse(JSON.stringify(BRP_DATA)),
    filterShift: 'all',
    filterStation: 'all',
    filterModel: 'all',
    filterStatus: 'all',
    searchQuery: '',
    simulatingInterval: null
  };

  /**
   * Inicialización al cargar el DOM
   */
  document.addEventListener('DOMContentLoaded', () => {
    // Si hay un estado de reset guardado en localStorage, cargarlo siempre que no haya foto nueva
    try {
      const isResetActive = localStorage.getItem('BRP_DASHBOARD_RESET_ACTIVE') === 'true';
      const savedReset = localStorage.getItem('BRP_DASHBOARD_RESET_DATA');
      const resetTime = parseInt(localStorage.getItem('BRP_DASHBOARD_RESET_TIME') || '0', 10);
      const dataTimeStr = state.data?.planta?.updatedAt || state.data?.updatedAt;
      const dataTime = dataTimeStr ? new Date(dataTimeStr).getTime() : 0;

      if (isResetActive && savedReset) {
        if (resetTime >= dataTime || dataTime === 0) {
          state.data = JSON.parse(savedReset);
        } else {
          localStorage.removeItem('BRP_DASHBOARD_RESET_ACTIVE');
          localStorage.removeItem('BRP_DASHBOARD_RESET_TIME');
          localStorage.removeItem('BRP_DASHBOARD_RESET_DATA');
        }
      }
    } catch (e) {
      console.warn('Error leyendo reset de localStorage:', e);
    }

    applyStoredOverrides();
    initClock();
    initFilters();
    renderKpis();
    renderHeroWidgets();
    renderStationsFlow();
    renderTable();
    renderAlerts();
    initCharts();
    setupEventListeners();
    initAutoSync();
  });

  /**
   * Reloj y sincronización en vivo
   */
  function initClock() {
    const clockEl = document.getElementById('liveClock');
    const update = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const timeStr = now.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      if (clockEl) {
        clockEl.textContent = `${dateStr} • ${timeStr}`;
      }
    };
    update();
    setInterval(update, 1000);
  }

  /**
   * Inicialización de Filtros
   */
  function initFilters() {
    const selectShift = document.getElementById('filterShift');
    const selectModel = document.getElementById('filterModel');
    const selectStation = document.getElementById('filterStation');
    const selectStatus = document.getElementById('filterStatus');
    const inputDate = document.getElementById('filterDate');

    if (inputDate) {
      inputDate.value = new Date().toISOString().split('T')[0];
    }

    if (selectShift) {
      selectShift.innerHTML = `
        <option value="all">Todos los Turnos (3)</option>
        ${state.data.turnos.map(t => `<option value="${t.id}">${t.nombre} (${t.horario})</option>`).join('')}
      `;
    }

    if (selectModel) {
      selectModel.innerHTML = `
        <option value="all">Todos los Modelos</option>
        ${state.data.modelos.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('')}
      `;
    }
  }

  /**
   * Renderizar Widgets del Hero Operativo
   */
  function renderHeroWidgets() {
    const p = state.data.planta;
    const k = state.data.resumenKpis;

    // Los 3 Estados Oficiales de la Línea C BRP:
    // 1. Producción en orden: Rates y metas se cumplen. Lámpara verde fija ON, demás OFF.
    // 2. Producción deficiente: Rates/metas NO se cumplen. Baliza roja y zumbador a 3 Hz, demás OFF.
    // 3. Advertencia operativa: Rates en promedio se van cumpliendo pero cerca de límite. Lámpara ámbar oscilando a 3 Hz, demás OFF.
    const statusPill = document.getElementById('heroStatusPill');
    const statusText = document.getElementById('heroStatusText');
    const heroDot = document.getElementById('heroStatusDot');
    const lampRed = document.getElementById('lampRed');
    const lampAmber = document.getElementById('lampAmber');
    const lampGreen = document.getElementById('lampGreen');
    const lampBuzzer = document.getElementById('lampBuzzer');
    const andonLabel = document.getElementById('andonStateLabel');

    const st = (k.estadoLinea || '').toUpperCase();
    const isDeficiente = st.includes('DEFICIENTE') || st.includes('PARO') || st === 'STOP';
    const isAdvertencia = st.includes('ADVERTENCIA') || st.includes('ALERTA') || st === 'WARN';

    if (isDeficiente) {
      // Estado 2: Producción Deficiente
      if (statusPill) statusPill.className = 'hero-status-pill status-deficiente';
      if (statusText) statusText.textContent = 'PRODUCCIÓN DEFICIENTE';
      if (heroDot) heroDot.className = 'pulse-dot dot-red-3hz';

      if (lampRed) lampRed.className = 'andon-lamp lamp-red active-3hz';
      if (lampBuzzer) lampBuzzer.className = 'andon-buzzer-icon active-3hz';
      if (lampAmber) lampAmber.className = 'andon-lamp lamp-amber';
      if (lampGreen) lampGreen.className = 'andon-lamp lamp-green';
      if (andonLabel) andonLabel.textContent = 'CH1 + CH4 @ 3Hz';
    } else if (isAdvertencia) {
      // Estado 3: Advertencia Operativa
      if (statusPill) statusPill.className = 'hero-status-pill status-advertencia';
      if (statusText) statusText.textContent = 'ADVERTENCIA OPERATIVA';
      if (heroDot) heroDot.className = 'pulse-dot dot-amber-3hz';

      if (lampAmber) lampAmber.className = 'andon-lamp lamp-amber active-3hz';
      if (lampRed) lampRed.className = 'andon-lamp lamp-red';
      if (lampGreen) lampGreen.className = 'andon-lamp lamp-green';
      if (lampBuzzer) lampBuzzer.className = 'andon-buzzer-icon';
      if (andonLabel) andonLabel.textContent = 'CH2 @ 3Hz';
    } else {
      // Estado 1: Producción en Orden
      if (statusPill) statusPill.className = 'hero-status-pill status-orden';
      if (statusText) statusText.textContent = 'PRODUCCIÓN EN ORDEN';
      if (heroDot) heroDot.className = 'pulse-dot dot-green-fixed';

      if (lampGreen) lampGreen.className = 'andon-lamp lamp-green active-fixed';
      if (lampRed) lampRed.className = 'andon-lamp lamp-red';
      if (lampAmber) lampAmber.className = 'andon-lamp lamp-amber';
      if (lampBuzzer) lampBuzzer.className = 'andon-buzzer-icon';
      if (andonLabel) andonLabel.textContent = 'CH3 FIJO ON';
    }

    const heroTakt = document.getElementById('heroTakt');
    if (heroTakt) heroTakt.textContent = `${k.taktTimeSeg} s (Target: ${p.tiempoCicloTargetSeg} s)`;

    const heroRate = document.getElementById('heroRate');
    if (heroRate) heroRate.textContent = `${Math.round(3600 / k.taktTimeSeg)} uds/h`;

    const heroSupervisor = document.getElementById('heroSupervisor');
    if (heroSupervisor) heroSupervisor.textContent = p.supervisorActual;

    const heroProduct = document.getElementById('heroProduct');
    if (heroProduct) heroProduct.textContent = p.productoActual;

    const heroAvail = document.getElementById('heroAvail');
    if (heroAvail) heroAvail.textContent = `${k.disponibilidad}%`;

    const heroPerf = document.getElementById('heroPerf');
    if (heroPerf) heroPerf.textContent = `${k.rendimiento}%`;

    const heroQual = document.getElementById('heroQual');
    if (heroQual) heroQual.textContent = `${k.calidadFpy}%`;

    // Actualización dinámica de Hero Card 4 (OEE y diferencia vs meta mundial 85%)
    const heroOeeVal = document.getElementById('heroOeeVal');
    const heroOeeDiff = document.getElementById('heroOeeDiff');
    const heroOeeBadge = document.getElementById('heroOeeBadge');
    if (heroOeeVal) {
      heroOeeVal.textContent = `${k.eficienciaOee.toFixed(1)}%`;
      heroOeeVal.style.color = k.eficienciaOee >= 85 ? '#059669' : '#DC2626';
    }
    if (heroOeeDiff) {
      const diffOee = (k.eficienciaOee - 85.0).toFixed(1);
      heroOeeDiff.textContent = `${diffOee >= 0 ? '+' : ''}${diffOee}% vs Meta`;
      heroOeeDiff.style.color = diffOee >= 0 ? '#166534' : '#DC2626';
    }
    if (heroOeeBadge) {
      heroOeeBadge.textContent = 'META > 85%';
      heroOeeBadge.style.background = k.eficienciaOee >= 85 ? '#ECFDF5' : '#FEF2F2';
      heroOeeBadge.style.color = k.eficienciaOee >= 85 ? '#065F46' : '#991B1B';
      heroOeeBadge.style.borderColor = k.eficienciaOee >= 85 ? '#A7F3D0' : '#FECACA';
    }
  }

  /**
   * Renderizar Indicadores Clave (KPIs)
   */
  function renderKpis() {
    const k = state.data.resumenKpis;

    const elProd = document.getElementById('kpiProdVal');
    const elMeta = document.getElementById('kpiMetaVal');
    const elAvance = document.getElementById('kpiAvanceVal');
    const elPend = document.getElementById('kpiPendVal');
    const elOee = document.getElementById('kpiOeeVal');
    const elParos = document.getElementById('kpiParosVal');

    if (elProd) elProd.textContent = k.unidadesCompletadas;
    if (elMeta) elMeta.textContent = k.metaDiaria;
    if (elAvance) elAvance.textContent = `${k.porcentajeAvance.toFixed(1)}%`;
    if (elPend) elPend.textContent = k.unidadesPendientes;
    if (elOee) {
      elOee.textContent = `${k.eficienciaOee.toFixed(1)}%`;
      elOee.style.color = k.eficienciaOee >= 85 ? '#1E3A8A' : '#DC2626';
    }
    if (elParos) elParos.textContent = `${k.parosAcumuladosMin} min`;

    // Actualizar barras de progreso
    const barAvance = document.getElementById('barAvance');
    if (barAvance) barAvance.style.width = `${Math.min(k.porcentajeAvance, 100)}%`;

    const barOee = document.getElementById('barOee');
    if (barOee) {
      barOee.style.width = `${Math.min(k.eficienciaOee, 100)}%`;
      barOee.className = k.eficienciaOee >= 85 ? 'kpi-progress-fill fill-green' : 'kpi-progress-fill fill-red';
    }

    // Identificar la última hora registrada con datos en la pizarra
    const recordedHours = (state.data.produccionHoraria || []).filter(h =>
      h.isRecorded || (h.real !== null && h.real !== undefined && h.real > 0)
    );
    const lastActive = recordedHours.length > 0 ? recordedHours[recordedHours.length - 1] : null;
    const metaALaHora = lastActive ? lastActive.acumMeta : k.metaDiaria;
    const horaCorte = lastActive ? (lastActive.hora.split(' - ')[1] || lastActive.hora) : '15:00';
    const esperadoPct = k.metaDiaria > 0 ? ((metaALaHora / k.metaDiaria) * 100).toFixed(1) : '0.0';

    // Subtextos dinámicos en tarjetas de KPIs
    const elMetaAcum = document.getElementById('kpiTargetMetaAcum');
    if (elMetaAcum) elMetaAcum.textContent = `Meta esperada a la hora (${horaCorte}): ${metaALaHora} uds`;

    const elMetaDia = document.getElementById('kpiTargetMetaDia');
    if (elMetaDia) elMetaDia.textContent = `Turno ${state.data.planta?.turnoActual || 1}: ${k.metaDiaria} uds programadas`;

    const elEsperado = document.getElementById('kpiTargetEsperado');
    if (elEsperado) elEsperado.textContent = `Esperado a la hora (${horaCorte}): ${esperadoPct}%`;

    const elTiempoRest = document.getElementById('kpiTargetTiempoRest');
    if (elTiempoRest) {
      elTiempoRest.textContent = 'Tiempo restante turno: 1h 00 min';
    }

    // Pills de toolbar
    const pillMeta = document.getElementById('pillToolbarMeta');
    const pillReal = document.getElementById('pillToolbarReal');
    const pillOee = document.getElementById('pillToolbarOee');
    const pillPend = document.getElementById('pillToolbarPend');
    const pillParos = document.getElementById('pillToolbarParos');
    const pillScrap = document.getElementById('pillToolbarScrap');

    if (pillMeta) pillMeta.textContent = `${k.metaDiaria} UDS`;
    if (pillReal) pillReal.textContent = `${k.unidadesCompletadas} UDS (${k.porcentajeAvance.toFixed(1)}%)`;
    if (pillOee) {
      pillOee.textContent = `${k.eficienciaOee.toFixed(1)}%`;
      pillOee.style.color = k.eficienciaOee >= 85 ? '#1E3A8A' : '#DC2626';
    }
    if (pillPend) pillPend.textContent = `${k.unidadesPendientes} UDS`;
    if (pillParos) pillParos.textContent = `${k.parosAcumuladosMin} MIN (${k.eventosParo || recordedHours.length} EV)`;
    if (pillScrap) pillScrap.textContent = `${(k.scrapPorcentaje || 0).toFixed(1)}% (${k.scrapPiezas || 0} PZ)`;

    const elParosEventos = document.getElementById('kpiParosEventos');
    if (elParosEventos) elParosEventos.textContent = `${k.eventosParo || recordedHours.length} eventos`;

    const elParosMttr = document.getElementById('kpiParosMttr');
    if (elParosMttr) {
      const evCount = k.eventosParo || recordedHours.length || 1;
      const mttr = (k.parosAcumuladosMin / evCount).toFixed(1);
      elParosMttr.textContent = `MTTR: ${mttr} min / evento`;
    }

    // Badges en cabecera de gráficas
    const elCumBadge = document.getElementById('chartCumulativeBadge');
    if (elCumBadge) {
      if (k.unidadesCompletadas === 0 && !lastActive) {
        elCumBadge.textContent = 'En espera de primer reporte';
        elCumBadge.style.color = '#64748B';
      } else {
        const diffVsPlan = lastActive ? (lastActive.acumReal - lastActive.acumMeta) : (k.unidadesCompletadas - metaALaHora);
        if (diffVsPlan >= 0) {
          elCumBadge.textContent = `Ritmo: +${diffVsPlan} pzas vs Plan (${horaCorte})`;
          elCumBadge.style.color = '#166534';
        } else {
          elCumBadge.textContent = `Ritmo: ${diffVsPlan} pzas vs Plan (${horaCorte})`;
          elCumBadge.style.color = '#DC2626';
        }
      }
    }

    const elDownBadge = document.getElementById('chartDowntimeBadge');
    if (elDownBadge) {
      elDownBadge.textContent = `Total: ${k.parosAcumuladosMin} min`;
      elDownBadge.style.color = k.parosAcumuladosMin > 0 ? '#DC2626' : '#166534';
    }
  }

  /**
   * Renderizar Diagrama de Avance de Estaciones (Flow - Retirado)
   */
  function renderStationsFlow() {
    // Apartado retirado
  }

  const OVERRIDES_STORAGE_KEY = 'BRP_TABLE_OVERRIDES_2026';

  /**
   * Cargar anulaciones manuales y estados de verificación guardados en localStorage
   */
  function applyStoredOverrides() {
    try {
      const stored = localStorage.getItem(OVERRIDES_STORAGE_KEY);
      if (stored) {
        const overrides = JSON.parse(stored);
        const hours = state.data.produccionHoraria || [];
        hours.forEach(h => {
          if (overrides[h.hora]) {
            const ov = overrides[h.hora];
            if (ov.real !== undefined && ov.real !== null) h.real = ov.real;
            if (ov.shiftAcumReal !== undefined && ov.shiftAcumReal !== null) h.shiftAcumReal = ov.shiftAcumReal;
            if (ov.acumReal !== undefined && ov.acumReal !== null) h.acumReal = ov.acumReal;
            if (ov.malas !== undefined && ov.malas !== null) h.malas = ov.malas;
            if (ov.op !== undefined && ov.op !== null) h.op = ov.op;
            if (ov.parosMin !== undefined && ov.parosMin !== null) h.parosMin = ov.parosMin;
            if (ov.comentario !== undefined && ov.comentario !== null) h.comentario = ov.comentario;
            if (ov.paros !== undefined && ov.paros !== null) h.paros = ov.paros;
            if (ov.isRecorded !== undefined) h.isRecorded = ov.isRecorded;
            if (ov.verificado !== undefined) h.verificado = !!ov.verificado;
          }
        });
      }
    } catch (e) {
      console.warn('Error leyendo anulaciones de localStorage:', e);
    }
  }

  /**
   * Recalcular todas las métricas, acumulados y KPIs a partir de los datos editados en la tabla
   */
  function recalculateAllMetrics(skipTableReRender = false) {
    const hours = state.data.produccionHoraria || [];
    let grandGood = 0;
    let grandScrap = 0;
    let grandParos = 0;

    const tTotals = {
      1: { real: 0, malas: 0, paros: 0, meta: 480 },
      2: { real: 0, malas: 0, paros: 0, meta: 450 },
      3: { real: 0, malas: 0, paros: 0, meta: 420 }
    };

    let diaAcumReal = 0;
    let shiftAcumReal = 0;
    let currentShiftNum = 1;

    hours.forEach(h => {
      const t = h.turnoNum || 1;
      if (t !== currentShiftNum) {
        currentShiftNum = t;
        shiftAcumReal = 0;
      }

      if (h.isRecorded && h.real !== null && h.real !== undefined) {
        const rVal = parseInt(h.real, 10) || 0;
        const mVal = parseInt(h.malas, 10) || 0;
        const pVal = parseInt(h.parosMin, 10) || 0;
        const buenasHora = Math.max(0, rVal - mVal);

        shiftAcumReal += buenasHora;
        diaAcumReal += buenasHora;

        h.shiftAcumReal = shiftAcumReal;
        h.acumReal = diaAcumReal;

        tTotals[t].real = shiftAcumReal;
        tTotals[t].malas += mVal;
        tTotals[t].paros += pVal;

        grandGood = diaAcumReal;
        grandScrap += mVal;
        grandParos += pVal;

        h.oeeHora = Math.round(Math.min(100, (rVal / (h.meta || 60)) * 100));
      }
    });

    const metaDiaria = state.data.resumenKpis?.metaDiaria || 1350;
    const avancePct = metaDiaria > 0 ? (grandGood / metaDiaria) * 100 : 0;
    const totalPzasBrutas = grandGood + grandScrap;
    const scrapPct = totalPzasBrutas > 0 ? (grandScrap / totalPzasBrutas) * 100 : 0;

    const disp = Math.max(0, Math.min(100, ((1440 - grandParos) / 1440) * 100));
    const rend = Math.min(100, avancePct);
    const cal = totalPzasBrutas > 0 ? (grandGood / totalPzasBrutas) * 100 : 100;
    const oee = Math.round(((disp * rend * cal) / 10000) * 10) / 10;

    let estado = 'PRODUCCION_EN_ORDEN';
    if (grandParos > 60) estado = 'PARO_DE_LINEA';
    else if (oee < 75 || scrapPct > 10) estado = 'PRODUCCION_DEFICIENTE';

    state.data.resumenKpis = Object.assign(state.data.resumenKpis || {}, {
      produccionDia: grandGood,
      unidadesCompletadas: grandGood,
      unidadesPendientes: Math.max(0, metaDiaria - grandGood),
      porcentajeAvance: avancePct,
      scrapPiezas: grandScrap,
      scrapPorcentaje: scrapPct,
      parosAcumuladosMin: grandParos,
      eficienciaOee: oee,
      disponibilidad: Math.round(disp * 10) / 10,
      rendimiento: Math.round(rend * 10) / 10,
      calidadFpy: Math.round(cal * 10) / 10,
      estadoLinea: estado
    });

    if (state.data.turnos) {
      if (state.data.turnos[0]) state.data.turnos[0].real = tTotals[1].real;
      if (state.data.turnos[1]) state.data.turnos[1].real = tTotals[2].real;
      if (state.data.turnos[2]) state.data.turnos[2].real = tTotals[3].real;
    }

    renderKpis();
    updateChartsForFilter();

    if (!skipTableReRender) {
      renderTable();
    } else {
      updateTotalizerRows(tTotals, { meta: metaDiaria, real: grandGood, malas: grandScrap, paros: grandParos });
    }

    saveOverridesToStorage();
  }

  function updateTotalizerRows(tTotals, grandTotal) {
    [1, 2, 3].forEach(tNum => {
      const elReal = document.querySelector(`.tot-real-t${tNum}`);
      const elAcum = document.querySelector(`.tot-acum-t${tNum}`);
      const elMalas = document.querySelector(`.tot-malas-t${tNum}`);
      const elParos = document.querySelector(`.tot-paros-t${tNum}`);
      if (elReal) elReal.textContent = tTotals[tNum].real;
      if (elAcum) elAcum.textContent = tTotals[tNum].real;
      if (elMalas) {
        elMalas.textContent = tTotals[tNum].malas;
        elMalas.style.color = tTotals[tNum].malas > 0 ? '#DC2626' : '#0F172A';
      }
      if (elParos) {
        elParos.textContent = `${tTotals[tNum].paros} min`;
        elParos.style.color = tTotals[tNum].paros > 0 ? '#DC2626' : '#0F172A';
      }
    });

    const elGReal = document.querySelector('.tot-grand-real');
    const elGAcum = document.querySelector('.tot-grand-acum');
    const elGMalas = document.querySelector('.tot-grand-malas');
    const elGParos = document.querySelector('.tot-grand-paros');
    if (elGReal) elGReal.textContent = grandTotal.real;
    if (elGAcum) elGAcum.textContent = grandTotal.real;
    if (elGMalas) elGMalas.textContent = grandTotal.malas;
    if (elGParos) elGParos.textContent = `${grandTotal.paros} min`;
  }

  function saveOverridesToStorage() {
    try {
      const overrides = {};
      (state.data.produccionHoraria || []).forEach(h => {
        overrides[h.hora] = {
          real: h.real,
          shiftAcumReal: h.shiftAcumReal,
          acumReal: h.acumReal,
          malas: h.malas,
          op: h.op,
          parosMin: h.parosMin,
          comentario: h.comentario,
          paros: h.paros,
          isRecorded: h.isRecorded,
          verificado: !!h.verificado
        };
      });
      localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
    } catch (e) {
      console.warn('Error guardando en localStorage:', e);
    }
  }

  let syncTimeout = null;
  function debouncedSyncBackend(h) {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      syncRowToBackend(h);
    }, 600);
  }

  function syncRowToBackend(h) {
    const payload = {
      hora: h.hora,
      real: h.real,
      realAc: h.shiftAcumReal !== undefined && h.shiftAcumReal !== null ? h.shiftAcumReal : h.acumReal,
      malas: h.malas,
      op: h.op,
      parosMin: h.parosMin,
      comentario: h.comentario || h.paros,
      verificado: !!h.verificado
    };

    const endpoints = [
      '/api/production/update-row',
      'http://localhost:8000/api/production/update-row'
    ];

    endpoints.forEach(url => {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    });
  }

  /**
   * Renderizar Tabla Oficial de Pizarra de Producción (Estructura PDF BRP Línea C)
   * Incluye las 24 horas continuas (Turnos 1, 2 y 3), checkbox de Verificado y celdas editables.
   */
  function renderTable() {
    const tbody = document.getElementById('tableWhiteboardBody') || document.getElementById('tableStationsBody');
    if (!tbody) return;

    let allHours = state.data.produccionHoraria || [];
    const query = (state.searchQuery || '').trim().toLowerCase();
    const shiftFilter = state.filterShift;
    const statusFilter = state.filterStatus;

    // Calcular totales por turno y acumulados
    const tTotals = {
      1: { meta: 480, real: 0, malas: 0, paros: 0, lider: (state.data.turnos?.[0]?.supervisor || 'Líder Antonia'), nota: 'Venta: 298 | Scrap: 115' },
      2: { meta: 450, real: 0, malas: 0, paros: 0, lider: (state.data.turnos?.[1]?.supervisor || 'Líder Javier'), nota: 'Venta: 256 | Scrap: 49' },
      3: { meta: 420, real: 0, malas: 0, paros: 0, lider: (state.data.turnos?.[2]?.supervisor || 'Ing. Diana Soto'), nota: 'En espera de inicio' }
    };

    allHours.forEach(h => {
      const t = h.turnoNum || 1;
      if (h.isRecorded) {
        if (h.real !== null && h.real !== undefined) tTotals[t].real += h.real;
        if (h.malas !== null && h.malas !== undefined) tTotals[t].malas += h.malas;
        if (h.parosMin) tTotals[t].paros += h.parosMin;
      }
    });

    const grandTotal = {
      meta: 1350,
      real: tTotals[1].real + tTotals[2].real + tTotals[3].real,
      malas: tTotals[1].malas + tTotals[2].malas + tTotals[3].malas,
      paros: tTotals[1].paros + tTotals[2].paros + tTotals[3].paros
    };

    // Función para verificar si una fila pasa los filtros
    function rowMatchesFilters(h) {
      if (shiftFilter !== 'all' && h.turnoNum !== parseInt(shiftFilter, 10)) {
        return false;
      }

      if (state.filterStation && state.filterStation !== 'all') {
        const opStr = (h.op || '').toUpperCase();
        const targetOp = state.filterStation.toUpperCase();
        if (!opStr.includes(targetOp)) return false;
      }

      if (statusFilter !== 'all') {
        const hasParo = (h.parosMin || 0) > 0 || (h.comentario && h.comentario.toLowerCase().includes('paro'));
        const hasScrap = (h.malas || 0) > 0;
        const isRun = !h.isRecorded || (h.comentario && h.comentario.toLowerCase().includes('curso'));
        const isOk = h.isRecorded && !hasParo && !hasScrap;

        if (statusFilter === 'OK' && !isOk) return false;
        if (statusFilter === 'RUN' && !isRun) return false;
        if (statusFilter === 'PEND' && !(hasParo || hasScrap)) return false;
      }

      if (query !== '') {
        const textToSearch = [
          h.hora,
          h.turno,
          h.comentario || '',
          h.paros || '',
          h.op || '',
          h.verificado ? 'verificado' : '',
          h.isRecorded ? 'registrado' : 'programado'
        ].join(' ').toLowerCase();

        if (!textToSearch.includes(query)) return false;
      }

      return true;
    }

    let rowsHtml = '';
    const turnosToShow = shiftFilter === 'all' ? [1, 2, 3] : [parseInt(shiftFilter, 10)];

    turnosToShow.forEach(tNum => {
      const shiftHours = allHours.filter(h => h.turnoNum === tNum);
      const filteredShiftHours = shiftHours.filter(rowMatchesFilters);

      filteredShiftHours.forEach(h => {
        let badgeHtml = '';
        let rowStyle = '';
        const isVerif = !!h.verificado;

        if (!h.isRecorded) {
          badgeHtml = '<span class="cell-badge" style="background:#F1F5F9; color:#64748B; border:1px solid #CBD5E1;">PROGRAMADO</span>';
          rowStyle = 'color: #94A3B8;';
        } else if (h.parosMin > 0) {
          badgeHtml = '<span class="cell-badge" style="background:#FEE2E2; color:#991B1B; border:1px solid #FCA5A5;">PARO</span>';
        } else if (h.malas > 0) {
          badgeHtml = '<span class="cell-badge" style="background:#FEF3C7; color:#92400E; border:1px solid #FCD34D;">SCRAP</span>';
        } else {
          badgeHtml = '<span class="cell-badge" style="background:#DCFCE7; color:#166534; border:1px solid #86EFAC;">OK</span>';
        }

        const realHVal = h.isRecorded && h.real !== null && h.real !== undefined ? h.real : '';
        const metaAc = h.shiftAcumMeta !== undefined ? h.shiftAcumMeta : h.acumMeta;
        const realAcVal = h.isRecorded && h.shiftAcumReal !== null && h.shiftAcumReal !== undefined ? h.shiftAcumReal : (h.acumReal !== null && h.acumReal !== undefined ? h.acumReal : '');
        const malasVal = h.isRecorded && h.malas !== null && h.malas !== undefined ? h.malas : (h.isRecorded ? 0 : '');
        const opVal = h.isRecorded ? (h.op || (tNum === 1 ? 'OP30' : 'OP20')) : '';
        const tiempoVal = h.isRecorded && h.parosMin !== null && h.parosMin !== undefined ? h.parosMin : (h.isRecorded ? 0 : '');
        const cmtText = h.isRecorded ? (h.comentario || h.paros || 'Producción en curso') : '';

        const verifiedBadge = isVerif ? '<div class="badge-verified-tag">✓ VERIFICADO</div>' : '';
        const rowClass = isVerif ? 'row-verified' : '';

        rowsHtml += `
          <tr class="${rowClass}" style="${rowStyle}" data-hora="${h.hora}">
            <td style="text-align: center; vertical-align: middle;">
              <input type="checkbox" class="verify-checkbox" data-hora="${h.hora}" ${isVerif ? 'checked' : ''} title="${isVerif ? 'Fila verificada (protegida contra sobreescritura automática por fotos)' : 'Marcar como verificado para proteger'}">
              ${verifiedBadge}
            </td>
            <td><strong style="color:${h.isRecorded ? '#173D60' : '#94A3B8'};">${h.hora}</strong></td>
            <td style="text-align: center;">${h.meta}</td>
            <td style="text-align: center;">
              <input type="number" class="table-cell-input input-real" data-hora="${h.hora}" data-field="real" value="${realHVal}" placeholder="--" min="0" max="200" title="Editar Real Pz/Hora">
            </td>
            <td style="text-align: center; color:#475569;">${metaAc}</td>
            <td style="text-align: center;">
              <input type="number" class="table-cell-input input-real-ac" data-hora="${h.hora}" data-field="realAc" value="${realAcVal}" placeholder="--" min="0" max="1500" title="Editar Real Acumulado">
            </td>
            <td style="text-align: center;">
              <input type="number" class="table-cell-input input-malas ${malasVal > 0 ? 'text-red' : ''}" data-hora="${h.hora}" data-field="malas" value="${malasVal}" placeholder="0" min="0" max="100" title="Editar Piezas Malas (Scrap)">
            </td>
            <td style="text-align: center;">
              <input type="text" class="table-cell-input input-op" style="width:50px; font-family:var(--font-mono); font-size:10px;" data-hora="${h.hora}" data-field="op" value="${opVal}" placeholder="OP--" title="Editar Estación OP">
            </td>
            <td style="text-align: center;">
              <input type="number" class="table-cell-input input-tiempo" style="width:48px;" data-hora="${h.hora}" data-field="parosMin" value="${tiempoVal}" placeholder="0" min="0" max="120" title="Editar Tiempo de Paro (minutos)">
            </td>
            <td>
              <input type="text" class="table-cell-input text-start input-comentario" data-hora="${h.hora}" data-field="comentario" value="${cmtText}" placeholder="${h.isRecorded ? 'Descripción de falla o paro...' : 'Hora programada / Por fabricar'}" title="Editar Paros y Descripción de Fallas">
            </td>
            <td style="text-align: center;" class="cell-status-container">${badgeHtml}</td>
          </tr>
        `;
      });

      // Fila Separador / Totalizador de Turno
      const tInfo = tTotals[tNum];
      if (filteredShiftHours.length > 0 && query === '') {
        rowsHtml += `
          <tr style="background-color: #E2E8F0; font-weight: 700; border-top: 2px solid #CBD5E1; border-bottom: 2px solid #94A3B8;">
            <td style="text-align: center; color: #64748B;">--</td>
            <td style="color: #0F172A; text-transform: uppercase;">Total ${tNum}er turno:</td>
            <td style="text-align: center; color: #0F172A;">${tInfo.meta}</td>
            <td style="text-align: center; color: #1F4E79; font-size: 12px;" class="tot-real-t${tNum}">${tInfo.real}</td>
            <td style="text-align: center; color: #0F172A;">${tInfo.meta}</td>
            <td style="text-align: center; color: #173D60; font-size: 12px;" class="tot-acum-t${tNum}">${tInfo.real}</td>
            <td style="text-align: center; color: ${tInfo.malas > 0 ? '#DC2626' : '#0F172A'};" class="tot-malas-t${tNum}">${tInfo.malas}</td>
            <td style="text-align: center;">--</td>
            <td style="text-align: center; color: ${tInfo.paros > 0 ? '#DC2626' : '#0F172A'};" class="tot-paros-t${tNum}">${tInfo.paros} min</td>
            <td colspan="2" style="font-size: 10.5px; color: #1E293B;">
              <strong>Líder:</strong> ${tInfo.lider} ${tInfo.nota ? `&nbsp;|&nbsp; <em>${tInfo.nota}</em>` : ''}
            </td>
          </tr>
        `;
      }
    });

    // Fila Total del Día (si se muestran todos los turnos y no hay búsqueda activa)
    if (shiftFilter === 'all' && query === '' && statusFilter === 'all') {
      rowsHtml += `
        <tr style="background-color: #CBD5E1; font-weight: 800; border-top: 2px solid #64748B;">
          <td style="text-align: center; color: #64748B;">--</td>
          <td style="color: #0F172A; font-size: 12px;">TOTAL DEL DÍA (24H):</td>
          <td style="text-align: center; font-size: 12px; color: #0F172A;">${grandTotal.meta}</td>
          <td style="text-align: center; font-size: 13px; color: #166534;" class="tot-grand-real">${grandTotal.real}</td>
          <td style="text-align: center; font-size: 12px; color: #0F172A;">${grandTotal.meta}</td>
          <td style="text-align: center; font-size: 13px; color: #166534;" class="tot-grand-acum">${grandTotal.real}</td>
          <td style="text-align: center; font-size: 12px; color: #DC2626;" class="tot-grand-malas">${grandTotal.malas}</td>
          <td style="text-align: center;">--</td>
          <td style="text-align: center; font-size: 12px; color: #DC2626;" class="tot-grand-paros">${grandTotal.paros} min</td>
          <td colspan="2" style="font-size: 11px; color: #0F172A;">
            Jornada Completa 24 Horas — BRP Línea C (Kolben Schmidt Celaya)
          </td>
        </tr>
      `;
    }

    if (!rowsHtml) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align: center; padding: 24px; color: #64748B;">
            No se encontraron registros de producción que coincidan con los filtros seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rowsHtml;
  }

  /**
   * Renderizar Alertas Operativas y Paros de Línea
   */
  function renderAlerts() {
    const container = document.getElementById('alertsListContainer');
    if (!container) return;

    const elCount = document.getElementById('alertsCountHeader');
    if (elCount && state.data.alertas) {
      elCount.textContent = `${state.data.alertas.length} EVENTOS Y PAROS REGISTRADOS EN LA JORNADA`;
    }

    if (!state.data.alertas || state.data.alertas.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--color-text-subtle); font-size: 13px;">
          ✅ No hay alertas activas en la Línea C. Sistema listo para recepción de fotos vía Telegram.
        </div>
      `;
      return;
    }

    container.innerHTML = state.data.alertas.map(a => {
      let itemClass = 'alert-info';
      let badgeClass = 'badge-info';
      let icon = 'ℹ️';

      if (a.tipo === 'CRITICA') {
        itemClass = 'alert-critica';
        badgeClass = 'badge-critica';
        icon = '🚨';
      } else if (a.tipo === 'ADVERTENCIA') {
        itemClass = 'alert-advertencia';
        badgeClass = 'badge-advertencia';
        icon = '⚠️';
      } else if (a.tipo === 'CALIDAD') {
        itemClass = 'alert-calidad';
        badgeClass = 'badge-calidad';
        icon = '🔍';
      }

      return `
        <div class="alert-item ${itemClass}">
          <div class="alert-icon">${icon}</div>
          <div class="alert-content">
            <div class="alert-header-row">
              <span class="alert-title">${a.titulo}</span>
              <span class="alert-badge ${badgeClass}">${a.tipo}</span>
            </div>
            <div class="alert-desc">${a.descripcion}</div>
            <div class="alert-footer-meta">
              <span>📍 Estación: <strong>${a.estacion}</strong></span>
              <span>⏰ Hora: <strong>${a.hora}</strong></span>
              <span>⌛ ${a.tiempoTranscurrido}</span>
              <span>Estatus: <strong>${a.resuelta ? '✅ Resuelta' : '🟡 En Monitoreo'}</strong></span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Helper para obtener las horas según el filtro de turno seleccionado.
   * En vista general ('all'), retorna los 23 bloques que cubren las 24 horas del día industrial (Turnos 1, 2 y 3).
   */
  function getHoursForCharts(dataObj) {
    let hours = (dataObj || state.data).produccionHoraria || [];
    if (state.filterShift !== 'all') {
      const tId = parseInt(state.filterShift, 10);
      hours = hours.filter(h => h.turnoNum === tId);
    }
    return hours;
  }

  /**
   * Inicialización de Gráficas Chart.js — 24 Horas con proyección completa y horas futuras en blanco
   */
  function initCharts() {
    Chart.defaults.font.family = 'ui-sans-serif, system-ui, -apple-system, sans-serif';
    Chart.defaults.color = '#475569';

    const hours = getHoursForCharts();

    // 1. Gráfica Producción por Hora (Real vs Meta)
    const ctxHourly = document.getElementById('chartHourlyCanvas');
    if (ctxHourly) {
      const labels = hours.map(h => h.hora.split(' - ')[0]);
      const dataMeta = hours.map(h => h.meta);
      // Las horas futuras sin registro van como null para que aparezcan estrictamente en blanco
      const dataReal = hours.map(h => (h.isRecorded && h.real !== null && h.real !== undefined) ? h.real : null);

      chartHourly = new Chart(ctxHourly, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Producción Real (uds)',
              data: dataReal,
              backgroundColor: '#1F4E79',
              borderRadius: 4,
              order: 2
            },
            {
              label: 'Meta Horaria (uds)',
              data: dataMeta,
              type: 'line',
              borderColor: '#F59E0B',
              borderWidth: 2.5,
              borderDash: [4, 4],
              pointBackgroundColor: '#F59E0B',
              pointRadius: 4,
              fill: false,
              order: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10, weight: '700' } } },
            tooltip: {
              callbacks: {
                afterBody: (ctx) => {
                  const idx = ctx[0].dataIndex;
                  const h = hours[idx];
                  if (!h || !h.isRecorded) return 'Hora programada / Por fabricar';
                  return `Paros: ${h.parosMin || 0} min\n${h.comentario || ''}`;
                }
              }
            }
          },
          scales: {
            y: { beginAtZero: true, suggestedMax: 95, grid: { color: '#F1F5F9' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 2. Gráfica Curva de Avance Acumulado (Curva S 24 Horas)
    const ctxCumulative = document.getElementById('chartCumulativeCanvas');
    if (ctxCumulative) {
      const labels = hours.map(h => h.hora.split(' - ')[0]);
      const isShiftFiltered = state.filterShift !== 'all';
      const acumMeta = isShiftFiltered
        ? hours.map(h => (h.shiftAcumMeta !== undefined ? h.shiftAcumMeta : h.acumMeta))
        : hours.map(h => h.acumMeta);
      // Acumulado real se corta en la última hora registrada; horas futuras quedan en blanco (null con spanGaps: false)
      const acumReal = isShiftFiltered
        ? hours.map(h => (h.isRecorded && h.shiftAcumReal !== null && h.shiftAcumReal !== undefined) ? h.shiftAcumReal : ((h.isRecorded && h.acumReal !== null) ? h.acumReal : null))
        : hours.map(h => (h.isRecorded && h.acumReal !== null && h.acumReal !== undefined) ? h.acumReal : null);

      chartCumulative = new Chart(ctxCumulative, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Acumulado Real',
              data: acumReal,
              borderColor: '#173D60',
              backgroundColor: 'rgba(23, 61, 96, 0.08)',
              borderWidth: 3,
              fill: true,
              tension: 0.3,
              spanGaps: false,
              pointRadius: (ctx) => (ctx.raw !== null && ctx.raw !== undefined ? 4 : 0),
              pointBackgroundColor: '#173D60'
            },
            {
              label: 'Meta Acumulada Proyectada (1350 uds)',
              data: acumMeta,
              borderColor: '#F59E0B',
              borderWidth: 2,
              borderDash: [5, 5],
              fill: false,
              tension: 0.1,
              pointRadius: 3,
              pointBackgroundColor: '#F59E0B'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10, weight: '700' } } }
          },
          scales: {
            y: {
              beginAtZero: true,
              suggestedMax: state.filterShift !== 'all' ? 520 : 1400,
              grid: { color: '#F1F5F9' }
            },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 3. Gráfica de Análisis de Paros (Pareto de Causas)
    const ctxDowntime = document.getElementById('chartDowntimeCanvas');
    if (ctxDowntime) {
      const paros = state.data.parosIncidencias || [];
      const labels = paros.length > 0 ? paros.map(p => p.causa || p.categoria) : ['Sin paros activos'];
      const dataVals = paros.length > 0 ? paros.map(p => p.duracionMin || 1) : [0];
      const palette = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#64748B', '#F97316', '#06B6D4'];
      const bgColors = paros.length > 0 ? paros.map((_, i) => palette[i % palette.length]) : ['#10B981'];

      chartDowntime = new Chart(ctxDowntime, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: dataVals,
            backgroundColor: bgColors
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9.5 } } }
          },
          cutout: '62%'
        }
      });
    }
  }

  /**
   * Configuración de Escuchadores de Eventos
   */
  function setupEventListeners() {
    // Filtro de Turno
    const selectShift = document.getElementById('filterShift');
    if (selectShift) {
      selectShift.addEventListener('change', (e) => {
        state.filterShift = e.target.value;
        showToast(`Filtro aplicado: ${e.target.options[e.target.selectedIndex].text}`);
        renderTable();
        updateChartsForFilter();
      });
    }

    // Filtro de Modelo
    const selectModel = document.getElementById('filterModel');
    if (selectModel) {
      selectModel.addEventListener('change', (e) => {
        state.filterModel = e.target.value;
        const optText = e.target.options[e.target.selectedIndex].text;
        showToast(`Filtro modelo: ${optText}`);
        renderTable();
      });
    }

    // Filtro de Fecha
    const inputDate = document.getElementById('filterDate');
    if (inputDate) {
      inputDate.addEventListener('change', (e) => {
        showToast(`Fecha de producción: ${e.target.value}`);
        renderTable();
      });
    }

    // Filtro de Estado
    const selectStatus = document.getElementById('filterStatus');
    if (selectStatus) {
      selectStatus.addEventListener('change', (e) => {
        state.filterStatus = e.target.value;
        const optText = e.target.options[e.target.selectedIndex].text;
        showToast(`Filtro estado: ${optText}`);
        renderTable();
      });
    }

    // Buscador en tabla
    const searchInput = document.getElementById('tableSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderTable();
      });
    }

    // Delegación de eventos para edición manual en la tabla de producción y verificación de filas
    const tableBody = document.getElementById('tableWhiteboardBody') || document.getElementById('tableStationsBody');
    if (tableBody) {
      // Edición de valores en celdas (input en tiempo real)
      tableBody.addEventListener('input', (e) => {
        const input = e.target;
        if (!input.classList.contains('table-cell-input')) return;

        const hora = input.dataset.hora;
        const field = input.dataset.field;
        const h = (state.data.produccionHoraria || []).find(row => row.hora === hora);
        if (!h) return;

        const val = input.value.trim();
        if (field === 'real') {
          h.real = val === '' ? null : Math.max(0, parseInt(val, 10));
          if (val !== '') h.isRecorded = true;
        } else if (field === 'realAc') {
          h.shiftAcumReal = val === '' ? null : Math.max(0, parseInt(val, 10));
          h.shiftAcumRealManual = true;
          h.acumReal = h.shiftAcumReal;
        } else if (field === 'malas') {
          h.malas = val === '' ? 0 : Math.max(0, parseInt(val, 10));
          input.classList.toggle('text-red', (h.malas || 0) > 0);
        } else if (field === 'op') {
          h.op = val;
        } else if (field === 'parosMin') {
          h.parosMin = val === '' ? 0 : Math.max(0, parseInt(val, 10));
        } else if (field === 'comentario') {
          h.comentario = val;
          h.paros = val;
        }

        // Recalcular métricas, acumulados y gráficas en vivo (conservando foco en el input activo)
        recalculateAllMetrics(true);
        debouncedSyncBackend(h);
      });

      // Cambio en el checkbox de Verificación
      tableBody.addEventListener('change', (e) => {
        const target = e.target;
        if (!target.classList.contains('verify-checkbox')) return;

        const hora = target.dataset.hora;
        const h = (state.data.produccionHoraria || []).find(row => row.hora === hora);
        if (!h) return;

        h.verificado = target.checked;
        const rowEl = target.closest('tr');
        if (rowEl) {
          rowEl.classList.toggle('row-verified', h.verificado);
        }

        saveOverridesToStorage();
        syncRowToBackend(h);

        // Re-renderizar para actualizar badges y recalcular
        recalculateAllMetrics(false);

        if (h.verificado) {
          showToast(`🔒 Fila ${hora} VERIFICADA: protegida contra sobreescritura por fotos`);
        } else {
          showToast(`🔓 Fila ${hora} desmarcada`);
        }
      });
    }

    // Botón Simular Producción (+1 Unidad)
    const btnSimulate = document.getElementById('btnSimulate');
    if (btnSimulate) {
      btnSimulate.addEventListener('click', () => {
        simulateProductionUnit();
      });
    }

    // Botón Descargar CSV
    const btnDownloadCsv = document.getElementById('btnDownloadCsv');
    if (btnDownloadCsv) {
      btnDownloadCsv.addEventListener('click', () => {
        exportCsv();
      });
    }

    // Botón Imprimir / PDF
    const btnPrint = document.getElementById('btnPrintReport');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }

    // Botón Pantalla Completa
    const btnFullscreen = document.getElementById('btnFullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Botón Limpiar Filtros
    const btnResetFilters = document.getElementById('btnResetFilters');
    if (btnResetFilters) {
      btnResetFilters.addEventListener('click', () => {
        state.filterShift = 'all';
        state.filterStation = 'all';
        state.filterModel = 'all';
        state.filterStatus = 'all';
        state.searchQuery = '';
        if (selectShift) selectShift.value = 'all';
        if (selectModel) selectModel.value = 'all';
        if (selectStatus) selectStatus.value = 'all';
        if (inputDate) inputDate.value = new Date().toISOString().split('T')[0];
        if (searchInput) searchInput.value = '';
        renderTable();
        updateChartsForFilter();
        showToast('Filtros restablecidos');
      });
    }

    // Actualizar gráficas según filtro de turno (mostrando la jornada de 24 horas y horas futuras en blanco)
    function updateChartsForFilter() {
      const hours = getHoursForCharts();
      if (chartHourly) {
        chartHourly.data.labels = hours.map(h => h.hora.split(' - ')[0]);
        chartHourly.data.datasets[0].data = hours.map(h => (h.isRecorded && h.real !== null && h.real !== undefined) ? h.real : null);
        chartHourly.data.datasets[1].data = hours.map(h => h.meta);
        chartHourly.options.scales.y.suggestedMax = 95;
        chartHourly.update();
      }
      if (chartCumulative) {
        const isShiftFiltered = state.filterShift !== 'all';
        chartCumulative.data.labels = hours.map(h => h.hora.split(' - ')[0]);
        chartCumulative.data.datasets[0].data = isShiftFiltered
          ? hours.map(h => (h.isRecorded && h.shiftAcumReal !== null && h.shiftAcumReal !== undefined) ? h.shiftAcumReal : ((h.isRecorded && h.acumReal !== null) ? h.acumReal : null))
          : hours.map(h => (h.isRecorded && h.acumReal !== null && h.acumReal !== undefined) ? h.acumReal : null);
        chartCumulative.data.datasets[1].data = isShiftFiltered
          ? hours.map(h => (h.shiftAcumMeta !== undefined ? h.shiftAcumMeta : h.acumMeta))
          : hours.map(h => h.acumMeta);
        chartCumulative.options.scales.y.suggestedMax = isShiftFiltered ? 520 : 1400;
        chartCumulative.update();
      }
    }

    // Botón Cambio de Turno Oficial (Esquina Superior Derecha)
    const btnShiftChange = document.getElementById('btnShiftChange');
    if (btnShiftChange) {
      btnShiftChange.addEventListener('click', () => {
        handleShiftChange();
      });
    }

    // Botón Reset General de Datos (Esquina Superior Derecha)
    const btnResetData = document.getElementById('btnResetData');
    if (btnResetData) {
      btnResetData.addEventListener('click', () => {
        handleResetData();
      });
    }
  }

  const CSV_STORAGE_KEY = 'BRP_PERSISTENT_CSV_RECORDS';

  /**
   * Obtiene la lista persistente de registros históricos para el archivo CSV.
   * Si no existe en localStorage, se inicializa con los registros reales de la pizarra.
   */
  function getPersistentCsvRecords() {
    let records = [];
    try {
      const stored = localStorage.getItem(CSV_STORAGE_KEY);
      if (stored) {
        records = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error leyendo CSV histórico de localStorage:', e);
    }

    if (!records || records.length === 0) {
      // Semilla inicial oficial con los datos de 8 horas extraídos de la pizarra
      records = [
        { fecha: '2026-11-06', turno: 'Primero: 06:30 a 15:00 hrs', horario: '06:30 - 08:00', linea: 'C', producto: 'WOLF V1', lider: 'Antonia', obj_pz_hora: 90, real_pz_hora: 96, obj_acumulado: 90, real_acumulado: 80, piezas_malas: 16, tiempo_minutos: 0, paros: '', estado: 'PRODUCCION_EN_ORDEN', timestamp: '2026-11-06 08:00:00' },
        { fecha: '2026-11-06', turno: 'Primero: 06:30 a 15:00 hrs', horario: '08:00 - 09:00', linea: 'C', producto: 'WOLF V1', lider: 'Antonia', obj_pz_hora: 60, real_pz_hora: 42, obj_acumulado: 150, real_acumulado: 100, piezas_malas: 22, tiempo_minutos: 25, paros: '* Golpe en cabeza op 20', estado: 'ADVERTENCIA_OPERATIVA', timestamp: '2026-11-06 09:00:00' },
        { fecha: '2026-11-06', turno: 'Primero: 06:30 a 15:00 hrs', horario: '09:00 - 10:00', linea: 'C', producto: 'WOLF V1', lider: 'Antonia', obj_pz_hora: 60, real_pz_hora: 19, obj_acumulado: 210, real_acumulado: 100, piezas_malas: 19, tiempo_minutos: 20, paros: '* Golpe en cabeza * marca de rebarba', estado: 'PRODUCCION_DEFICIENTE', timestamp: '2026-11-06 10:00:00' },
        { fecha: '2026-11-06', turno: 'Primero: 06:30 a 15:00 hrs', horario: '10:00 - 11:00', linea: 'C', producto: 'WOLF V1', lider: 'Antonia', obj_pz_hora: 60, real_pz_hora: 16, obj_acumulado: 270, real_acumulado: 100, piezas_malas: 16, tiempo_minutos: 0, paros: 'Cadencia frenada', estado: 'PRODUCCION_DEFICIENTE', timestamp: '2026-11-06 11:00:00' },
        { fecha: '2026-11-06', turno: 'Primero: 06:30 a 15:00 hrs', horario: '11:00 - 12:00', linea: 'C', producto: 'WOLF V1', lider: 'Antonia', obj_pz_hora: 30, real_pz_hora: 18, obj_acumulado: 300, real_acumulado: 100, piezas_malas: 18, tiempo_minutos: 15, paros: 'Ajuste DNs en TF', estado: 'PRODUCCION_DEFICIENTE', timestamp: '2026-11-06 12:00:00' },
        { fecha: '2026-11-06', turno: 'Primero: 06:30 a 15:00 hrs', horario: '12:00 - 13:00', linea: 'C', producto: 'WOLF V1', lider: 'Antonia', obj_pz_hora: 60, real_pz_hora: 36, obj_acumulado: 360, real_acumulado: 120, piezas_malas: 16, tiempo_minutos: 0, paros: '', estado: 'PRODUCCION_DEFICIENTE', timestamp: '2026-11-06 13:00:00' },
        { fecha: '2026-11-06', turno: 'Primero: 06:30 a 15:00 hrs', horario: '13:00 - 14:00', linea: 'C', producto: 'WOLF V1', lider: 'Antonia', obj_pz_hora: 60, real_pz_hora: 59, obj_acumulado: 420, real_acumulado: 165, piezas_malas: 14, tiempo_minutos: 0, paros: '', estado: 'PRODUCCION_DEFICIENTE', timestamp: '2026-11-06 14:00:00' },
        { fecha: '2026-11-06', turno: 'Primero: 06:30 a 15:00 hrs', horario: '14:00 - 15:00', linea: 'C', producto: 'WOLF V1', lider: 'Antonia', obj_pz_hora: 60, real_pz_hora: 30, obj_acumulado: 480, real_acumulado: 185, piezas_malas: 10, tiempo_minutos: 0, paros: 'Venta => 185 | Scrap: 131', estado: 'PRODUCCION_DEFICIENTE', timestamp: '2026-11-06 15:00:00' }
      ];
      try {
        localStorage.setItem(CSV_STORAGE_KEY, JSON.stringify(records));
      } catch (e) {}
    }
    return records;
  }

  /**
   * Asegura que los registros de producción activos se almacenen en el CSV persistente.
   */
  function persistCurrentRecordsToCsv(currentData) {
    if (!currentData || !currentData.produccionHoraria) return;
    const records = getPersistentCsvRecords();
    const shiftName = currentData.turnos?.[0]?.nombre || 'Primero: 06:30 a 15:00 hrs';
    const leader = currentData.planta?.supervisorActual || 'Líder Antonia';
    const prodName = currentData.planta?.productoActual || 'WOLF V1';

    currentData.produccionHoraria.forEach(h => {
      if (h.real > 0 || h.malas > 0 || (h.comentario && !h.comentario.includes('En espera'))) {
        const existingIdx = records.findIndex(r => r.horario === h.hora && r.turno === shiftName);
        const item = {
          fecha: new Date().toISOString().slice(0, 10),
          turno: shiftName,
          horario: h.hora,
          linea: 'C',
          producto: prodName,
          lider: leader,
          obj_pz_hora: h.meta,
          real_pz_hora: h.real,
          obj_acumulado: h.acumMeta,
          real_acumulado: h.acumReal,
          piezas_malas: h.malas || 0,
          tiempo_minutos: h.parosMin || 0,
          paros: h.comentario || '',
          estado: currentData.resumenKpis?.estadoLinea || 'PRODUCCION_EN_ORDEN',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
        };

        if (existingIdx >= 0) {
          records[existingIdx] = item;
        } else {
          records.push(item);
        }
      }
    });

    try {
      localStorage.setItem(CSV_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {}
  }

  const SHIFT_CONFIGS = {
    1: {
      id: 1,
      nombre: 'Turno 1 - Matutino',
      horario: '06:30 - 15:00',
      supervisor: 'Líder Antonia',
      meta: 480,
      horas: [
        { hora: '06:30 - 08:00', meta: 90, acumMeta: 90 },
        { hora: '08:00 - 09:00', meta: 60, acumMeta: 150 },
        { hora: '09:00 - 10:00', meta: 60, acumMeta: 210 },
        { hora: '10:00 - 11:00', meta: 60, acumMeta: 270 },
        { hora: '11:00 - 12:00', meta: 30, acumMeta: 300 },
        { hora: '12:00 - 13:00', meta: 60, acumMeta: 360 },
        { hora: '13:00 - 14:00', meta: 60, acumMeta: 420 },
        { hora: '14:00 - 15:00', meta: 60, acumMeta: 480 }
      ]
    },
    2: {
      id: 2,
      nombre: 'Turno 2 - Vespertino',
      horario: '15:00 - 23:00',
      supervisor: 'Ing. Roberto Garza',
      meta: 450,
      horas: [
        { hora: '15:00 - 16:00', meta: 60, acumMeta: 60 },
        { hora: '16:00 - 17:00', meta: 60, acumMeta: 120 },
        { hora: '17:00 - 18:00', meta: 60, acumMeta: 180 },
        { hora: '18:00 - 19:00', meta: 60, acumMeta: 240 },
        { hora: '19:00 - 20:00', meta: 30, acumMeta: 270 },
        { hora: '20:00 - 21:00', meta: 60, acumMeta: 330 },
        { hora: '21:00 - 22:00', meta: 60, acumMeta: 390 },
        { hora: '22:00 - 23:00', meta: 60, acumMeta: 450 }
      ]
    },
    3: {
      id: 3,
      nombre: 'Turno 3 - Nocturno',
      horario: '23:00 - 06:30',
      supervisor: 'Ing. Diana Soto',
      meta: 420,
      horas: [
        { hora: '23:00 - 24:00', meta: 60, acumMeta: 60 },
        { hora: '24:00 - 01:00', meta: 60, acumMeta: 120 },
        { hora: '01:00 - 02:00', meta: 60, acumMeta: 180 },
        { hora: '02:00 - 03:00', meta: 60, acumMeta: 240 },
        { hora: '03:00 - 04:00', meta: 30, acumMeta: 270 },
        { hora: '04:00 - 05:00', meta: 60, acumMeta: 330 },
        { hora: '05:00 - 06:30', meta: 90, acumMeta: 420 }
      ]
    }
  };

  /**
   * Genera y descarga el archivo CSV oficial dedicado para el turno saliente.
   */
  function archiveShiftToCsv(shiftId) {
    const sId = shiftId || state.data.planta?.turnoActual || 1;
    const cfg = SHIFT_CONFIGS[sId] || SHIFT_CONFIGS[1];
    const todayStr = new Date().toISOString().slice(0, 10);
    const k = state.data.resumenKpis || {};
    const supervisor = state.data.planta?.supervisorActual || cfg.supervisor;
    const producto = state.data.planta?.productoActual || 'WOLF V1 (Pistón BRP)';

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += '# =============================================================================\r\n';
    csvContent += '# BRP ROTAX MÉXICO — PLANTA KOLBEN SCHMIDT CELAYA\r\n';
    csvContent += `# REPORTE OFICIAL DE CIERRE DE TURNO: ${cfg.nombre.toUpperCase()}\r\n`;
    csvContent += `# Fecha: ${todayStr} | Turno: ${cfg.nombre} (${cfg.horario} hrs)\r\n`;
    csvContent += `# Supervisor: ${supervisor} | Producto: ${producto}\r\n`;
    csvContent += `# Producción Real: ${k.produccionDia || 0} uds | Meta: ${k.metaDiaria || cfg.meta} uds | Cumplimiento: ${(k.porcentajeAvance || 0).toFixed(1)}%\r\n`;
    csvContent += `# Scrap / NOK: ${k.scrapPiezas || 0} uds (${(k.scrapPorcentaje || 0).toFixed(1)}%) | Paros: ${k.parosAcumuladosMin || 0} min (${k.eventosParo || 0} eventos)\r\n`;
    csvContent += `# Eficiencia OEE: ${(k.eficienciaOee || 0).toFixed(1)}% | Estado Final: ${k.estadoLinea || 'PRODUCCION_EN_ORDEN'}\r\n`;
    csvContent += `# Fecha/Hora de Cierre: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC\r\n`;
    csvContent += '# =============================================================================\r\n';
    csvContent += 'Fecha,Turno,Horario,Linea,Producto,Lider,Obj_Pz_Hora,Real_Pz_Hora,Obj_Acumulado,Real_Acumulado,Piezas_Malas_Scrap,Tiempo_Minutos_Paro,Causa_Paro_Incidencia,Estado_Linea,Timestamp_Registro\r\n';

    (state.data.produccionHoraria || []).forEach(h => {
      const row = [
        todayStr,
        `"${cfg.nombre} (${cfg.horario})"`,
        `"${h.hora}"`,
        '"C"',
        `"${producto}"`,
        `"${supervisor}"`,
        h.meta ?? 0,
        h.real ?? 0,
        h.acumMeta ?? 0,
        h.acumReal ?? 0,
        h.malas ?? 0,
        h.parosMin ?? 0,
        `"${(h.comentario || '').replace(/"/g, '""')}"`,
        `"${k.estadoLinea || 'PRODUCCION_EN_ORDEN'}"`,
        `"${new Date().toISOString()}"`
      ];
      csvContent += row.join(',') + '\r\n';
    });

    if (state.data.parosIncidencias && state.data.parosIncidencias.length > 0) {
      csvContent += '\r\n';
      csvContent += '# DESGLOSE DETALLADO DE PAROS E INCIDENCIAS DEL TURNO\r\n';
      csvContent += 'ID,Horario,Duracion_Min,Estacion,Causa_Motivo,Tipo_Impacto,Estatus\r\n';
      state.data.parosIncidencias.forEach(p => {
        csvContent += [
          p.id || 'PARO',
          `"${p.hora || ''}"`,
          p.duracionMin || 0,
          `"${p.estacion || 'OP30'}"`,
          `"${(p.causa || '').replace(/"/g, '""')}"`,
          `"${p.categoria || 'CRITICA'}"`,
          '"Registrado"'
        ].join(',') + '\r\n';
      });
    }

    const slug = cfg.nombre.split(' - ')[1] || 'Matutino';
    const filename = `Turno_${cfg.id}_${slug}_${todayStr}.csv`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    try {
      const archivedHistory = JSON.parse(localStorage.getItem('BRP_ARCHIVED_SHIFTS') || '[]');
      archivedHistory.push({
        shiftId: cfg.id,
        shiftName: cfg.nombre,
        date: todayStr,
        filename: filename,
        totalProduced: k.produccionDia || 0,
        target: k.metaDiaria || cfg.meta,
        totalDowntimeMin: k.parosAcumuladosMin || 0,
        oee: k.eficienciaOee || 0.0,
        archivedAt: new Date().toISOString()
      });
      localStorage.setItem('BRP_ARCHIVED_SHIFTS', JSON.stringify(archivedHistory));
    } catch (e) {}

    return filename;
  }

  /**
   * Ejecuta el Cambio de Turno Oficial:
   * 1. Archiva y descarga el CSV del turno saliente.
   * 2. Limpia todos los datos del dashboard a ceros.
   * 3. Configura la cuadrícula horaria y metas del nuevo turno.
   */
  function handleShiftChange(targetShiftNum) {
    const currentShiftId = state.data.planta?.turnoActual || 1;
    const currentCfg = SHIFT_CONFIGS[currentShiftId] || SHIFT_CONFIGS[1];
    const nextShiftId = targetShiftNum || ((currentShiftId % 3) + 1);
    const nextCfg = SHIFT_CONFIGS[nextShiftId] || SHIFT_CONFIGS[2];

    const confirmed = window.confirm(
      `¿Desea confirmar el CAMBIO DE TURNO?\n\n` +
      `• Turno Saliente: ${currentCfg.nombre} (${currentCfg.horario} hrs)\n` +
      `• Turno Entrante: ${nextCfg.nombre} (${nextCfg.horario} hrs)\n\n` +
      `ACCIONES AUTOMÁTICAS:\n` +
      `1. Se archivará y descargará el archivo CSV oficial de ${currentCfg.nombre}.\n` +
      `2. Se restablecerán todos los datos del dashboard a ceros.\n` +
      `3. Se activará la grilla de producción para el ${nextCfg.nombre} (Meta: ${nextCfg.meta} uds).`
    );

    if (!confirmed) return;

    // 1. Archivar y descargar el documento CSV del turno saliente
    const csvName = archiveShiftToCsv(currentShiftId);

    // 2. Notificar al backend FastAPI para archivar en disco y reiniciar telemetría
    try {
      fetch(`/api/shift-change?target_shift=${nextShiftId}`, { method: 'POST' }).catch(() => {});
    } catch (e) {}

    // 3. Crear el estado limpio para el nuevo turno
    const cleanHours = nextCfg.horas.map(h => ({
      hora: h.hora,
      meta: h.meta,
      real: 0,
      acumMeta: h.acumMeta,
      acumReal: 0,
      oeeHora: 0.0,
      parosMin: 0,
      malas: 0,
      comentario: 'En espera de primer reporte Telegram'
    }));

    const cleanData = {
      planta: {
        nombre: 'BRP ROTAX MÉXICO S.A. de C.V.',
        plantaId: 'PLANTA KOLBEN SCHMIDT CELAYA - LÍNEA C',
        linea: 'Línea C — Ensamble y Mecanizado de Pistón WOLF V1',
        versionSistema: 'v2.8.0-OCR-LIVE',
        tiempoCicloTargetSeg: 45.0,
        metaTurnoUnidades: nextCfg.meta,
        supervisorActual: nextCfg.supervisor,
        productoActual: 'WOLF V1 (Pistón BRP)',
        turnoActual: nextShiftId
      },
      resumenKpis: {
        produccionDia: 0,
        metaDiaria: nextCfg.meta,
        porcentajeAvance: 0.0,
        unidadesCompletadas: 0,
        unidadesPendientes: nextCfg.meta,
        eficienciaOee: 0.0,
        disponibilidad: 100.0,
        rendimiento: 0.0,
        calidadFpy: 100.0,
        parosAcumuladosMin: 0,
        eventosParo: 0,
        taktTimeSeg: 45.0,
        scrapPiezas: 0,
        scrapPorcentaje: 0.0,
        estadoLinea: 'PRODUCCION_EN_ORDEN'
      },
      turnos: [
        { id: 1, nombre: 'Turno 1 - Matutino', horario: '06:30 - 15:00', supervisor: 'Líder Antonia', meta: 480, real: 0, oee: 0.0, activo: nextShiftId === 1 },
        { id: 2, nombre: 'Turno 2 - Vespertino', horario: '15:00 - 23:00', supervisor: 'Ing. Roberto Garza', meta: 450, real: 0, oee: 0.0, activo: nextShiftId === 2 },
        { id: 3, nombre: 'Turno 3 - Nocturno', horario: '23:00 - 06:30', supervisor: 'Ing. Diana Soto', meta: 420, real: 0, oee: 0.0, activo: nextShiftId === 3 }
      ],
      modelos: [
        { id: 'M01', codigo: 'PISTON-WOLF-V1', nombre: 'Pistón WOLF V1 (Línea C)', cilindros: 1, hp: 0, plataforma: 'BRP Rotax Engine Program', activo: true }
      ],
      produccionHoraria: cleanHours,
      parosIncidencias: [],
      estaciones: [
        { id: 'OP10', nombre: 'Mecanizado de Falda y Corona WOLF V1', equipo: 'Torno / Centro CNC OP10', operador: 'Téc. Línea C', metaPzas: nextCfg.meta, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP20', nombre: 'Ranurado de Anillos y Barrenado de Perno', equipo: 'Ranuradora de Precisión OP20', operador: 'Téc. Línea C', metaPzas: nextCfg.meta, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP30', nombre: 'Lavado Térmico y Desengrase', equipo: 'Lavadora Ultrasónica OP30', operador: 'Téc. Línea C', metaPzas: nextCfg.meta, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP40', nombre: 'Acabado de Superficie / Recubrimiento', equipo: 'Cabina de Grafito / Moly OP40', operador: 'Téc. Línea C', metaPzas: nextCfg.meta, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP50', nombre: 'Inspección Dimensional Neumática', equipo: 'Gage de Aire Multidiametral OP50', operador: 'Téc. Calidad', metaPzas: nextCfg.meta, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP60', nombre: 'Inspección Final EOL & Marcado Láser', equipo: 'Estación de Visión y Embalaje OP60', operador: 'Téc. Calidad', metaPzas: nextCfg.meta, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' }
      ],
      alertas: [
        {
          id: 'ALT-NEW-SHIFT',
          tipo: 'INFO',
          titulo: `${nextCfg.nombre} Iniciado — Línea C`,
          descripcion: `Dashboard limpio y preparado para ${nextCfg.nombre} (${nextCfg.horario} hrs). Meta programada: ${nextCfg.meta} unidades. En espera de la primera captura vía Telegram.`,
          estacion: 'LÍNEA C COMPLETA',
          hora: nextCfg.horas[0].hora,
          tiempoTranscurrido: 'Inicio de Turno',
          resuelta: true
        }
      ]
    };

    // 4. Aplicar al estado reactivo y guardar
    state.data = JSON.parse(JSON.stringify(cleanData));
    try {
      localStorage.setItem('BRP_DASHBOARD_RESET_ACTIVE', 'true');
      localStorage.setItem('BRP_DASHBOARD_RESET_DATA', JSON.stringify(cleanData));
      localStorage.setItem('BRP_DASHBOARD_RESET_TIME', Date.now().toString());
    } catch (e) {}

    // 5. Re-renderizar módulos visuales en ceros
    renderKpis();
    renderHeroWidgets();
    renderAlerts();

    // 6. Actualizar gráficas para el nuevo turno
    if (chartHourly) {
      chartHourly.data.labels = cleanHours.map(h => h.hora.split(' - ')[0]);
      chartHourly.data.datasets[0].data = cleanHours.map(() => 0);
      chartHourly.data.datasets[1].data = cleanHours.map(h => h.meta);
      chartHourly.update();
    }
    if (chartCumulative) {
      chartCumulative.data.labels = cleanHours.map(h => h.hora.split(' - ')[0]);
      chartCumulative.data.datasets[0].data = cleanHours.map(() => 0);
      chartCumulative.data.datasets[1].data = cleanHours.map(h => h.acumMeta);
      chartCumulative.update();
    }
    if (chartDowntime) {
      chartDowntime.data.labels = ['Sin paros activos'];
      chartDowntime.data.datasets[0].data = [0];
      chartDowntime.data.datasets[0].backgroundColor = ['#10B981'];
      chartDowntime.update();
    }

    // 7. Notificar semáforo Andon ESP32 a Producción en Orden (Lámpara Verde Fija)
    try {
      fetch('http://192.168.0.200/api/andon?state=orden', { method: 'POST', mode: 'no-cors' }).catch(() => {});
    } catch (e) {}

    showToast(`📁 ${currentCfg.nombre} archivado en ${csvName}. ¡${nextCfg.nombre} iniciado con éxito!`);
  }

  /**
   * Restablecer todos los datos del dashboard a cero / baseline inicial
   * para comenzar una nueva captura de turno subiendo imágenes desde Telegram.
   * IMPORTANTE: Los datos acumulados del archivo CSV permanecen persistentes.
   */
  function handleResetData() {
    const confirmed = window.confirm(
      '¿Desea restablecer todos los datos del dashboard a cero para iniciar una nueva captura de turno?\n\n' +
      'AVISO DE PERSISTENCIA:\n' +
      'Los datos acumulados de producción se preservarán intactos en el archivo CSV para su exportación histórica.\n' +
      'El dashboard permanecerá en ceros hasta que se reciba y procese una NUEVA fotografía en Telegram.'
    );

    if (!confirmed) return;

    // 1. Guardar de forma persistente los datos acumulados actuales en el historial CSV antes de limpiar el dashboard
    persistCurrentRecordsToCsv(state.data);

    // 2. Estructura limpia de inicio de turno (todos los contadores del dashboard a cero)
    const resetNow = Date.now();
    const resetIso = new Date().toISOString();

    const cleanData = {
      planta: {
        nombre: 'BRP ROTAX MÉXICO S.A. de C.V.',
        plantaId: 'PLANTA KOLBEN SCHMIDT CELAYA - LÍNEA C',
        linea: 'Línea C — Ensamble y Mecanizado de Pistón WOLF V1',
        versionSistema: 'v3.0.0-24H-LIVE',
        updatedAt: resetIso,
        fechaProduccion: resetIso.split('T')[0],
        tiempoCicloTargetSeg: 45.0,
        metaTurnoUnidades: 450,
        supervisorActual: 'Líder Turno',
        productoActual: 'WOLF V1 (Pistón BRP)',
        turnoActual: 1
      },
      resumenKpis: {
        produccionDia: 0,
        metaDiaria: 1350,
        porcentajeAvance: 0.0,
        unidadesCompletadas: 0,
        unidadesPendientes: 1350,
        eficienciaOee: 0.0,
        disponibilidad: 100.0,
        rendimiento: 0.0,
        calidadFpy: 100.0,
        parosAcumuladosMin: 0,
        eventosParo: 0,
        taktTimeSeg: 45.0,
        scrapPiezas: 0,
        scrapPorcentaje: 0.0,
        estadoLinea: 'PRODUCCION_EN_ORDEN'
      },
      turnos: [
        { id: 1, nombre: 'Turno 1 - Matutino', horario: '06:30 - 15:00', supervisor: 'Líder Antonia', meta: 480, real: 0, oee: 0.0, activo: true },
        { id: 2, nombre: 'Turno 2 - Vespertino', horario: '15:00 - 23:00', supervisor: 'Ing. Roberto Garza', meta: 450, real: 0, oee: 0.0, activo: false },
        { id: 3, nombre: 'Turno 3 - Nocturno', horario: '23:00 - 06:30', supervisor: 'Ing. Diana Soto', meta: 420, real: 0, oee: 0.0, activo: false }
      ],
      modelos: [
        { id: 'M01', codigo: 'PISTON-WOLF-V1', nombre: 'Pistón WOLF V1 (Línea C)', cilindros: 1, hp: 0, plataforma: 'BRP Rotax Engine Program', activo: true }
      ],
      produccionHoraria: [
        // Turno 1 - Matutino
        { hora: '06:30 - 08:00', meta: 90, real: 0, acumMeta: 90, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 1 },
        { hora: '08:00 - 09:00', meta: 60, real: 0, acumMeta: 150, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 1 },
        { hora: '09:00 - 10:00', meta: 60, real: 0, acumMeta: 210, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 1 },
        { hora: '10:00 - 11:00', meta: 60, real: 0, acumMeta: 270, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 1 },
        { hora: '11:00 - 12:00', meta: 30, real: 0, acumMeta: 300, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 1 },
        { hora: '12:00 - 13:00', meta: 60, real: 0, acumMeta: 360, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 1 },
        { hora: '13:00 - 14:00', meta: 60, real: 0, acumMeta: 420, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 1 },
        { hora: '14:00 - 15:00', meta: 60, real: 0, acumMeta: 480, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 1 },
        // Turno 2 - Vespertino
        { hora: '15:00 - 16:00', meta: 60, real: 0, acumMeta: 540, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 2 },
        { hora: '16:00 - 17:00', meta: 60, real: 0, acumMeta: 600, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 2 },
        { hora: '17:00 - 18:00', meta: 60, real: 0, acumMeta: 660, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 2 },
        { hora: '18:00 - 19:00', meta: 60, real: 0, acumMeta: 720, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 2 },
        { hora: '19:00 - 20:00', meta: 30, real: 0, acumMeta: 750, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 2 },
        { hora: '20:00 - 21:00', meta: 60, real: 0, acumMeta: 810, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 2 },
        { hora: '21:00 - 22:00', meta: 60, real: 0, acumMeta: 870, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 2 },
        { hora: '22:00 - 23:00', meta: 60, real: 0, acumMeta: 930, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 2 },
        // Turno 3 - Nocturno
        { hora: '23:00 - 24:00', meta: 60, real: 0, acumMeta: 990, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 3 },
        { hora: '24:00 - 01:00', meta: 60, real: 0, acumMeta: 1050, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 3 },
        { hora: '01:00 - 02:00', meta: 60, real: 0, acumMeta: 1110, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 3 },
        { hora: '02:00 - 03:00', meta: 60, real: 0, acumMeta: 1170, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 3 },
        { hora: '03:00 - 04:00', meta: 30, real: 0, acumMeta: 1200, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 3 },
        { hora: '04:00 - 05:00', meta: 60, real: 0, acumMeta: 1260, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 3 },
        { hora: '05:00 - 06:30', meta: 90, real: 0, acumMeta: 1350, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte Telegram', turnoNum: 3 }
      ],
      parosIncidencias: [],
      estaciones: [
        { id: 'OP10', nombre: 'Mecanizado de Falda y Corona WOLF V1', equipo: 'Torno / Centro CNC OP10', operador: 'Téc. Línea C', metaPzas: 1350, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP20', nombre: 'Ranurado de Anillos y Barrenado de Perno', equipo: 'Ranuradora de Precisión OP20', operador: 'Téc. Línea C', metaPzas: 1350, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP30', nombre: 'Lavado Térmico y Desengrase', equipo: 'Lavadora Ultrasónica OP30', operador: 'Téc. Línea C', metaPzas: 1350, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP40', nombre: 'Acabado de Superficie / Recubrimiento', equipo: 'Cabina de Grafito / Moly OP40', operador: 'Téc. Línea C', metaPzas: 1350, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP50', nombre: 'Inspección Dimensional Neumática', equipo: 'Gage de Aire Multidiametral OP50', operador: 'Téc. Calidad', metaPzas: 1350, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP60', nombre: 'Inspección Final EOL & Marcado Láser', equipo: 'Estación de Visión y Embalaje OP60', operador: 'Téc. Calidad', metaPzas: 1350, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' }
      ],
      alertas: []
    };

    // 3. Aplicar al estado reactivo del dashboard y guardar para visualización
    state.data = JSON.parse(JSON.stringify(cleanData));
    try {
      localStorage.setItem('BRP_DASHBOARD_RESET_ACTIVE', 'true');
      localStorage.setItem('BRP_DASHBOARD_RESET_DATA', JSON.stringify(cleanData));
      localStorage.setItem('BRP_DASHBOARD_RESET_TIME', resetNow.toString());
    } catch (e) {}

    // 4. Re-renderizar módulos visuales en ceros
    renderKpis();
    renderHeroWidgets();
    renderStationsFlow();
    renderTable();
    renderAlerts();

    // 5. Actualizar gráficas en ceros
    if (chartHourly) {
      chartHourly.data.labels = cleanData.produccionHoraria.map(h => h.hora.split(' - ')[0]);
      chartHourly.data.datasets[0].data = cleanData.produccionHoraria.map(() => 0);
      chartHourly.data.datasets[1].data = cleanData.produccionHoraria.map(h => h.meta);
      chartHourly.update();
    }
    if (chartCumulative) {
      chartCumulative.data.labels = cleanData.produccionHoraria.map(h => h.hora.split(' - ')[0]);
      chartCumulative.data.datasets[0].data = cleanData.produccionHoraria.map(() => 0);
      chartCumulative.data.datasets[1].data = cleanData.produccionHoraria.map(h => h.acumMeta);
      chartCumulative.update();
    }
    if (chartDowntime) {
      chartDowntime.data.labels = ['Sin paros activos'];
      chartDowntime.data.datasets[0].data = [0];
      chartDowntime.data.datasets[0].backgroundColor = ['#10B981'];
      chartDowntime.update();
    }

    // 6. Restablecer semáforo Andon ESP32 a Producción en Orden (Lámpara Verde Fija)
    try {
      fetch('http://192.168.0.200/api/andon?state=orden', { method: 'POST', mode: 'no-cors' }).catch(() => {});
    } catch (e) {}

    // 7. Notificar al backend FastAPI si está levantado
    try {
      fetch('/api/reset', { method: 'POST' }).catch(() => {});
      fetch('http://localhost:8000/api/reset', { method: 'POST' }).catch(() => {});
    } catch (e) {}

    showToast('🔄 Dashboard restablecido a ceros. Esperando nueva fotografía en Telegram.');
  }

  /**
   * Simulación interactiva de una nueva unidad producida
   */
  function simulateProductionUnit() {
    const k = state.data.resumenKpis;
    if (k.unidadesCompletadas < k.metaDiaria) {
      k.unidadesCompletadas += 1;
      k.produccionDia += 1;
      k.unidadesPendientes -= 1;
      k.porcentajeAvance = (k.unidadesCompletadas / k.metaDiaria) * 100;

      // Incrementar última estación (OP60)
      const op60 = state.data.estaciones.find(e => e.id === 'OP60');
      if (op60) {
        op60.buenasPzas += 1;
        const now = new Date();
        op60.ultimaLiberacion = now.toTimeString().split(' ')[0];
      }

      // Actualizar última hora registrada en gráfica
      const recordedHours = (state.data.produccionHoraria || []).filter(h => h.isRecorded);
      const targetHour = recordedHours.length > 0 ? recordedHours[recordedHours.length - 1] : state.data.produccionHoraria[0];
      if (targetHour) {
        targetHour.real = (targetHour.real || 0) + 1;
        targetHour.acumReal = (targetHour.acumReal || 0) + 1;
        targetHour.isRecorded = true;
      }

      // Re-renderizar vistas
      renderKpis();
      renderHeroWidgets();
      renderStationsFlow();
      renderTable();
      updateChartsForFilter();

      showToast(`⚡ Pieza liberada en OP60 (#${k.unidadesCompletadas} / ${k.metaDiaria}) — ${state.data.planta.productoActual}`);
    } else {
      showToast('🎉 ¡Meta diaria de producción alcanzada (100%)!');
    }
  }

  /**
   * Exportar Datos a formato CSV oficial
   * Mantiene el historial acumulado persistente incluso tras pulsar Reset.
   */
  function exportCsv() {
    // Si la sesión actual tiene datos en pantalla, sincronizarlos con el histórico persistente
    persistCurrentRecordsToCsv(state.data);
    const records = getPersistentCsvRecords();

    const headers = [
      'Fecha',
      'Turno',
      'Horario',
      'Linea',
      'Producto',
      'Lider_Supervisor',
      'Obj_Pz_Hora',
      'Real_Pz_Hora',
      'Obj_Acumulado',
      'Real_Acumulado',
      'Piezas_Malas_Scrap',
      'Tiempo_Minutos_Paro',
      'Causa_Paro_Incidencia',
      'Estado_Linea',
      'Timestamp_Registro'
    ];

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += headers.join(',') + '\r\n';

    records.forEach(r => {
      const row = [
        r.fecha || '2026-11-06',
        `"${r.turno || 'Primero: 06:30 a 15:00 hrs'}"`,
        `"${r.horario || ''}"`,
        `"${r.linea || 'C'}"`,
        `"${r.producto || 'WOLF V1'}"`,
        `"${r.lider || 'Antonia'}"`,
        r.obj_pz_hora ?? 60,
        r.real_pz_hora ?? 0,
        r.obj_acumulado ?? 0,
        r.real_acumulado ?? 0,
        r.piezas_malas ?? 0,
        r.tiempo_minutos ?? 0,
        `"${(r.paros || '').replace(/"/g, '""')}"`,
        `"${r.estado || 'PRODUCCION_EN_ORDEN'}"`,
        `"${r.timestamp || new Date().toISOString()}"`
      ];
      csvContent += row.join(',') + '\r\n';
    });

    // Anexar resumen de estaciones de trabajo
    csvContent += '\r\n';
    csvContent += '# RESUMEN DE ESTACIONES DE TRABAJO (LINEA C)\r\n';
    csvContent += 'Estacion,Nombre_Proceso,Equipo,Operador,Meta_Pzas,Buenas_Pzas,Scrap_Pzas,Ciclo_Seg,Estado,Ultima_Liberacion\r\n';
    state.data.estaciones.forEach(e => {
      csvContent += [
        e.id,
        `"${e.nombre}"`,
        `"${e.equipo}"`,
        `"${e.operador}"`,
        e.metaPzas,
        e.buenasPzas,
        e.scrapPzas,
        e.cicloSeg,
        e.estado,
        e.ultimaLiberacion
      ].join(',') + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `BRP_Linea_C_Historial_Produccion_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📄 CSV histórico exportado exitosamente (${records.length} registros persistentes conservados)`);
  }

  /**
   * Sincronización automática periódica con data/production_data.json
   */
  function initAutoSync() {
    setInterval(async () => {
      try {
        const resp = await fetch('data/production_data.json?v=' + Date.now(), { cache: 'no-store' });
        if (!resp.ok) return;
        const freshData = await resp.json();
        if (!freshData || !freshData.resumenKpis) return;

        const curProd = state.data.resumenKpis ? state.data.resumenKpis.produccionDia : -1;
        const freshProd = freshData.resumenKpis.produccionDia;
        const curStatus = state.data.resumenKpis ? state.data.resumenKpis.estadoLinea : '';
        const freshStatus = freshData.resumenKpis.estadoLinea;
        const curHours = (state.data.produccionHoraria || []).map(h => h.real).join(',');
        const freshHours = (freshData.produccionHoraria || []).map(h => h.real).join(',');
        const curShift = state.data.planta?.turnoActual;
        const freshShift = freshData.planta?.turnoActual;

        // Comprobación de estado RESET activo por el usuario
        const isResetActive = localStorage.getItem('BRP_DASHBOARD_RESET_ACTIVE') === 'true';
        const resetTime = parseInt(localStorage.getItem('BRP_DASHBOARD_RESET_TIME') || '0', 10);
        const freshTimeStr = freshData.planta?.updatedAt || freshData.updatedAt;
        const freshTime = freshTimeStr ? new Date(freshTimeStr).getTime() : 0;

        if (isResetActive) {
          // Si el archivo en el servidor no es estrictamente posterior al momento del Reset,
          // IGNORAR la sincronización y mantenerse en ceros.
          if (freshTime <= resetTime) {
            return;
          } else {
            // Llegó una NUEVA fotografía procesada en Telegram con fecha posterior al Reset
            console.log('[AUTO-SYNC] Nueva fotografía detectada tras el Reset. Saliendo de modo reset...');
            localStorage.removeItem('BRP_DASHBOARD_RESET_ACTIVE');
            localStorage.removeItem('BRP_DASHBOARD_RESET_TIME');
            localStorage.removeItem('BRP_DASHBOARD_RESET_DATA');
          }
        }

        if (curProd !== freshProd || curStatus !== freshStatus || curHours !== freshHours || curShift !== freshShift) {
          console.log('[AUTO-SYNC] Nueva información horaria detectada, actualizando interfaz...');
          localStorage.removeItem('BRP_DASHBOARD_RESET_ACTIVE');
          localStorage.removeItem('BRP_DASHBOARD_RESET_DATA');
          localStorage.removeItem('BRP_DASHBOARD_RESET_TIME');
          state.data = freshData;
          applyStoredOverrides();
          renderKpis();
          renderHeroWidgets();
          renderStationsFlow();
          renderTable();
          renderAlerts();
          updateChartsForFilter();
          if (chartDowntime && freshData.parosIncidencias) {
            const palette = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#64748B', '#F97316', '#06B6D4'];
            const labels = freshData.parosIncidencias.length ? freshData.parosIncidencias.map(p => p.causa.length > 25 ? p.causa.substring(0, 25) + '...' : p.causa) : ['Sin paros'];
            const mins = freshData.parosIncidencias.length ? freshData.parosIncidencias.map(p => p.duracionMin) : [0];
            chartDowntime.data.labels = labels;
            chartDowntime.data.datasets[0].data = mins;
            chartDowntime.data.datasets[0].backgroundColor = mins.length > 0 ? mins.map((_, i) => palette[i % palette.length]) : ['#10B981'];
            chartDowntime.update();
          }
          showToast('⚡ Dashboard actualizado con la última hora de pizarra');
        }
      } catch (e) {
        // Fallback silencioso
      }
    }, 4000);
  }

  /**
   * Mensaje Toast Flotante
   */
  function showToast(message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>⚙️</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Exponer al scope global para eventos onclick en HTML
  window.filterByStationCard = function (stationId) {
    const selectStation = document.getElementById('filterStation');
    if (selectStation) {
      selectStation.value = stationId;
      state.filterStation = stationId;
      showToast(`Estación seleccionada: ${stationId}`);
    }
  };

})();

