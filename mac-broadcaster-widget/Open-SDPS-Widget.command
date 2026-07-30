#!/bin/bash
# Double-click launcher for SDPS macOS Desktop Broadcaster Widget
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Option 1: Try Electron if available
if command -v npx &> /dev/null && [ -d "$DIR/node_modules/electron" ]; then
    echo "Launching SDPS Broadcaster Widget with Electron..."
    cd "$DIR" && npx electron .
    exit 0
fi

# Option 2: Fallback to Mac App Window in Chrome or Safari
echo "Opening SDPS Broadcaster Widget in Mac Desktop App Mode..."
if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="file://$DIR/index.html" --window-size=420,720
else
    open -a Safari "file://$DIR/index.html"
fi
