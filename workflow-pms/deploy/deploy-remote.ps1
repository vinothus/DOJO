# Deploy Workflow PMS to a remote Linux host (Docker + Compose).
# Prereq: OpenSSH (ssh/scp), key to server, Docker on server.
# Create once on server: ~/workflow-pms/.env from deploy/.env.remote.example (JWT_SECRET, CORS_ORIGIN).
#
# Target: -RemoteHost, or WFPMS_REMOTE_HOST / WFPMS_REMOTE_USER, or remote.config.json (copy from remote.config.json.example)
#
#   cd workflow-pms\deploy
#   .\deploy-remote.ps1 -RemoteHost YOUR_PUBLIC_IP
#   $env:WFPMS_REMOTE_HOST = "x.x.x.x"; .\deploy-remote.ps1
#
param(
  [string] $RemoteHost = "",
  [string] $RemoteUser = "",
  [string] $AppDir = "workflow-pms"
)
$jsonPath = Join-Path $PSScriptRoot "remote.config.json"
if (Test-Path $jsonPath) {
  $c = Get-Content $jsonPath -Raw -Encoding utf8 | ConvertFrom-Json
  if ([string]::IsNullOrWhiteSpace($RemoteHost) -and $c.RemoteHost) { $RemoteHost = [string]$c.RemoteHost }
  if ([string]::IsNullOrWhiteSpace($RemoteUser) -and $c.RemoteUser) { $RemoteUser = [string]$c.RemoteUser }
  if (-not $PSBoundParameters.ContainsKey("AppDir") -and $c.AppDir) { $AppDir = [string]$c.AppDir }
}
if ([string]::IsNullOrWhiteSpace($RemoteHost) -and $env:WFPMS_REMOTE_HOST) {
  $RemoteHost = $env:WFPMS_REMOTE_HOST
}
if ([string]::IsNullOrWhiteSpace($RemoteUser) -and $env:WFPMS_REMOTE_USER) {
  $RemoteUser = $env:WFPMS_REMOTE_USER
}
if ([string]::IsNullOrWhiteSpace($RemoteUser)) { $RemoteUser = "ubuntu" }
if ([string]::IsNullOrWhiteSpace($RemoteHost)) {
  throw "No remote target. Use -RemoteHost, set WFPMS_REMOTE_HOST, or add deploy/remote.config.json (see remote.config.json.example)."
}

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

$remote = "$RemoteUser@$RemoteHost"
$tar = Join-Path $env:TEMP ("wfpms-" + [Guid]::NewGuid().ToString("N") + ".tar.gz")
try {
  if (-not (Get-Command tar -ErrorAction SilentlyContinue)) { throw "tar not found" }
  $x = @(
    "--exclude=node_modules", "--exclude=dist", "--exclude=.git", "--exclude=uploads",
    "--exclude=*.log", "--exclude=backend/node_modules", "--exclude=frontend/node_modules",
    "--exclude=backend/dist", "--exclude=frontend/dist"
  )
  & tar @x -czf $tar -C $root .
  if ($LASTEXITCODE -ne 0) { throw "tar failed" }

  & ssh $remote "mkdir -p ~/$AppDir"
  if ($LASTEXITCODE -ne 0) { throw "ssh mkdir failed" }

  $scpTarget = "$remote" + ':~/' + $AppDir + '/bundle.tar.gz'
  Write-Host "Uploading to $scpTarget"
  & scp $tar $scpTarget
  if ($LASTEXITCODE -ne 0) { throw "scp failed" }

  $cmd = "cd ~/$AppDir && tar -xzf bundle.tar.gz && rm -f bundle.tar.gz && docker compose build && docker compose up -d"
  Write-Host "docker compose on server..."
  & ssh $remote $cmd
  if ($LASTEXITCODE -ne 0) { throw "remote failed" }
  Write-Host "OK - http://${RemoteHost}:8082  API: http://${RemoteHost}:3000"
} finally {
  if (Test-Path $tar) { Remove-Item $tar -Force -ErrorAction SilentlyContinue }
}
