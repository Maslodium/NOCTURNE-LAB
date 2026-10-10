@echo off
setlocal
set "POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%POWERSHELL%" (
  echo Windows PowerShell was not found.
  pause
  exit /b 2
)
"%POWERSHELL%" -NoLogo -ExecutionPolicy Bypass -NoProfile -STA -File "%~dp0apply-nocturne-theme.ps1"
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" pause
exit /b %EXITCODE%