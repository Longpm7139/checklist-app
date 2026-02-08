@echo off
echo ==================================================
echo        DANG KHOI DONG PHAN MEM CHECKLIST
echo ==================================================
echo.
echo Vui long cho giay lat, trinh duyet se tu dong mo...
echo.

:: Change to current directory
cd /d "%~dp0"

:: Open browser after a slight delay (using timeout hack)
start "" "http://localhost:3000"

:: Start the application
npm run dev

pause
