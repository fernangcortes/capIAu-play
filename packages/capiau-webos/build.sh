#!/bin/bash
# CapIAu WebOS Build Script
# Builds the jellyfin-web fork and packages it as an LG WebOS .ipk app
#
# Prerequisites:
#   - Node.js installed
#   - @anthropic/ares-cli installed globally: npm i -g @anthropic/ares-cli
#   - LG Developer Mode app installed on TV + key server enabled
#   - Device registered via: ares-setup-device
#
# Usage:
#   ./build.sh                    # Build .ipk only
#   ./build.sh --install          # Build + install on registered TV

set -e

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
JELLYFIN_WEB_DIR="$SCRIPT_DIR/../../jellyfin-web"
WWW_DIR="$SCRIPT_DIR/www"
DEVICE_NAME="${WEBOS_DEVICE:-tv}"

echo "╔══════════════════════════════════════╗"
echo "║   CapIAu Streaming — WebOS Build     ║"
echo "╚══════════════════════════════════════╝"

# --- Step 1: Build jellyfin-web ---
echo ""
echo "📦 Step 1: Building jellyfin-web (production)..."
cd "$JELLYFIN_WEB_DIR"

# Clean previous build
rm -rf dist/

# Build with system fonts (required for TV)
USE_SYSTEM_FONTS=1 npm run build:production

echo "✅ jellyfin-web build complete"

# --- Step 2: Copy build to WebOS www/ ---
echo ""
echo "📂 Step 2: Copying build to WebOS package..."

# Clean and recreate www/
rm -rf "$WWW_DIR"
mkdir -p "$WWW_DIR"

# Copy the built web app
cp -r dist/* "$WWW_DIR/"

echo "✅ Copied to $WWW_DIR"

# --- Step 3: Package as .ipk ---
echo ""
echo "📱 Step 3: Building WebOS .ipk package..."
cd "$SCRIPT_DIR"

# Remove previous package
rm -f *.ipk

# Build the IPK package
ares-package "$SCRIPT_DIR"

IPK_FILE=$(ls -t *.ipk 2>/dev/null | head -1)

if [ -z "$IPK_FILE" ]; then
    echo "❌ Failed to create .ipk package"
    exit 1
fi

echo "✅ Package created: $IPK_FILE"

# --- Step 4 (optional): Install on TV ---
if [ "$1" == "--install" ]; then
    echo ""
    echo "📺 Step 4: Installing on LG TV (device: $DEVICE_NAME)..."
    
    # Install the package
    ares-install --device "$DEVICE_NAME" "$IPK_FILE"
    
    echo "✅ Installed on LG TV!"
    echo ""
    echo "To run: Open 'CapIAu Streaming' from your LG TV apps"
    echo "To launch via CLI: ares-launch --device $DEVICE_NAME com.capiau.streaming"
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 Build complete: $IPK_FILE"
    echo ""
    echo "To install on LG TV:"
    echo "  1. Install 'Developer Mode' app from LG Content Store on your TV"
    echo "  2. Login with your LG dev account and enable Dev Mode + Key Server"
    echo "  3. Register device: ares-setup-device"
    echo "  4. Run: ares-install --device tv $IPK_FILE"
    echo ""
    echo "Or run: ./build.sh --install"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
