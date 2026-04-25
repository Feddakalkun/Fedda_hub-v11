param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [switch]$BuildFrontend,
    [switch]$CheckRuntime
)

$ErrorActionPreference = "Stop"

function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }

function Test-RequiredPath {
    param(
        [string]$Base,
        [string]$Relative
    )
    $full = Join-Path $Base $Relative
    if (Test-Path -LiteralPath $full) {
        Write-Ok $Relative
        return $true
    }
    Write-Err "$Relative (missing)"
    return $false
}

function Test-Http {
    param(
        [string]$Url,
        [int]$TimeoutSec = 3
    )
    try {
        $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
        return $resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500
    } catch {
        return $false
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " FEDDA Clean Install Smoke Test" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Root: $ProjectRoot"
Write-Host ""

$failCount = 0

# 1) Critical source files needed for fresh install startup
Write-Host "1) Checking critical frontend files..." -ForegroundColor Cyan
$criticalFiles = @(
    "frontend/src/config/api.ts",
    "frontend/src/config/preview.ts",
    "frontend/src/services/comfyService.ts",
    "frontend/src/hooks/useComfyStatus.ts",
    "frontend/src/pages/LandingPage.tsx",
    "frontend/vite.config.ts",
    "frontend/package.json",
    "run.bat",
    "install.bat",
    "update.bat"
)
foreach ($f in $criticalFiles) {
    if (-not (Test-RequiredPath -Base $ProjectRoot -Relative $f)) { $failCount++ }
}
Write-Host ""

# 2) Key workflows that are expected by UI mappings
Write-Host "2) Checking key workflow files..." -ForegroundColor Cyan
$workflowFiles = @(
    "frontend/public/workflows/ltx23-single-stage-api.json",
    "frontend/public/workflows/LTX2lipsync.json",
    "frontend/public/workflows/qwen-multiangle.json",
    "frontend/public/workflows/FLUX2KLEIN-txt2img.json"
)
foreach ($wf in $workflowFiles) {
    if (-not (Test-RequiredPath -Base $ProjectRoot -Relative $wf)) { $failCount++ }
}
Write-Host ""

# 3) Optional frontend build verification
if ($BuildFrontend) {
    Write-Host "3) Running frontend build..." -ForegroundColor Cyan
    $frontendDir = Join-Path $ProjectRoot "frontend"
    if (-not (Test-Path -LiteralPath $frontendDir)) {
        Write-Err "frontend/ folder missing"
        $failCount++
    } else {
        Push-Location $frontendDir
        try {
            & npm run build
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "frontend build passed"
            } else {
                Write-Err "frontend build failed (exit $LASTEXITCODE)"
                $failCount++
            }
        } catch {
            Write-Err "frontend build failed: $($_.Exception.Message)"
            $failCount++
        } finally {
            Pop-Location
        }
    }
    Write-Host ""
} else {
    Write-Warn "Frontend build check skipped (use -BuildFrontend)"
    Write-Host ""
}

# 4) Optional runtime probes (when app is running)
if ($CheckRuntime) {
    Write-Host "4) Probing runtime endpoints..." -ForegroundColor Cyan
    $runtimeChecks = @(
        @{ Name = "Frontend (Vite)"; Url = "http://127.0.0.1:5173/" },
        @{ Name = "Backend API"; Url = "http://127.0.0.1:8000/api/hardware/stats" },
        @{ Name = "ComfyUI"; Url = "http://127.0.0.1:8199/system_stats" },
        @{ Name = "Frontend proxy /comfy"; Url = "http://127.0.0.1:5173/comfy/system_stats" }
    )
    foreach ($c in $runtimeChecks) {
        if (Test-Http -Url $c.Url) {
            Write-Ok "$($c.Name): reachable"
        } else {
            Write-Err "$($c.Name): not reachable"
            $failCount++
        }
    }
    Write-Host ""
} else {
    Write-Warn "Runtime probe skipped (use -CheckRuntime)"
    Write-Host ""
}

Write-Host "------------------------------------------" -ForegroundColor DarkGray
if ($failCount -eq 0) {
    Write-Host "Smoke test PASSED" -ForegroundColor Green
    exit 0
}
Write-Host "Smoke test FAILED ($failCount issue(s))" -ForegroundColor Red
exit 1

