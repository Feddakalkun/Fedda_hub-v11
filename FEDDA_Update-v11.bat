@echo off
setlocal EnableDelayedExpansion
title FEDDA AI Studio - Update Tool v11

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

set "REPO_URL=https://github.com/Feddakalkun/Fedda_hub-v11"
set "REPO_BRANCH=v11-main"
set "TARGET_DIR=%ROOT_DIR%\comfyuifeddafront"
set "TARGET_NAME=FEDDA v11"
set "FORCE_NODE_ARG="
if /I "%~1"=="--full-nodes" set "FORCE_NODE_ARG=-ForceNodeUpdate"

echo.
echo  =========================================
echo    FEDDA AI Studio ^| Update Tool
echo  =========================================
echo.
echo    Root: %ROOT_DIR%
echo    Target: %TARGET_DIR%
if defined FORCE_NODE_ARG (
    echo    Node mode: FULL ^(force update all installed nodes^)
) else (
    echo    Node mode: SMART ^(missing nodes only, faster^)
    echo               tip: use --full-nodes for full node refresh
)
echo.

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Git is not installed or not in PATH.
    echo  Download: https://git-scm.com/downloads
    echo.
    pause
    exit /b 1
)

if not exist "%TARGET_DIR%\scripts\install_lite.ps1" (
    echo  [ERROR] FEDDA install not found at:
    echo          %TARGET_DIR%
    echo.
    echo  Run installer first:
    echo          %ROOT_DIR%\FEDDA_OneClick_Installer-v11.bat
    echo.
    pause
    exit /b 1
)

call :cleanup_install_root_launchers
call :ensure_root_run_launcher

echo  [INFO] Updating %TARGET_NAME%...
pushd "%TARGET_DIR%" >nul

set "ORIGIN_URL="
for /f "delims=" %%r in ('git remote get-url origin 2^>nul') do set "ORIGIN_URL=%%r"
if /I not "!ORIGIN_URL!"=="%REPO_URL%" (
    echo  [ERROR] Install points to a different repo:
    echo          !ORIGIN_URL!
    echo          Expected: %REPO_URL%
    popd >nul
    pause
    exit /b 1
)

set "DIRTY=0"
for /f %%s in ('git status --porcelain 2^>nul ^| find /c /v ""') do set "DIRTY=%%s"
if not "!DIRTY!"=="0" (
    echo  [WARN] Local changes detected ^(git status not clean^).
    echo         Skipping auto-pull to avoid overwriting your work.
    popd >nul
    echo.
    pause
    exit /b 0
)

echo  [INFO] Fetching latest from %REPO_BRANCH%...
git fetch origin %REPO_BRANCH%
if %errorlevel% neq 0 (
    echo  [ERROR] git fetch failed.
    popd >nul
    pause
    exit /b 1
)

git checkout %REPO_BRANCH% >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] git checkout %REPO_BRANCH% failed.
    popd >nul
    pause
    exit /b 1
)

git pull --ff-only origin %REPO_BRANCH%
if %errorlevel% neq 0 (
    echo  [ERROR] git pull failed.
    popd >nul
    pause
    exit /b 1
)

for /f "delims=" %%h in ('git rev-parse --short HEAD 2^>nul') do set "HEAD_SHORT=%%h"
echo  [OK] Updated to commit !HEAD_SHORT!

echo  [INFO] Running post-update repair/sync...
if exist "scripts\update_logic.ps1" (
    powershell -ExecutionPolicy Bypass -File ".\scripts\update_logic.ps1" -SilentMode %FORCE_NODE_ARG%
    if %errorlevel% neq 0 (
        echo  [WARN] update_logic.ps1 returned non-zero.
    ) else (
        echo  [OK] update_logic.ps1 completed.
    )
) else if exist "scripts\update_code.ps1" (
    echo  [WARN] update_logic.ps1 missing, falling back to update_code.ps1...
    powershell -ExecutionPolicy Bypass -File ".\scripts\update_code.ps1" -SilentMode
    if %errorlevel% neq 0 (
        echo  [WARN] update_code.ps1 returned non-zero.
    ) else (
        echo  [OK] update_code.ps1 completed.
    )
) else (
    echo  [WARN] No update script found, skipping repair.
)

if not exist "logs" mkdir logs
echo [%date% %time%] UPDATED %TARGET_NAME% to !HEAD_SHORT! >> logs\update_wrapper.log

popd >nul

echo.
echo  =========================================
echo    Update completed
echo  =========================================
echo.
echo  Run app:
echo    "%ROOT_DIR%\FEDDA_run-v11.bat"
echo.
pause
exit /b 0

:cleanup_install_root_launchers
if exist "%TARGET_DIR%\FEDDA_OneClick_Installer-v11.bat" del /f /q "%TARGET_DIR%\FEDDA_OneClick_Installer-v11.bat" >nul 2>nul
if exist "%TARGET_DIR%\FEDDA_Update-v11.bat" del /f /q "%TARGET_DIR%\FEDDA_Update-v11.bat" >nul 2>nul
if exist "%TARGET_DIR%\FEDDA_Push-v11.bat" del /f /q "%TARGET_DIR%\FEDDA_Push-v11.bat" >nul 2>nul
exit /b 0

:ensure_root_run_launcher
(
echo @echo off
echo setlocal EnableExtensions
echo set "ROOT_DIR=%%~dp0"
echo if "%%ROOT_DIR:~-1%%"=="\" set "ROOT_DIR=%%ROOT_DIR:~0,-1%%"
echo set "TARGET_DIR=%%ROOT_DIR%%\comfyuifeddafront"
echo if not exist "%%TARGET_DIR%%\run.bat" ^(
echo   echo.
echo   echo  [ERROR] FEDDA install not found at:
echo   echo          %%TARGET_DIR%%
echo   echo.
echo   echo  Run FEDDA_OneClick_Installer-v11.bat first.
echo   echo.
echo   pause
echo   exit /b 1
echo ^)
echo call "%%TARGET_DIR%%\run.bat"
echo exit /b %%errorlevel%%
) > "%ROOT_DIR%\FEDDA_run-v11.bat"
exit /b 0
