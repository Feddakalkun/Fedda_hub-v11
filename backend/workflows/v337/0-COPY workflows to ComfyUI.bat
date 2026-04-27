@echo off
setlocal ENABLEDELAYEDEXPANSION

REM ===== Paths =====
set "TARGET_PARENT_DIR=%~dp0.."
set "TARGET_APP_DIR=%TARGET_PARENT_DIR%\App"
set "ROOT_WORKFLOWS=%TARGET_PARENT_DIR%\1-WORKFLOWS"
set "DESTINATION_FOLDER=%TARGET_APP_DIR%\ComfyUI\user\default\workflows"
set "BACKUP_FOLDER=%TARGET_APP_DIR%\backup"

REM ===== Check folders =====
if not exist "%ROOT_WORKFLOWS%" (
    echo ERROR: Source workflows folder not found: "%ROOT_WORKFLOWS%"
    pause
    exit /b 1
)

if not exist "%DESTINATION_FOLDER%" (
    echo Destination folder not found, creating...
    mkdir "%DESTINATION_FOLDER%"
)

REM ===== Create numbered backup folder =====
set "n=1"
:find_backup_folder
set "CURRENT_BACKUP=%BACKUP_FOLDER%_%n%"
if exist "%CURRENT_BACKUP%" (
    set /a n+=1
    goto find_backup_folder
)

echo Creating backup folder: "%CURRENT_BACKUP%"
mkdir "%CURRENT_BACKUP%"

REM ===== Backup source and destination workflows =====
echo Backing up 1-WORKFLOWS...
robocopy "%ROOT_WORKFLOWS%" "%CURRENT_BACKUP%\ROOT_WORKFLOWS" /E /NFL /NDL /NJH /NJS /NC /NS >nul
if exist "%DESTINATION_FOLDER%" (
    echo Backing up DESTINATION_FOLDER...
    robocopy "%DESTINATION_FOLDER%" "%CURRENT_BACKUP%\DESTINATION_WORKFLOWS" /E /NFL /NDL /NJH /NJS /NC /NS >nul
)
echo Backing up destination workflows...
robocopy "%DESTINATION_FOLDER%" "%CURRENT_BACKUP%\DESTINATION_WORKFLOWS" /E /NFL /NDL /NJH /NJS /NC /NS >nul

REM ===== Clear destination folder =====
echo Deleting old workflows in destination...
for /d %%D in ("%DESTINATION_FOLDER%\*") do rmdir /s /q "%%D"
del /q "%DESTINATION_FOLDER%\*" >nul 2>&1

REM ===== Copy new workflows =====
echo Copying new workflows from "%ROOT_WORKFLOWS%" to "%DESTINATION_FOLDER%"...
robocopy "%ROOT_WORKFLOWS%" "%DESTINATION_FOLDER%" /E /NFL /NDL /NJH /NJS /NC /NS >nul

REM ===== Done =====
echo Workflow update complete.
echo Backup saved in: "%CURRENT_BACKUP%"

REM ===== Delete all BAT files from destination =====
del /q "%DESTINATION_FOLDER%\*.bat" >nul 2>&1
echo Workflow update complete.
echo Backup saved in: "%CURRENT_BACKUP%"
pause
endlocal
