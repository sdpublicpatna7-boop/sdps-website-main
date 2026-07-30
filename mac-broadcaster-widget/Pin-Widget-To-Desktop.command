#!/bin/bash
# Pin SDPS Broadcaster Widget directly onto macOS Desktop Wallpaper
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
INDEX_PATH="$DIR/SDPS Broadcaster.app/Contents/Resources/index.html"

echo "Pinning SDPS Broadcaster Widget to macOS Desktop..."

if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args \
        --app="file://$INDEX_PATH" \
        --window-position=40,60 \
        --window-size=360,450 \
        --user-data-dir="/tmp/sdps_widget_chrome_profile"
else
    open -a Safari "file://$INDEX_PATH"
fi
