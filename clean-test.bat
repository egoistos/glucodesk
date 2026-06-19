@echo off
echo Cleaning GlucoDesk test data...
del "%APPDATA%\glucodesk\glucodesk-settings.json" 2>nul
del "%APPDATA%\glucodesk\glucodesk-history.db" 2>nul
del "%APPDATA%\glucodesk\glucodesk-history.db-shm" 2>nul
del "%APPDATA%\glucodesk\glucodesk-history.db-wal" 2>nul
echo Done. Starting GlucoDesk...
start "" "%~dp0dist\win-unpacked\GlucoDesk.exe"