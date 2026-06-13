@echo off
cd /d "%~dp0"
echo ====================================================
echo Starting Rider Insurance Registration Server...
echo ====================================================

:: Check if port 5001 is in use
netstat -ano | findstr :5001 > nul
if %errorlevel% equ 0 (
    echo [WARNING] Port 5001 is currently occupied!
    echo Please free it or stop any other process running on it.
    echo.
    pause
    cls
)

echo Starting Flask application on port 5001...
myvenv\Scripts\python.exe api\index.py
pause
