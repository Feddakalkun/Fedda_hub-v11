# ============================================================================
# FEDDA Update & Repair - auto-detects portable vs lite mode
# ============================================================================

param(
    [switch]$SilentMode,
    [switch]$ForceNodeUpdate,
    [switch]$ForceCoreUpdate
)

$ErrorActionPreference = "Stop"
try { $PSNativeCommandUseErrorActionPreference = $false } catch {}
$ScriptPath = $PSScriptRoot
$RootPath = Split-Path -Parent $ScriptPath
Set-Location $RootPath

if (-not $SilentMode) {
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host "      FEDDA UPDATE & REPAIR" -ForegroundColor Cyan
    Write-Host "===================================================" -ForegroundColor Cyan
}

# ============================================================================
# DETECT MODE
# ============================================================================
$PortablePy = Join-Path $RootPath "python_embeded\python.exe"
$VenvPy     = Join-Path $RootPath "venv\Scripts\python.exe"
$NodeEmbed  = Join-Path $RootPath "node_embeded\node.exe"
$ComfyDir = Join-Path $RootPath "ComfyUI"
$CustomNodesDir = Join-Path $ComfyDir "custom_nodes"
$CoreUpdateMarker = Join-Path $RootPath ".last_comfy_core_update"

# Detection order: venv = Lite (even if python_embeded also exists, since
# Lite now embeds Python 3.11.9 but still creates a venv from it).
# Full/portable = has python_embeded AND node_embeded (no venv).
if (Test-Path $VenvPy) {
    $Mode = "lite"
    $PyExe = $VenvPy
    if (-not $SilentMode) { Write-Host "`n  Mode: Lite (venv)" -ForegroundColor Green }
} elseif ((Test-Path $PortablePy) -and (Test-Path $NodeEmbed)) {
    $Mode = "portable"
    $PyExe = $PortablePy
    if (-not $SilentMode) { Write-Host "`n  Mode: Full (portable)" -ForegroundColor Green }
} elseif (Test-Path $PortablePy) {
    # python_embeded only, no venv and no node_embeded - treat as portable
    $Mode = "portable"
    $PyExe = $PortablePy
    if (-not $SilentMode) { Write-Host "`n  Mode: Full (portable - no node_embeded)" -ForegroundColor Yellow }
} else {
    Write-Host "`n  [ERROR] No Python environment found!" -ForegroundColor Red
    Write-Host "  Run FEDDA_OneClick_Installer-v11.bat first." -ForegroundColor Yellow
    exit 1
}

# Git setup
$GitEmbedded = Join-Path $RootPath "git_embeded\cmd\git.exe"
$GitFromWrapper = [string]$env:FEDDA_GIT_EXE
$GitFromSystemCmd = Get-Command git -ErrorAction SilentlyContinue
$GitFromSystem = if ($GitFromSystemCmd) { $GitFromSystemCmd.Source } else { $null }

if ($GitFromWrapper -and (Test-Path $GitFromWrapper)) {
    $GitExe = $GitFromWrapper
    $GitSource = "wrapper"
} elseif ($GitFromSystem) {
    $GitExe = $GitFromSystem
    $GitSource = "system"
} elseif (Test-Path $GitEmbedded) {
    $GitExe = $GitEmbedded
    $GitSource = "embedded"
} else {
    $GitExe = "git"
    $GitSource = "path"
}

if ($GitExe -ne "git") {
    $env:PATH = "$(Split-Path -Parent $GitExe);$env:PATH"
}

if (-not $SilentMode) {
    Write-Host "  Git runtime: $GitExe ($GitSource)" -ForegroundColor DarkGray
}

# Fix dubious ownership errors (local config only - never modify user's global gitconfig)
$env:GIT_CONFIG_GLOBAL = Join-Path $RootPath ".gitconfig"
& $GitExe config --file "$env:GIT_CONFIG_GLOBAL" --add safe.directory '*' 2>$null
& $GitExe config --file "$env:GIT_CONFIG_GLOBAL" maintenance.auto false 2>$null
& $GitExe config --file "$env:GIT_CONFIG_GLOBAL" gc.auto 0 2>$null
& $GitExe config --file "$env:GIT_CONFIG_GLOBAL" gc.autoDetach false 2>$null

if (-not (Test-Path $ComfyDir)) {
    Write-Host "`n  [ERROR] ComfyUI directory not found!" -ForegroundColor Red
    Write-Host "  Run FEDDA_OneClick_Installer-v11.bat first." -ForegroundColor Yellow
    exit 1
}

# Optional toggles used by update flow:
# - FEDDA_FORCE_COMFY_CORE_UPDATE=1 forces ComfyUI core update on every run.
$ForceCoreFromEnv = (([string]$env:FEDDA_FORCE_COMFY_CORE_UPDATE).Trim() -eq "1")

# Ensure predictable LoRA folder structure used by UI upload/import.
$LoRADir = Join-Path $ComfyDir "models\loras"
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
    $p = Join-Path $LoRADir $target
    if (-not (Test-Path $p)) {
        New-Item -ItemType Directory -Path $p -Force | Out-Null
    }
}

# ============================================================================
# 0. UPDATE COMFYUI CORE
# ============================================================================
Write-Host "`n[0/3] ComfyUI core..." -ForegroundColor Yellow
$NeedCoreUpdate = $false
$CoreReason = ""
if ($ForceCoreUpdate -or $ForceCoreFromEnv) {
    $NeedCoreUpdate = $true
    $CoreReason = "forced"
} elseif (Test-Path $CoreUpdateMarker) {
    $LastCoreUpdate = (Get-Item $CoreUpdateMarker).LastWriteTime
    $DaysSinceCore = ((Get-Date) - $LastCoreUpdate).TotalDays
    if ($DaysSinceCore -ge 7) {
        $NeedCoreUpdate = $true
        $CoreReason = "older than 7d"
    } else {
        $DaysCoreAgo = [math]::Floor($DaysSinceCore)
        Write-Host "  Skipping core update (last update ${DaysCoreAgo}d ago). Use --full-core to force." -ForegroundColor DarkGray
    }
} else {
    $NeedCoreUpdate = $true
    $CoreReason = "first run"
}

$CoreWasUpdated = $false
if ($NeedCoreUpdate) {
    Write-Host "  Updating ComfyUI core ($CoreReason)..." -ForegroundColor White
    try {
        Set-Location $ComfyDir
        $ErrorActionPreference = "Continue"
        $OldCoreHead = (& $GitExe rev-parse HEAD 2>$null)
        & $GitExe fetch origin master 2>&1 | Out-Null
        & $GitExe checkout master 2>&1 | Out-Null
        & $GitExe reset --hard origin/master 2>&1 | Out-Null
        $NewCoreHead = (& $GitExe rev-parse HEAD 2>$null)
        $ErrorActionPreference = "Stop"
        Set-Location $RootPath
        if ($OldCoreHead -and $NewCoreHead -and ($OldCoreHead.Trim() -ne $NewCoreHead.Trim())) {
            $CoreWasUpdated = $true
            Write-Host "  ComfyUI core updated to latest master." -ForegroundColor Green
        } else {
            Write-Host "  ComfyUI core already current." -ForegroundColor Green
        }
        "Updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $CoreUpdateMarker -Force
    } catch {
        Set-Location $RootPath
        Write-Host "  [WARNING] ComfyUI core update failed (non-fatal): $_" -ForegroundColor Yellow
    }
}

# ============================================================================
# 1. CUSTOM NODES - install missing / update existing (from nodes.json)
# ============================================================================
$NodesConfigFile = Join-Path $RootPath "config\nodes.json"
if (-not (Test-Path $NodesConfigFile)) {
    Write-Host "  [ERROR] config/nodes.json not found!" -ForegroundColor Red
    exit 1
}

$NodesConfig = Get-Content $NodesConfigFile -Raw | ConvertFrom-Json

if (-not (Test-Path $CustomNodesDir)) {
    New-Item -ItemType Directory -Path $CustomNodesDir -Force | Out-Null
}

# Smart update: default to missing-only installs.
# Full git-pull pass is opt-in via -ForceNodeUpdate.
$NodeUpdateMarker = Join-Path $RootPath ".last_node_update"
$NeedNodeUpdate = $false

if ($ForceNodeUpdate) {
    $NeedNodeUpdate = $true
    Write-Host "`n[1/3] Full custom-node update forced by caller..." -ForegroundColor Yellow
} elseif (Test-Path $NodeUpdateMarker) {
    $LastUpdate = (Get-Item $NodeUpdateMarker).LastWriteTime
    $DaysSince = ((Get-Date) - $LastUpdate).TotalDays
    $DaysAgo = [math]::Floor($DaysSince)
    Write-Host "`n[1/3] Smart node sync (missing-only). Last full sync: ${DaysAgo}d ago." -ForegroundColor Green
} else {
    Write-Host "`n[1/3] Smart node sync (missing-only). No full sync marker yet." -ForegroundColor Green
}

$InstalledCount = 0
$UpdatedCount = 0
$SkippedCount = 0
$FailedCount = 0

# Known unstable/optional nodes that can crash startup or fail import on some installs.
# Can be overridden with: $env:FEDDA_ALLOW_UNSTABLE_NODES=1
$UnstableNodeFolders = @(
    "ComfyUI-F5-TTS",
    "ComfyUI_Searge_LLM",
    "ComfyUI_InstantID",
    "ComfyUI-tbox",
    "ComfyUI-Diffusers"
)
$DeprecatedNodeFolders = @(
    "v337"
)
$AllowUnstableNodes = (([string]$env:FEDDA_ALLOW_UNSTABLE_NODES).Trim() -eq "1")

# Optional toggles:
# - FEDDA_AUTO_MODEL_DOWNLOADS=1 enables bundled model ensure/download steps.
# - FEDDA_INSTALL_NVIDIA_VFX=1 enables automatic nvidia-vfx pip install for RTX nodes.
$EnableAutoModelDownloads = (([string]$env:FEDDA_AUTO_MODEL_DOWNLOADS).Trim() -eq "1")
$EnableNvidiaVfxInstall = (([string]$env:FEDDA_INSTALL_NVIDIA_VFX).Trim() -eq "1")

function Sync-NodeSubmodules {
    param([string]$NodeDir)
    $GitmodulesFile = Join-Path $NodeDir ".gitmodules"
    if (Test-Path $GitmodulesFile) {
        try {
            Set-Location $NodeDir
            $ErrorActionPreference = "Continue"
            & $GitExe submodule update --init --recursive 2>&1 | Out-Null
            $ErrorActionPreference = "Stop"
            Set-Location $RootPath
        } catch {
            Set-Location $RootPath
        }
    }
}

# Always check for missing nodes
$HasMissing = $false
foreach ($Node in $NodesConfig) {
    if ($Node.local -eq $true) { continue }
    $NodeDir_Check = Join-Path $CustomNodesDir $Node.folder
    if (-not (Test-Path $NodeDir_Check)) { $HasMissing = $true; break }
}

# Only force-update critical nodes during a full node refresh.
if ($NeedNodeUpdate) {
    $CriticalNodes = @("ComfyUI-LTXVideo", "RES4LYF", "Nvidia_RTX_Nodes_ComfyUI", "ComfyUI-KJNodes")
    foreach ($CritNode in $CriticalNodes) {
        $CritDir = Join-Path $CustomNodesDir $CritNode
        if (Test-Path $CritDir) {
            try {
                Set-Location $CritDir
                $ErrorActionPreference = "Continue"
                & $GitExe pull 2>&1 | Out-Null
                $ErrorActionPreference = "Stop"
                Set-Location $RootPath
                Sync-NodeSubmodules -NodeDir $CritDir
            } catch {
                Set-Location $RootPath
            }
        }
    }
}

function Install-FilteredRequirements {
    param([string]$NodeDir)
    $ReqFile = Join-Path $NodeDir "requirements.txt"
    if (-not (Test-Path $ReqFile)) { return }
    $SkipPkgs = @('^\s*insightface','^\s*byaldi','^\s*nano-graphrag','^\s*kaleido','^\s*qwen-vl-utils','^\s*fastparquet')
    $ReqContent = Get-Content $ReqFile
    $Filtered = $ReqContent
    foreach ($p in $SkipPkgs) { $Filtered = $Filtered | Where-Object { $_ -notmatch $p } }
    $TmpReq = Join-Path $NodeDir "_req_filtered.txt"
    Set-Content -Path $TmpReq -Value $Filtered
    $ErrorActionPreference = "Continue"
    & $PyExe -m pip install -r "$TmpReq" --no-warn-script-location | Out-Null
    $ErrorActionPreference = "Stop"
    Remove-Item $TmpReq -Force -ErrorAction SilentlyContinue
}

function Test-PackageVersion {
    param(
        [string]$Module,
        [string]$ConstraintScript
    )
    try {
        & $PyExe -c "import importlib.metadata as m; v=m.version('$Module'); assert ($ConstraintScript), v" 2>$null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

# Always remove known unstable nodes unless explicitly allowed.
if (-not $AllowUnstableNodes) {
    foreach ($UnstableFolder in $UnstableNodeFolders) {
        $ActivePath = Join-Path $CustomNodesDir $UnstableFolder
        $DisabledPath = Join-Path $CustomNodesDir ($UnstableFolder + ".disabled")
        try {
            $RemovedAny = $false
            if (Test-Path $ActivePath) {
                Remove-Item -Recurse -Force -LiteralPath $ActivePath -ErrorAction SilentlyContinue
                $RemovedAny = $true
            }
            if (Test-Path $DisabledPath) {
                Remove-Item -Recurse -Force -LiteralPath $DisabledPath -ErrorAction SilentlyContinue
                $RemovedAny = $true
            }
            if ($RemovedAny) {
                Write-Host "  [$UnstableFolder] Removed by default (startup hardening)." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  [WARNING] Could not remove ${UnstableFolder}: $_" -ForegroundColor Yellow
        }
    }
}

if ($NeedNodeUpdate -or $HasMissing) {
    if ($NeedNodeUpdate) {
        Write-Host "`n[1/3] Syncing custom nodes from config/nodes.json..." -ForegroundColor Yellow
    } else {
        Write-Host "`n[1/3] Installing missing custom nodes..." -ForegroundColor Yellow
    }

    foreach ($Node in $NodesConfig) {
        if ($Node.local -eq $true) {
            Write-Host "  [$($Node.name)] Local node - skipped" -ForegroundColor Gray
            continue
        }

        if ((-not $AllowUnstableNodes) -and ($UnstableNodeFolders -contains [string]$Node.folder)) {
            Write-Host "  [$($Node.name)] Skipped (removed by default for stability)." -ForegroundColor DarkYellow
            $SkippedCount++
            continue
        }

        $NodeDir_Install = Join-Path $CustomNodesDir $Node.folder

        if (-not (Test-Path $NodeDir_Install)) {
            # Clone missing node
            Write-Host "  [$($Node.name)] Installing..." -ForegroundColor White
            try {
                $ErrorActionPreference = "Continue"
                & $GitExe clone --depth 1 $Node.url "$NodeDir_Install" 2>&1 | Out-Null
                $ErrorActionPreference = "Stop"
                if ($LASTEXITCODE -eq 0) {
                    $InstalledCount++
                    Write-Host "  [$($Node.name)] Installed OK" -ForegroundColor Green
                    Sync-NodeSubmodules -NodeDir $NodeDir_Install

                    Write-Host "  [$($Node.name)] Installing dependencies..." -ForegroundColor Gray
                    Install-FilteredRequirements -NodeDir $NodeDir_Install
                } else {
                    Write-Host "  [$($Node.name)] Clone failed!" -ForegroundColor Red
                    $FailedCount++
                }
            }
            catch {
                Write-Host "  [$($Node.name)] Error: $_" -ForegroundColor Red
                $FailedCount++
            }
        }
        elseif ($NeedNodeUpdate) {
            # Update existing node
            Write-Host "  [$($Node.name)] Updating..." -ForegroundColor Gray
            try {
                Set-Location $NodeDir_Install
                & $GitExe pull 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "  [$($Node.name)] Git pull failed (non-fatal)" -ForegroundColor Yellow
                }
                $UpdatedCount++
                Set-Location $RootPath
                Sync-NodeSubmodules -NodeDir $NodeDir_Install
            }
            catch {
                Write-Host "  [$($Node.name)] Update failed (non-fatal): $_" -ForegroundColor Yellow
                Set-Location $RootPath
            }

            Install-FilteredRequirements -NodeDir $NodeDir_Install
        }
        else {
            $SkippedCount++
        }
    }

    if ($NeedNodeUpdate) {
        "Updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $NodeUpdateMarker -Force
    }

    $Parts = @()
    if ($InstalledCount -gt 0) { $Parts += "$InstalledCount installed" }
    if ($UpdatedCount -gt 0)  { $Parts += "$UpdatedCount updated" }
    if ($SkippedCount -gt 0)  { $Parts += "$SkippedCount up to date" }
    if ($FailedCount -gt 0)   { $Parts += "$FailedCount failed" }
    if ($Parts.Count -eq 0) { $Parts += "nothing changed" }
    Write-Host "`n  Summary: $($Parts -join ', ')" -ForegroundColor Cyan
} else {
    Write-Host "  No missing nodes found. Skipping node sync." -ForegroundColor Green
}

# Ensure key utility node dependencies are installed even in SMART missing-only mode.
# This avoids "installed folder but node not loaded" issues for core workflow nodes.
$EnsureNodeDeps = @(
    "was-node-suite-comfyui",        # Text Concatenate
    "ComfyUI-Custom-Scripts",        # text utility fallbacks
    "ComfyLiterals",                 # String Literal
    "ComfyUI-Styles_CSV_Loader",     # Load Styles CSV
    "ComfyUI-qwenmultiangle",        # QwenMultiangleCameraNode
    "comfyui-inpaint-nodes"          # INPAINT_* nodes (Fooocus inpaint/outpaint)
)
foreach ($NodeFolder in $EnsureNodeDeps) {
    $NodeDir = Join-Path $CustomNodesDir $NodeFolder
    if (Test-Path $NodeDir) {
        try {
            Install-FilteredRequirements -NodeDir $NodeDir
        } catch {
            Write-Host "  [WARNING] Could not sync requirements for ${NodeFolder}: $_" -ForegroundColor Yellow
        }
    }
}

# Always remove deprecated custom-node folders no longer supported.
foreach ($DeprecatedFolder in $DeprecatedNodeFolders) {
    $DeprecatedPath = Join-Path $CustomNodesDir $DeprecatedFolder
    $DeprecatedDisabledPath = Join-Path $CustomNodesDir ($DeprecatedFolder + ".disabled")
    try {
        $RemovedAny = $false
        if (Test-Path $DeprecatedPath) {
            Remove-Item -Recurse -Force -LiteralPath $DeprecatedPath -ErrorAction SilentlyContinue
            $RemovedAny = $true
        }
        if (Test-Path $DeprecatedDisabledPath) {
            Remove-Item -Recurse -Force -LiteralPath $DeprecatedDisabledPath -ErrorAction SilentlyContinue
            $RemovedAny = $true
        }
        if ($RemovedAny) {
            Write-Host "  [$DeprecatedFolder] Removed (deprecated custom node folder)." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  [WARNING] Could not remove deprecated folder ${DeprecatedFolder}: $_" -ForegroundColor Yellow
    }
}

# ============================================================================
# 1c. APPLY CUSTOM NODE PATCHES
# ============================================================================
$PatchSourceDir = Join-Path $RootPath "custom_node_patches"
if (Test-Path $PatchSourceDir) {
    Write-Host "`n[1c/3] Applying custom node patches..." -ForegroundColor Yellow
    $PatchesFound = Get-ChildItem -Path $PatchSourceDir -Directory
    foreach ($PFolder in $PatchesFound) {
        $NodeFolderName = $PFolder.Name
        $TargetNodeDir = Join-Path $CustomNodesDir $NodeFolderName
        
        # Special case for WanVideoWrapper because of naming mismatch in repo
        if ($NodeFolderName -eq "WanVideoWrapper") { $TargetNodeDir = Join-Path $CustomNodesDir "ComfyUI-WanVideoWrapper" }
        
        if (Test-Path $TargetNodeDir) {
            Write-Host "  Applying patches for $NodeFolderName..." -ForegroundColor White
            # Copy all files from patch folder to target node dir recursively
            Copy-Item -Path (Join-Path $PFolder.FullName "*") -Destination $TargetNodeDir -Recurse -Force
            Write-Host "  $NodeFolderName patches applied OK" -ForegroundColor Green
        }
    }
}

# ============================================================================
# 1b. PATCH PYTHON DEPENDENCIES - fix known version conflicts & missing deps
# ============================================================================
Write-Host "`n[1b/3] Patching Python dependencies..." -ForegroundColor Yellow

# Ensure OpenCV is installed for video frame extraction
Write-Host "  Checking opencv-python..." -ForegroundColor White
$OpenCvOk = $false
try {
    & $PyExe -c "import cv2" 2>$null
    $OpenCvOk = ($LASTEXITCODE -eq 0)
} catch { $OpenCvOk = $false }
if ($OpenCvOk) {
    Write-Host "  opencv-python OK (already installed)" -ForegroundColor Green
} else {
    try {
        $ErrorActionPreference = "Continue"
        & $PyExe -m pip install opencv-python --no-warn-script-location | Out-Null
        $OpenCvExit = $LASTEXITCODE
        $ErrorActionPreference = "Stop"
        if ($OpenCvExit -eq 0) {
            Write-Host "  opencv-python installed." -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] opencv-python install returned code $OpenCvExit (non-fatal)." -ForegroundColor Yellow
        }
    } catch {
        $ErrorActionPreference = "Stop"
        Write-Host "  [WARNING] opencv-python install failed (non-fatal): $_" -ForegroundColor Yellow
    }
}

# Keep NumPy pinned to 1.x for ONNX Runtime / ControlNet Aux binary compatibility.
Write-Host "  Checking NumPy < 2..." -ForegroundColor White
$NumpyOk = Test-PackageVersion -Module "numpy" -ConstraintScript "int(v.split('.')[0]) -lt 2"
if ($NumpyOk) {
    Write-Host "  numpy<2 OK (already compatible)" -ForegroundColor Green
} else {
    try {
        $ErrorActionPreference = "Continue"
        & $PyExe -m pip install "numpy<2" --no-warn-script-location | Out-Null
        $NumpyExit = $LASTEXITCODE
        $ErrorActionPreference = "Stop"
        if ($NumpyExit -eq 0) {
            Write-Host "  numpy<2 fixed." -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] numpy pin returned code $NumpyExit (non-fatal)." -ForegroundColor Yellow
        }
    } catch {
        $ErrorActionPreference = "Stop"
        Write-Host "  [WARNING] numpy pin failed (non-fatal): $_" -ForegroundColor Yellow
    }
}

# RTX Video Super Resolution node requires the nvidia-vfx Python package.
if ($EnableNvidiaVfxInstall) {
    Write-Host "  Ensuring nvidia-vfx is installed (RTX nodes)..." -ForegroundColor White
    try {
        $ErrorActionPreference = "Continue"
        & $PyExe -m pip install nvidia-vfx --no-warn-script-location | Out-Null
        $NvidiaVfxExit = $LASTEXITCODE
        $ErrorActionPreference = "Stop"
        if ($NvidiaVfxExit -eq 0) {
            Write-Host "  nvidia-vfx OK" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] nvidia-vfx install returned code $NvidiaVfxExit. RTXVideoSuperResolution may be unavailable." -ForegroundColor Yellow
        }
    } catch {
        $ErrorActionPreference = "Stop"
        Write-Host "  [WARNING] nvidia-vfx install failed (non-fatal): $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Skipping nvidia-vfx install (set FEDDA_INSTALL_NVIDIA_VFX=1 to enable)." -ForegroundColor DarkGray
}

# Keep model-runtime stack compatible for Florence2/LTX/Qwen nodes.
Write-Host "  Checking transformers/hub/safetensors compatibility..." -ForegroundColor White
$TfmOk = Test-PackageVersion -Module "transformers" -ConstraintScript "tuple(int(x) for x in v.split('.')[:2]) -ge (4,57) -and int(v.split('.')[0]) -lt 5"
$HubOk = Test-PackageVersion -Module "huggingface-hub" -ConstraintScript "int(v.split('.')[0]) -lt 1"
$SafetensorsOk = Test-PackageVersion -Module "safetensors" -ConstraintScript "int(v.split('.')[0]) -lt 1"
if ($TfmOk -and $HubOk -and $SafetensorsOk) {
    $TransformersVersion = & $PyExe -c "import transformers; print(transformers.__version__)" 2>$null
    Write-Host "  transformers compatibility OK ($TransformersVersion) [already compatible]" -ForegroundColor Green
} else {
    try {
        $ErrorActionPreference = "Continue"
        & $PyExe -m pip install --upgrade --force-reinstall "transformers>=4.57.6,<5" "huggingface-hub>=0.34.0,<1.0" "safetensors>=0.8.0rc0,<1.0" --no-warn-script-location | Out-Null
        $CompatExit = $LASTEXITCODE
        $ErrorActionPreference = "Stop"
        if ($CompatExit -eq 0) {
            $TransformersVersion = & $PyExe -c "import transformers; print(transformers.__version__)" 2>$null
            Write-Host "  transformers compatibility fixed ($TransformersVersion)" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] transformers compatibility pin returned code $CompatExit (non-fatal)." -ForegroundColor Yellow
        }
    } catch {
        $ErrorActionPreference = "Stop"
        Write-Host "  [WARNING] transformers compatibility pin failed (non-fatal): $_" -ForegroundColor Yellow
    }
}

# ============================================================================
# 2. FRONTEND - npm install
# ============================================================================
Write-Host "`n[2/3] Updating frontend dependencies..." -ForegroundColor Yellow
$FrontendDir = Join-Path $RootPath "frontend"

if (Test-Path $FrontendDir) {
    Set-Location $FrontendDir

    if ($Mode -eq "portable") {
        $NodeExeDir = Join-Path $RootPath "node_embeded"
        # Ensure npm shims exist
        if (Test-Path $NodeExeDir) {
            $NpmShim = Join-Path $NodeExeDir "node_modules\npm\bin\npm.cmd"
            $NpxShim = Join-Path $NodeExeDir "node_modules\npm\bin\npx.cmd"
            if (Test-Path $NpmShim) { Copy-Item $NpmShim $NodeExeDir -Force }
            if (Test-Path $NpxShim) { Copy-Item $NpxShim $NodeExeDir -Force }
        }
        $NpmCmd = Join-Path $NodeExeDir "npm.cmd"
        if (Test-Path $NpmCmd) {
            & "$NpmCmd" "install" | Out-Null
            Write-Host "  Frontend dependencies updated." -ForegroundColor Green
        }
        else {
            $NodeExe = Join-Path $NodeExeDir "node.exe"
            $NpmCli = Join-Path $NodeExeDir "node_modules\npm\bin\npm-cli.js"
            if (Test-Path $NpmCli) {
                & "$NodeExe" "$NpmCli" "install" | Out-Null
                Write-Host "  Frontend dependencies updated." -ForegroundColor Green
            }
            else {
    Write-Host "  [WARNING] npm not found in PATH - skipping frontend npm refresh (app can still run)." -ForegroundColor Yellow
            }
        }
    } else {
        # Lite mode - use system npm
        & npm install | Out-Null
        Write-Host "  Frontend dependencies updated." -ForegroundColor Green
    }

    Set-Location $RootPath
}

# ============================================================================
# 3. SYNC COMFYUI REQUIREMENTS
# ============================================================================

# Ensure required ComfyUI core dependencies are in sync after ComfyUI updates
Write-Host "`n[2a/3] Syncing ComfyUI requirements..." -ForegroundColor Yellow
$ComfyRequirements = Join-Path $ComfyDir "requirements.txt"
if (Test-Path $ComfyRequirements) {
    $ReqHashFile = Join-Path $RootPath ".last_comfy_requirements_hash"
    $ReqHash = (Get-FileHash -Path $ComfyRequirements -Algorithm SHA256).Hash
    $LastReqHash = ""
    if (Test-Path $ReqHashFile) { $LastReqHash = (Get-Content -Path $ReqHashFile -Raw).Trim() }
    $NeedReqSync = $CoreWasUpdated -or ($ReqHash -ne $LastReqHash)
    if ($NeedReqSync) {
        try {
            & $PyExe -m pip install -r "$ComfyRequirements" --no-warn-script-location | Out-Null
            $ReqHash | Out-File -FilePath $ReqHashFile -Force -Encoding ascii
            Write-Host "  ComfyUI requirements synced." -ForegroundColor Green
        } catch {
            Write-Host "  [WARNING] ComfyUI requirements sync failed (non-fatal): $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ComfyUI requirements unchanged; skipping pip sync." -ForegroundColor DarkGray
    }
}

# Ensure backend voice fallback dependency exists after update
try {
    & $PyExe -m pip install edge-tts --no-warn-script-location | Out-Null
    Write-Host "  edge-tts synced." -ForegroundColor Green
} catch {
    Write-Host "  [WARNING] edge-tts sync failed (non-fatal): $_" -ForegroundColor Yellow
}

# Keep Comfy preview defaults enabled for end users.
Write-Host "`n[2b/3] Applying Comfy preview defaults..." -ForegroundColor Yellow
$PreviewSetupScript = Join-Path $RootPath "scripts\setup_comfyui_config.py"
if (Test-Path $PreviewSetupScript) {
    try {
        & $PyExe "$PreviewSetupScript" | Out-Null
        Write-Host "  Preview defaults applied (Execution=auto, VHS=Always)." -ForegroundColor Green
    } catch {
        Write-Host "  [WARNING] Preview defaults update failed (non-fatal): $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARNING] setup_comfyui_config.py not found, skipping preview defaults." -ForegroundColor Yellow
}

if ($EnableAutoModelDownloads) {
    # Ensure Z-Image core model files exist so prompts don't fail validation on fresh installs.
    Write-Host "`n[2c/3] Ensuring Z-Image core models..." -ForegroundColor Yellow
    $EnsureZImageScript = Join-Path $RootPath "scripts\ensure_zimage_core_models.ps1"
    if (Test-Path $EnsureZImageScript) {
        try {
            & $EnsureZImageScript -SilentMode
            Write-Host "  Z-Image core models ready." -ForegroundColor Green
        } catch {
            Write-Host "  [WARNING] Z-Image core model ensure failed (non-fatal): $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [WARNING] ensure_zimage_core_models.ps1 not found, skipping." -ForegroundColor Yellow
    }

    # Ensure Steady Dancer pose detection ONNX files exist so workflow validates.
    Write-Host "`n[2c.1/3] Ensuring Steady Dancer detection models..." -ForegroundColor Yellow
    $EnsureSteadyDetectionScript = Join-Path $RootPath "scripts\ensure_steady_dancer_detection_models.ps1"
    if (Test-Path $EnsureSteadyDetectionScript) {
        try {
            & $EnsureSteadyDetectionScript -SilentMode
            Write-Host "  Steady Dancer detection models ready." -ForegroundColor Green
        } catch {
            Write-Host "  [WARNING] Steady Dancer detection model ensure failed (non-fatal): $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [WARNING] ensure_steady_dancer_detection_models.ps1 not found, skipping." -ForegroundColor Yellow
    }

    # Ensure LTX 2.3 model bundle exists so LTX workflows validate.
    Write-Host "`n[2c.2/3] Ensuring LTX 2.3 models..." -ForegroundColor Yellow
    $EnsureLtx23Script = Join-Path $RootPath "scripts\ensure_ltx23_models.ps1"
    if (Test-Path $EnsureLtx23Script) {
        try {
            & $EnsureLtx23Script -SilentMode
            Write-Host "  LTX 2.3 models ready." -ForegroundColor Green
        } catch {
            Write-Host "  [WARNING] LTX 2.3 model ensure failed (non-fatal): $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [WARNING] ensure_ltx23_models.ps1 not found, skipping." -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[2c/3] Skipping automatic model downloads (set FEDDA_AUTO_MODEL_DOWNLOADS=1 to enable)." -ForegroundColor DarkGray
}


# ============================================================================
# 2d. SYNC WORKFLOWS TO COMFYUI USER DIRECTORY
# ============================================================================
Write-Host "`n[2d/3] Syncing workflows to ComfyUI User directory..." -ForegroundColor Yellow
$FeddaWorkflowsSource = Join-Path $RootPath "backend\workflows"
$ComfyUserWorkflowsDir = Join-Path $ComfyDir "user\default\workflows\FEDDA"

if (Test-Path $FeddaWorkflowsSource) {
    if (-not (Test-Path $ComfyUserWorkflowsDir)) {
        New-Item -ItemType Directory -Path $ComfyUserWorkflowsDir -Force | Out-Null
    }
    
    # Copy all JSON workflows recursively
    Get-ChildItem -Path $FeddaWorkflowsSource -Filter *.json -Recurse | ForEach-Object {
        $DestFile = Join-Path $ComfyUserWorkflowsDir $_.Name
        Copy-Item $_.FullName $DestFile -Force
    }
    Write-Host "  Workflows synced to ComfyUI (user/default/workflows/FEDDA)." -ForegroundColor Green
} else {
    Write-Host "  [WARNING] backend/workflows not found, skipping sync." -ForegroundColor Yellow
}

# ============================================================================
# 2e. SYNC ROOT WRAPPER LAUNCHERS (for installer root folder)
# ============================================================================
$RootLeaf = Split-Path $RootPath -Leaf
if ($RootLeaf -ieq "comfyuifeddafront") {
    $OuterRoot = Split-Path -Parent $RootPath
    Write-Host "`n[2e/3] Syncing root wrapper launchers..." -ForegroundColor Yellow

    $RootRunBat = Join-Path $OuterRoot "FEDDA_run-v11.bat"
    $RootUpdateBat = Join-Path $OuterRoot "FEDDA_Update-v11.bat"

    $RunWrapper = @'
@echo off
setlocal EnableExtensions
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "TARGET_DIR=%ROOT_DIR%\comfyuifeddafront"
if not exist "%TARGET_DIR%\run.bat" (
  echo.
  echo  [ERROR] FEDDA install not found at:
  echo          %TARGET_DIR%
  echo.
  echo  Run FEDDA_OneClick_Installer-v11.bat first.
  echo.
  pause
  exit /b 1
)
call "%TARGET_DIR%\run.bat"
exit /b %errorlevel%
'@

    $UpdateWrapper = @'
@echo off
setlocal EnableExtensions
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "TARGET_DIR=%ROOT_DIR%\comfyuifeddafront"
if not exist "%TARGET_DIR%\FEDDA_Update-v11.bat" (
  echo.
  echo  [ERROR] FEDDA install not found at:
  echo          %TARGET_DIR%
  echo.
  echo  Run FEDDA_OneClick_Installer-v11.bat first.
  echo.
  pause
  exit /b 1
)
call "%TARGET_DIR%\FEDDA_Update-v11.bat" %*
exit /b %errorlevel%
'@

    try {
        Set-Content -Path $RootRunBat -Value $RunWrapper -Encoding ASCII -Force
        Set-Content -Path $RootUpdateBat -Value $UpdateWrapper -Encoding ASCII -Force
        Write-Host "  Root wrappers refreshed." -ForegroundColor Green
    } catch {
        Write-Host "  [WARNING] Could not refresh root wrappers: $_" -ForegroundColor Yellow
    }

    # Keep internal launcher files hidden inside the install folder to reduce clutter.
    $InternalLaunchers = @(
        "FEDDA_OneClick_Installer-v11.bat",
        "FEDDA_Update-v11.bat",
        "FEDDA_Push-v11.bat",
        "run.bat"
    )
    foreach ($Launcher in $InternalLaunchers) {
        $LauncherPath = Join-Path $RootPath $Launcher
        if (Test-Path $LauncherPath) {
            try {
                & attrib +h "$LauncherPath" 2>$null
            } catch {}
        }
    }
}


# ============================================================================
# DONE
# ============================================================================
if (-not $SilentMode) {
    Write-Host "`n===================================================" -ForegroundColor Green
    Write-Host "   UPDATE COMPLETE" -ForegroundColor Green
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host "Run RUN.bat to start FEDDA."
}

