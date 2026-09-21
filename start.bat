@echo off
title FinSight AI Launcher
color 0A

echo =====================================================================
echo                      FinSight AI Platform
echo         Financial Document Intelligence & Extraction Engine
echo =====================================================================
echo.

echo [*] Checking AI Models and Dependencies...
py -3.11 verify_system.py
echo.

echo [*] Launching FastAPI Backend Server on http://localhost:8001...
start "FinSight AI - Backend Server" cmd /k "cd backend && py -3.11 -m uvicorn app:app --host 0.0.0.0 --port 8001 --reload"

echo [*] Launching React Vite Frontend on http://localhost:5173...
start "FinSight AI - Frontend UI" cmd /k "cd frontend && npm run dev"

echo.
echo [*] Waiting for services to initialize...
timeout /t 4 /nobreak >nul

echo [*] Opening FinSight AI in your browser...
start http://localhost:5173

echo.
echo =====================================================================
echo FinSight AI is running!
echo  - Frontend Dashboard: http://localhost:5173
echo  - API Swagger Docs  : http://localhost:8001/docs
echo.
echo  - Path A (Local LM Studio): If you have LM Studio open, load
echo    Qwen 3 8B or Gemma 3 4B and click 'Start Server' on port 1234.
echo =====================================================================
echo.
pause
