param(
    [switch]$SilentMode
)

$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
$RootPath = Split-Path -Parent $ScriptPath
$ComfyModels = Join-Path $RootPath "ComfyUI\models"

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
        [long]$MinBytes = 5242880
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

function Ensure-LinkedCopy {
    param(
        [string]$SourcePath,
        [string]$DestPath,
        [string]$Label
    )

    if (-not (Test-Path $SourcePath)) {
        throw "Missing source file for ${Label}: $SourcePath"
    }

    $destDir = Split-Path -Parent $DestPath
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    if (Test-Path $DestPath) {
        return
    }

    try {
        New-Item -ItemType HardLink -Path $DestPath -Target $SourcePath -ErrorAction Stop | Out-Null
        Write-Info "  [OK] $Label linked" "Green"
    }
    catch {
        Copy-Item -Path $SourcePath -Destination $DestPath -Force
        Write-Info "  [OK] $Label copied" "Green"
    }
}

Write-Info "`n[LTX 2.3] Ensuring required models..." "Cyan"

$MainCheckpoint = Join-Path $ComfyModels "checkpoints\10Eros_v1-fp8mixed_learned.safetensors"
$SpatialUpscaler = Join-Path $ComfyModels "latent_upscale_models\ltx-2.3-spatial-upscaler-x2-1.1.safetensors"
$DistilledLora = Join-Path $ComfyModels "loras\ltx-2.3-22b-distilled-lora-1.1_fro90_ceil72_condsafe.safetensors"
$EditAnythingLora = Join-Path $ComfyModels "loras\ltx23_edit_anything_global_rank128_v1_9000steps_adamw.safetensors"
$GemmaTextEncoder = Join-Path $ComfyModels "text_encoders\gemma_3_12B_it_fp8_e4m3fn.safetensors"
$GemmaClipMirror = Join-Path $ComfyModels "clip\gemma_3_12B_it_fp8_e4m3fn.safetensors"
$DistilledLoraLtxSubfolder = Join-Path $ComfyModels "loras\ltx23\ltx-2.3-22b-distilled-lora-1.1_fro90_ceil72_condsafe.safetensors"
$EditAnythingLoraLtxSubfolder = Join-Path $ComfyModels "loras\ltx23\ltx23_edit_anything_global_rank128_v1_9000steps_adamw.safetensors"

Ensure-File `
    -Label "Checkpoint 10Eros_v1-fp8mixed_learned.safetensors" `
    -Url "https://huggingface.co/TenStrip/LTX2.3-10Eros/resolve/main/10Eros_v1-fp8mixed_learned.safetensors?download=true" `
    -DestPath $MainCheckpoint

Ensure-File `
    -Label "Latent upscaler ltx-2.3-spatial-upscaler-x2-1.1.safetensors" `
    -Url "https://huggingface.co/Lightricks/LTX-2.3/resolve/main/ltx-2.3-spatial-upscaler-x2-1.1.safetensors?download=true" `
    -DestPath $SpatialUpscaler

Ensure-File `
    -Label "LoRA ltx-2.3-22b-distilled-lora-1.1_fro90_ceil72_condsafe.safetensors" `
    -Url "https://huggingface.co/TenStrip/LTX2.3_Distilled_Lora_1.1_Experiments/resolve/main/ltx-2.3-22b-distilled-lora-1.1_fro90_ceil72_condsafe.safetensors?download=true" `
    -DestPath $DistilledLora

Ensure-File `
    -Label "LoRA ltx23_edit_anything_global_rank128_v1_9000steps_adamw.safetensors" `
    -Url "https://huggingface.co/Alissonerdx/LTX-LoRAs/resolve/main/ltx23_edit_anything_global_rank128_v1_9000steps_adamw.safetensors?download=true" `
    -DestPath $EditAnythingLora

Ensure-File `
    -Label "Text encoder gemma_3_12B_it_fp8_e4m3fn.safetensors" `
    -Url "https://huggingface.co/GitMylo/LTX-2-comfy_gemma_fp8_e4m3fn/resolve/main/gemma_3_12B_it_fp8_e4m3fn.safetensors?download=true" `
    -DestPath $GemmaTextEncoder

# Keep compatibility with workflows that look in clip/ as well as text_encoders/.
Ensure-LinkedCopy `
    -SourcePath $GemmaTextEncoder `
    -DestPath $GemmaClipMirror `
    -Label "Gemma text encoder clip mirror"

# Keep compatibility with workflows that expect loras/ltx23/.
Ensure-LinkedCopy `
    -SourcePath $DistilledLora `
    -DestPath $DistilledLoraLtxSubfolder `
    -Label "Distilled LoRA ltx23 mirror"

Ensure-LinkedCopy `
    -SourcePath $EditAnythingLora `
    -DestPath $EditAnythingLoraLtxSubfolder `
    -Label "Edit Anything LoRA ltx23 mirror"

Write-Info "[LTX 2.3] Required models ready." "Green"
