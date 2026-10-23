@echo off
rem Abre la web en tu ordenador: doble clic en este archivo.
rem Compila la version actual y la sirve en http://localhost:4322 (igual que la publicada).
rem Para cerrarla, cierra esta ventana (o pulsa Ctrl+C).
chcp 65001 >nul
cd /d "%~dp0"
title Phantom Parade Hub (local)

if not exist node_modules (
  echo Instalando dependencias por primera vez...
  call npm install || goto :error
)

echo Preparando la web (tarda unos 30 segundos)...
call npm run build || goto :error

echo.
echo Lista: se abre en tu navegador. Deja esta ventana abierta mientras la uses.
start "" http://localhost:4322/es/
call npx astro preview --port 4322
goto :eof

:error
echo.
echo Algo ha fallado. Copia el mensaje de arriba y pasamelo.
pause
