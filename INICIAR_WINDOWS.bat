@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js nao encontrado. Instale Node.js 20+ em https://nodejs.org/
 echo Ou use o VS Code com Live Server, abrindo a pasta do projeto.
 pause
 exit /b 1
)
echo.
echo  GOATi MANAGER - TESTE LOCAL
 echo Abrindo http://localhost:4173
start "" "http://localhost:4173"
node server.mjs
pause
