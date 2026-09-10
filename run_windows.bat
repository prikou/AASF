@echo off
cd /d "%~dp0"
title AASF Email Defense Only V7.3.1
if exist ".env" (for /f "usebackq tokens=1,* delims==" %%A in (".env") do (if not "%%A"=="" if not "%%B"=="" set "%%A=%%B"))
echo.
echo ==============================================
echo   AASF EMAIL DEFENSE ONLY - V7.3.1
echo   RED attacks ^> BLUE stops ^> GREEN remediates
echo ==============================================
echo.
echo Opening: http://127.0.0.1:8773/story/01-red-attack.html
start "" http://127.0.0.1:8773/story/01-red-attack.html
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (py server.py) else (python server.py)
pause
