@echo off
setlocal EnableDelayedExpansion
title FEDDA AI Studio - Update Tool v11

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "ROOT_DIR=%SCRIPT_DIR%"

set "REPO_URL=https://github.com/Feddakalkun/Fedda_hub-v11"
set "REPO_BRANCH=v11-main"
set "TARGET_DIR=%SCRIPT_DIR%\comfyuifeddafront"
set "ROOT_WRAP_DIR=%SCRIPT_DIR%"
set "TARGET_NAME=FEDDA v11"
set "FORCE_NODE_ARG="
set "NO_STASH=0"
set "AUTO_STASHED=0"
set "AUTO_FULL_NODE_UPDATE=0"
set "PS_EXE="
if /I "%~1"=="--full-nodes" set "FORCE_NODE_ARG=-ForceNodeUpdate"
if /I "%~1"=="--no-stash" set "NO_STASH=1"
where pwsh >nul 2>&1 && set "PS_EXE=pwsh"
if not defined PS_EXE set "PS_EXE=powershell"

if exist "%SCRIPT_DIR%\scripts\install_lite.ps1" (
    set "TARGET_DIR=%SCRIPT_DIR%"
    for %%I in ("%SCRIPT_DIR%\..") do set "ROOT_WRAP_DIR=%%~fI"
    set "ROOT_DIR=%ROOT_WRAP_DIR%"
)

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

where %PS_EXE% >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] PowerShell runtime not found. Install PowerShell 7 or Windows PowerShell.
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
) > "%ROOT_WRAP_DIR%\FEDDA_run-v11.bat"

echo  [INFO] Updating %TARGET_NAME%...
pushd "%TARGET_DIR%" >nul

for /f %%u in ('git diff --name-only --diff-filter=U 2^>nul ^| find /c /v ""') do set "HAS_UNMERGED=%%u"
if not "!HAS_UNMERGED!"=="0" (
    echo  [WARN] Previous git conflict state detected. Attempting auto-recovery...
    git merge --abort >nul 2>&1
    git rebase --abort >nul 2>&1
    git reset --merge >nul 2>&1
)

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
    if "%NO_STASH%"=="1" (
        echo  [WARN] Local changes detected ^(git status not clean^).
        echo         --no-stash is active, so update stops here.
        popd >nul
        echo.
        pause
        exit /b 0
    )
    for /f "delims=" %%t in ('%PS_EXE% -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "STASH_TS=%%t"
    set "STASH_MSG=FEDDA auto-stash before update !STASH_TS!"
    echo  [INFO] Local changes detected. Auto-stashing before pull...
    git stash push -u -m "!STASH_MSG!" >nul 2>&1
    if %errorlevel% neq 0 (
        echo  [ERROR] Auto-stash failed. Update stopped.
        popd >nul
        pause
        exit /b 1
    )
    set "AUTO_STASHED=1"
    set "AUTO_STASH_MSG=!STASH_MSG!"
)

echo  [INFO] Fetching latest from %REPO_BRANCH%...
for /f "delims=" %%h in ('git rev-parse HEAD 2^>nul') do set "OLD_HEAD=%%h"
git fetch origin %REPO_BRANCH%
if %errorlevel% neq 0 (
    echo  [ERROR] git fetch failed.
    popd >nul
    pause
    exit /b 1
)

git checkout %REPO_BRANCH% >nul 2>&1
if %errorlevel% neq 0 (
    echo  [WARN] git checkout %REPO_BRANCH% failed, attempting branch repair...
    git checkout -B %REPO_BRANCH% origin/%REPO_BRANCH% >nul 2>&1
    if %errorlevel% neq 0 (
        echo  [ERROR] Could not switch to %REPO_BRANCH%.
        popd >nul
        pause
        exit /b 1
    )
)

git pull --ff-only origin %REPO_BRANCH%
if %errorlevel% neq 0 (
    if "!AUTO_STASHED!"=="1" (
        echo  [INFO] Pull failed. Restoring stashed changes...
        git stash pop --index >nul 2>&1
    )
    echo  [ERROR] git pull failed.
    popd >nul
    pause
    exit /b 1
)

for /f "delims=" %%h in ('git rev-parse --short HEAD 2^>nul') do set "HEAD_SHORT=%%h"
for /f "delims=" %%h in ('git rev-parse HEAD 2^>nul') do set "NEW_HEAD=%%h"
echo  [OK] Updated to commit !HEAD_SHORT!

if defined OLD_HEAD if defined NEW_HEAD (
    if /I not "!OLD_HEAD!"=="!NEW_HEAD!" (
        for /f %%c in ('git diff --name-only "!OLD_HEAD!..!NEW_HEAD!" ^| findstr /R /I /C:"^config/nodes\.json$" /C:"^scripts/update_logic\.ps1$" /C:"^scripts/install_lite\.ps1$" /C:"^scripts/install\.ps1$" /C:"^backend/workflows/" ^| find /c /v ""') do set "CHANGED_NODE_RELATED=%%c"
        if not "!CHANGED_NODE_RELATED!"=="0" (
            set "AUTO_FULL_NODE_UPDATE=1"
            if not defined FORCE_NODE_ARG (
                set "FORCE_NODE_ARG=-ForceNodeUpdate"
            )
            echo  [INFO] Update touched node/workflow-critical files.
            echo         Enabling FULL node sync automatically.
        )
    )
)

echo  [INFO] Running post-update repair/sync...
if exist "scripts\update_logic.ps1" (
    %PS_EXE% -ExecutionPolicy Bypass -File ".\scripts\update_logic.ps1" -SilentMode %FORCE_NODE_ARG%
    if %errorlevel% neq 0 (
        echo  [WARN] update_logic.ps1 returned non-zero.
    ) else (
        echo  [OK] update_logic.ps1 completed.
    )
) else if exist "scripts\update_code.ps1" (
    echo  [WARN] update_logic.ps1 missing, falling back to update_code.ps1...
    %PS_EXE% -ExecutionPolicy Bypass -File ".\scripts\update_code.ps1" -SilentMode
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

if "!AUTO_STASHED!"=="1" (
    echo  [INFO] Restoring your local changes...
    git stash pop --index >nul 2>&1
    if %errorlevel% neq 0 (
        echo  [WARN] Could not auto-restore cleanly.
        echo         Your stash is still saved. Run: git stash list
    ) else (
        echo  [OK] Local changes restored.
    )
)

popd >nul

echo.
echo  =========================================
echo    Update completed
echo  =========================================
echo.
echo  Run app:
echo    "%ROOT_WRAP_DIR%\FEDDA_run-v11.bat"
echo.
pause
exit /b 0
