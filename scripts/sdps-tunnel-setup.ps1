# SDPS Audio Tunnel Bridge - Windows Auto-Start Setup Script
# Run this in Administrator PowerShell

$ErrorActionPreference = "Stop"

$SDPS_DIR = "C:\sdps"
New-Item -ItemType Directory -Path $SDPS_DIR -Force | Out-Null
$CF_EXE = "$SDPS_DIR\cloudflared.exe"

if (-not (Test-Path $CF_EXE)) {
    Write-Host "[~] Downloading cloudflared..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $CF_EXE
    Write-Host "[+] Downloaded cloudflared.exe" -ForegroundColor Green
} else {
    Write-Host "[+] cloudflared.exe already exists" -ForegroundColor Green
}

# Add Windows Firewall rules
Write-Host "[~] Adding firewall rules..." -ForegroundColor Yellow
try {
    Remove-NetFirewallRule -DisplayName "SDPS Cloudflared Out" -ErrorAction SilentlyContinue
    Remove-NetFirewallRule -DisplayName "SDPS Cloudflared In" -ErrorAction SilentlyContinue
} catch {}
New-NetFirewallRule -DisplayName "SDPS Cloudflared Out" -Direction Outbound -Program $CF_EXE -Action Allow | Out-Null
New-NetFirewallRule -DisplayName "SDPS Cloudflared In" -Direction Inbound -Program $CF_EXE -Action Allow | Out-Null
Write-Host "[+] Firewall rules added" -ForegroundColor Green

# Create the tunnel bridge script
$bridgeContent = @'
$SDPS_DIR = "C:\sdps"
$CF_EXE = "$SDPS_DIR\cloudflared.exe"
$LOG_FILE = "$SDPS_DIR\tunnel.log"
$BRIDGE_LOG = "$SDPS_DIR\bridge.log"
$DEVICE_IP = "192.168.29.71"
$BACKEND_URL = "https://api.sdpublic.org/api/admin/audio/tunnel/register"
$API_KEY = "sdps-tunnel-2026"
$HOSTNAME = $env:COMPUTERNAME

while ($true) {
    if (Test-Path $LOG_FILE) { Remove-Item $LOG_FILE -Force }
    $proc = Start-Process -FilePath $CF_EXE -ArgumentList "tunnel","--url","http://${DEVICE_IP}" -PassThru -NoNewWindow -RedirectStandardError $LOG_FILE
    
    $url = $null
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path $LOG_FILE) {
            $content = Get-Content $LOG_FILE -Raw -ErrorAction SilentlyContinue
            if ($content -match '(https://[a-z0-9-]+\.trycloudflare\.com)') {
                $url = $Matches[1]
                break
            }
        }
    }

    if ($url) {
        $body = @{ tunnel_url = $url; api_key = $API_KEY; hostname = $HOSTNAME } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri $BACKEND_URL -Method Post -Body $body -ContentType "application/json" -TimeoutSec 15 | Out-Null
            Add-Content $BRIDGE_LOG "[$(Get-Date -Format 'HH:mm:ss')] Registered: $url"
        } catch {
            Add-Content $BRIDGE_LOG "[$(Get-Date -Format 'HH:mm:ss')] Failed to register URL"
        }

        while (-not $proc.HasExited) {
            Start-Sleep -Seconds 300
            if (-not $proc.HasExited) {
                try {
                    Invoke-RestMethod -Uri $BACKEND_URL -Method Post -Body $body -ContentType "application/json" -TimeoutSec 15 | Out-Null
                } catch {}
            }
        }
    } else {
        if (-not $proc.HasExited) { $proc | Stop-Process -Force -ErrorAction SilentlyContinue }
    }

    Add-Content $BRIDGE_LOG "[$(Get-Date -Format 'HH:mm:ss')] Restarting tunnel..."
    Start-Sleep -Seconds 10
}
'@

Set-Content -Path "$SDPS_DIR\tunnel-bridge.ps1" -Value $bridgeContent -Encoding UTF8
Write-Host "[+] Created tunnel bridge script" -ForegroundColor Green

# Create Task Scheduler Task
$TASK_NAME = "SDPS Audio Tunnel"
try { Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue } catch {}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"C:\sdps\tunnel-bridge.ps1`""
$trigger = New-ScheduledTaskTrigger -AtLogon
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 9999 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TASK_NAME -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest | Out-Null
Write-Host "[+] Auto-start task created: '$TASK_NAME'" -ForegroundColor Green

# Start Task
Start-ScheduledTask -TaskName $TASK_NAME
Write-Host "[+] Tunnel task started!" -ForegroundColor Green
Write-Host "SETUP COMPLETE! SDPS Audio Tunnel is running and will auto-start on boot." -ForegroundColor Green
