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
    initClock();
    initFilters();
    renderKpis();
    renderHeroWidgets();
    renderStationsFlow();
    renderTable();
    renderAlerts();
    initCharts();
    setupEventListeners();
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

    // Estado General
    const statusPill = document.getElementById('heroStatusPill');
    const statusText = document.getElementById('heroStatusText');
    if (statusPill && statusText) {
      if (k.estadoLinea === 'OPERANDO') {
        statusPill.className = 'hero-status-pill';
        statusText.textContent = '🟢 OPERANDO A RITMO NORMAL';
      } else if (k.estadoLinea === 'ALERTA') {
        statusPill.className = 'hero-status-pill status-alert';
        statusText.textContent = '🟡 EN ADVERTENCIA OPERATIVA';
      } else {
        statusPill.className = 'hero-status-pill status-stop';
        statusText.textContent = '🔴 PARO DE LÍNEA ACTIVO';
      }
    }

    const heroTakt = document.getElementById('heroTakt');
    if (heroTakt) heroTakt.textContent = `${k.taktTimeSeg} s (Target: ${p.tiempoCicloTargetSeg} s)`;

    const heroRate = document.getElementById('heroRate');
    if (heroRate) heroRate.textContent = `${Math.round(3600 / k.taktTimeSeg)} uds/h`;

    const heroSupervisor = document.getElementById('heroSupervisor');
    if (heroSupervisor) heroSupervisor.textContent = p.supervisorActual;

    const heroProduct = document.getElementById('heroProduct');
    if (heroProduct) heroProduct.textContent = p.productoActual;

    const heroOrder = document.getElementById('heroOrder');
    if (heroOrder) heroOrder.textContent = p.ordenTrabajo;

    const heroAvail = document.getElementById('heroAvail');
    if (heroAvail) heroAvail.textContent = `${k.disponibilidad}%`;

    const heroPerf = document.getElementById('heroPerf');
    if (heroPerf) heroPerf.textContent = `${k.rendimiento}%`;

    const heroQual = document.getElementById('heroQual');
    if (heroQual) heroQual.textContent = `${k.calidadFpy}%`;
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
    if (elOee) elOee.textContent = `${k.eficienciaOee.toFixed(1)}%`;
    if (elParos) elParos.textContent = `${k.parosAcumuladosMin} min`;

    // Actualizar barras de progreso
    const barAvance = document.getElementById('barAvance');
    if (barAvance) barAvance.style.width = `${Math.min(k.porcentajeAvance, 100)}%`;

    const barOee = document.getElementById('barOee');
    if (barOee) barOee.style.width = `${Math.min(k.eficienciaOee, 100)}%`;

    // Pills de toolbar
    const pillMeta = document.getElementById('pillToolbarMeta');
    const pillReal = document.getElementById('pillToolbarReal');
    const pillOee = document.getElementById('pillToolbarOee');
    const pillPend = document.getElementById('pillToolbarPend');
    if (pillMeta) pillMeta.textContent = `${k.metaDiaria} UDS`;
    if (pillReal) pillReal.textContent = `${k.unidadesCompletadas} UDS (${k.porcentajeAvance.toFixed(1)}%)`;
    if (pillOee) pillOee.textContent = `${k.eficienciaOee.toFixed(1)}%`;
    if (pillPend) pillPend.textContent = `${k.unidadesPendientes} UDS`;
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

    // 1. Gráfica Producción por Hora (Real vs Meta)
    const ctxHourly = document.getElementById('chartHourlyCanvas');
    if (ctxHourly) {
      const labels = state.data.produccionHoraria.map(h => h.hora.split(' - ')[0]);
      const dataMeta = state.data.produccionHoraria.map(h => h.meta);
      const dataReal = state.data.produccionHoraria.map(h => h.real);

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
                  return `Paros: ${state.data.produccionHoraria[idx].parosMin} min\n${state.data.produccionHoraria[idx].comentario}`;
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
      const labels = state.data.produccionHoraria.map(h => h.hora.split(' - ')[0]);
      const acumMeta = state.data.produccionHoraria.map(h => h.acumMeta);
      const acumReal = state.data.produccionHoraria.map(h => h.acumReal);

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

    // 3. Gráfica de OEE y Componentes
    const ctxOee = document.getElementById('chartOeeCanvas');
    if (ctxOee) {
      const k = state.data.resumenKpis;
      chartOee = new Chart(ctxOee, {
        type: 'bar',
        data: {
          labels: ['Disponibilidad', 'Rendimiento', 'Calidad (FPY)', 'OEE Global'],
          datasets: [{
            data: [k.disponibilidad, k.rendimiento, k.calidadFpy, k.eficienciaOee],
            backgroundColor: ['#2563EB', '#3B82F6', '#10B981', '#173D60'],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { min: 70, max: 100, grid: { color: '#F1F5F9' } },
            y: { grid: { display: false } }
          }
        }
      });
    }

    // 4. Gráfica de Análisis de Paros (Pareto de Causas)
    const ctxDowntime = document.getElementById('chartDowntimeCanvas');
    if (ctxDowntime) {
      chartDowntime = new Chart(ctxDowntime, {
        type: 'doughnut',
        data: {
          labels: ['Mecánico (Gantry OP10)', 'Logística (Bielas OP30)', 'Setup (Atornillador OP40)', 'Limpieza (Canastilla OP20)'],
          datasets: [{
            data: [8, 5, 3, 2],
            backgroundColor: ['#EF4444', '#F59E0B', '#3B82F6', '#64748B']
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
   */
  function exportCsv() {
    const headers = ['Estacion', 'Nombre_Proceso', 'Equipo', 'Operador', 'Meta_Pzas', 'Buenas_Pzas', 'Scrap_Pzas', 'Ciclo_Seg', 'Estado', 'Ultima_Liberacion'];
    const rows = state.data.estaciones.map(e => [
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
    ]);

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += headers.join(',') + '\r\n';
    rows.forEach(r => {
      csvContent += r.join(',') + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `BRP_Linea_C_Seguimiento_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Archivo CSV descargado exitosamente');
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

