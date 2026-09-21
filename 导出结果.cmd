@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Exporting from CloudBase and building CSV ...
echo (If it says not logged in, run: npx -y -p @cloudbase/cli tcb login)
echo.
node export.mjs
echo.
pause
