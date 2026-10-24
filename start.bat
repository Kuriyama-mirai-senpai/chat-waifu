@echo off
chcp 65001 >nul
title Waifu Chatbot - Live2D Shizuku
cd /d "%~dp0"

echo ============================================
echo    WAIFU CHATBOT  -  Shizuku Live2D
echo ============================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [X] Khong thay lenh 'python' tren may.
    echo     Hay cai Python tai: https://www.python.org/downloads/
    echo     Nho tick "Add Python to PATH" khi cai dat nha!
    echo.
    pause
    exit /b 1
)

echo [1] Dang chay server tai:  http://localhost:8000
echo [2] Trinh duyet se tu mo trong giay lat...
echo     ^|neu khong tu mo, ban mo tay link tren^|
echo.
echo     Bam Ctrl+C hoac dong cua so nay de tat server.
echo.

start "" "http://localhost:8000"
python tools\server.py 8000
