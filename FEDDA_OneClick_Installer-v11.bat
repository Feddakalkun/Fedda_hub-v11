@echo off
setlocal EnableExtensions

title FEDDA AI Studio - Main Installer v11

set "REPO_URL=https://github.com/Feddakalkun/Fedda_hub-v11"
set "REPO_BRANCH=v11-main"
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "INSTALL_DIR=%ROOT%\comfyuifeddafront"
set "LOG_DIR=%ROOT%\logs"
set "LOG_FILE=%LOG_DIR%\oneclick_setup.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>nul

echo. > "%LOG_FILE%"
echo [%date% %time%] FEDDA One-Click installer start >> "%LOG_FILE%"

echo.
echo  ==============================================================
echo   FEDDA AI Studio ^| Main Installer
echo  ==============================================================
echo.
echo   This installer sets up the recommended production build.
echo   No extra setup menus, no manual repo steps.
echo.
echo   Requirements:
echo    - Git
echo    - Node.js 18+
echo    - npm
echo    - NVIDIA GPU (for Comfy workflows)
echo.
echo   Install target:
echo    %INSTALL_DIR%
echo.
echo   Press any key to continue or close this window to cancel.
pause >nul

where git >nul 2>nul || goto :err_git
where node >nul 2>nul || goto :err_node
where npm >nul 2>nul || goto :err_npm

echo  [OK] Tool checks passed.
echo [%date% %time%] Tool checks passed >> "%LOG_FILE%"

if exist "%INSTALL_DIR%\.git" goto :update_repo
goto :clone_repo

:update_repo
echo.
echo  [INFO] Existing FEDDA install detected. Updating repo...
pushd "%INSTALL_DIR%" || goto :err_pushd

for /f "delims=" %%r in ('git remote get-url origin 2^>nul') do set "ORIGIN_URL=%%r"
if /I not "%ORIGIN_URL%"=="%REPO_URL%" goto :err_remote

git diff --quiet --ignore-submodules HEAD
if not "%ERRORLEVEL%"=="0" (
  for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "STASH_TS=%%t"
  set "STASH_MSG=FEDDA auto-stash before installer update !STASH_TS!"
  echo  [INFO] Local changes detected. Auto-stashing...
  git stash push -u -m "!STASH_MSG!" >> "%LOG_FILE%" 2>&1 || goto :err_stash
  set "AUTO_STASHED=1"
)

git fetch origin %REPO_BRANCH% >> "%LOG_FILE%" 2>&1 || goto :err_fetch
git checkout %REPO_BRANCH% >> "%LOG_FILE%" 2>&1 || goto :err_checkout
git pull --ff-only origin %REPO_BRANCH% >> "%LOG_FILE%" 2>&1 || goto :err_pull

if "%AUTO_STASHED%"=="1" (
  git stash pop --index >> "%LOG_FILE%" 2>&1
  if not "%ERRORLEVEL%"=="0" (
    echo  [WARN] Could not auto-restore stashed changes cleanly.
    echo         Run: git stash list in %INSTALL_DIR%
    echo [%date% %time%] WARN: stash pop conflict >> "%LOG_FILE%"
  )
)

popd
goto :run_install

:clone_repo
echo.
echo  [INFO] Cloning FEDDA repo...
git clone --branch %REPO_BRANCH% %REPO_URL% "%INSTALL_DIR%" >> "%LOG_FILE%" 2>&1 || goto :err_clone
goto :run_install

:run_install
if not exist "%INSTALL_DIR%\scripts\install_lite.ps1" goto :err_no_installscript

echo.
echo  [INFO] Running FEDDA installer...
echo [%date% %time%] Running scripts\install_lite.ps1 stable profile >> "%LOG_FILE%"

pushd "%INSTALL_DIR%" || goto :err_pushd
powershell -ExecutionPolicy Bypass -File ".\scripts\install_lite.ps1"
set "INSTALL_EXIT=%ERRORLEVEL%"
popd

if not "%INSTALL_EXIT%"=="0" goto :err_install

call :ensure_root_launchers
call :cleanup_install_root_launchers

echo.
echo  ==============================================================
echo   FEDDA AI Studio installed successfully
echo  ==============================================================
echo.
echo   Start app:
echo    %ROOT%\FEDDA_run-v11.bat
echo.
echo   Update later (recommended):
echo    %ROOT%\FEDDA_Update-v11.bat
echo.
echo [%date% %time%] SUCCESS >> "%LOG_FILE%"
pause
exit /b 0

:err_git
echo.
echo  [ERROR] Git not found.
echo  Install Git: https://git-scm.com/downloads
echo [%date% %time%] ERROR: git missing >> "%LOG_FILE%"
pause
exit /b 1

:err_node
echo.
echo  [ERROR] Node.js not found.
echo  Install Node.js LTS: https://nodejs.org/
echo [%date% %time%] ERROR: node missing >> "%LOG_FILE%"
pause
exit /b 1

:err_npm
echo.
echo  [ERROR] npm not found.
echo  Reinstall Node.js LTS so npm is included.
echo [%date% %time%] ERROR: npm missing >> "%LOG_FILE%"
pause
exit /b 1

:err_pushd
echo.
echo  [ERROR] Could not enter install directory.
echo [%date% %time%] ERROR: pushd failed >> "%LOG_FILE%"
pause
exit /b 1

:err_remote
echo.
echo  [ERROR] Existing folder points to another repo:
echo          %ORIGIN_URL%
echo          expected: %REPO_URL%
echo [%date% %time%] ERROR: remote mismatch %ORIGIN_URL% >> "%LOG_FILE%"
popd
pause
exit /b 1

:err_dirty
echo.
echo  [ERROR] Existing install has local changes.
echo  To protect your edits, auto-pull is blocked.
echo  Commit or stash first, then run again.
echo [%date% %time%] ERROR: dirty working tree >> "%LOG_FILE%"
popd
pause
exit /b 1

:err_stash
echo.
echo  [ERROR] Failed to auto-stash local changes.
echo [%date% %time%] ERROR: auto stash failed >> "%LOG_FILE%"
popd
pause
exit /b 1

:err_fetch
echo.
echo  [ERROR] git fetch failed.
echo [%date% %time%] ERROR: git fetch failed >> "%LOG_FILE%"
popd
pause
exit /b 1

:err_checkout
echo.
echo  [ERROR] git checkout failed.
echo [%date% %time%] ERROR: git checkout failed >> "%LOG_FILE%"
popd
pause
exit /b 1

:err_pull
echo.
echo  [ERROR] git pull failed (non fast-forward or network issue).
echo [%date% %time%] ERROR: git pull failed >> "%LOG_FILE%"
popd
pause
exit /b 1

:err_clone
echo.
echo  [ERROR] Clone failed.
echo  Check internet/GitHub access and try again.
echo [%date% %time%] ERROR: clone failed >> "%LOG_FILE%"
pause
exit /b 1

:err_no_installscript
echo.
echo  [ERROR] scripts\install_lite.ps1 not found in install directory.
echo [%date% %time%] ERROR: install_lite.ps1 missing >> "%LOG_FILE%"
pause
exit /b 1

:err_install
echo.
echo  [ERROR] Installation failed with code %INSTALL_EXIT%.
echo  Check log files in:
echo    %INSTALL_DIR%\logs\
echo [%date% %time%] ERROR: install failed code %INSTALL_EXIT% >> "%LOG_FILE%"
pause
exit /b %INSTALL_EXIT%

:cleanup_install_root_launchers
if exist "%INSTALL_DIR%\FEDDA_OneClick_Installer-v11.bat" del /f /q "%INSTALL_DIR%\FEDDA_OneClick_Installer-v11.bat" >nul 2>nul
if exist "%INSTALL_DIR%\FEDDA_Update-v11.bat" del /f /q "%INSTALL_DIR%\FEDDA_Update-v11.bat" >nul 2>nul
if exist "%INSTALL_DIR%\FEDDA_Push-v11.bat" del /f /q "%INSTALL_DIR%\FEDDA_Push-v11.bat" >nul 2>nul
exit /b 0

:ensure_root_launchers
echo  [INFO] Creating root launchers...
echo [%date% %time%] Creating root launchers in %ROOT% >> "%LOG_FILE%"

if exist "%INSTALL_DIR%\FEDDA_Update-v11.bat" (
    copy /Y "%INSTALL_DIR%\FEDDA_Update-v11.bat" "%ROOT%\FEDDA_Update-v11.bat" >nul 2>nul
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
) > "%ROOT%\FEDDA_run-v11.bat"

if exist "%ROOT%\FEDDA_Update-v11.bat" (
    echo  [OK] Root launchers ready:
    echo       %ROOT%\FEDDA_run-v11.bat
    echo       %ROOT%\FEDDA_Update-v11.bat
) else (
    echo  [WARN] Could not place FEDDA_Update-v11.bat in root.
    echo        You can still run update from:
    echo        %INSTALL_DIR%\FEDDA_Update-v11.bat
)
exit /b 0



