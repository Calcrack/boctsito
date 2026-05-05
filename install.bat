@echo off
echo Instalando dependencias...
echo.

echo [1/3] Raiz...
call npm install

echo.
echo [2/3] Servidor...
cd server
call npm install
cd ..

echo.
echo [3/3] Cliente...
cd client
call npm install
cd ..

echo.
echo Listo. Ahora puedes ejecutar start.bat
pause
