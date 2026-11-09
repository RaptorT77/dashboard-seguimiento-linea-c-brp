import os
import sys
from pathlib import Path

startup_dir = Path(os.environ["APPDATA"]) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"
target_bat = Path("D:/RESEARCH/dashboard-seguimiento-linea-c-brp/start_bot_service.bat").resolve()

# Create a VBScript shortcut in Startup folder
vbs_content = f'''Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\\RESEARCH\\dashboard-seguimiento-linea-c-brp"
WshShell.Run "cmd /c ""{target_bat}""", 7, False
'''

startup_file = startup_dir / "Iniciar_Bot_BRP_LineaC.vbs"
with open(startup_file, "w", encoding="utf-8") as f:
    f.write(vbs_content)

print(f"Instalado exitosamente en: {startup_file}")
print("El servicio iniciará minimizado en segundo plano cada vez que inicie Windows.")
