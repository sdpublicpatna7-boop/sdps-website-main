#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  SDPS Audio Tunnel Bridge — macOS Auto-Start Setup Script
#  Run this ONCE with sudo on each school Mac:  sudo bash sdps-tunnel-setup-mac.sh
#  It will: download cloudflared, create auto-start service, start tunnel
# ═══════════════════════════════════════════════════════════════════════════

set -e

# ─── Configuration ───
SDPS_DIR="/usr/local/sdps"
CF_BIN="$SDPS_DIR/cloudflared"
BRIDGE_SCRIPT="$SDPS_DIR/tunnel-bridge.sh"
LOG_FILE="$SDPS_DIR/tunnel.log"
BRIDGE_LOG="$SDPS_DIR/bridge.log"
DEVICE_IP="192.168.29.71"
BACKEND_URL="https://api.sdpublic.org/api/admin/audio/tunnel/register"
API_KEY="sdps-tunnel-2026"
PLIST_LABEL="com.sdps.audio-tunnel"
PLIST_PATH="/Library/LaunchDaemons/${PLIST_LABEL}.plist"
HOSTNAME=$(hostname -s)

echo ""
echo "═══════════════════════════════════════════════════"
echo "   SDPS Audio Tunnel — macOS One-Time Setup"
echo "═══════════════════════════════════════════════════"
echo ""

# ─── Check root ───
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run with sudo:  sudo bash $0"
  exit 1
fi

# ─── Step 1: Create directory ───
mkdir -p "$SDPS_DIR"
echo "[+] Created $SDPS_DIR"

# ─── Step 2: Download cloudflared ───
if [ ! -f "$CF_BIN" ]; then
    echo "[~] Downloading cloudflared..."
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
        CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz"
    else
        CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz"
    fi
    curl -sL "$CF_URL" -o /tmp/cloudflared.tgz
    tar -xzf /tmp/cloudflared.tgz -C "$SDPS_DIR"
    chmod +x "$CF_BIN"
    rm -f /tmp/cloudflared.tgz
    echo "[+] Downloaded cloudflared ($ARCH)"
else
    echo "[+] cloudflared already exists"
fi

# ─── Step 3: Create the tunnel bridge script ───
cat > "$BRIDGE_SCRIPT" << 'BRIDGE_EOF'
#!/bin/bash
# SDPS Audio Tunnel Bridge — Runs on boot, auto-restarts, reports URL to backend

SDPS_DIR="/usr/local/sdps"
CF_BIN="$SDPS_DIR/cloudflared"
LOG_FILE="$SDPS_DIR/tunnel.log"
BRIDGE_LOG="$SDPS_DIR/bridge.log"
DEVICE_IP="192.168.29.71"
BACKEND_URL="https://sdps-website-main.onrender.com/api/admin/audio/tunnel/register"
API_KEY="sdps-tunnel-2026"
HOSTNAME=$(hostname -s)

log_msg() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$BRIDGE_LOG"
}

register_url() {
    local url="$1"
    curl -s -X POST "$BACKEND_URL" \
        -H "Content-Type: application/json" \
        -d "{\"tunnel_url\":\"$url\",\"api_key\":\"$API_KEY\",\"hostname\":\"$HOSTNAME\"}" \
        --connect-timeout 10 \
        --max-time 15 > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        log_msg "Registered: $url from $HOSTNAME"
    else
        log_msg "Failed to register URL"
    fi
}

extract_url() {
    # Wait up to 30 seconds for tunnel URL to appear in log
    for i in $(seq 1 30); do
        sleep 1
        if [ -f "$LOG_FILE" ]; then
            URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | head -1)
            if [ -n "$URL" ]; then
                echo "$URL"
                return 0
            fi
        fi
    done
    return 1
}

# ─── Main Loop ───
log_msg "Bridge starting on $HOSTNAME"

while true; do
    # Clear old log
    > "$LOG_FILE"

    # Start cloudflared tunnel
    "$CF_BIN" tunnel --url "http://${DEVICE_IP}" 2>"$LOG_FILE" &
    CF_PID=$!

    # Wait for URL
    TUNNEL_URL=$(extract_url)

    if [ -n "$TUNNEL_URL" ]; then
        register_url "$TUNNEL_URL"

        # Keep alive — re-register every 5 minutes
        while kill -0 "$CF_PID" 2>/dev/null; do
            sleep 300
            if kill -0 "$CF_PID" 2>/dev/null; then
                register_url "$TUNNEL_URL"
            fi
        done
    else
        log_msg "Failed to get tunnel URL, restarting..."
        kill "$CF_PID" 2>/dev/null || true
    fi

    log_msg "Tunnel exited, restarting in 10s..."
    sleep 10
done
BRIDGE_EOF

chmod +x "$BRIDGE_SCRIPT"
echo "[+] Created tunnel bridge script"

# ─── Step 4: Create LaunchDaemon for auto-start on boot ───
echo "[~] Creating auto-start service..."

# Stop existing service if running
launchctl unload "$PLIST_PATH" 2>/dev/null || true

cat > "$PLIST_PATH" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${BRIDGE_SCRIPT}</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>${SDPS_DIR}/stdout.log</string>

    <key>StandardErrorPath</key>
    <string>${SDPS_DIR}/stderr.log</string>

    <key>WorkingDirectory</key>
    <string>${SDPS_DIR}</string>
</dict>
</plist>
PLIST_EOF

chmod 644 "$PLIST_PATH"
echo "[+] Created LaunchDaemon: $PLIST_LABEL"

# ─── Step 5: Start the service now ───
echo "[~] Starting tunnel service..."
launchctl load "$PLIST_PATH"

sleep 15

# Check bridge log
if [ -f "$BRIDGE_LOG" ]; then
    echo ""
    echo "─── Bridge Log ───"
    tail -5 "$BRIDGE_LOG"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "   ✅ SETUP COMPLETE!"
echo "   Tunnel auto-starts on boot and reports URL"
echo "   to boardcasting.sdpublic.org automatically."
echo ""
echo "   Run this same script on 2-3 more school Macs"
echo "   for automatic failover redundancy!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Useful commands:"
echo "  Check status:  cat /usr/local/sdps/bridge.log"
echo "  Stop service:  sudo launchctl unload $PLIST_PATH"
echo "  Start service: sudo launchctl load $PLIST_PATH"
echo ""
