param(
    [switch]$SilentMode
)

$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
$RootPath = Split-Path -Parent $ScriptPath
$ComfyModels = Join-Path $RootPath "ComfyUI\models"
$DetectionDir = Join-Path $ComfyModels "detection"

function Write-Info {
    param([string]$Message, [string]$Color = "Gray")
    if (-not $SilentMode) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Ensure-File {
    param(
        [string]$Label,
        [string]$Url,
        [string]$DestPath,
        [long]$MinBytes = 1048576
    )
    $destDir = Split-Path -Parent $DestPath
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    if ((Test-Path $DestPath) -and ((Get-Item $DestPath).Length -ge $MinBytes)) {
        Write-Info "  [OK] $Label already present" "Green"
        return
    }

    Write-Info "  [DL] $Label" "Yellow"
    & curl.exe -L -C - --retry 4 --retry-delay 3 --progress-bar -o "$DestPath" "$Url"
    if ($LASTEXITCODE -ne 0) {
        throw "Download failed for $Label (exit code $LASTEXITCODE)"
    }
    if (-not (Test-Path $DestPath) -or ((Get-Item $DestPath).Length -lt $MinBytes)) {
        throw "Downloaded file invalid for $Label"
    }
    Write-Info "  [OK] $Label ready" "Green"
}

Write-Info "`n[Steady Dancer] Ensuring ONNX detection models..." "Cyan"

if (-not (Test-Path $DetectionDir)) {
    New-Item -ItemType Directory -Path $DetectionDir -Force | Out-Null
}

Ensure-File `
    -Label "ViTPose vitpose-l-wholebody.onnx" `
    -Url "https://huggingface.co/JunkyByte/easy_ViTPose/resolve/main/onnx/wholebody/vitpose-l-wholebody.onnx" `
    -DestPath (Join-Path $DetectionDir "vitpose-l-wholebody.onnx") `
    -MinBytes 104857600

Ensure-File `
    -Label "YOLO yolov10m.onnx" `
    -Url "https://huggingface.co/onnx-community/yolov10m/resolve/main/onnx/model.onnx" `
    -DestPath (Join-Path $DetectionDir "yolov10m.onnx") `
    -MinBytes 10485760

Write-Info "[Steady Dancer] Detection models ready." "Green"
