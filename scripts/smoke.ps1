$ErrorActionPreference = "Stop"

$base = "http://localhost:5000"
$apiBase = "$base/api"

$startedProcess = $null

function Test-ApiUp {
  try {
    $healthCheck = Invoke-RestMethod "$base/healthz"
    return $healthCheck.status -eq "ok"
  } catch {
    return $false
  }
}

if (-not (Test-ApiUp)) {
  Write-Host "[smoke] API not running. Starting temporary server..."
  $projectRoot = Split-Path -Parent $PSScriptRoot
  $startedProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $projectRoot -PassThru -WindowStyle Hidden

  $ready = $false
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-ApiUp) {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    if ($startedProcess) {
      Stop-Process -Id $startedProcess.Id -Force -ErrorAction SilentlyContinue
    }
    throw "API failed to start for smoke checks"
  }
}

try {
  Write-Host "[smoke] Checking API health..."
  $health = Invoke-RestMethod "$base/healthz"
  if ($health.status -ne "ok") {
    throw "Health check failed"
  }

  Write-Host "[smoke] Logging in as admin..."
  $login = Invoke-RestMethod -Method POST -Uri "$apiBase/auth/login" -ContentType "application/json" -Body '{"email":"k.mills@opstrack.mil","password":"password123"}'
  if (-not $login.token) {
    throw "Login failed: token missing"
  }

  $headers = @{ Authorization = "Bearer $($login.token)" }

  Write-Host "[smoke] Validating protected route..."
  $users = Invoke-RestMethod -Method GET -Uri "$apiBase/users?limit=1&offset=0" -Headers $headers
  if (-not $users.data) {
    throw "Protected route check failed"
  }

  Write-Host "[smoke] Validating unauthenticated block..."
  $blocked = $false
  try {
    Invoke-RestMethod -Method GET -Uri "$apiBase/users" | Out-Null
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
      $blocked = $true
    }
  }
  if (-not $blocked) {
    throw "Unauthenticated request was not blocked"
  }

  Write-Host "[smoke] PASS"
} finally {
  if ($startedProcess) {
    Write-Host "[smoke] Stopping temporary server..."
    Stop-Process -Id $startedProcess.Id -Force -ErrorAction SilentlyContinue
  }
}
