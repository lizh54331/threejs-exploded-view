@echo off
rem ---------------------------------------------------------------
rem  Exploded view - local preview launcher
rem  Double-click this file. It starts a local http server and
rem  opens the page. Closing the black window stops the server.
rem  (ES modules cannot run from file:// - it needs http.)
rem ---------------------------------------------------------------
cd /d "%~dp0"
set "PORT=5188"
set "URL=http://127.0.0.1:%PORT%/index.html"

rem If a server already answers on this port, just open the browser.
powershell -NoProfile -Command "try{(Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 2)|Out-Null;exit 0}catch{exit 1}"
if not errorlevel 1 goto open_only

where python >nul 2>nul
if errorlevel 1 goto use_py
start "Exploded view server (close this window to stop)" cmd /k python -m http.server %PORT% --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" "%URL%"
goto end

:use_py
where py >nul 2>nul
if errorlevel 1 goto no_python
start "Exploded view server (close this window to stop)" cmd /k py -m http.server %PORT% --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" "%URL%"
goto end

:open_only
echo Server already running on port %PORT%. Opening browser...
start "" "%URL%"
goto end

:no_python
echo.
echo Python was not found on this machine.
echo Options:
echo   1) Install Python 3 from https://www.python.org/downloads/
echo   2) In VS Code install the "Live Server" extension, right-click index.html, "Open with Live Server"
echo.
pause

:end
endlocal
