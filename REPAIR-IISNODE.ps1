$ErrorActionPreference = "Stop"

$site = "C:\inetpub\wwwroot\hrms"
$pool = "hrms"
$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $packageRoot "site"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "C:\Temp\hrms-repair-backup-$stamp"

if (-not (Test-Path -LiteralPath "$source\server.js")) {
    throw "Run this script from the extracted repair-package folder. The site folder was not found."
}
if (-not (Test-Path -LiteralPath "$site\.env")) {
    throw "Production .env is missing from $site. Restore it before continuing."
}

$nodeCommand = Get-Command node.exe -ErrorAction Stop
$nodePath = $nodeCommand.Source
Write-Host "Using Node: $nodePath"

New-Item -ItemType Directory -Path $backup -Force | Out-Null
foreach ($name in @("assets","config","middleware","models","routes","services","index.html","server.js","web.config","package.json","package-lock.json")) {
    $current = Join-Path $site $name
    if (Test-Path -LiteralPath $current) {
        Copy-Item -LiteralPath $current -Destination $backup -Recurse -Force
    }
}

Import-Module WebAdministration
if ((Get-WebAppPoolState -Name $pool).Value -eq "Started") {
    Stop-WebAppPool -Name $pool
    Start-Sleep -Seconds 4
}

Get-ChildItem -LiteralPath $source -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $site -Recurse -Force
}

# Make iisnode use the Node executable that PowerShell actually found.
[xml]$webConfig = Get-Content -LiteralPath "$site\web.config" -Raw
$webConfig.configuration.'system.webServer'.iisnode.nodeProcessCommandLine = $nodePath
$webConfig.Save("$site\web.config")

$required = @(
    "server.js", "config\db.js", "middleware\auth.js",
    "routes\auth.js", "routes\attendance.js", "routes\employees.js",
    "routes\leave.js", "routes\requests.js", "routes\admin.js",
    "routes\admin-suite.js", "routes\mobile.js", "models\Employee.js",
    "models\RequestAccount.js", "models\Claim.js", "models\Announcement.js",
    "models\CompanySettings.js", "services\request-policy.js"
)
$missing = $required | Where-Object { -not (Test-Path -LiteralPath (Join-Path $site $_)) }
if ($missing) { throw "Required application files are missing: $($missing -join ', ')" }

if (-not (Test-Path -LiteralPath "$site\node_modules\express")) {
    Push-Location $site
    try { npm install --omit=dev } finally { Pop-Location }
}

& $nodePath --check "$site\server.js"
if ($LASTEXITCODE -ne 0) { throw "server.js syntax validation failed" }
& $nodePath --check "$site\routes\requests.js"
if ($LASTEXITCODE -ne 0) { throw "requests.js syntax validation failed" }
& $nodePath --check "$site\routes\mobile.js"
if ($LASTEXITCODE -ne 0) { throw "mobile.js syntax validation failed" }

$logDirectory = "$site\iisnode"
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
& icacls.exe $site /grant "IIS AppPool\hrms:(OI)(CI)(RX)" /T /C | Out-Null
& icacls.exe $logDirectory /grant "IIS AppPool\hrms:(OI)(CI)(M)" /T /C | Out-Null

$started = $false
for ($attempt = 1; $attempt -le 6; $attempt++) {
    try {
        Start-WebAppPool -Name $pool
        Start-Sleep -Seconds 5
        if ((Get-WebAppPoolState -Name $pool).Value -eq "Started") { $started = $true; break }
    } catch { Start-Sleep -Seconds 5 }
}
if (-not $started) { throw "The hrms application pool could not be started." }

$health = $null
for ($attempt = 1; $attempt -le 6; $attempt++) {
    try {
        $health = Invoke-RestMethod -Uri "http://172.16.16.5:8080/api/health" -TimeoutSec 15
        break
    } catch { Start-Sleep -Seconds 5 }
}

if (-not $health) {
    Write-Host "Health check failed. Latest iisnode error:" -ForegroundColor Red
    $latestLog = Get-ChildItem -LiteralPath $logDirectory -File -Filter "*-stderr-*.txt" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestLog) { Get-Content -LiteralPath $latestLog.FullName -Tail 120 }
    throw "HRMS is still unavailable. The error above identifies the remaining startup problem."
}

Write-Host "HRMS repair completed successfully." -ForegroundColor Green
Write-Host "Application pool: $((Get-WebAppPoolState -Name $pool).Value)"
Write-Host "Health status: $($health.status)"
Write-Host "Backup: $backup"
