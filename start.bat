@echo off
echo ================================================
echo   Los Campanarios - Blood on the Clock Tower
echo ================================================
echo.

set /p TUNNEL="Abrir URL publica para amigos? (s/n): "

if /i "%TUNNEL%"=="s" (
  echo.
  echo Compilando cliente para produccion...
  cd client
  call npm run build
  cd ..
  if errorlevel 1 (
    echo ERROR: Fallo la compilacion. Abortando.
    pause
    exit /b 1
  )
  echo Compilacion lista.
  echo.
  echo Iniciando servidor con tunel...
  echo Los amigos se conectan a la URL del tunel directamente.
  start "Servidor + Tunel" cmd /k "cd server && set TUNNEL=1 && npm run dev"
  echo.
  echo Iniciando cliente local en dev mode...
  start "Cliente (local)" cmd /k "cd client && npm run dev"
) else (
  echo.
  echo Iniciando servidor local...
  start "Servidor" cmd /k "cd server && npm run dev"
  echo.
  echo Iniciando cliente...
  start "Cliente" cmd /k "cd client && npm run dev"
)

echo.
echo Servidor:      http://localhost:3001
echo Cliente local: http://localhost:5173
if /i "%TUNNEL%"=="s" (
  echo Amigos: usar la URL del tunel que aparece en la ventana del servidor
)
echo.
echo Cierra las ventanas para detener.
pause
