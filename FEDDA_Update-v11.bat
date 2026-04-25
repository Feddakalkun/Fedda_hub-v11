@echo off
setlocal EnableDelayedExpansion
title FEDDA AI Studio - Updater v11

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

set "REPO_URL=https://github.com/Feddakalkun/Fedda_hub-v11"
set "REPO_BRANCH=v11-main"
set "FULL_DIR=%ROOT_DIR%\comfyuifeddafront-full"
set "LITE_DIR=%ROOT_DIR%\comfyuifeddafront-lite"

echo.
echo  =========================================
echo    FEDDA AI Studio ^| Update Tool
echo  =========================================
echo.
echo    Root: %ROOT_DIR%
echo.

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Git is not installed or not in PATH.
    echo  Download: https://git-scm.com/downloads
    echo.
    pause
    exit /b 1
)

echo  Choose what to update:
echo.
echo    [1] FULL  ^(%FULL_DIR%^)
echo    [2] LITE  ^(%LITE_DIR%^)
echo    [3] BOTH  ^(default^)
echo.

:ask_choice
set "CHOICE="
set /p "CHOICE=  Enter 1, 2 or 3 (default: 3): "
if "%CHOICE%"=="" set "CHOICE=3"
if "%CHOICE%"=="1" goto :update_full
if "%CHOICE%"=="2" goto :update_lite
if "%CHOICE%"=="3" goto :update_both
echo  Invalid choice. Please enter 1, 2 or 3.
goto :ask_choice

:update_both
call :update_one "%FULL_DIR%" "FULL"
call :update_one "%LITE_DIR%" "LITE"
goto :done

:update_full
call :update_one "%FULL_DIR%" "FULL"
goto :done

:update_lite
call :update_one "%LITE_DIR%" "LITE"
goto :done

:update_one
set "TARGET_DIR=%~1"
set "TARGET_NAME=%~2"

echo.
echo  -----------------------------------------
echo    Updating %TARGET_NAME%
echo  -----------------------------------------

if not exist "%TARGET_DIR%\install.bat" (
    echo  [WARN] %TARGET_NAME% install not found at:
    echo         %TARGET_DIR%
    exit /b 0
)

pushd "%TARGET_DIR%" >nul

for /f "delims=" %%r in ('git remote get-url origin 2^>nul') do set "ORIGIN_URL=%%r"
if /I not "!ORIGIN_URL!"=="%REPO_URL%" (
    echo  [ERROR] %TARGET_NAME% points to a different repo:
    echo          !ORIGIN_URL!
    echo          Expected: %REPO_URL%
    popd >nul
    exit /b 1
)

set "DIRTY=0"
for /f %%s in ('git status --porcelain 2^>nul ^| find /c /v ""') do set "DIRTY=%%s"
if not "!DIRTY!"=="0" (
    echo  [WARN] %TARGET_NAME% has local changes (^!git status^! not clean^).
    echo         Skipping auto-pull to avoid overwriting your work.
    popd >nul
    exit /b 0
)

echo  [INFO] Fetching latest from %REPO_BRANCH%...
git pull origin %REPO_BRANCH%
if %errorlevel% neq 0 (
    echo  [ERROR] git pull failed for %TARGET_NAME%.
    popd >nul
    exit /b 1
)

for /f "delims=" %%h in ('git rev-parse --short HEAD 2^>nul') do set "HEAD_SHORT=%%h"
echo  [OK] %TARGET_NAME% updated to commit !HEAD_SHORT!

echo  [INFO] Running post-update repair/sync for %TARGET_NAME%...
if exist "scripts\update_logic.ps1" (
    powershell -ExecutionPolicy Bypass -File ".\scripts\update_logic.ps1" -SilentMode
    if %errorlevel% neq 0 (
        echo  [WARN] update_logic.ps1 returned non-zero for %TARGET_NAME%.
    ) else (
        echo  [OK] update_logic.ps1 completed for %TARGET_NAME%.
    )
) else if exist "scripts\update_code.ps1" (
    echo  [WARN] update_logic.ps1 missing, falling back to update_code.ps1...
    powershell -ExecutionPolicy Bypass -File ".\scripts\update_code.ps1" -SilentMode
    if %errorlevel% neq 0 (
        echo  [WARN] update_code.ps1 returned non-zero for %TARGET_NAME%.
    ) else (
        echo  [OK] update_code.ps1 completed for %TARGET_NAME%.
    )
) else (
    echo  [WARN] No update script found in %TARGET_NAME%, skipping repair.
)

if not exist "logs" mkdir logs
echo [%date% %time%] UPDATED %TARGET_NAME% to !HEAD_SHORT! >> logs\update_wrapper.log

popd >nul
exit /b 0

:done
echo.
echo  =========================================
echo    Update completed
echo  =========================================
echo.
echo  Tip:
echo    Run FULL : "%FULL_DIR%\run.bat"
echo    Run LITE : "%LITE_DIR%\run.bat"
echo.
pause
exit /b 0


