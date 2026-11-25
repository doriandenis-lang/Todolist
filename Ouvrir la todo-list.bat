@echo off
title Ma todo-list
cd /d "%~dp0"

rem Installe les dependances si besoin (premiere utilisation)
if not exist "node_modules" (
  echo Installation des dependances, patientez...
  call npm install
)

echo.
echo  La todo-list demarre sur http://localhost:3000
echo  Le navigateur va s'ouvrir dans quelques secondes.
echo  Pour arreter : fermez cette fenetre (ou Ctrl + C).
echo.

rem Ouvre le navigateur apres un petit delai, le temps que le serveur demarre
start "" cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:3000"

call npm run dev
