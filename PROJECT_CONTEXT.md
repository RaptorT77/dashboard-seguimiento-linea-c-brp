# PROJECT_CONTEXT.md — Memoria Operativa y Contexto Integral del Sistema

> **Planta:** Kolbenschmidt Pierburg (KS) — Celaya, Guanajuato, México  
> **Cliente / Programa:** BRP Rotax México (Bombardier Recreational Products)  
> **Línea de Producción:** Línea C (Mecanizado y Ensamble de Pistones)  
> **Producto:** WOLF V1 (Pistón BRP de Alto Rendimiento)  
> **Versión del Sistema:** v3.2.0-24H-LIVE

---

## 1. Contexto Industrial y de Negocio

La planta de **Kolbenschmidt (KS) en Celaya** manufactura componentes de motor para diversas armadoras globales. En la **Línea C**, se fabrican pistones de alta precisión para el programa de motores **BRP Rotax (WOLF V1)**.

### Dinámica de Operación en Piso:
- **3 Turnos Laborales (24 Horas Continuas):**
  - **Turno 1 (Matutino):** 06:30 a 15:00 hrs (Meta: 480 piezas). Supervisora: *Líder Antonia*.
  - **Turno 2 (Vespertino):** 15:00 a 23:00 hrs (Meta: 450 piezas). Supervisores: *Líder Javier* / *Santiago V.* / *Ing. Roberto Garza*.
  - **Turno 3 (Nocturno):** 23:00 a 06:30 hrs (Meta: 420 piezas). Supervisora: *Ing. Diana Soto*.
  - **Meta Diaria Global:** **1,350 piezas / día** (Takt Time nominal: ~45.0 seg/pieza).

- **La Pizarra Física (Whiteboard):**
  En el piso de la Línea C se encuentra un pizarrón acrílico impreso con una matriz estandarizada donde los operadores y líderes de línea registran cada hora:
  - Producción real de la hora.
  - Producción acumulada del turno (piezas buenas = real menos scrap).
  - Piezas malas (Scrap).
  - Estación responsable (OP).
  - Minutos de paro y descripción manuscrita de incidencias.
  - Al cierre de turno: Firma del Líder, Total Venta y Total Scrap.

- **El Desafío Resuelto:**
  Anteriormente, los directivos e ingenieros de planta no podían ver el avance de producción en tiempo real sin caminar hasta el piso de manufactura. Ahora, los supervisores simplemente envían una fotografía del pizarrón por **Telegram** al bot `@DASHBOARD_BRP_001_bot`, y en menos de 5 segundos la información es extraída por RapidOCR (PP-OCRv4), validada matemáticamente y proyectada en el dashboard web público.

---

## 2. Mapa de Archivos y Responsabilidades

```
dashboard-seguimiento-linea-c-brp/
│
├── index.html                   # Interfaz de usuario del dashboard (Single Page App)
├── README.md                    # Manual general del proyecto y guía de instalación
├── AGENTS.md                    # Reglas obligatorias y directrices para agentes IA
├── PROJECT_CONTEXT.md           # Memoria operativa, contexto de planta y SOPs
├── ARCHITECTURE.md              # Diagramas y especificación técnica de la arquitectura
│
├── assets/
│   ├── css/
│   │   └── styles.css           # Estilos corporativos (BRP Blue #173D60, Andon lamps, responsive)
│   ├── js/
│   │   ├── dashboard.js         # Lógica frontend: KPIs, Chart.js, renderTable, filtros reactivos
│   │   └── mockData.js          # Datos maestros cacheados (sincronizados idénticamente con JSON)
│   └── images/
│       ├── LOGO_KS-1.png        # Logotipo Kolbenschmidt Pierburg
│       └── LOGO_JIFIX_BRP-1.jpg # Logotipo JI&FIX / BRP Rotax
│
├── backend/
│   ├── api_service.py           # API REST FastAPI (/health, /api/sync/latest, /api/upload-whiteboard)
│   ├── audit_logger.py          # Registro inmutable de eventos y transacciones en logs
│   ├── config.py                # Variables de entorno, rutas, turnos y credenciales de bot
│   ├── dashboard_sync.py        # Generador de producción 24H, Curva S, cálculo de OEE y sincronización JSON/JS
│   ├── data_extractor.py        # Motor de anclaje de cuadrícula Y-spatial y extracción OCR
│   ├── data_validator.py        # Reglas de validación industrial y consistencia matemática
│   ├── database.py              # Sesión SQLAlchemy y motor SQLite
│   ├── image_preprocessor.py    # Filtros OpenCV (contraste CLAHE, binarización Otsu, recorte de pizarra)
│   ├── models.py                # Modelos ORM: RawImage, OcrLog, HourlyProductionRecord, AuditEvent
│   ├── ocr_processor.py         # Motor RapidOCR multiespectral con cálculo de confianza espacial
│   ├── pipeline.py              # Pipeline orquestador: Preprocess -> RapidOCR -> Extract -> Validate -> Sync
│   ├── requirements.txt         # Lista congelada de dependencias Python
│   ├── telegram_receiver.py     # Receptor Telegram (long-polling y webhook) con descarga de fotos
│   ├── storage/                 # Almacenamiento persistente
│   │   ├── production_data.db   # Base de datos SQLite
│   │   ├── raw_images/          # Fotos originales recibidas por Telegram
│   │   ├── processed_images/    # Imágenes corregidas por OpenCV
│   │   ├── audit_logs/          # Logs rotativos de auditoría
│   │   └── turnos/              # Archivo histórico en CSV por turno cerrado
│   └── tests/
│       └── test_pipeline.py     # Suite de pruebas unitarias automatizadas
│
├── data/
│   ├── production_data.json     # Archivo JSON principal consumido por frontend y APIs
│   ├── produccion_linea_c_historial.csv # CSV consolidado de producción histórica
│   └── turnos_archivados/       # Copias de seguridad de turnos en CSV
│
├── run_backend.py               # Punto de entrada unificado (--mode all | bot | api)
├── install_startup.py           # Script para registrar el bot en inicio automático de Windows
├── start_bot_service.bat        # Lanzador batch para PowerShell / CMD
└── start_bot_silent.vbs         # Lanzador silencioso en background para Windows
```

---

## 3. Funcionamiento de la Extracción OCR (Spatial Grid Correlation)

A diferencia de un OCR tradicional de texto libre, la pizarra industrial sufre de reflejos de luz de planta, plumones secos o números manuscritos con inclinación. Para garantizar **100% de confiabilidad**:

1. **Anclaje de Cuadrícula (Y-Spatial Anchor):**
   El extractor conoce de antemano las 28 filas de la plantilla PDF. Localiza tokens fijos de texto (`06:30`, `08:00`, `15:00`, `Total 1er turno`, etc.) y calcula el paso vertical entre filas (`row_step`). Las filas sin texto visible se interpolan con exactitud milimétrica.
2. **Segmentación por Zonas X (Columnas de la Plantilla):**
   - $X \in [0.18, 0.265]$: Columna **Real Pz/Hora** (0 a 120 piezas).
   - $X \in [0.265, 0.425]$: Columna **Real Acumulado** (piezas buenas acumuladas en el turno).
   - $X \in [0.425, 0.505]$: Columna **Piezas Malas / Scrap**.
   - $X \in [0.505, 0.635]$: Columna **Tiempo Minutos** de paro.
   - $X \ge 0.60$: Columna **Paros y Descripción de Fallas** (análisis de texto manuscrito).
3. **Manejo de Horas Futuras:**
   Toda hora posterior a la última registrada en la foto se marca como `isRecorded = False` y sus métricas reales se emiten como `null`. De esta forma, el dashboard web no proyecta valores inventados.

---

## 4. Procedimientos Operativos Estandarizados (SOPs)

### SOP-01: Recepción de Nueva Fotografía desde Telegram
1. El operador envía la foto a `@DASHBOARD_BRP_001_bot`.
2. `telegram_receiver.py` descarga la imagen en `backend/storage/raw_images/` y llama a `pipeline.process_image_file()`.
3. `pipeline.py` verifica hash MD5 para evitar duplicados. Si es nueva, corre EasyOCR y el extractor espacial.
4. `dashboard_sync.py` actualiza `data/production_data.json` y `assets/js/mockData.js`.
5. Si el backend corre con Git configurado, se ejecuta commit & push automático para actualizar GitHub Pages.

### SOP-02: Cambio de Turno Automático (Scheduler 24/7)
- `run_backend.py` monitorea continuamente la hora de Celaya (UTC-6).
- A las **15:00 hrs**, detecta cambio Turno 1 -> Turno 2, archiva el CSV del Turno 1 y activa el Turno 2.
- A las **23:00 hrs**, detecta cambio Turno 2 -> Turno 3, archiva el CSV del Turno 2 y activa el Turno 3.
- A las **06:30 hrs**, detecta cambio Turno 3 -> Turno 1, archiva la jornada y resetea el ciclo diario a cero.

### SOP-03: Botón de Reset en Dashboard Web
- Al pulsar **Reset** en la esquina superior derecha del dashboard web, se limpian los datos en pantalla para permitir la carga de una nueva jornada limpia.
- Los datos históricos no se pierden: quedan guardados en `production_data.db` y en la carpeta `backend/storage/turnos/`.
