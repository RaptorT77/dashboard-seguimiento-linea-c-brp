# Multi-arch standard slim Python image
FROM python:3.10-slim

# Prevent Python from buffering stdout/stderr
ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8000

# Install system dependencies required by OpenCV headless, ONNX Runtime, Git and Curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency definition
COPY backend/requirements.txt /app/backend/requirements.txt

# Install python dependencies with pip cache disabled to keep image small
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy application source code
COPY backend/ /app/backend/
COPY data/ /app/data/
COPY assets/ /app/assets/
COPY index.html /app/index.html
COPY run_backend.py /app/run_backend.py

# Ensure storage directories exist
RUN mkdir -p /app/backend/storage/raw_images \
    /app/backend/storage/processed_images \
    /app/backend/storage/audit_logs \
    /app/backend/storage/turnos \
    /app/data/turnos_archivados

# Expose port (default 8000, dynamic on Render/Railway/Cloud Run)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start command: runs Telegram bot polling and FastAPI concurrently
CMD ["python", "run_backend.py", "--mode", "all"]

