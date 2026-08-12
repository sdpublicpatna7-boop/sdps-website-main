#!/bin/bash
# Pin SDPS Broadcaster Squircle Widget directly onto macOS Desktop Wallpaper
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
INDEX_PATH="$DIR/SDPS Broadcaster.app/Contents/Resources/index.html"

echo "Pinning SDPS Broadcaster Squircle Widget to macOS Desktop..."

if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args \
        --app="file://$INDEX_PATH" \
        --window-position=30,50 \
        --window-size=320,360 \
        --user-data-dir="/tmp/sdps_desktop_widget_profile"
else
    open -a Safari "file://$INDEX_PATH"
fi
