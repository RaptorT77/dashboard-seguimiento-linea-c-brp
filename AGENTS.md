# AGENTS.md — Reglas, Contexto y Protocolo Operativo del Proyecto

> **BRP Rotax México — Planta Kolben Schmidt Celaya — Línea C**  
> **Producto Oficial:** WOLF V1 (Pistón BRP)  
> **Dashboard Web Oficial:** [https://raptort77.github.io/dashboard-seguimiento-linea-c-brp/](https://raptort77.github.io/dashboard-seguimiento-linea-c-brp/)  
> **Bot de Telegram:** `@DASHBOARD_BRP_001_bot`  
> **Servicio Backend Cloud:** [https://dashboard-seguimiento-linea-c-brp.onrender.com/](https://dashboard-seguimiento-linea-c-brp.onrender.com/)

---

## 1. Misión y Propósito del Proyecto

Este sistema es una solución de telemetría industrial, captura OCR de alta precisión y visualización web en tiempo real para el seguimiento horario de producción (24 horas continuas, 3 turnos laborales) de la **Línea C** de pistones **WOLF V1** para motores BRP Rotax en la planta **Kolbenschmidt Pierburg (KS)** en Celaya, Guanajuato.

El flujo operacional consta de:
1. Los supervisores/operadores fotografían la pizarra física de producción al final de cada hora o corte y la envían al bot de Telegram (`@DASHBOARD_BRP_001_bot`).
2. El pipeline backend (FastAPI + OpenCV + RapidOCR PP-OCRv4 ONNX) recibe la fotografía, preprocesa el contraste/perspectiva, detecta la cuadrícula de la pizarra según la plantilla oficial en PDF, y extrae los valores numéricos y descripciones manuscritas de paros.
3. Los datos validados se almacenan en SQLite (`production_data.db`), se generan respaldos CSV por turno y se sincronizan inmediatamente con el frontend (`data/production_data.json` y `assets/js/mockData.js`).
4. El dashboard web en **GitHub Pages** actualiza en vivo las tarjetas de mando Andon, KPIs de OEE, gráficas de ritmo (Real vs Meta), Curva S acumulada de 24 horas y la tabla histórica con descripciones de fallas y filtros interactivos.

---

## 2. Herramientas y Stack Tecnológico Oficial (Congelado)

Cualquier agente que trabaje en este proyecto **DEBE** apegarse estrictamente a este conjunto de herramientas probado y funcional:

### Entorno y Lenguajes
- **Python:** 3.10+ (probado hasta Python 3.14 en Windows 11).
- **Directorio de Trabajo Local:** `D:\RESEARCH\dashboard-seguimiento-linea-c-brp`
- **Shell / Terminal:** PowerShell en Windows (`run_command` ejecutando siempre `cd D:\RESEARCH\dashboard-seguimiento-linea-c-brp` previo al comando).
- **Frontend:** HTML5 semántico, CSS3 corporativo (`styles.css`), JavaScript Vanilla ES6+ (`dashboard.js`), Chart.js v4.

### Dependencias Principales de Backend (`backend/requirements.txt`)
- `fastapi`, `uvicorn[standard]` (Servicio REST y webhooks)
- `opencv-python-headless` (Preprocesamiento y corrección de cuadrícula)
- `rapidocr-onnxruntime`, `onnxruntime` (Motor de OCR ultrarrápido PP-OCRv4 ONNX para números y texto manuscrito)
- `sqlalchemy` (ORM para base de datos SQLite `production_data.db`)
- `pydantic` (Validación de esquemas y contratos de datos)
- `requests` (Polling de Telegram, Webhooks y Keepalive hacia Render)

### Servicios Cloud y Despliegue
- **GitHub Repository & Pages:** Rama `main` en `https://github.com/RaptorT77/dashboard-seguimiento-linea-c-brp.git`. El despliegue de GitHub Pages es automático tras cada `git push origin main`.
- **Render Backend:** Servicio Web en `https://dashboard-seguimiento-linea-c-brp.onrender.com/`. Incluye monitor keepalive cada 10 min para evitar hibernación en capa gratuita.
- **Telegram Bot API:** Token `9167994509:AAHrdHq0lCYgP2OcXDR2jLvh74SJGJls5kA`.

---

## 3. Estructura de la Pizarra y Reglas de Correlación (Plantilla PDF)

La pizarra física tiene una cuadrícula fija de **9 columnas y 28 filas** estructurada en 3 turnos oficiales:

```
[ENCABEZADO] Línea: Aut. C | Número de Parte: WOLF V1 | Fecha: DD - MMM. YY

[COLUMNAS OFICIALES (10 en Dashboard)]:
1. Horario
2. Obj. Pz/Hora
3. Real Pz/Hora
4. Obj. Acumulado
5. Real Acumulado
6. Piezas Malas (Scrap)
7. Op (Estación responsable)
8. Tiempo Minutos (Duración del paro)
9. Paros y Descripción de Fallas
10. Estatus (Badge OK / SCRAP / PARO / PROGRAMADO)
```

### Distribución Horaria de los 3 Turnos (23 horas de producción):
- **Turno 1 (Matutino - 8 Horas):**
  - Horarios: `06:30 - 08:00` (Obj: 90), `08:00 - 09:00` (60), `09:00 - 10:00` (60), `10:00 - 11:00` (60), `11:00 - 12:00` (30), `12:00 - 13:00` (60), `13:00 - 14:00` (60), `14:00 - 15:00` (60).
  - Meta Turno 1: **480 unidades**.
  - Fila Totalizador: `Total 1er turno: Líder: Antonia | Venta: [unidades] | Scrap: [piezas]`
- **Turno 2 (Vespertino - 8 Horas):**
  - Horarios: `15:00 - 16:00` (60), `16:00 - 17:00` (60), `17:00 - 18:00` (60), `18:00 - 19:00` (60), `19:00 - 20:00` (30), `20:00 - 21:00` (60), `21:00 - 22:00` (60), `22:00 - 23:00` (60).
  - Meta Turno 2: **450 unidades**.
  - Fila Totalizador: `Total 2do turno: Líder: Javier (o Santiago V.) | Venta: [unidades] | Scrap: [piezas]`
- **Turno 3 (Nocturno - 7 Horas):**
  - Horarios: `23:00 - 24:00` (60), `24:00 - 01:00` (60), `01:00 - 02:00` (60), `02:00 - 03:00` (60), `03:00 - 04:00` (30), `04:00 - 05:00` (60), `05:00 - 06:30` (90).
  - Meta Turno 3: **420 unidades**.
  - Fila Totalizador: `Total 3er turno: Líder: Diana Soto`
- **Total de la Jornada (24 Horas):**
  - Meta Diaria: **1,350 unidades**.

### Reglas Críticas de Visualización de Datos
1. **Horas Futuras en Blanco (`null`):**
   Si la foto contiene datos únicamente hasta cierta hora (ej. 22:00 hrs), todas las horas posteriores (`22:00 - 23:00` y todo el Turno 3) **DEBEN permanecer con valor `null`**. No proyectar barras ni líneas artificiales; Chart.js debe mostrar el espacio en blanco con `spanGaps: false`.
2. **Real Acumulado por Turno vs Acumulado 24H:**
   - En la **tabla de pizarra** (`index.html`), el valor de `Real Acumulado` muestra el avance del turno respectivo (Turno 2 acumula sus propias piezas buenas: 16, 48, 96, 96, 160, 208, 256), tal como se escribe físicamente en el pizarrón.
   - En la **Curva S Acumulada de 24H**, el acumulado es continuo: Turno 1 (202) + Turno 2 (256) = **458 unidades**.
3. **Columna de Paros:**
   Siempre debe preservarse la descripción textual extraída de la pizarra (ej. "Ajuste de juego // Falta de personal", "Ajuste P/S", "Cambio de buril", "Comedor", "Paro de línea (% 0)").
4. **Filtros Interactivos:**
   El filtro de Turno, Estación (`OP10` a `OP60`), Estatus (`OK`, `RUN`, `PEND`) y el buscador reactivo de texto deben filtrar inmediatamente tanto la tabla como las gráficas sin requerir recargar la página.

---

## 4. Comandos de Ejecución y Operación

### Iniciar el Backend Completo Localmente (Telegram + API + Keepalive + Scheduler):
```powershell
cd D:\RESEARCH\dashboard-seguimiento-linea-c-brp
python run_backend.py --mode all
```

### Ejecutar Suite de Pruebas del Pipeline OCR:
```powershell
cd D:\RESEARCH\dashboard-seguimiento-linea-c-brp
python -m unittest backend/tests/test_pipeline.py
```

### Probar Simulación de Navegador (Headless Validation):
```powershell
cd D:\RESEARCH\dashboard-seguimiento-linea-c-brp
node -e "
const fs = require('fs');
global.window = global;
global.document = {
  addEventListener: (e, cb) => { global._cb = cb; },
  getElementById: () => ({ style:{}, innerHTML:'', textContent:'', addEventListener:()=>{} }),
  querySelectorAll: () => []
};
global.Chart = function() { this.update = ()=>{}; };
global.Chart.defaults = { font:{}, color:'' };
eval(fs.readFileSync('assets/js/mockData.js','utf8').replace('const BRP_DATA =','global.BRP_DATA ='));
eval(fs.readFileSync('assets/js/dashboard.js','utf8'));
global._cb();
console.log('✅ DOMContentLoaded SUCCESS: dashboard.js sin errores de sintaxis ni runtime!');
"
```

### Desplegar Cambios a GitHub Pages:
```powershell
cd D:\RESEARCH\dashboard-seguimiento-linea-c-brp
git add assets/js/dashboard.js assets/js/mockData.js backend/ data/ index.html README.md AGENTS.md ARCHITECTURE.md PROJECT_CONTEXT.md
git commit -m "fix/feat: <descripción concisa>"
git push origin main
```

### Automatización de Inicio con Windows:
Para registrar el bot como servicio al inicio de Windows:
```powershell
cd D:\RESEARCH\dashboard-seguimiento-linea-c-brp
python install_startup.py
```
Esto genera `Iniciar_Bot_BRP_LineaC.vbs` en la carpeta `Startup` del usuario.

---

## 5. Prohibiciones y Restricciones Absolutas
- **PROHIBIDO** inventar datos de producción ("mocking" destructivo) que sobreescriba los datos extraídos de la foto de la pizarra.
- **PROHIBIDO** eliminar o cambiar la URL de GitHub Pages. Es el único destino corporativo validado por el cliente.
- **PROHIBIDO** desincronizar `mockData.js` de `production_data.json`. Siempre que el backend actualice datos, ambos archivos deben mantenerse con la misma información.
- **PROHIBIDO** introducir variables no declaradas en `dashboard.js`. Toda variable de conteo de horas registradas debe ser consistente (`recordedHours`).
- **PROHIBIDO** dejar scripts de prueba temporales (`run_*.py`, `test_*.js`, `.dump`) regados en el repositorio.
