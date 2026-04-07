#!/bin/bash
# CapIAu Tizen Build Script
# Builds the jellyfin-web fork and packages it as a Tizen .wgt app for Samsung TVs
#
# Prerequisites:
#   - Node.js installed
#   - Tizen Studio CLI installed (tizen, sdb commands available)
#   - Tizen certificate profile configured
#
# Usage:
#   ./build.sh                    # Build .wgt only
#   ./build.sh --install <IP>     # Build + install on TV at <IP>

set -e

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
JELLYFIN_WEB_DIR="$SCRIPT_DIR/../../jellyfin-web"
WWW_DIR="$SCRIPT_DIR/www"
CERT_PROFILE="${TIZEN_CERT_PROFILE:-CapIAu}"

echo "╔══════════════════════════════════════╗"
echo "║   CapIAu Streaming — Tizen Build     ║"
echo "╚══════════════════════════════════════╝"

# --- Step 1: Build jellyfin-web ---
echo ""
echo "📦 Step 1: Building jellyfin-web (production)..."
cd "$JELLYFIN_WEB_DIR"

# Clean previous build
rm -rf dist/

# Build with system fonts (required for Tizen)
USE_SYSTEM_FONTS=1 npm run build:production

echo "✅ jellyfin-web build complete"

# --- Step 2: Copy build to Tizen www/ ---
echo ""
echo "📂 Step 2: Copying build to Tizen package..."

# Clean and recreate www/
rm -rf "$WWW_DIR"
mkdir -p "$WWW_DIR"

# Copy the built web app
cp -r dist/* "$WWW_DIR/"

echo "✅ Copied to $WWW_DIR"

# --- Step 3: Package as .wgt ---
echo ""
echo "📱 Step 3: Building Tizen .wgt package..."
cd "$SCRIPT_DIR"

# Remove previous package
rm -f *.wgt

# Build the widget package
tizen package -t wgt -s "$CERT_PROFILE" -- "$SCRIPT_DIR"

WGT_FILE=$(ls -t *.wgt 2>/dev/null | head -1)

if [ -z "$WGT_FILE" ]; then
    echo "❌ Failed to create .wgt package"
    exit 1
fi

echo "✅ Package created: $WGT_FILE"

# --- Step 4 (optional): Install on TV ---
if [ "$1" == "--install" ] && [ -n "$2" ]; then
    TV_IP="$2"
    echo ""
    echo "📺 Step 4: Installing on Samsung TV at $TV_IP..."
    
    # Connect to TV
    sdb connect "$TV_IP"
    sleep 2
    
    # Install the package
    tizen install -n "$WGT_FILE" -t "$TV_IP"
    
    echo "✅ Installed on TV!"
    echo ""
    echo "To run: Open 'CapIAu Streaming' from your Samsung TV apps"
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 Build complete: $WGT_FILE"
    echo ""
    echo "To install on Samsung TV:"
    echo "  1. Enable Developer Mode on your Samsung TV"
    echo "     (Apps → type 12345 → Developer Mode ON → set PC IP)"
    echo "  2. Run: sdb connect <TV_IP>"
    echo "  3. Run: tizen install -n $WGT_FILE"
    echo ""
    echo "Or run: ./build.sh --install <TV_IP>"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
