# Dashboard de Seguimiento Línea C BRP — Planta Kolben Schmidt Celaya

> **Sistema Industrial de Telemetría, Captura OCR de Pizarra y Control de Producción 24 Horas**  
> Desarrollado con base en la identidad visual y estándares corporativos de **BRP Rotax México**, **Kolbenschmidt Pierburg (KS)** y **JI&FIX SIGMA S.A. de C.V.**

[![Estado Sistema](https://img.shields.io/badge/Sistema-En%20Vivo%20(24%2F7)-emerald.svg)](https://raptort77.github.io/dashboard-seguimiento-linea-c-brp/)
[![Planta](https://img.shields.io/badge/Planta-Kolben%20Schmidt%20Celaya-173D60.svg)](https://raptort77.github.io/dashboard-seguimiento-linea-c-brp/)
[![Línea](https://img.shields.io/badge/L%C3%ADnea-L%C3%ADnea%20C%20(WOLF%20V1)-1F4E79.svg)](https://raptort77.github.io/dashboard-seguimiento-linea-c-brp/)
[![Telegram Bot](https://img.shields.io/badge/Telegram-@DASHBOARD__BRP__001__bot-229ED9.svg)](https://t.me/DASHBOARD_BRP_001_bot)

---

## 🌐 Enlaces Oficiales del Proyecto

| Recurso | Enlace Directo | Descripción |
| :--- | :--- | :--- |
| **Dashboard Web Público (Producción)** | 👉 **[raptort77.github.io/dashboard-seguimiento-linea-c-brp/](https://raptort77.github.io/dashboard-seguimiento-linea-c-brp/)** | **Única fuente de verdad oficial.** Dashboard interactivo en GitHub Pages. |
| **Repositorio en GitHub** | 👉 **[github.com/RaptorT77/dashboard-seguimiento-linea-c-brp](https://github.com/RaptorT77/dashboard-seguimiento-linea-c-brp)** | Código fuente, pipeline backend, modelos y datos maestros. |
| **Bot de Telegram** | 👉 **[@DASHBOARD_BRP_001_bot](https://t.me/DASHBOARD_BRP_001_bot)** | Receptor móvil de fotografías de pizarra enviadas por supervisores. |
| **Servicio Cloud Backend** | 👉 **[dashboard-seguimiento-linea-c-brp.onrender.com](https://dashboard-seguimiento-linea-c-brp.onrender.com/)** | API REST FastAPI en Render con monitor keep-alive automático. |

---

## 📋 Descripción del Sistema

El sistema automatiza el levantamiento de información horaria de producción en la **Línea C** (mecanizado y ensamble del pistón **WOLF V1** para motores BRP Rotax). 

En lugar de requerir captura manual en hojas de cálculo, los líderes de turno simplemente fotografían el pizarrón acrílico oficial de piso de planta y lo envían a un bot de **Telegram**. El motor de visión artificial (OpenCV + RapidOCR PP-OCRv4 ONNX) procesa la imagen, extrae las cantidades por hora, piezas malas, causas de paro y acumulados, y sincroniza de inmediato el dashboard web en tiempo real.

---

## ⚙️ Estructura de Turnos y Metas Oficiales (Jornada 24 Horas)

| Turno | Horario | Horas | Meta Turno | Supervisión / Líder | Horas Cubiertas |
| :---: | :---: | :---: | :---: | :--- | :--- |
| **Turno 1 (Matutino)** | `06:30 - 15:00` | 8 hrs | **480 uds** | Líder Antonia | 06:30 a 15:00 hrs |
| **Turno 2 (Vespertino)** | `15:00 - 23:00` | 8 hrs | **450 uds** | Líder Javier / Santiago V. | 15:00 a 23:00 hrs |
| **Turno 3 (Nocturno)** | `23:00 - 06:30` | 7 hrs | **420 uds** | Ing. Diana Soto | 23:00 a 06:30 hrs |
| **TOTAL JORNADA 24H** | **24 Horas** | **23 hrs** | **1,350 uds** | Plantel Celaya | Jornada completa continua |

> [!NOTE]
> Las horas futuras que aún no transcurren en la jornada permanecen **estrictamente en blanco (`null`)**, tanto en la tabla como en las gráficas de producción y en la Curva S acumulada.

---

## ✨ Características y Módulos del Dashboard

1. **Semáforo Andon y Estado Operativo:**
   - Visualización de baliza industrial de 3 estados: `PRODUCCIÓN EN ORDEN` (Verde), `ADVERTENCIA OPERATIVA` (Ámbar oscilante a 3 Hz) y `PRODUCCIÓN DEFICIENTE` (Rojo con alerta de paro).
   - Cadencia horaria y Takt Time de línea (objetivo: 45.0 s).

2. **Panel de KPIs de Clase Mundial (OEE):**
   - Producción Real del Día vs. Meta Diaria (1,350 uds).
   - Porcentaje de Avance y Unidades Pendientes con tiempo restante de turno.
   - Eficiencia Global OEE desglosada en **Disponibilidad**, **Rendimiento** y **Calidad (FPY)**.
   - Paros acumulados en minutos y conteo de eventos con cálculo de MTTR.

3. **Visualizaciones de Datos Interactivas (Chart.js v4):**
   - **Producción por Hora (Real vs. Meta):** Barras azul marino comparadas con la meta programada en línea ámbar.
   - **Curva de Avance Acumulado (Curva S 24H):** Avance real acumulado continuo cortado exactamente en la última hora registrada, con proyección de meta hasta 1,350 unidades.
   - **Distribución de Paros e Incidencias (Pareto):** Gráfica tipo dona categorizando causas (Mecánico, Herramental, Comedor, Calibración).

4. **Tabla de Pizarra Industrial Oficial (10 Columnas):**
   - Correlacionada exactamente con la plantilla PDF oficial (`WOLF V1 - Línea C`).
   - Columnas: `Horario | Obj. Pz/Hora | Real Pz/Hora | Obj. Acumulado | Real Acumulado | Piezas Malas (Scrap) | Op | Tiempo (Min) | Paros y Descripción de Fallas | Estatus`.
   - Filas de totalizador con cálculo automático por turno y total del día.

5. **Filtros Interactivos Reactivos:**
   - **Filtro de Turno:** Permite ver Turno 1, Turno 2, Turno 3 o los 3 turnos juntos (24 horas). Al cambiar de turno, tanto la tabla como las gráficas se recalculan dinámicamente.
   - **Filtro de Estación:** Filtra registros por la estación de trabajo (`OP10`, `OP20`, `OP30`, `OP40`, `OP50`).
   - **Filtro de Estado:** Aísla horas con estatus `OK`, `RUN` o `PEND / PARO`.
   - **Buscador en Tiempo Real:** Búsqueda libre en tabla (ej. escribe `buril`, `comedor` o `personal`).
   - **Botón Restablecer Filtros:** Regresa con un solo clic a la vista completa de la jornada.

---

## 🛠️ Stack Tecnológico Oficial

- **Frontend:** HTML5 semántico, CSS3 corporativo (`assets/css/styles.css`), JavaScript ES6+ (`assets/js/dashboard.js`), Chart.js v4 CDN.
- **Backend:** Python 3.10+ / 3.14, FastAPI, Uvicorn, SQLAlchemy, Pydantic, OpenCV (`opencv-python`), RapidOCR (`rapidocr-onnxruntime`).
- **Base de Datos y Persistencia:** SQLite (`backend/storage/production_data.db`), respaldos CSV por turno en `backend/storage/turnos/` y `data/production_data.json`.
- **Despliegue y Hosting:**
  - Frontend Web: **GitHub Pages** (HTTPS).
  - Backend API & Bot: Servicio local con autoarranque en Windows + Réplica en **Render Cloud**.

---

## 🚀 Guía de Instalación y Ejecución Local

### 1. Clonar el Repositorio e Ingresar al Directorio
```powershell
cd D:\RESEARCH
git clone https://github.com/RaptorT77/dashboard-seguimiento-linea-c-brp.git
cd D:\RESEARCH\dashboard-seguimiento-linea-c-brp
```

### 2. Instalar Dependencias de Python
```powershell
pip install -r backend/requirements.txt
```

### 3. Iniciar el Backend Completo (Telegram + API REST + Keepalive + Scheduler 24/7)
```powershell
python run_backend.py --mode all
```
El servidor responderá en `http://127.0.0.1:8000` e iniciará la escucha activa de Telegram para el bot `@DASHBOARD_BRP_001_bot`.

### 4. Configurar Inicio Automático con Windows (Opcional)
Para que el bot de Telegram y el backend se inicien automáticamente en segundo plano cada vez que se encienda la computadora:
```powershell
python install_startup.py
```
*(Esto creará un acceso directo VBScript en la carpeta `Startup` de Windows que corre el proceso minimizado).*

### 5. Ejecutar la Batería de Pruebas Unitarias
```powershell
python -m unittest backend/tests/test_pipeline.py
```

---

## 📸 Uso del Bot de Telegram

1. Abre Telegram y busca el bot oficial: **[@DASHBOARD_BRP_001_bot](https://t.me/DASHBOARD_BRP_001_bot)**.
2. Presiona `/start` para recibir las instrucciones de captura.
3. Toma una fotografía clara de la pizarra de Línea C y envíala al bot.
4. El bot procesará la imagen y te responderá con un resumen de los datos extraídos:
   - Fecha y Horario activo detectado.
   - Producción Real y Scrap.
   - Paros registrados.
   - Enlace directo al dashboard web actualizado.
5. Abre el dashboard web y presiona `Ctrl + F5` para visualizar los nuevos datos reflejados al instante.

---

## 📚 Documentación Adicional

- [Reglas y Protocolo para Agentes de IA (`AGENTS.md`)](file:///d:/RESEARCH/dashboard-seguimiento-linea-c-brp/AGENTS.md)
- [Memoria Operativa y Contexto de Planta (`PROJECT_CONTEXT.md`)](file:///d:/RESEARCH/dashboard-seguimiento-linea-c-brp/PROJECT_CONTEXT.md)
- [Arquitectura Técnica y Diagramas (`ARCHITECTURE.md`)](file:///d:/RESEARCH/dashboard-seguimiento-linea-c-brp/ARCHITECTURE.md)

---

**BRP Rotax México & Kolbenschmidt Pierburg (KS Celaya)**  
*En colaboración con [VCG CONTINENTAL](https://www.vcgcontinental.com/) & JI&FIX SIGMA S.A. de C.V. **[HC Advanced Automation https://www.hcaa.com.mx/](https://www.hcaa.com.mx/)***
