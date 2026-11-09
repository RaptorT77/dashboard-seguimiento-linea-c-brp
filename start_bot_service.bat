@echo off
title BRP Linea C - Telemetry & Telegram Bot Service
cd /d "D:\RESEARCH\dashboard-seguimiento-linea-c-brp"
echo =======================================================
echo Iniciando Servicio de Telemetria BRP Linea C
echo =======================================================
python run_backend.py --mode all
pause

