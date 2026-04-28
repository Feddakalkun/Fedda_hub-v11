$ErrorActionPreference = "Stop"

param(
    [string]$InstallRoot = ""
)

$ScriptPath = $PSScriptRoot
$RepoRoot = Split-Path -Parent $ScriptPath
$RepoRoot = (Resolve-Path $RepoRoot).Path

if (-not $InstallRoot) {
    $candidates = @(
        (Join-Path $RepoRoot "comfyuifeddafront"),
        (Join-Path (Split-Path $RepoRoot -Parent) "comfyuifeddafront")
    )
    foreach ($c in $candidates) {
        if (Test-Path (Join-Path $c "ComfyUI\custom_nodes")) {
            $InstallRoot = $c
            break
        }
    }
}

if (-not $InstallRoot) {
    throw "No install root detected. Pass -InstallRoot '<path-to-install>'"
}

$InstallRoot = (Resolve-Path $InstallRoot).Path
$ComfyNodes = Join-Path $InstallRoot "ComfyUI\custom_nodes"
$OutFile = Join-Path $RepoRoot "config\nodes.lock.json"

if (-not (Test-Path $ComfyNodes)) {
    throw "custom_nodes directory not found: $ComfyNodes"
}

$locks = @()
$dirs = Get-ChildItem -Path $ComfyNodes -Directory -ErrorAction Stop
foreach ($d in $dirs) {
    $gitDir = Join-Path $d.FullName ".git"
    if (-not (Test-Path $gitDir)) { continue }

    $remote = ""
    $commit = ""
    $branch = ""
    try { $remote = (& git -C $d.FullName remote get-url origin 2>$null).Trim() } catch {}
    try { $commit = (& git -C $d.FullName rev-parse HEAD 2>$null).Trim() } catch {}
    try { $branch = (& git -C $d.FullName branch --show-current 2>$null).Trim() } catch {}

    $locks += [pscustomobject]@{
        folder = $d.Name
        remote = $remote
        branch = $branch
        commit = $commit
        exported_at = (Get-Date).ToString("s")
    }
}

$locks = $locks | Sort-Object folder
$json = $locks | ConvertTo-Json -Depth 4
Set-Content -Path $OutFile -Value $json -Encoding UTF8
Write-Host "Install root: $InstallRoot"
Write-Host "Wrote lock file: $OutFile"
