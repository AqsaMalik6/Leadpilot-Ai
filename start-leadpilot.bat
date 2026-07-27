@echo off
REM Double-click this file every time you want to use LeadPilot AI.
REM It starts both the backend and the website. Leave both black windows open
REM while you use the site — closing them (or shutting down/restarting your
REM laptop) stops the site, which is why you need to run this again next time.

echo Starting LeadPilot AI backend...
start "LeadPilot Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010"

timeout /t 3 /nobreak >nul

echo Starting LeadPilot AI website...
start "LeadPilot Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both are starting in the two new black windows.
echo Wait about 20-30 seconds, then open http://localhost:3000 in your browser.
echo.
pause
