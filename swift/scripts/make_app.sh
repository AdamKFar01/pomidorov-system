#!/bin/bash
# Build Pomidorov.app. Run from anywhere:  ./scripts/make_app.sh
set -euo pipefail

cd "$(dirname "$0")/.."

APP="dist/Pomidorov.app"

swift build -c release

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cp .build/release/Pomidorov "$APP/Contents/MacOS/Pomidorov"
cp Info.plist "$APP/Contents/Info.plist"
cp Resources/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns"

# Ad-hoc signature, enough to run locally. Real distribution needs a
# Developer ID certificate and notarisation.
codesign --force --sign - "$APP" >/dev/null 2>&1 || true

echo "built $APP"
