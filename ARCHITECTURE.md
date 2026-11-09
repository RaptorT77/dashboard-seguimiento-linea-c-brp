# ARCHITECTURE.md — Arquitectura Técnica del Sistema

> **BRP Rotax México — Planta Kolben Schmidt Celaya — Línea C**  
> **Sistema:** Telemetría, Captura OCR y Dashboard de Producción 24 Horas  
> **Referencia:** Arquitectura de 5 Capas

---

## 1. Diagrama General de Arquitectura (5 Capas)

```mermaid
flowchart TD
    subgraph CAPA1["1. Capa de Piso de Planta (Edge / Mobile)"]
        WB["Pizarra Física de Producción (28 Filas / 9 Columnas)"]
        OP["Operador / Líder de Turno (Cámara de Celular)"]
        TG["Telegram Bot Client (@DASHBOARD_BRP_001_bot)"]
        WB --> OP --> TG
    end

    subgraph CAPA2["2. Capa de Ingestión y Visión Artificial"]
        API["Telegram Receiver & Webhook Daemon"]
        IMG["Storage Raw Images (Deduplicación MD5)"]
        PRE["Image Preprocessor (OpenCV / CLAHE)"]
        OCR["OCR Processor (RapidOCR PP-OCRv4 ONNX)"]
        EXT["Whiteboard Grid Extractor (Spatial Y-Anchor)"]
        VAL["Data Validator (Balance y Consistencia)"]
        
        TG --> API --> IMG --> PRE --> OCR --> EXT --> VAL
    end

    subgraph CAPA3["3. Capa de Persistencia y Auditoría"]
        DB[("SQLite Database: production_data.db")]
        AUD["Audit Logger (audit_YYYY_MM_DD.log)"]
        CSV["Shift CSV Archives (/storage/turnos/)"]
        
        VAL --> DB
        VAL --> AUD
        VAL --> CSV
    end

    subgraph CAPA4["4. Capa de Sincronización y Negocio"]
        SYNC["Dashboard Sync Service"]
        JSON["data/production_data.json"]
        MOCK["assets/js/mockData.js"]
        KEEPALIVE["Keepalive Service (Render Cloud Ping)"]
        SCHED["24/7 Shift Scheduler (UTC-6)"]
        
        DB --> SYNC
        SYNC --> JSON
        SYNC --> MOCK
        SCHED --> SYNC
        KEEPALIVE --> SYNC
    end

    subgraph CAPA5["5. Capa de Presentación y Andon"]
        GH["GitHub Pages (raptort77.github.io)"]
        WEB["Dashboard Industrial Web (Chart.js / SPA)"]
        ANDON["Baliza Andon ESP32-S3 (HTTP Signal)"]
        
        MOCK --> GH --> WEB
        JSON --> WEB
        SYNC --> ANDON
    end
```

---

## 2. Flujo Secuencial de Captura y Publicación

```mermaid
sequenceDiagram
    autonumber
    actor Operador as Líder de Línea C
    participant Telegram as Telegram Bot API
    participant Receiver as telegram_receiver.py
    participant Pipeline as pipeline.py
    participant Extractor as data_extractor.py
    participant DB as SQLite / CSV
    participant Sync as dashboard_sync.py
    participant Pages as GitHub Pages (Web)

    Operador->>Telegram: Envia foto del pizarrón acrílico
    Telegram->>Receiver: Notificación de foto entrante
    Receiver->>Pipeline: Descarga imagen y procesa pipeline
    Pipeline->>Pipeline: Filtros OpenCV (contraste y corrección)
    Pipeline->>Extractor: Ejecuta RapidOCR y ancla cuadrícula de 28 filas
    Extractor->>Pipeline: Retorna matriz de 15 horas reales + horas futuras (null)
    Pipeline->>DB: Almacena en SQLite y registra evento de auditoría
    Pipeline->>Sync: Invoca sincronización de dashboard
    Sync->>Sync: Genera Curva S 24H y calcula OEE global
    Sync->>Pages: Actualiza production_data.json y mockData.js
    Pages-->>Operador: Dashboard web actualizado en tiempo real
```

---

## 3. Máquina de Estados del Semáforo Andon

```mermaid
stateDiagram-v2
    [*] --> PRODUCCION_EN_ORDEN

    PRODUCCION_EN_ORDEN --> ADVERTENCIA_OPERATIVA : Desviación < 15% vs Plan o Paro < 40 min
    PRODUCCION_EN_ORDEN --> PRODUCCION_DEFICIENTE : Paro >= 60 min o Cumplimiento < 65%

    ADVERTENCIA_OPERATIVA --> PRODUCCION_EN_ORDEN : Recuperación de ritmo de fabricación
    ADVERTENCIA_OPERATIVA --> PRODUCCION_DEFICIENTE : Incremento de paros o caída drástica de piezas

    PRODUCCION_DEFICIENTE --> ADVERTENCIA_OPERATIVA : Reanudación tras paro mayor
    PRODUCCION_DEFICIENTE --> PRODUCCION_EN_ORDEN : Cumplimiento de meta al corte horario
```

---

## 4. Descripción de Componentes Clave

### A. Preprocesamiento de Imágenes (`image_preprocessor.py`)
- **CLAHE (Contrast Limited Adaptive Histogram Equalization):** Realza el contraste de plumones gastados sobre fondo blanco reflectante.
- **Detección de Contorno de Pizarra:** Corrige la perspectiva para alinear el pizarrón ortogonalmente antes de segmentar.

### B. Motor OCR y Extractor Espacial (`ocr_processor.py`, `data_extractor.py`)
- **RapidOCR PP-OCRv4:** Reconoce con altísima velocidad (~150ms) trazos multiespectrales (BGR, canal verde para tinta morada, CLAHE para rojo y plumón gastado).
- Mapea las 28 filas de la plantilla oficial de Línea C:
  - 8 filas de Turno 1 (06:30 a 15:00) + Fila Totalizador T1.
  - 8 filas de Turno 2 (15:00 a 23:00) + Fila Totalizador T2.
  - 7 filas de Turno 3 (23:00 a 06:30) + Fila Totalizador T3.
  - Fila Total del Día (1,350 unidades programadas).
- Asigna tokens por coordenadas relativas X y asigna texto manuscrito a la columna de paros e incidencias.

### C. Sincronizador de Dashboard (`dashboard_sync.py`)
- Garantiza que el JSON maestro (`production_data.json`) y el archivo JS (`mockData.js`) sean réplicas exactas.
- Mantiene las horas futuras sin registrar con valores estrictamente `null` para que Chart.js las pinte en blanco.
- Calcula Disponibilidad, Rendimiento, Calidad (FPY) y OEE global bajo las fórmulas de World Class Manufacturing (WCM).
