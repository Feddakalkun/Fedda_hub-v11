@echo off
setlocal EnableExtensions

title FEDDA AI Studio - Main Installer

set "REPO_URL=https://github.com/Feddakalkun/Fedda_hub-v7"
set "REPO_BRANCH=main"
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
if not "%ERRORLEVEL%"=="0" goto :err_dirty

git fetch origin %REPO_BRANCH% >> "%LOG_FILE%" 2>&1 || goto :err_fetch
git checkout %REPO_BRANCH% >> "%LOG_FILE%" 2>&1 || goto :err_checkout
git pull --ff-only origin %REPO_BRANCH% >> "%LOG_FILE%" 2>&1 || goto :err_pull

popd
goto :run_install

:clone_repo
echo.
echo  [INFO] Cloning FEDDA repo...
git clone --branch %REPO_BRANCH% %REPO_URL% "%INSTALL_DIR%" >> "%LOG_FILE%" 2>&1 || goto :err_clone
goto :run_install

:run_install
if not exist "%INSTALL_DIR%\install.bat" goto :err_no_installbat

echo.
echo  [INFO] Running FEDDA installer...
echo [%date% %time%] Running install.bat stable profile >> "%LOG_FILE%"

pushd "%INSTALL_DIR%" || goto :err_pushd
call install.bat LITE
set "INSTALL_EXIT=%ERRORLEVEL%"
popd

if not "%INSTALL_EXIT%"=="0" goto :err_install

echo.
echo  ==============================================================
echo   FEDDA AI Studio installed successfully
echo  ==============================================================
echo.
echo   Start app:
echo    %INSTALL_DIR%\run.bat
echo.
echo   Update later (recommended):
echo    %ROOT%\FEDDA_OneClick_Installer-v7.bat
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

:err_no_installbat
echo.
echo  [ERROR] install.bat not found in install directory.
echo [%date% %time%] ERROR: install.bat missing >> "%LOG_FILE%"
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
