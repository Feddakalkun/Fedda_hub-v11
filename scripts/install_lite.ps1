# ============================================================================
# FEDDA Lite Installer - Hybrid (Embedded Python + System Git/Node)
# ============================================================================
# Assumes: Git, Node.js 18+, npm (Python is embedded automatically)
# Creates: embedded Python runtime + ComfyUI + custom nodes + frontend + backend
# ============================================================================

$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
$RootPath = Split-Path -Parent $ScriptPath
$RootPath = (Resolve-Path $RootPath).Path
Set-Location $RootPath

# Optional toggles:
# - FEDDA_AUTO_MODEL_DOWNLOADS=1 enables bundled model ensure/download steps.
# - FEDDA_INSTALL_NVIDIA_VFX=1 enables automatic nvidia-vfx pip install for RTX nodes.
$EnableAutoModelDownloads = (([string]$env:FEDDA_AUTO_MODEL_DOWNLOADS).Trim() -eq "1")
$EnableNvidiaVfxInstall = (([string]$env:FEDDA_INSTALL_NVIDIA_VFX).Trim() -eq "1")

# Logging
$LogsDir = Join-Path $RootPath "logs"
if (-not (Test-Path $LogsDir)) { New-Item -ItemType Directory -Path $LogsDir | Out-Null }
$LogFile = Join-Path $LogsDir "install_fast_log.txt"

function Write-Step {
    param([string]$Message, [string]$Color = "White")
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "  [$ts] $Message" -ForegroundColor $Color
    Add-Content -Path $LogFile -Value "[$ts] $Message" -ErrorAction SilentlyContinue
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "  =================================================" -ForegroundColor DarkGray
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "  =================================================" -ForegroundColor DarkGray
}

function Test-Command {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-EmbeddedOllama {
    param([string]$RootPath, [string]$LogFile)
    
    $OllamaDir = Join-Path $RootPath "ollama_embeded"
    $OllamaExe = Join-Path $OllamaDir "ollama.exe"
    
    if (Test-Path $OllamaExe) {
        Write-Step "Embedded Ollama already installed." "Green"
        return $true
    }
    
    Write-Header "INSTALLING EMBEDDED OLLAMA"
    Write-Step "Downloading Ollama portable binary (v0.5.4)..." "Yellow"
    
    New-Item -ItemType Directory -Path $OllamaDir -Force | Out-Null
    $OllamaZip = Join-Path $OllamaDir "ollama.zip"
    
    try {
        # Download Ollama
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri "https://github.com/ollama/ollama/releases/download/v0.5.4/ollama-windows-amd64.zip" -OutFile $OllamaZip -UseBasicParsing
        
        Write-Step "Extracting Ollama..." "Yellow"
        Expand-Archive -Path $OllamaZip -DestinationPath $OllamaDir -Force
        Remove-Item $OllamaZip -Force
        
        Write-Step "Embedded Ollama installed successfully!" "Green"
        Write-Host "  Run 'ollama serve' to start Ollama." -ForegroundColor Gray
        return $true
    }
    catch {
        Write-Step "Failed to download Ollama: $_" "Red"
        return $false
    }
}

function Download-ZImageTurboCelebPack {
    param(
        [string]$PythonExe,
        [string]$ComfyDir
    )

    Write-Header "STEP 4.5/7 - Z-Image Turbo Celeb LoRA Pack"
    $TargetDir = Join-Path $ComfyDir "models\loras\zimage_turbo"
    if (-not (Test-Path $TargetDir)) {
        New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    }

    $PyScript = Join-Path $env:TEMP "feddaz_zimage_turbo_sync_lite.py"
    $PyCode = @"
import json
import os
import subprocess
import sys
import urllib.request

repo = "pmczip/Z-Image-Turbo_Models"
target = r"$TargetDir"
api = f"https://huggingface.co/api/models/{repo}/tree/main"

os.makedirs(target, exist_ok=True)

with urllib.request.urlopen(api, timeout=60) as resp:
    items = json.loads(resp.read().decode("utf-8", errors="ignore"))

files = []
for item in items:
    p = str(item.get("path", "")).strip()
    if p.lower().endswith(".safetensors") and "/" not in p:
        files.append(p)

files = sorted(set(files))
print(f"[Z-Image Turbo] Found {len(files)} LoRA files")

downloaded = 0
skipped = 0
failed = 0

for i, name in enumerate(files, start=1):
    out = os.path.join(target, name)
    if os.path.exists(out) and os.path.getsize(out) > 10000:
        skipped += 1
        print(f"[{i}/{len(files)}] Skip existing: {name}")
        continue

    url = f"https://huggingface.co/{repo}/resolve/main/{name}"
    print(f"[{i}/{len(files)}] Download: {name}")
    cmd = ["curl.exe", "-L", "--retry", "3", "--retry-delay", "2", "-o", out, url]
    result = subprocess.run(cmd)
    if result.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 10000:
        downloaded += 1
    else:
        failed += 1
        try:
            if os.path.exists(out) and os.path.getsize(out) < 10000:
                os.remove(out)
        except Exception:
            pass

print(f"[Z-Image Turbo] Done. Downloaded={downloaded}, Skipped={skipped}, Failed={failed}")
sys.exit(0 if failed == 0 else 2)
"@
    Set-Content -Path $PyScript -Value $PyCode -Encoding UTF8

    try {
        & $PythonExe $PyScript
        if ($LASTEXITCODE -eq 0) {
            Write-Step "Z-Image Turbo celeb pack installed." "Green"
        } else {
            Write-Step "Z-Image Turbo download completed with partial failures (code $LASTEXITCODE)." "Yellow"
        }
    } catch {
        Write-Step "Z-Image Turbo download failed: $_" "Yellow"
    } finally {
        if (Test-Path $PyScript) {
            Remove-Item $PyScript -Force -ErrorAction SilentlyContinue
        }
    }
}


Clear-Host
Write-Host ""
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host "                                                          " -ForegroundColor Cyan
Write-Host "         FEDDA LITE INSTALLER" -ForegroundColor Cyan
Write-Host "         Uses embedded Python + system Git/Node" -ForegroundColor Cyan
Write-Host "                                                          " -ForegroundColor Cyan
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host ""

# --- Detect System Tools ---
Write-Header "SYSTEM CHECK"

$AllGood = $true

# Python - informational only, we always embed Python 3.11.9 regardless of system version
if (Test-Command "python") {
    $PyVersion = & python --version 2>&1
    Write-Step "Python:  $PyVersion (system - will use embedded 3.11.9 instead)" "Gray"
} else {
    Write-Step "Python:  not installed on system (embedded 3.11.9 will be downloaded)" "Gray"
}
# No $AllGood = $false here - system Python is never required in Lite anymore

# Git
if (Test-Command "git") {
    $GitVersion = & git --version 2>&1
    Write-Step "Git:     $GitVersion" "Green"
} else {
    Write-Step "Git:     NOT FOUND - install from git-scm.com" "Red"
    $AllGood = $false
}

# Node.js - check presence AND minimum version (18+ required for Vite 7 / React 19)
$NODE_MIN = 18
if (Test-Command "node") {
    $NodeVersion = & node --version 2>&1    # e.g. "v20.11.0"
    if ($NodeVersion -match "v(\d+)\.") {
        $NodeMajor = [int]$Matches[1]
        if ($NodeMajor -lt $NODE_MIN) {
            Write-Step "Node.js: $NodeVersion  <<  INCOMPATIBLE (need v18+)" "Red"
            Write-Host ""
            Write-Host "  [!] NODE.JS TOO OLD" -ForegroundColor Red
            Write-Host "      Your version: $NodeVersion" -ForegroundColor Red
            Write-Host "      Required: v18 or newer (for Vite 7 + React 19)" -ForegroundColor Yellow
            Write-Host "      Download: https://nodejs.org  (choose LTS)" -ForegroundColor Cyan
            Write-Host ""
            $AllGood = $false
        } else {
            Write-Step "Node.js: $NodeVersion" "Green"
        }
    } else {
        Write-Step "Node.js: $NodeVersion" "Green"
    }
} else {
    Write-Step "Node.js: NOT FOUND - install from nodejs.org" "Red"
    $AllGood = $false
}

# npm
if (Test-Command "npm") {
    $NpmVersion = & npm --version 2>&1
    Write-Step "npm:     v$NpmVersion" "Green"
} else {
    Write-Step "npm:     NOT FOUND" "Red"
    $AllGood = $false
}

# Ollama
# Ollama - check if installed AND running
$OllamaInstalled = $false
$OllamaRunning = $false
if (Test-Command "ollama") {
    $OllamaInstalled = $true
    # Try to connect to Ollama service (port 11434)
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 1 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($?) {
            $OllamaVersion = & ollama --version 2>&1
            Write-Step "Ollama:  $OllamaVersion (running)" "Green"
            $OllamaRunning = $true
        } else {
            Write-Step "Ollama:  Installed but NOT RUNNING" "Yellow"
        }
    } catch {
        Write-Step "Ollama:  Installed but NOT RUNNING" "Yellow"
    }
} else {
    Write-Step "Ollama:  NOT INSTALLED (optional - AI chat disabled)" "Yellow"
}

# NVIDIA GPU
try {
    $NvidiaGPU = Get-CimInstance Win32_VideoController -ErrorAction Stop | Where-Object { $_.Name -match "NVIDIA" } | Select-Object -First 1
    if ($NvidiaGPU) {
        $VRAM_MB = 0
        try {
            $SmiOut = & nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>$null
            if ($SmiOut) { $VRAM_MB = [int]($SmiOut.Trim()) }
        } catch {}
        $VRAMStr = ""
        if ($VRAM_MB -gt 0) { $VRAMStr = " ($([math]::Round($VRAM_MB / 1024)) GB VRAM)" }
        Write-Step "GPU:     $($NvidiaGPU.Name)$VRAMStr" "Green"
    } else {
        Write-Step "GPU:     No NVIDIA GPU found - CUDA required!" "Red"
        $AllGood = $false
    }
} catch {
    Write-Step "GPU:     Detection failed" "Yellow"
}

# RAM & Disk
$OSInfo = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$RAM_GB = 0
if ($OSInfo) { $RAM_GB = [math]::Round($OSInfo.TotalVisibleMemorySize / 1MB) }
$Drive = (Get-Item $RootPath).PSDrive
$FreeGB = [math]::Round($Drive.Free / 1GB)

$RAMColor = "Yellow"
if ($RAM_GB -ge 16) { $RAMColor = "Green" }
Write-Step "RAM:     ${RAM_GB} GB" $RAMColor

$DiskColor = "Red"
if ($FreeGB -ge 10) { $DiskColor = "Green" }
elseif ($FreeGB -ge 5) { $DiskColor = "Yellow" }
Write-Step "Disk:    ${FreeGB} GB free on $($Drive.Name):\" $DiskColor

Write-Host ""

if (-not $AllGood) {
    Write-Host "  MISSING REQUIREMENTS - install the tools marked in red above." -ForegroundColor Red
    Write-Host ""
    Read-Host "  Press Enter to exit"
    exit 1
}

# Ollama Check (Warning if not running)
if (-not $OllamaRunning) {
    Write-Host ""
    Write-Host "  [!] OLLAMA NOT RUNNING" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Ollama is needed for the AI chat feature. Without it:" -ForegroundColor Yellow
    Write-Host "    - Agent Chat (text-to-speech, image caption) won't work" -ForegroundColor Gray
    Write-Host "    - Image generation, video, audio features WILL work normally" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Options:" -ForegroundColor White
    if ($OllamaInstalled) {
        Write-Host "    1) Continue install (Ollama will be used when you start it)" -ForegroundColor Gray
        Write-Host "    2) Cancel and start Ollama first (recommended)" -ForegroundColor Gray
        Write-Host "    3) Download & install embedded Ollama (portable, no system install needed)" -ForegroundColor Gray
    } else {
        Write-Host "    1) Continue install (skip AI chat)" -ForegroundColor Gray
        Write-Host "    2) Cancel and download Ollama from https://ollama.ai" -ForegroundColor Gray
        Write-Host "    3) Download & install embedded Ollama (portable, included)" -ForegroundColor Gray
    }
    Write-Host ""
    $OllamaChoice = Read-Host "  Enter 1, 2, or 3 (default: 1)"
    
    if ($OllamaChoice -eq "2") {
        Write-Host ""
        if ($OllamaInstalled) {
            Write-Host "  Start Ollama with: ollama serve" -ForegroundColor Cyan
            Write-Host "  Then run this installer again." -ForegroundColor White
        } else {
            Write-Host "  Download from https://ollama.ai" -ForegroundColor Cyan
            Write-Host "  Then run this installer again." -ForegroundColor White
        }
        Write-Host ""
        Read-Host "  Press Enter to exit"
        exit 0
    }
    elseif ($OllamaChoice -eq "3") {
        $EmbeddedSuccess = Install-EmbeddedOllama -RootPath $RootPath -LogFile $LogFile
        if (-not $EmbeddedSuccess) {
            Write-Host ""
            Write-Host "  Failed to download embedded Ollama. Check your internet connection." -ForegroundColor Red
            Write-Host "  You can still continue without it." -ForegroundColor Yellow
        } else {
            Write-Host "  Embedded Ollama is ready. It will start with run.bat." -ForegroundColor Green
            $OllamaRunning = $true
        }
    }
    
    if (-not $OllamaRunning) {
        Write-Host "  Continuing install without Ollama..." -ForegroundColor Yellow
    }
}

# Confirm
Write-Host "  All system tools detected. Root: $RootPath" -ForegroundColor Gray
Write-Host ""
$Confirm = Read-Host "  Press ENTER to install, or N to cancel"
if ($Confirm -eq "N" -or $Confirm -eq "n") { exit 0 }

$StopWatch = [System.Diagnostics.Stopwatch]::StartNew()

# ============================================================================
# 0. EMBED PYTHON 3.11.9 (always - eliminates version compatibility issues)
# Lite still uses system Git + Node, but Python is always our known-good version
# ============================================================================
Write-Header "STEP 0/7 - Embedded Python 3.11.9 (guaranteed compatible)"

$PyEmbedDir = Join-Path $RootPath "python_embeded"
$PyEmbedExe = Join-Path $PyEmbedDir "python.exe"

if (-not (Test-Path $PyEmbedExe)) {
    Write-Step "Downloading Python 3.11.9 portable (~8 MB)..." "Yellow"
    $PyZip = Join-Path $RootPath "python_embed.zip"
    try {
        & curl.exe -L -o "$PyZip" "https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip" --progress-bar --retry 3 --retry-delay 2
        if ($LASTEXITCODE -ne 0) { throw "Download failed" }

        Write-Step "Extracting Python 3.11.9..." "Yellow"
        New-Item -ItemType Directory -Path $PyEmbedDir -Force | Out-Null
        Expand-Archive -Path $PyZip -DestinationPath $PyEmbedDir -Force
        Remove-Item $PyZip -Force

        # Enable site-packages and add ComfyUI to path
        $PthFile = Join-Path $PyEmbedDir "python311._pth"
        if (Test-Path $PthFile) {
            $Content = Get-Content $PthFile
            $Content = $Content -replace "#import site", "import site"
            if ($Content -notcontains "../ComfyUI") { $Content += "../ComfyUI" }
            Set-Content -Path $PthFile -Value $Content
        }

        # Install pip into embedded Python
        Write-Step "Installing pip into embedded Python..." "Yellow"
        $GetPip = Join-Path $RootPath "get-pip.py"
        & curl.exe -L -o "$GetPip" "https://bootstrap.pypa.io/get-pip.py" --retry 3 --retry-delay 2
        & $PyEmbedExe $GetPip
        Remove-Item $GetPip -Force

        Write-Step "Python 3.11.9 embedded and configured." "Green"
    } catch {
        Write-Step "WARNING: Could not download embedded Python. Falling back to system Python." "Yellow"
        # Fall back gracefully - remove partial dir
        if (Test-Path $PyEmbedDir) { Remove-Item $PyEmbedDir -Recurse -Force -ErrorAction SilentlyContinue }
    }
} else {
    Write-Step "Embedded Python 3.11.9 already present." "Green"
}

# Determine the Python to use for ALL steps - embedded zip has NO venv module,
# so we install packages directly into embedded Python (same as portable installer).
$EmbedPy = $PyEmbedExe
if (-not (Test-Path $EmbedPy)) {
    # Fallback: use system Python if embedded download failed
    # Note: use if/else instead of ?. for PowerShell 5.1 compatibility
    $SysPyCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($SysPyCmd) {
        $SysPy = $SysPyCmd.Source
    } else {
        $SysPy = $null
    }
    if (-not $SysPy) {
        Write-Step "ERROR: No Python available. Embedded download must have failed." "Red"
        throw "No Python found"
    }
    $EmbedPy = $SysPy
    Write-Step "WARNING: Using system Python as fallback (embedded download failed)." "Yellow"
} else {
    Write-Step "Using embedded Python 3.11.9 directly (no venv - embedded zip lacks venv module)." "Green"
}

# ============================================================================
# 1. PYTHON PACKAGES (directly into embedded Python - no venv)
# ============================================================================
Write-Header "STEP 1/7 - Python Setup"

# Alias $VenvPy so the rest of the script stays unchanged
$VenvPy  = $EmbedPy
$VenvPip = Join-Path (Split-Path $EmbedPy) "Scripts\pip.exe"

Write-Step "pip is ready in embedded Python." "Green"

# Helper to run pip
function Venv-Pip {
    param([Parameter(Mandatory = $true)][string[]]$PipArgs)
    & $VenvPy -m pip @PipArgs --no-warn-script-location
    if ($LASTEXITCODE -ne 0) {
        Write-Step "WARNING: pip command had issues: $($PipArgs -join ' ')" "Yellow"
    }
}

function Get-NvidiaGpuProfile {
    $profile = [ordered]@{
        Name = "Unknown NVIDIA GPU"
        Driver = "Unknown"
        VramMB = 0
        Series = "unknown"
        HasNvidiaSmi = $false
    }

    $smi = Get-Command "nvidia-smi" -ErrorAction SilentlyContinue
    if (-not $smi) {
        return [pscustomobject]$profile
    }

    $profile.HasNvidiaSmi = $true
    try {
        $query = & nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader,nounits 2>$null | Select-Object -First 1
        if ($query) {
            $parts = $query -split ","
            if ($parts.Count -ge 3) {
                $profile.Name = $parts[0].Trim()
                $profile.Driver = $parts[1].Trim()
                $profile.VramMB = [int]($parts[2].Trim())
            }
        }
    } catch {}

    if ($profile.Name -match "RTX 60\d\d") {
        $profile.Series = "60"
    } elseif ($profile.Name -match "RTX 50\d\d") {
        $profile.Series = "50"
    } elseif ($profile.Name -match "RTX 40\d\d") {
        $profile.Series = "40"
    } elseif ($profile.Name -match "RTX 30\d\d") {
        $profile.Series = "30"
    } elseif ($profile.Name -match "RTX 20\d\d|GTX 16\d\d|GTX 10\d\d") {
        $profile.Series = "legacy"
    }

    return [pscustomobject]$profile
}

function Install-PipWithFallback {
    param(
        [string]$PrimaryArgs,
        [string]$FallbackArgs,
        [string]$Label
    )
    Write-Step "$Label (primary)..."
    & $VenvPy -m pip $PrimaryArgs --no-warn-script-location
    if ($LASTEXITCODE -eq 0) { return $true }

    Write-Step "$Label primary failed, trying fallback..." "Yellow"
    & $VenvPy -m pip $FallbackArgs --no-warn-script-location
    if ($LASTEXITCODE -eq 0) { return $true }

    Write-Step "$Label failed after fallback." "Red"
    return $false
}

function Install-TorchStack {
    param(
        [string[]]$Indexes
    )
    $torchSpec = @(
        "torch==2.6.0",
        "torchvision==0.21.0",
        "torchaudio==2.6.0"
    )
    foreach ($idx in $Indexes) {
        Write-Step "Trying torch stack from $idx ..."
        & $VenvPy -m pip install --upgrade --force-reinstall $torchSpec --index-url $idx --no-warn-script-location
        if ($LASTEXITCODE -eq 0) {
            Write-Step "Torch stack installed from $idx." "Green"
            return @{ ok = $true; index = $idx }
        }
        Write-Step "Torch stack failed on $idx" "Yellow"
    }
    return @{ ok = $false; index = "" }
}

function Get-TorchIndexesForGpu {
    param(
        [Parameter(Mandatory = $true)][string]$Series
    )

    # Optional manual override for advanced users/friend installs.
    $override = [string]$env:FEDDA_TORCH_INDEXES
    if (-not [string]::IsNullOrWhiteSpace($override)) {
        $parts = $override.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
        if ($parts.Count -gt 0) {
            Write-Step "Using FEDDA_TORCH_INDEXES override: $($parts -join ', ')" "Yellow"
            return $parts
        }
    }

    if ($Series -eq "60" -or $Series -eq "50") {
        return @(
            "https://download.pytorch.org/whl/cu128",
            "https://download.pytorch.org/whl/cu126",
            "https://download.pytorch.org/whl/cu124",
            "https://download.pytorch.org/whl/cu121"
        )
    }

    if ($Series -eq "40") {
        return @(
            "https://download.pytorch.org/whl/cu124",
            "https://download.pytorch.org/whl/cu121"
        )
    }

    return @(
        "https://download.pytorch.org/whl/cu124",
        "https://download.pytorch.org/whl/cu121"
    )
}

# ============================================================================
# 2. COMFYUI
# ============================================================================
Write-Header "STEP 2/7 - ComfyUI Core"

$ComfyUICommit = "a2840e75"  # Pinned stable - includes LTXAV 2.3 model support
$ComfyDir = Join-Path $RootPath "ComfyUI"

if (-not (Test-Path $ComfyDir)) {
    Write-Step "Cloning ComfyUI..."
    $ErrorActionPreference = "Continue"
    $cloneOut = & git clone https://github.com/comfyanonymous/ComfyUI.git "$ComfyDir" 2>&1 | Out-String
    $ErrorActionPreference = "Stop"
    Set-Location $ComfyDir
    $ErrorActionPreference = "Continue"
    $checkoutOut = & git checkout $ComfyUICommit 2>&1 | Out-String
    $ErrorActionPreference = "Stop"
    Set-Location $RootPath
    Write-Step "ComfyUI cloned + pinned to $ComfyUICommit" "Green"
} else {
    Write-Step "ComfyUI already exists." "Green"
}

# ============================================================================
# 3. PYTORCH + CORE DEPS
# ============================================================================
Write-Header "STEP 3/7 - PyTorch + Dependencies"

$GpuProfile = Get-NvidiaGpuProfile
Write-Step "GPU profile: $($GpuProfile.Name) | Driver $($GpuProfile.Driver) | VRAM $([math]::Round($GpuProfile.VramMB / 1024,1)) GB"
$torchIndexes = Get-TorchIndexesForGpu -Series $GpuProfile.Series
Write-Step "Torch index fallback order: $($torchIndexes -join ' -> ')" "Gray"
$torchResult = Install-TorchStack -Indexes $torchIndexes

if (-not $torchResult.ok) {
    throw "PyTorch CUDA installation failed for this system."
}

if ($GpuProfile.Series -eq "50" -or $GpuProfile.Series -eq "60") {
    Write-Step "RTX 50/60-series detected. Forcing native SDPA (removing xformers if present)..."
    & $VenvPy -m pip uninstall -y xformers --no-warn-script-location 2>&1 | Out-Null
} else {
    Write-Step "Installing xformers (optional performance package)..."
    & $VenvPy -m pip install xformers==0.0.29.post3 --index-url https://download.pytorch.org/whl/cu124 --no-warn-script-location
    if ($LASTEXITCODE -ne 0) {
        Write-Step "xformers install failed on cu124, trying default wheel..." "Yellow"
        & $VenvPy -m pip install xformers==0.0.29.post3 --no-warn-script-location
        if ($LASTEXITCODE -ne 0) {
            Write-Step "xformers unavailable for this GPU/driver combo. Continuing with PyTorch SDPA fallback." "Yellow"
        } else {
            Write-Step "xformers installed via fallback wheel." "Green"
        }
    } else {
        Write-Step "xformers installed (cu124)." "Green"
    }
}

Write-Step "Installing ComfyUI requirements..."
$ComfyReq = Join-Path $ComfyDir "requirements.txt"
Venv-Pip @("install", "-r", $ComfyReq)

# Re-assert matching torch/torchvision/torchaudio after Comfy reqs to avoid binary mismatch.
Write-Step "Re-validating torch stack consistency..."
& $VenvPy -m pip install --upgrade --force-reinstall torch torchvision torchaudio --index-url $($torchResult.index) --no-warn-script-location
if ($LASTEXITCODE -ne 0) {
    Write-Step "WARNING: Could not re-assert torch stack after requirements install." "Yellow"
}

Write-Step "Installing build tools..."
Venv-Pip @("install", "cmake", "ninja", "Cython")

Write-Step "Installing insightface..."
Venv-Pip @("install", "insightface", "--prefer-binary", "--no-build-isolation")

# Comprehensive deps (same as portable)
Write-Step "Installing comprehensive dependencies..."
$Deps = @(
    "accelerate", "transformers>=4.57.6,<5", "diffusers", "safetensors>=0.8.0rc0,<1.0",
    "huggingface-hub>=0.34.0,<1.0", "onnxruntime-gpu", "onnxruntime", "omegaconf",
    "aiohttp", "aiohttp-sse",
    "pytube", "yt-dlp", "moviepy", "youtube-transcript-api",
    "numba",
    "imageio", "imageio-ffmpeg", "av",
    "gdown", "pandas", "reportlab",
    "GPUtil", "wandb",
    "piexif", "rembg", "pillow-heif",
    "librosa", "soundfile",
    "beautifulsoup4", "lxml", "shapely",
    "deepdiff", "matplotlib", "scipy", "scikit-image", "scikit-learn",
    "timm", "colour-science", "blend-modes", "loguru",
    "ultralytics", "opencv-python-headless", "dill",
    "fastapi", "uvicorn[standard]", "python-multipart",
    "browser-cookie3", "edge-tts"
)
Venv-Pip (@("install") + $Deps)

# Hard pin compatibility for the transformers/hub stack to avoid drift.
Write-Step "Enforcing compatibility pins (transformers/huggingface-hub/safetensors)..."
Venv-Pip @(
    "install",
    "--upgrade",
    "--force-reinstall",
    "transformers>=4.57.6,<5",
    "huggingface-hub>=0.34.0,<1.0",
    "safetensors>=0.8.0rc0,<1.0"
)

# RTX Video Super Resolution Python dependency (opt-in, best effort).
if ($EnableNvidiaVfxInstall) {
    Write-Step "Ensuring nvidia-vfx is installed (RTX nodes)..."
    Venv-Pip @("install", "nvidia-vfx")
} else {
    Write-Step "Skipping nvidia-vfx install (set FEDDA_INSTALL_NVIDIA_VFX=1 to enable)." "Gray"
}

# SageAttention for 40/50/60-series (best effort only)
try {
    if ($GpuProfile.Series -eq "40" -or $GpuProfile.Series -eq "50" -or $GpuProfile.Series -eq "60") {
        Write-Step "RTX 40/50/60-series detected - attempting SageAttention install..."
        Venv-Pip @("install", "sageattention")
    }
} catch {}

Write-Step "All Python dependencies installed." "Green"

# ============================================================================
# 4. CUSTOM NODES
# ============================================================================
Write-Header "STEP 4/7 - Custom Nodes (from config/nodes.json)"

$NodesConfig = Get-Content (Join-Path $RootPath "config\nodes.json") | ConvertFrom-Json
$CustomNodesDir = Join-Path $ComfyDir "custom_nodes"
if (-not (Test-Path $CustomNodesDir)) { New-Item -ItemType Directory -Path $CustomNodesDir | Out-Null }

$Installed = 0; $Skipped = 0; $Failed = 0
$AllowUnstableNodes = (([string]$env:FEDDA_ALLOW_UNSTABLE_NODES).Trim() -eq "1")
$UnstableNodeFolders = @(
    "ComfyUI-F5-TTS",
    "ComfyUI_Searge_LLM",
    "ComfyUI_InstantID",
    "ComfyUI-tbox",
    "ComfyUI-Diffusers"
)

if (-not $AllowUnstableNodes) {
    foreach ($Folder in $UnstableNodeFolders) {
        $P1 = Join-Path $CustomNodesDir $Folder
        $P2 = Join-Path $CustomNodesDir ($Folder + ".disabled")
        if (Test-Path $P1) { Remove-Item -Recurse -Force -LiteralPath $P1 -ErrorAction SilentlyContinue }
        if (Test-Path $P2) { Remove-Item -Recurse -Force -LiteralPath $P2 -ErrorAction SilentlyContinue }
    }
}

function Clone-NodeWithFallback {
    param(
        [Parameter(Mandatory = $true)][pscustomobject]$Node,
        [Parameter(Mandatory = $true)][string]$NodeDir
    )

    $allUrls = @()
    if ($Node.url) { $allUrls += [string]$Node.url }
    if ($Node.PSObject.Properties.Name -contains "fallback_urls" -and $Node.fallback_urls) {
        foreach ($u in $Node.fallback_urls) {
            if ($u) { $allUrls += [string]$u }
        }
    }
    $allUrls = $allUrls | Select-Object -Unique

    foreach ($url in $allUrls) {
        for ($attempt = 1; $attempt -le 3; $attempt++) {
            if (Test-Path $NodeDir) {
                Remove-Item -Path $NodeDir -Recurse -Force -ErrorAction SilentlyContinue
            }

            Write-Step "  [$($Node.name)] Clone attempt $attempt/3 from $url" "Gray"
            $ErrorActionPreference = "Continue"
            $null = & git clone --depth 1 $url "$NodeDir" 2>&1 | Out-String
            $exitCode = $LASTEXITCODE
            $ErrorActionPreference = "Stop"

            if ($exitCode -eq 0 -and (Test-Path $NodeDir)) {
                return $true
            }

            Start-Sleep -Seconds 2
        }
    }

    return $false
}

foreach ($Node in $NodesConfig) {
    if ($Node.local -eq $true) {
        Write-Step "  [$($Node.name)] Local - skipped" "Gray"
        continue
    }
    if ((-not $AllowUnstableNodes) -and ($UnstableNodeFolders -contains [string]$Node.folder)) {
        Write-Step "  [$($Node.name)] Optional unstable node - skipped by default (set FEDDA_ALLOW_UNSTABLE_NODES=1 to include)" "DarkYellow"
        $Skipped++
        continue
    }

    $NodeDir = Join-Path $CustomNodesDir $Node.folder
    if (-not (Test-Path $NodeDir)) {
        Write-Step "  [$($Node.name)] Cloning..." "White"
        $cloned = Clone-NodeWithFallback -Node $Node -NodeDir $NodeDir

        if ($cloned) {
            $Installed++
            # Install node requirements
            $ReqFile = Join-Path $NodeDir "requirements.txt"
            if (Test-Path $ReqFile) {
                $ErrorActionPreference = "Continue"
                & $VenvPy -m pip install -r "$ReqFile" --no-warn-script-location --quiet 2>&1 | Out-Null
                $ErrorActionPreference = "Stop"
            }
        } else {
            Write-Step "  [$($Node.name)] FAILED" "Red"
            $Failed++
        }
    } else {
        $Skipped++
    }
}

# Apply tracked node patches (WanVideoWrapper and LTX compatibility shims).
$PatchSourceDir = Join-Path $RootPath "custom_node_patches"
if (Test-Path $PatchSourceDir) {
    Write-Step "Applying custom node patches..."
    $PatchesFound = Get-ChildItem -Path $PatchSourceDir -Directory
    foreach ($PFolder in $PatchesFound) {
        $NodeFolderName = $PFolder.Name
        $TargetNodeDir = Join-Path $CustomNodesDir $NodeFolderName

        if ($NodeFolderName -eq "WanVideoWrapper") {
            $TargetNodeDir = Join-Path $CustomNodesDir "ComfyUI-WanVideoWrapper"
        }

        if (Test-Path $TargetNodeDir) {
            Copy-Item -Path (Join-Path $PFolder.FullName "*") -Destination $TargetNodeDir -Recurse -Force
            Write-Step "  [$NodeFolderName] Patch applied." "Green"
        }
    }
}

$NodeColor = "Green"
if ($Failed -gt 0) { $NodeColor = "Yellow" }
Write-Step "Nodes: $Installed installed, $Skipped already present, $Failed failed" $NodeColor

Write-Step "Skipping automatic Z-Image Turbo celeb pack download (available in UI on demand)." "Yellow"

# ============================================================================
# 5. FRONTEND
# ============================================================================
Write-Header "STEP 5/7 - Frontend (React + Vite)"

$FrontendDir = Join-Path $RootPath "frontend"
if (Test-Path $FrontendDir) {
    Set-Location $FrontendDir
    if (-not (Test-Path "node_modules")) {
        Write-Step "Running npm install..."
        & npm install 2>&1 | Out-Null
        Write-Step "Frontend dependencies installed." "Green"
    } else {
        Write-Step "node_modules already exists." "Green"
    }
    Set-Location $RootPath
} else {
    Write-Step "frontend/ directory not found!" "Red"
}

# ============================================================================
# 6. ASSETS + CONFIG
# ============================================================================
Write-Header "STEP 6/7 - Assets & Configuration"

# Ensure predictable LoRA subfolder structure for drag/drop import in UI.
$LoRABase = Join-Path $ComfyDir "models\loras"
$LoRATargets = @(
    "zimage_turbo",
    "zimage_custom",
    "flux2klein",
    "flux1dev",
    "qwen",
    "wan22",
    "ltx",
    "sd15",
    "sd15-lycoris",
    "sdxl",
    "imported"
)
foreach ($target in $LoRATargets) {
    $path = Join-Path $LoRABase $target
    if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}
Write-Step "LoRA folder structure ensured." "Green"

# styles.csv
$StylesSrc = Join-Path $RootPath "assets\styles.csv"
if (Test-Path $StylesSrc) {
    Copy-Item -Path $StylesSrc -Destination $ComfyDir -Force
    Write-Step "styles.csv installed." "Green"
}

# Bundled LoRAs
$SrcLoras = Join-Path $RootPath "assets\loras\z-image"
$DstLoras = Join-Path $ComfyDir "models\loras\z-image"
if (Test-Path $SrcLoras) {
    if (-not (Test-Path $DstLoras)) { New-Item -ItemType Directory -Path $DstLoras -Force | Out-Null }
    Copy-Item -Path "$SrcLoras\*" -Destination $DstLoras -Recurse -Force
    Write-Step "Bundled LoRAs (Emmy, Zana) installed." "Green"
} else {
    Write-Step "No bundled LoRAs found (download_loras.bat later)." "Yellow"
}

# Audio TTS asset
$AudioScript = Join-Path $ScriptPath "setup_tts_audio.py"
if (Test-Path $AudioScript) {
    & $VenvPy "$AudioScript" 2>&1 | Out-Null
    Write-Step "TTS audio assets configured (ComfyUI + Mockingbird speaker)." "Green"
}

function Install-MockingbirdRuntime {
    param(
        [string]$RootPath,
        [string]$SpeakerSource
    )

    $GitExe = (Get-Command git -ErrorAction Stop).Source
    $MockDir = Join-Path $RootPath "mockingbird_tts"
    $PythonRoot = Join-Path $MockDir "python310"
    $PythonExe = Join-Path $PythonRoot "python.exe"
    $VenvDir = Join-Path $MockDir "venv"
    $VenvPy = Join-Path $VenvDir "Scripts\python.exe"
    $RepoDir = Join-Path $MockDir "xtts-api-server"
    $SpeakersDir = Join-Path $MockDir "speakers"
    $OutputDir = Join-Path $MockDir "output"
    $ModelsDir = Join-Path $MockDir "xtts_models"
    $InstallerDir = Join-Path $MockDir "downloads"
    $InstallerExe = Join-Path $InstallerDir "python-3.10.11-amd64.exe"

    Write-Header "STEP 3.5/7 - Mockingbird XTTS Runtime"
    New-Item -ItemType Directory -Path $MockDir, $SpeakersDir, $OutputDir, $ModelsDir, $InstallerDir -Force | Out-Null

    if (-not (Test-Path $PythonExe)) {
        Write-Step "Downloading dedicated Python 3.10 for Mockingbird..." "Yellow"
        & curl.exe -L -o "$InstallerExe" "https://www.python.org/ftp/python/3.10.11/python-3.10.11-amd64.exe" --retry 3 --retry-delay 2 --progress-bar
        if ($LASTEXITCODE -ne 0) { throw "Failed to download Python 3.10 installer for Mockingbird" }

        Write-Step "Installing dedicated Python 3.10 runtime..." "Yellow"
        $Args = @(
            "/quiet",
            "InstallAllUsers=0",
            "PrependPath=0",
            "Include_pip=1",
            "Include_dev=1",
            "Include_test=0",
            "Include_tcltk=0",
            "Include_doc=0",
            "Include_launcher=0",
            "AssociateFiles=0",
            "Shortcuts=0",
            "TargetDir=$PythonRoot"
        )
        $Proc = Start-Process -FilePath $InstallerExe -ArgumentList $Args -Wait -PassThru
        if ($Proc.ExitCode -ne 0 -or -not (Test-Path $PythonExe)) {
            throw "Dedicated Python 3.10 install failed with exit code $($Proc.ExitCode)"
        }
    } else {
        Write-Step "Dedicated Mockingbird Python already installed." "Green"
    }

    if (-not (Test-Path $VenvPy)) {
        Write-Step "Creating Mockingbird virtual environment..." "Yellow"
        & $PythonExe -m venv "$VenvDir"
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $VenvPy)) {
            throw "Failed to create Mockingbird virtual environment"
        }
    } else {
        Write-Step "Mockingbird virtual environment already exists." "Green"
    }

    if (-not (Test-Path $RepoDir)) {
        Write-Step "Cloning xtts-api-server..." "Yellow"
        & $GitExe clone --depth 1 https://github.com/daswer123/xtts-api-server.git "$RepoDir" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Failed to clone xtts-api-server" }
    } else {
        Write-Step "xtts-api-server already present." "Green"
    }

    Write-Step "Installing Mockingbird XTTS dependencies..." "Yellow"
    & $VenvPy -m pip install --upgrade pip wheel setuptools --no-warn-script-location 2>&1 | Out-Null
    & $VenvPy -m pip install -r "$RepoDir\requirements.txt" --no-warn-script-location 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Mockingbird requirements install failed" }
    & $VenvPy -m pip install torch==2.1.1+cu118 torchaudio==2.1.1+cu118 --index-url https://download.pytorch.org/whl/cu118 --no-warn-script-location 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Mockingbird torch install failed" }

    if (Test-Path $SpeakerSource) {
        Copy-Item -Path $SpeakerSource -Destination (Join-Path $SpeakersDir "charlotte.wav") -Force
        Write-Step "Mockingbird default speaker installed." "Green"
    } else {
        Write-Step "WARNING: Mockingbird speaker source missing: $SpeakerSource" "Yellow"
    }

    Write-Step "Mockingbird XTTS runtime ready." "Green"
}

try {
    Install-MockingbirdRuntime -RootPath $RootPath -SpeakerSource (Join-Path $RootPath "assets\audio-tts\charlotte\charlotte.wav")
} catch {
    Write-Step "WARNING: Mockingbird runtime setup failed: $($_.Exception.Message)" "Yellow"
    Write-Step "Continuing install without bundled XTTS runtime." "Yellow"
}

# ComfyUI-Manager config (weak security for auto-install)
$MgrDir = Join-Path $ComfyDir "user\__manager"
if (-not (Test-Path $MgrDir)) { New-Item -ItemType Directory -Path $MgrDir -Force | Out-Null }
$MgrConfig = @"
[default]
preview_method = auto
git_exe =
use_uv = False
channel_url = https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main
share_option = all
bypass_ssl = False
file_logging = True
component_policy = mine
update_policy = stable-comfyui
model_download_by_agent = False
downgrade_blacklist =
security_level = weak
always_lazy_install = False
network_mode = public
db_mode = remote
"@
Set-Content -Path (Join-Path $MgrDir "config.ini") -Value $MgrConfig
Write-Step "ComfyUI-Manager configured (weak security)." "Green"

# Enforce preview defaults in Comfy user settings.
$PreviewSetupScript = Join-Path $ScriptPath "setup_comfyui_config.py"
if (Test-Path $PreviewSetupScript) {
    try {
        & $VenvPy "$PreviewSetupScript" 2>&1 | Out-Null
        Write-Step "Comfy preview defaults configured (auto live preview)." "Green"
    } catch {
        Write-Step "WARNING: Could not apply preview defaults (non-fatal)." "Yellow"
    }
}

if ($EnableAutoModelDownloads) {
    # Ensure Z-Image core model files exist on fresh install so generation does not fail validation.
    $EnsureZImageScript = Join-Path $ScriptPath "ensure_zimage_core_models.ps1"
    if (Test-Path $EnsureZImageScript) {
        try {
            Write-Step "Ensuring Z-Image core models..." "Yellow"
            & $EnsureZImageScript -SilentMode
            Write-Step "Z-Image core models ready." "Green"
        } catch {
            Write-Step "WARNING: Z-Image core model ensure failed (non-fatal)." "Yellow"
        }
    }

    # Ensure Steady Dancer ONNX detection models exist so workflow validates.
    $EnsureSteadyDetectionScript = Join-Path $ScriptPath "ensure_steady_dancer_detection_models.ps1"
    if (Test-Path $EnsureSteadyDetectionScript) {
        try {
            Write-Step "Ensuring Steady Dancer detection models..." "Yellow"
            & $EnsureSteadyDetectionScript -SilentMode
            Write-Step "Steady Dancer detection models ready." "Green"
        } catch {
            Write-Step "WARNING: Steady Dancer detection model ensure failed (non-fatal)." "Yellow"
        }
    }

    # Ensure LTX 2.3 model bundle exists for LTX workflows.
    $EnsureLtx23Script = Join-Path $ScriptPath "ensure_ltx23_models.ps1"
    if (Test-Path $EnsureLtx23Script) {
        try {
            Write-Step "Ensuring LTX 2.3 models..." "Yellow"
            & $EnsureLtx23Script -SilentMode
            Write-Step "LTX 2.3 models ready." "Green"
        } catch {
            Write-Step "WARNING: LTX 2.3 model ensure failed (non-fatal)." "Yellow"
        }
    }
} else {
    Write-Step "Skipping automatic model downloads (set FEDDA_AUTO_MODEL_DOWNLOADS=1 to enable)." "Gray"
}

# ============================================================================
# 7. SMOKE TEST
# ============================================================================
Write-Header "STEP 7/7 - Verification"

$SmokeCode = @"
import sys
ok = True
try:
    import torch
    gpu = torch.cuda.is_available()
    print(f'  PyTorch {torch.__version__} - CUDA: {gpu}')
    if gpu: print(f'  GPU: {torch.cuda.get_device_name(0)}')
    else: ok = False; print('  WARNING: CUDA not available!')
except Exception as e:
    ok = False; print(f'  PyTorch FAILED: {e}')

for lib in ['transformers', 'safetensors', 'numpy', 'PIL']:
    try:
        __import__(lib)
        print(f'  {lib}: OK')
    except:
        ok = False; print(f'  {lib}: FAILED')

sys.exit(0 if ok else 1)
"@
$SmokeFile = Join-Path $RootPath "_smoke_test.py"
Set-Content -Path $SmokeFile -Value $SmokeCode
$SmokeResult = Start-Process -FilePath $VenvPy -ArgumentList "$SmokeFile" -NoNewWindow -Wait -PassThru
Remove-Item $SmokeFile -Force

if ($SmokeResult.ExitCode -eq 0) {
    Write-Step "All core imports verified!" "Green"
} else {
    Write-Step "Some imports failed - check output above." "Yellow"
}

# ============================================================================
# INSTALL SUMMARY REPORT (Lite)
# ============================================================================
$StopWatch.Stop()
$Elapsed = $StopWatch.Elapsed
$TimeStr = "{0:mm}m {0:ss}s" -f $Elapsed

$LiteReport = @()
$LiteReport += "Install Date:    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$LiteReport += "Install Mode:    Lite (Embedded Python + system Git/Node)"
$LiteReport += "Install Path:    $RootPath"
$LiteReport += "Install Time:    $TimeStr"
$LiteReport += ""

try { $PyVer = & $VenvPy --version 2>&1; $LiteReport += "Python:          $PyVer" } catch { $LiteReport += "Python:          UNKNOWN" }
try { $PipVer = & $VenvPy -m pip --version 2>&1; $LiteReport += "Pip:             $($PipVer -replace ' from .*','')" } catch {}
try { $NodeVer = & node --version 2>&1; $LiteReport += "Node.js:         $NodeVer" } catch {}
try { $GitVer = & git --version 2>&1; $LiteReport += "Git:             $GitVer" } catch {}

try {
    $TorchInfo = & $VenvPy -c "import torch; print(f'PyTorch {torch.__version__} | CUDA: {torch.cuda.is_available()} | Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else ""N/A""}')" 2>&1
    $LiteReport += "PyTorch:         $TorchInfo"
} catch {}

$LiteReport += ""
if ($SmokeResult.ExitCode -eq 0) { $LiteReport += "Smoke Test:      PASSED" } else { $LiteReport += "Smoke Test:      FAILED" }

$LiteReport += ""
$LiteReport += "Log Files:"
$LiteReport += "  Report:  $(Join-Path $LogsDir 'install_report.txt')"
$LiteReport += "  Full:    $(Join-Path $LogsDir 'install_fast_log.txt')"

# Write report
$LogsDir = Join-Path $RootPath "logs"
if (-not (Test-Path $LogsDir)) { New-Item -ItemType Directory -Path $LogsDir | Out-Null }
$ReportFile = Join-Path $LogsDir "install_report.txt"
$LiteReport | Set-Content -Path $ReportFile -Encoding UTF8

Write-Host ""
foreach ($Line in $LiteReport) { Write-Host "  $Line" }

Write-Host ""
Write-Host "  ========================================================" -ForegroundColor Green
Write-Host "         INSTALLATION COMPLETE!                           " -ForegroundColor Green
Write-Host "         Time: $TimeStr                                   " -ForegroundColor Green
Write-Host "         Report: $ReportFile                              " -ForegroundColor Green
Write-Host "         Run: RUN.bat                                     " -ForegroundColor Green
Write-Host "  ========================================================" -ForegroundColor Green
Write-Host ""
