@echo off
rem financeAI - doble clic para abrir el menu de desarrollo del frontend.
rem Solo lanza scripts\windows\menu.ps1 saltando la politica de ejecucion de .ps1.
rem En Linux/macOS el equivalente es ./iniciar.sh
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\menu.ps1"
if errorlevel 1 pause
