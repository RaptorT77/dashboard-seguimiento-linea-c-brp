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
    // Si hay un estado de reset guardado en localStorage, cargarlo
    try {
      const savedReset = localStorage.getItem('BRP_DASHBOARD_RESET_DATA');
      const resetTime = parseInt(localStorage.getItem('BRP_DASHBOARD_RESET_TIME') || '0', 10);
      const dataTime = state.data.updatedAt ? new Date(state.data.updatedAt).getTime() : 0;
      if (savedReset && resetTime > dataTime) {
        state.data = JSON.parse(savedReset);
      }
    } catch (e) {
      console.warn('Error leyendo reset de localStorage:', e);
    }

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

    if (selectStation) {
      selectStation.innerHTML = `
        <option value="all">Todas las Estaciones (6)</option>
        ${state.data.estaciones.map(e => `<option value="${e.id}">${e.id} — ${e.nombre}</option>`).join('')}
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

    // Identificar la última hora registrada con datos
    const activeHours = (state.data.produccionHoraria || []).filter(h =>
      h.real > 0 || h.malas > 0 || h.parosMin > 0 ||
      (h.comentario && !h.comentario.toLowerCase().includes('programado') && !h.comentario.toLowerCase().includes('en espera') && !h.comentario.toLowerCase().includes('por fabricar'))
    );
    const lastActive = activeHours.length > 0 ? activeHours[activeHours.length - 1] : null;
    const metaALaHora = lastActive ? lastActive.acumMeta : k.metaDiaria;
    const horaCorte = lastActive ? (lastActive.hora.split(' - ')[1] || lastActive.hora) : '14:00';
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
    if (pillParos) pillParos.textContent = `${k.parosAcumuladosMin} MIN (${k.eventosParo || activeHours.length} EV)`;
    if (pillScrap) pillScrap.textContent = `${(k.scrapPorcentaje || 0).toFixed(1)}% (${k.scrapPiezas || 0} PZ)`;

    const elParosEventos = document.getElementById('kpiParosEventos');
    if (elParosEventos) elParosEventos.textContent = `${k.eventosParo || activeHours.length} eventos`;

    const elParosMttr = document.getElementById('kpiParosMttr');
    if (elParosMttr) {
      const evCount = k.eventosParo || activeHours.length || 1;
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
   * Renderizar Diagrama de Avance de Estaciones (Flow)
   */
  function renderStationsFlow() {
    const container = document.getElementById('stationsFlowContainer');
    if (!container) return;

    container.innerHTML = state.data.estaciones.map(e => {
      let badgeClass = 'status-ok';
      if (e.estado === 'RUN') badgeClass = 'status-run';
      if (e.estado === 'PEND' || e.estado === 'PARO') badgeClass = 'status-pend';

      return `
        <div class="station-node-card" data-station="${e.id}" onclick="window.filterByStationCard('${e.id}')">
          <div class="station-node-header">
            <span class="station-id">${e.id}</span>
            <span class="station-status-pill ${badgeClass}">${e.estado}</span>
          </div>
          <div class="station-name" title="${e.nombre}">${e.nombre}</div>
          <div class="station-metrics">
            <div>Buenas: <strong>${e.buenasPzas}</strong> / Meta: ${e.metaPzas}</div>
            <div>Ciclo: <strong>${e.cicloSeg}s</strong> | Scrap: ${e.scrapPzas}</div>
            <div>Eficiencia: <strong>${e.eficiencia}%</strong></div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Renderizar Tabla Detallada con Búsqueda y Filtros
   */
  function renderTable() {
    const tbody = document.getElementById('tableStationsBody');
    if (!tbody) return;

    let items = state.data.estaciones;

    // Filtro por Estación
    if (state.filterStation !== 'all') {
      items = items.filter(e => e.id === state.filterStation);
    }

    // Filtro por Estado
    if (state.filterStatus !== 'all') {
      items = items.filter(e => e.estado === state.filterStatus);
    }

    // Filtro por Búsqueda de texto
    if (state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase();
      items = items.filter(e =>
        e.id.toLowerCase().includes(q) ||
        e.nombre.toLowerCase().includes(q) ||
        e.equipo.toLowerCase().includes(q) ||
        e.operador.toLowerCase().includes(q)
      );
    }

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 24px; color: #64748B;">
            No se encontraron estaciones coincidentes con los criterios de filtro seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items.map(e => {
      let badgeHtml = '<span class="cell-badge" style="background:#DCFCE7; color:#166534; border:1px solid #86EFAC;">OK</span>';
      if (e.estado === 'RUN') badgeHtml = '<span class="cell-badge" style="background:#FEF3C7; color:#92400E; border:1px solid #FCD34D;">RUN</span>';
      if (e.estado === 'PEND' || e.estado === 'PARO') badgeHtml = '<span class="cell-badge" style="background:#FEE2E2; color:#991B1B; border:1px solid #FCA5A5;">PARO</span>';

      return `
        <tr>
          <td><strong style="color:#173D60;">${e.id}</strong></td>
          <td>${e.nombre}</td>
          <td><span style="font-family:var(--font-mono); font-size:10px; color:#475569;">${e.equipo}</span></td>
          <td>${e.operador}</td>
          <td><strong>${e.metaPzas}</strong></td>
          <td style="color:#16A34A; font-weight:700;">${e.buenasPzas}</td>
          <td style="color:${e.scrapPzas > 0 ? '#DC2626' : '#64748B'}; font-weight:${e.scrapPzas > 0 ? '700' : 'normal'};">${e.scrapPzas}</td>
          <td>${e.cicloSeg} s</td>
          <td>${badgeHtml}</td>
          <td style="font-family:var(--font-mono); font-size:10px;">${e.ultimaLiberacion}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Renderizar Alertas Operativas
   */
  function renderAlerts() {
    const container = document.getElementById('alertsListContainer');
    if (!container) return;

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
   * Inicialización de Gráficas Chart.js
   */
  function initCharts() {
    Chart.defaults.font.family = 'ui-sans-serif, system-ui, -apple-system, sans-serif';
    Chart.defaults.color = '#475569';

    // Filtrar estrictamente las horas que tienen registros reales de la pizarra (descartando horas futuras sin registrar)
    const activeHourly = (state.data.produccionHoraria || []).filter(h =>
      h.real > 0 || h.malas > 0 || h.parosMin > 0 ||
      (h.comentario && !h.comentario.toLowerCase().includes('programado') && !h.comentario.toLowerCase().includes('en espera') && !h.comentario.toLowerCase().includes('por fabricar'))
    );
    const hoursToPlot = activeHourly.length > 0 ? activeHourly : (state.data.produccionHoraria || []);

    // 1. Gráfica Producción por Hora (Real vs Meta)
    const ctxHourly = document.getElementById('chartHourlyCanvas');
    if (ctxHourly) {
      const labels = hoursToPlot.map(h => h.hora.split(' - ')[0]);
      const dataMeta = hoursToPlot.map(h => h.meta);
      const dataReal = hoursToPlot.map(h => h.real);

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
              label: 'Meta Horaria (68 uds)',
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
                  return `Paros: ${hoursToPlot[idx].parosMin} min\n${hoursToPlot[idx].comentario}`;
                }
              }
            }
          },
          scales: {
            y: { beginAtZero: true, suggestedMax: 85, grid: { color: '#F1F5F9' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 2. Gráfica Curva de Avance Acumulado (Curva S)
    const ctxCumulative = document.getElementById('chartCumulativeCanvas');
    if (ctxCumulative) {
      const labels = hoursToPlot.map(h => h.hora.split(' - ')[0]);
      const acumMeta = hoursToPlot.map(h => h.acumMeta);
      const acumReal = hoursToPlot.map(h => h.acumReal);

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
              pointRadius: 4,
              pointBackgroundColor: '#173D60'
            },
            {
              label: 'Meta Acumulada Proyectada',
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
            y: { beginAtZero: true, suggestedMax: 560, grid: { color: '#F1F5F9' } },
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
      const bgColors = paros.length > 0 ? ['#EF4444', '#F59E0B', '#3B82F6', '#64748B', '#8B5CF6'] : ['#10B981'];

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
        showToast(`Filtro aplicado: Turno ${e.target.options[e.target.selectedIndex].text}`);
        renderTable();
      });
    }

    // Filtro de Estación
    const selectStation = document.getElementById('filterStation');
    if (selectStation) {
      selectStation.addEventListener('change', (e) => {
        state.filterStation = e.target.value;
        renderTable();
      });
    }

    // Filtro de Estado
    const selectStatus = document.getElementById('filterStatus');
    if (selectStatus) {
      selectStatus.addEventListener('change', (e) => {
        state.filterStatus = e.target.value;
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
        state.filterStatus = 'all';
        state.searchQuery = '';
        if (selectShift) selectShift.value = 'all';
        if (selectStation) selectStation.value = 'all';
        if (selectStatus) selectStatus.value = 'all';
        if (searchInput) searchInput.value = '';
        renderTable();
        showToast('Filtros restablecidos');
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

  /**
   * Restablecer todos los datos del dashboard a cero / baseline inicial
   * para comenzar una nueva captura de turno subiendo imágenes desde Telegram.
   * IMPORTANTE: Los datos acumulados del archivo CSV permanecen persistentes.
   */
  function handleResetData() {
    const confirmed = window.confirm(
      '¿Desea restablecer todos los datos del dashboard a cero para iniciar una nueva captura de turno?\n\n' +
      'AVISO DE PERSISTENCIA:\n' +
      'Los datos acumulados de producción se preservarán intactos en el archivo CSV para su exportación histórica.'
    );

    if (!confirmed) return;

    // 1. Guardar de forma persistente los datos acumulados actuales en el historial CSV antes de limpiar el dashboard
    persistCurrentRecordsToCsv(state.data);

    // 2. Estructura limpia de inicio de turno (todos los contadores del dashboard a cero)
    const cleanData = {
      planta: {
        nombre: 'BRP ROTAX MÉXICO S.A. de C.V.',
        plantaId: 'PLANTA KOLBEN SCHMIDT CELAYA - LÍNEA C',
        linea: 'Línea C — Ensamble y Mecanizado de Pistón WOLF V1',
        versionSistema: 'v2.7.0-OCR-LIVE',
        tiempoCicloTargetSeg: 45.0,
        metaTurnoUnidades: 480,
        supervisorActual: 'Líder Turno',
        productoActual: 'WOLF V1 (Pistón BRP)',
        turnoActual: 1
      },
      resumenKpis: {
        produccionDia: 0,
        metaDiaria: 480,
        porcentajeAvance: 0.0,
        unidadesCompletadas: 0,
        unidadesPendientes: 480,
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
        { id: 1, nombre: 'Turno 1 - Matutino', horario: '06:30 - 15:00', supervisor: 'Por Asignar', meta: 480, real: 0, oee: 0.0, activo: true },
        { id: 2, nombre: 'Turno 2 - Vespertino', horario: '15:00 - 23:00', supervisor: 'Ing. Roberto Garza', meta: 450, real: 0, oee: 0.0, activo: false },
        { id: 3, nombre: 'Turno 3 - Nocturno', horario: '23:00 - 06:30', supervisor: 'Ing. Diana Soto', meta: 420, real: 0, oee: 0.0, activo: false }
      ],
      modelos: [
        { id: 'M01', codigo: 'PISTON-WOLF-V1', nombre: 'Pistón WOLF V1 (Línea C)', cilindros: 1, hp: 0, plataforma: 'BRP Rotax Engine Program', activo: true }
      ],
      produccionHoraria: [
        { hora: '06:30 - 08:00', meta: 90, real: 0, acumMeta: 90, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de primer reporte Telegram' },
        { hora: '08:00 - 09:00', meta: 60, real: 0, acumMeta: 150, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte' },
        { hora: '09:00 - 10:00', meta: 60, real: 0, acumMeta: 210, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte' },
        { hora: '10:00 - 11:00', meta: 60, real: 0, acumMeta: 270, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte' },
        { hora: '11:00 - 12:00', meta: 30, real: 0, acumMeta: 300, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte' },
        { hora: '12:00 - 13:00', meta: 60, real: 0, acumMeta: 360, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte' },
        { hora: '13:00 - 14:00', meta: 60, real: 0, acumMeta: 420, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte' },
        { hora: '14:00 - 15:00', meta: 60, real: 0, acumMeta: 480, acumReal: 0, oeeHora: 0.0, parosMin: 0, malas: 0, comentario: 'En espera de reporte' }
      ],
      parosIncidencias: [],
      estaciones: [
        { id: 'OP10', nombre: 'Mecanizado de Falda y Corona WOLF V1', equipo: 'Torno / Centro CNC OP10', operador: 'Téc. Línea C', metaPzas: 480, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP20', nombre: 'Ranurado de Anillos y Barrenado de Perno', equipo: 'Ranuradora de Precisión OP20', operador: 'Téc. Línea C', metaPzas: 480, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP30', nombre: 'Lavado Térmico y Desengrase', equipo: 'Lavadora Ultrasónica OP30', operador: 'Téc. Línea C', metaPzas: 480, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP40', nombre: 'Acabado de Superficie / Recubrimiento', equipo: 'Cabina de Grafito / Moly OP40', operador: 'Téc. Línea C', metaPzas: 480, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP50', nombre: 'Inspección Dimensional Neumática', equipo: 'Gage de Aire Multidiametral OP50', operador: 'Téc. Calidad', metaPzas: 480, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' },
        { id: 'OP60', nombre: 'Inspección Final EOL & Marcado Láser', equipo: 'Estación de Visión y Embalaje OP60', operador: 'Téc. Calidad', metaPzas: 480, buenasPzas: 0, scrapPzas: 0, cicloSeg: 45.0, estado: 'OK', buffer: 'Línea lista', eficiencia: 100.0, ultimaLiberacion: '--:--' }
      ],
      alertas: []
    };

    // 3. Aplicar al estado reactivo del dashboard y guardar para visualización
    state.data = JSON.parse(JSON.stringify(cleanData));
    try {
      localStorage.setItem('BRP_DASHBOARD_RESET_DATA', JSON.stringify(cleanData));
      localStorage.setItem('BRP_DASHBOARD_RESET_TIME', Date.now().toString());
    } catch (e) {}

    // 4. Re-renderizar módulos visuales en ceros
    renderKpis();
    renderHeroWidgets();
    renderStationsFlow();
    renderTable();
    renderAlerts();

    // 5. Actualizar gráficas en ceros
    if (chartHourly) {
      chartHourly.data.datasets[0].data = cleanData.produccionHoraria.map(() => 0);
      chartHourly.update();
    }
    if (chartCumulative) {
      chartCumulative.data.datasets[0].data = cleanData.produccionHoraria.map(() => 0);
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
    } catch (e) {}

    showToast('🔄 Dashboard restablecido a ceros. Los datos acumulados permanecen persistentes en el archivo CSV.');
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

      // Actualizar última hora en gráfica
      const lastHour = state.data.produccionHoraria[state.data.produccionHoraria.length - 1];
      if (lastHour) {
        lastHour.real += 1;
        lastHour.acumReal += 1;
      }

      // Re-renderizar vistas
      renderKpis();
      renderHeroWidgets();
      renderStationsFlow();
      renderTable();

      // Actualizar gráficas en vivo
      if (chartHourly) {
        chartHourly.data.datasets[0].data = state.data.produccionHoraria.map(h => h.real);
        chartHourly.update('none');
      }
      if (chartCumulative) {
        chartCumulative.data.datasets[0].data = state.data.produccionHoraria.map(h => h.acumReal);
        chartCumulative.update('none');
      }

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

        if (curProd !== freshProd || curStatus !== freshStatus || curHours !== freshHours) {
          console.log('[AUTO-SYNC] Nueva información horaria detectada, actualizando interfaz...');
          localStorage.removeItem('BRP_DASHBOARD_RESET_DATA');
          localStorage.removeItem('BRP_DASHBOARD_RESET_TIME');
          state.data = freshData;
          renderKpis();
          renderHeroWidgets();
          renderStationsFlow();
          renderTable();
          renderAlerts();
          if (chartHourly && freshData.produccionHoraria) {
            const activeFresh = freshData.produccionHoraria.filter(h =>
              h.real > 0 || h.malas > 0 || h.parosMin > 0 ||
              (h.comentario && !h.comentario.toLowerCase().includes('programado') && !h.comentario.toLowerCase().includes('en espera') && !h.comentario.toLowerCase().includes('por fabricar'))
            );
            const plotFresh = activeFresh.length > 0 ? activeFresh : freshData.produccionHoraria;
            chartHourly.data.labels = plotFresh.map(h => h.hora.split(' - ')[0]);
            chartHourly.data.datasets[0].data = plotFresh.map(h => h.real);
            chartHourly.data.datasets[1].data = plotFresh.map(h => h.meta);
            chartHourly.update();
          }
          if (chartCumulative && freshData.produccionHoraria) {
            const activeFresh = freshData.produccionHoraria.filter(h =>
              h.real > 0 || h.malas > 0 || h.parosMin > 0 ||
              (h.comentario && !h.comentario.toLowerCase().includes('programado') && !h.comentario.toLowerCase().includes('en espera') && !h.comentario.toLowerCase().includes('por fabricar'))
            );
            const plotFresh = activeFresh.length > 0 ? activeFresh : freshData.produccionHoraria;
            chartCumulative.data.labels = plotFresh.map(h => h.hora.split(' - ')[0]);
            chartCumulative.data.datasets[0].data = plotFresh.map(h => h.acumReal);
            chartCumulative.data.datasets[1].data = plotFresh.map(h => h.acumMeta);
            chartCumulative.update();
          }
          if (chartDowntime && freshData.parosIncidencias) {
            const labels = freshData.parosIncidencias.length ? freshData.parosIncidencias.map(p => p.causa.substring(0, 20)) : ['Sin paros'];
            const mins = freshData.parosIncidencias.length ? freshData.parosIncidencias.map(p => p.duracionMin) : [0];
            chartDowntime.data.labels = labels;
            chartDowntime.data.datasets[0].data = mins;
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
      renderTable();
      const tableSec = document.getElementById('tableSection');
      if (tableSec) {
        tableSec.scrollIntoView({ behavior: 'smooth' });
      }
      showToast(`Filtrado por estación: ${stationId}`);
    }
  };

})();

