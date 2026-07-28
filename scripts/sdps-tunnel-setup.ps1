# ═══════════════════════════════════════════════════════════════════════════
#  SDPS Audio Tunnel Bridge — Auto-Start Setup Script
#  Run this ONCE as Administrator on each school PC (3-4 PCs for redundancy)
#  It will: download cloudflared, add firewall rules, create auto-start task
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

# ─── Configuration ───
$SDPS_DIR        = "C:\sdps"
$CF_EXE          = "$SDPS_DIR\cloudflared.exe"
$BRIDGE_SCRIPT   = "$SDPS_DIR\tunnel-bridge.ps1"
$LOG_FILE        = "$SDPS_DIR\tunnel.log"
$DEVICE_IP       = "192.168.29.71"
$BACKEND_URL     = "https://sdps-website-main.onrender.com/api/admin/audio/tunnel/register"
$API_KEY         = "sdps-tunnel-2026"
$TASK_NAME       = "SDPS Audio Tunnel"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   SDPS Audio Tunnel — One-Time Setup" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ─── Step 1: Create directory ───
if (-not (Test-Path $SDPS_DIR)) {
    New-Item -ItemType Directory -Path $SDPS_DIR -Force | Out-Null
    Write-Host "[+] Created $SDPS_DIR" -ForegroundColor Green
}

# ─── Step 2: Download cloudflared ───
if (-not (Test-Path $CF_EXE)) {
    Write-Host "[~] Downloading cloudflared..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $CF_EXE
    Write-Host "[+] Downloaded cloudflared.exe" -ForegroundColor Green
} else {
    Write-Host "[+] cloudflared.exe already exists" -ForegroundColor Green
}

# ─── Step 3: Add Windows Firewall rules ───
Write-Host "[~] Adding firewall rules..." -ForegroundColor Yellow
try {
    Remove-NetFirewallRule -DisplayName "SDPS Cloudflared Out" -ErrorAction SilentlyContinue
    Remove-NetFirewallRule -DisplayName "SDPS Cloudflared In" -ErrorAction SilentlyContinue
} catch {}
New-NetFirewallRule -DisplayName "SDPS Cloudflared Out" -Direction Outbound -Program $CF_EXE -Action Allow | Out-Null
New-NetFirewallRule -DisplayName "SDPS Cloudflared In"  -Direction Inbound  -Program $CF_EXE -Action Allow | Out-Null
Write-Host "[+] Firewall rules added" -ForegroundColor Green

# ─── Step 4: Create the tunnel bridge script ───
$bridgeCode = @'
# SDPS Audio Tunnel Bridge — Runs on boot, auto-restarts, reports URL to backend
$SDPS_DIR      = "C:\sdps"
$CF_EXE        = "$SDPS_DIR\cloudflared.exe"
$LOG_FILE      = "$SDPS_DIR\tunnel.log"
$DEVICE_IP     = "192.168.29.71"
$BACKEND_URL   = "https://sdps-website-main.onrender.com/api/admin/audio/tunnel/register"
$API_KEY       = "sdps-tunnel-2026"
$HOSTNAME      = $env:COMPUTERNAME

function Start-Tunnel {
    # Clear old log
    if (Test-Path $LOG_FILE) { Remove-Item $LOG_FILE -Force }

    # Start cloudflared in background, redirect stderr (where URL is printed) to log
    $proc = Start-Process -FilePath $CF_EXE `
        -ArgumentList "tunnel","--url","http://${DEVICE_IP}" `
        -PassThru -NoNewWindow `
        -RedirectStandardError $LOG_FILE
    return $proc
}

function Get-TunnelUrl {
    # Wait up to 30 seconds for the URL to appear in the log
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path $LOG_FILE) {
            $content = Get-Content $LOG_FILE -Raw -ErrorAction SilentlyContinue
            if ($content -match '(https://[a-z0-9-]+\.trycloudflare\.com)') {
                return $Matches[1]
            }
        }
    }
    return $null
}

function Register-Url($url) {
    try {
        $body = @{
            tunnel_url = $url
            api_key    = $API_KEY
            hostname   = $HOSTNAME
        } | ConvertTo-Json

        Invoke-RestMethod -Uri $BACKEND_URL -Method Post `
            -Body $body -ContentType "application/json" `
            -TimeoutSec 15 | Out-Null

        $ts = Get-Date -Format "HH:mm:ss"
        Add-Content "$SDPS_DIR\bridge.log" "[$ts] Registered: $url from $HOSTNAME"
    } catch {
        $ts = Get-Date -Format "HH:mm:ss"
        Add-Content "$SDPS_DIR\bridge.log" "[$ts] Failed to register: $_"
    }
}

# ─── Main Loop ───
Add-Content "$SDPS_DIR\bridge.log" "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Bridge starting on $HOSTNAME"

while ($true) {
    $proc = Start-Tunnel
    $url  = Get-TunnelUrl

    if ($url) {
        Register-Url $url
        # Re-register every 5 minutes to keep backend updated
        while (-not $proc.HasExited) {
            Start-Sleep -Seconds 300
            if (-not $proc.HasExited) {
                Register-Url $url
            }
        }
    } else {
        # Tunnel failed to start — kill and retry
        if (-not $proc.HasExited) { $proc | Stop-Process -Force -ErrorAction SilentlyContinue }
    }

    # Wait 10 seconds before restarting
    $ts = Get-Date -Format "HH:mm:ss"
    Add-Content "$SDPS_DIR\bridge.log" "[$ts] Tunnel exited, restarting in 10s..."
    Start-Sleep -Seconds 10
}
'@

Set-Content -Path $BRIDGE_SCRIPT -Value $bridgeCode -Encoding UTF8
Write-Host "[+] Created tunnel bridge script" -ForegroundColor Green

# ─── Step 5: Create Windows Task Scheduler entry (runs at logon) ───
Write-Host "[~] Creating auto-start task..." -ForegroundColor Yellow
try {
    Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

$action  = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$BRIDGE_SCRIPT`""

$trigger = New-ScheduledTaskTrigger -AtLogon
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 9999 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName $TASK_NAME `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "SDPS Audio Tunnel Bridge — connects school audio device to cloud" `
    -RunLevel Highest | Out-Null

Write-Host "[+] Auto-start task created: '$TASK_NAME'" -ForegroundColor Green

# ─── Step 6: Start it now ───
Write-Host ""
Write-Host "[~] Starting tunnel now..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName $TASK_NAME

Start-Sleep -Seconds 15

# Check if URL was captured
if (Test-Path "$SDPS_DIR\bridge.log") {
    $log = Get-Content "$SDPS_DIR\bridge.log" -Tail 5
    Write-Host ""
    Write-Host "─── Bridge Log ───" -ForegroundColor Cyan
    $log | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ SETUP COMPLETE!" -ForegroundColor White
Write-Host "   Tunnel auto-starts on boot and reports URL" -ForegroundColor White  
Write-Host "   to boardcasting.sdpublic.org automatically." -ForegroundColor White
Write-Host "" 
Write-Host "   Run this same script on 2-3 more school PCs" -ForegroundColor Yellow
Write-Host "   for automatic failover redundancy!" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
