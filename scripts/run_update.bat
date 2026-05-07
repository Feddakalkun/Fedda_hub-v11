@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
cd ..

set "ROOT_DIR=%CD%"
set "LOG_FILE=%ROOT_DIR%\logs\update.log"
set "PS_EXE="
where pwsh >nul 2>&1 && set "PS_EXE=pwsh"
if not defined PS_EXE set "PS_EXE=powershell"

if not exist "%ROOT_DIR%\logs" mkdir "%ROOT_DIR%\logs"

:: Log wrapper to track update completion
(
    echo [%date% %time%] FEDDA Update Starting...
    echo.
) >> "%LOG_FILE%"

:: Call PowerShell update script in silent mode
%PS_EXE% -ExecutionPolicy Bypass -File "%ROOT_DIR%\scripts\update_code.ps1" -SilentMode >> "%LOG_FILE%" 2>&1
set "UPDATE_EXIT=%errorlevel%"

:: Log result
if %UPDATE_EXIT% equ 0 (
    echo [%date% %time%] FEDDA Update Completed Successfully >> "%LOG_FILE%"
) else (
    echo [%date% %time%] FEDDA Update Failed with exit code %UPDATE_EXIT% >> "%LOG_FILE%"
)

exit /b %UPDATE_EXIT%
