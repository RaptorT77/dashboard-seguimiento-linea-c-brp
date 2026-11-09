Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\RESEARCH\dashboard-seguimiento-linea-c-brp"
WshShell.Run "python run_backend.py --mode all", 0, False

