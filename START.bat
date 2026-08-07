@echo off
title soccer.co.ke - Starting site
cd /d "%~dp0"

echo.
echo ========================================
echo   soccer.co.ke - installing and starting
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Download from https://nodejs.org  ^(version 20 or 24^)
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo Creating .env.local from .env.example ...
  copy /Y ".env.example" ".env.local" >nul
  echo.
  echo IMPORTANT: Edit .env.local and set:
  echo   NEXT_PUBLIC_SITE_URL=https://your-domain.com
  echo   GNEWS_API_KEY=your-key  ^(optional^)
  echo.
  notepad ".env.local"
)

echo Installing packages...
call npm install
if errorlevel 1 (
  echo npm install failed
  pause
  exit /b 1
)

echo Building site...
call npm run build
if errorlevel 1 (
  echo Build failed
  pause
  exit /b 1
)

echo.
echo ========================================
echo   READY - open http://localhost:3000
echo   Press Ctrl+C to stop the server
echo ========================================
echo.

call npm start
pause
