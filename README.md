# Dashboard de Seguimiento Línea C BRP — Rotax México

> **Sistema Ejecutivo y Operativo de Control de Producción, OEE y Estaciones en Tiempo Real**  
> Desarrollado con base en la identidad visual y estándares corporativos de **BRP Rotax México**, **Kolbenschmidt Pierburg** y **JI&FIX SIGMA S.A. de C.V.**

---

## 🌐 Enlaces Oficiales

- **Sitio Web Público (GitHub Pages):**  
  👉 **[https://raptort77.github.io/dashboard-seguimiento-linea-c-brp/](https://raptort77.github.io/dashboard-seguimiento-linea-c-brp/)**

- **Repositorio Oficial en GitHub:**  
  👉 **[https://github.com/RaptorT77/dashboard-seguimiento-linea-c-brp](https://github.com/RaptorT77/dashboard-seguimiento-linea-c-brp)**

---

## 📋 Descripción del Proyecto

El **Dashboard de Seguimiento Línea C BRP** es una solución front-end moderna, responsiva y de grado industrial concebida para brindar supervisión operativa y ejecutiva instantánea sobre la **Línea C** de ensamble y mecanizado de motores **Rotax ACE (Advanced Combustion Efficiency)** en planta.

El diseño sigue con rigurosa fidelidad los lineamientos visuales, colores corporativos (`#173D60`, `#1F4E79`, fondos `slate` y bordes estandarizados), tipografía industrial y experiencia de usuario del portal de referencia [KOLBEN-BRP](https://raptort77.github.io/KOLBEN-BRP/).

---

## ✨ Características y Módulos Principales

### 1. Encabezado Corporativo e Identidad Gráfica
- **Logotipos Oficiales Integrados:** Kolbenschmidt (KS Pierburg) en el flanco izquierdo y JI&FIX SIGMA / BRP en el flanco derecho, enmarcados en tarjetas con bordes sutiles.
- **Indicador "EN VIVO":** Pulsador dinámico de estado en verde esmeralda que indica telemetría conectada.
- **Reloj Industrial en Tiempo Real:** Visualización continua de fecha y hora local (`DD/MM/AAAA • HH:mm:ss`).
- **Acciones Rápidas:**
  - ⚡ **Simular Pieza (+1):** Permite incrementar unidades en vivo, recalculando instantáneamente el avance, las barras de progreso, las gráficas y emitiendo notificaciones *toast*.
  - 📥 **Exportar CSV:** Descarga directa de la matriz de datos de estaciones, piezas y ciclos.
  - 🖨️ **Imprimir PDF:** Estilos de impresión `@media print` optimizados para emitir informes ejecutivos limpios sin elementos de navegación.
  - ⛶ **Pantalla Completa:** Modo kiosco / pantalla Andon para monitores industriales de piso de producción.

### 2. Barra de Métricas Rápidas y Filtros Interactivos
- **Chips Rápidos de Estado:** Meta total (540 uds), Producción actual (432 uds - 80%), Pendientes (108 uds), OEE Global (89.4%), Paros acumulados (18 min) y Scrap (0.46%).
- **Filtros Dinámicos Combinables:**
  - Selector de Fecha (con calendario HTML5).
  - Selector de Turno (Turno 1 Matutino, Turno 2 Vespertino, Turno 3 Nocturno).
  - Selector de Estación (OP10 a OP60).
  - Selector de Modelo de Motor (Rotax 900 ACE Turbo, 1630 ACE HO, 850 E-TEC, HD10).
  - Selector de Estado Operativo (OK, RUN, PEND / PARO).
  - Botón de restablecimiento general de filtros.

### 3. Hero Operativo (Tarjetas de Mando)
- **Estado de la Línea:** Estado en tiempo real (`🟢 OPERANDO A RITMO NORMAL`), Takt time actual vs. objetivo (44.8s vs. 45.0s) y cadencia horaria (80 uds/h).
- **Turno & Supervisión:** Turno activo, horario laboral y supervisor a cargo (`Ing. Carlos Mendoza`).
- **Producto en Fabricación:** Código de motor (`Rotax 900 ACE Turbo`), Orden de Trabajo (`OT-2026-BRP-09482`) y planta destino.
- **Eficiencia OEE:** OEE Global (89.4%), Disponibilidad (94.1%), Rendimiento (95.5%) y Calidad / FPY (99.54%).

### 4. Grilla de Indicadores Clave (KPIs)
- **Producción Real del Día:** 432 unidades con indicador de ritmo positivo (+2 piezas vs. plan).
- **Meta Diaria Programada:** 540 unidades.
- **Porcentaje de Avance:** 80.0% con barra de progreso dinámica.
- **Unidades Pendientes:** 108 unidades calculadas con tiempo restante estimado.
- **Eficiencia Global (OEE):** 89.4% clasificada como rendimiento de clase mundial.
- **Tiempo de Paros Acumulado:** 18 minutos distribuidos en 4 eventos de microparos con MTTR de 4.5 min.

### 5. Visualizaciones de Datos Interactivas (Chart.js)
1. **Producción por Hora (Real vs. Meta):** Gráfica combinada de barras en azul marino industrial con línea punteada de meta horaria en ámbar.
2. **Curva de Avance Acumulado (Curva S):** Proyección acumulada teórica vs. curva real con degradado corporativo.
3. **Desglose de Eficiencia (OEE):** Barras horizontales comparando Disponibilidad, Rendimiento, Calidad (FPY) y OEE.
4. **Pareto de Paros e Incidencias:** Gráfica tipo dona (*doughnut*) analizando causas: Mecánico (8m), Logística (5m), Setup (3m) y Limpieza (2m).

### 6. Flujo de Estaciones de Línea C (Process Flow Layout)
- Visualización interactiva de las 6 operaciones clave:
  - **OP10:** Mecanizado de Monoblock (Kanzaki OP10 / Gantry 3M)
  - **OP20:** Lavado Térmico y Desengrase Ultrasónico (WashTech OP20)
  - **OP30:** Subensamble de Pistones y Bielas (Robodrill OP30)
  - **OP40:** Torque de Cabeza Robotizado (Atlas Copco STB40)
  - **OP50:** Prueba Neumática y Fuga de Helio (Ateq F520)
  - **OP60:** Inspección Final EOL & Liberación Óptica (Cognex EOL60)
- *Interacción Drill-down:* Al hacer clic en cualquier tarjeta de estación, la tabla inferior se filtra automáticamente.

### 7. Tabla Detallada con Búsqueda en Vivo
- Tabla estilo matriz industrial con encabezados `#1F4E79` y bordes reforzados.
- Buscador reactivo por estación, equipo o nombre de técnico.
- Tiempos de ciclo en segundos, piezas buenas, scrap y fecha/hora exacta de última liberación.

### 8. Centro de Alertas y Notificaciones Operativas
- Registro categorizado con badges de severidad: **CRÍTICA**, **ADVERTENCIA**, **CALIDAD** e **INFO**.
- Cálculo de tiempo transcurrido y estatus de resolución.

---

## 🛠️ Tecnologías Utilizadas

- **HTML5 Semántico:** Estructura accesible y modular optimizada para SEO y lectores de pantalla.
- **CSS3 Moderno:** Variables nativas CSS (`:root`), Flexbox, CSS Grid, media queries responsivas y diseño para impresión (`@media print`).
- **JavaScript (Vanilla ES6+):** Código desacoplado, sin dependencias pesadas, estructurado en arquitectura de datos maestros (`BRP_DATA`).
- **Chart.js v4:** Gráficas vectoriales interactivas vía CDN oficial de alto rendimiento.
- **GitHub Pages:** Despliegue automatizado en la nube con certificado SSL/HTTPS.

---

## 💻 Instrucciones para Ejecución Local

No requiere compiladores ni gestores de paquetes. Se ejecuta directamente en cualquier navegador moderno:

### Opción 1: Apertura Directa
1. Clona o descarga el repositorio:
   ```bash
   git clone https://github.com/RaptorT77/dashboard-seguimiento-linea-c-brp.git
   ```
2. Entra al directorio:
   ```bash
   cd dashboard-seguimiento-linea-c-brp
   ```
3. Haz doble clic en el archivo `index.html` o ábrelo con tu navegador preferido (Chrome, Edge, Firefox, Safari).

### Opción 2: Con Servidor Local (Recomendado para simulación de red)
Con Python:
```bash
python -m http.server 8000
```
Luego abre tu navegador en: `http://localhost:8000`

---

## 🏭 Estructura del Proyecto

```text
dashboard-seguimiento-linea-c-brp/
├── index.html                  # Página principal del dashboard
├── README.md                   # Documentación oficial y enlaces
├── assets/
│   ├── css/
│   │   └── styles.css          # Estilos industriales y paleta corporativa KOLBEN-BRP
│   ├── js/
│   │   ├── mockData.js         # Base de datos maestros, estaciones y telemetría
│   │   └── dashboard.js        # Motor de interacción, gráficas y simulación
│   └── images/
│       ├── LOGO_KS-1.png       # Logotipo oficial Kolbenschmidt (KS Pierburg)
│       ├── LOGO_KS-1.bmp       # Logotipo formato alterno KS
│       └── LOGO_JIFIX_BRP-1.jpg # Logotipo oficial JI&FIX SIGMA / BRP
```

---

## 📄 Créditos y Derechos

- **Organización:** BRP Rotax México S.A. de C.V.
- **Línea de Ensamble:** Línea C — Motores Rotax 900 ACE / 1630 ACE
- **Colaboradores:** Kolbenschmidt Pierburg &amp; JI&FIX SIGMA S.A. de C.V.
- **Desarrollo:** Ingeniería de Procesos y Automatización MES/SCADA
