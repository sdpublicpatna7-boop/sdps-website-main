#!/bin/bash
# Double-click launcher for SDPS macOS Desktop Broadcaster Widget
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
INDEX_PATH="$DIR/index.html"

echo "Opening SDPS Broadcaster Widget..."
if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="file://$INDEX_PATH" --window-size=420,720
else
    open -a Safari "file://$INDEX_PATH"
fi
