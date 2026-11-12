@echo off
title soccer.co.ke - install, build, start
cd /d "%~dp0"

echo.
echo ========================================
echo   soccer.co.ke deploy
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Download from https://nodejs.org  ^(version 20 or 24^)
  pause
  exit /b 1
)

echo Checking package files...
call node scripts\check-deploy.js
if errorlevel 1 (
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo Creating .env.local from .env.example ...
  copy /Y ".env.example" ".env.local" >nul
  echo.
  echo IMPORTANT: set NEXT_PUBLIC_SITE_URL to your real domain in .env.local
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
echo   If behind Cloudflare and you see 522,
echo   test SERVER-IP:3000 or grey-cloud DNS.
echo   Press Ctrl+C to stop
echo ========================================
echo.

call npm start
pause
