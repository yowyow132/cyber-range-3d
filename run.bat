@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
cd /d "%~dp0"
title CYBER RANGE 3D Server

echo ============================================================
echo   CYBER RANGE 3D Launcher (Local Server + Cloudflare Tunnel)
echo ============================================================
echo.

set "PY_EXE="

if exist "%~dp0.venv\Scripts\python.exe" (
    "%~dp0.venv\Scripts\python.exe" -c "import websockets, cryptography" >nul 2>&1
    if not errorlevel 1 (
        set "PY_EXE=%~dp0.venv\Scripts\python.exe"
        goto :have_python
    )
)

if exist "%~dp0esp32-firmware\.venv\Scripts\python.exe" (
    "%~dp0esp32-firmware\.venv\Scripts\python.exe" -c "import websockets, cryptography" >nul 2>&1
    if not errorlevel 1 (
        set "PY_EXE=%~dp0esp32-firmware\.venv\Scripts\python.exe"
        goto :have_python
    )
)

set "BASE_PY="
if exist "%USERPROFILE%\miniconda3\python.exe" set "BASE_PY=%USERPROFILE%\miniconda3\python.exe"
if not defined BASE_PY if exist "%USERPROFILE%\anaconda3\python.exe" set "BASE_PY=%USERPROFILE%\anaconda3\python.exe"

if not defined BASE_PY (
    for /f "delims=" %%P in ('where python 2^>nul') do (
        if not defined BASE_PY (
            "%%P" -m pip --version >nul 2>&1
            if not errorlevel 1 set "BASE_PY=%%P"
        )
    )
)

if not defined BASE_PY (
    for /f "delims=" %%P in ('py -3 -c "import sys; print(sys.executable)" 2^>nul') do (
        if not defined BASE_PY (
            "%%P" -m pip --version >nul 2>&1
            if not errorlevel 1 set "BASE_PY=%%P"
        )
    )
)

if not defined BASE_PY (
    echo [ERROR] Python with pip was not found.
    echo Please install Python 3.10+ or Miniconda and run again.
    echo.
    pause
    exit /b 1
)

echo [Setup] Found Python: "%BASE_PY%"
if not exist "%~dp0.venv\Scripts\python.exe" (
    echo [Setup] Creating virtual environment .venv ...
    "%BASE_PY%" -m venv "%~dp0.venv"
    if errorlevel 1 (
        echo [Warn] Failed to create .venv, using system Python instead...
        set "PY_EXE=%BASE_PY%"
        goto :install_deps
    )
)
set "PY_EXE=%~dp0.venv\Scripts\python.exe"

:install_deps
"%PY_EXE%" -c "import websockets, cryptography" >nul 2>&1
if errorlevel 1 (
    echo [Setup] Installing websockets and cryptography ...
    "%PY_EXE%" -m pip install --upgrade websockets cryptography
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies. Check your internet connection.
        echo.
        pause
        exit /b 1
    )
)

:have_python
if not exist "%~dp0cloudflared.exe" (
    where cloudflared >nul 2>&1
    if errorlevel 1 (
        echo [Setup] Downloading portable cloudflared.exe ...
        curl.exe -fL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -o "%~dp0cloudflared.exe"
        if errorlevel 1 (
            echo [Warn] Failed to download cloudflared.exe. LAN mode will still work.
        )
    )
)

echo [Start] Launching server and Cloudflare tunnel...
echo [Info]  Browser will open http://localhost:8088/ automatically.
echo [Info]  Close this window or press Ctrl+C to stop.
echo.

"%PY_EXE%" "%~dp0server.py" --tunnel --open

echo.
echo Server stopped.
pause
