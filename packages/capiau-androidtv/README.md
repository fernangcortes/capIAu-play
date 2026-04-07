# CapIAu Android TV — Build & Deploy Guide

## Prerequisites

1. **Android Studio** installed ([developer.android.com/studio](https://developer.android.com/studio))
2. **Firebase Console**: Register `com.capiau.streaming.tv` in your Firebase project
   - Download `google-services.json` and replace `app/google-services.json`
3. **Android TV device** in Developer Mode
   - Settings → About → Build Number (click 7x) → Developer Options → USB/Network Debugging

## Build

### Via Android Studio (recommended)
1. Open `packages/capiau-androidtv/` in Android Studio
2. Wait for Gradle sync
3. Build → Build APK(s) → `app/build/outputs/apk/debug/app-debug.apk`

### Via Command Line
```bash
cd packages/capiau-androidtv
./gradlew assembleDebug
```

## Install on TV

### Via USB
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Via Network (wireless)
```bash
# Find your TV's IP in Settings → Network
adb connect 192.168.x.x:5555
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Supported Devices
- Sony TVs (Android TV / Google TV)
- TCL TVs (Google TV)
- Nvidia Shield
- Xiaomi Mi Box
- Any Android TV / Google TV device

## Architecture

```
┌──────────────────────────────────────────────────┐
│              CapIAu Android TV App               │
│                                                  │
│  ┌───────────────┐    ┌───────────────────────┐  │
│  │  Leanback UI  │    │   WebView Bridge      │  │
│  │  (Kotlin)     │    │   (CapIAu JS modules) │  │
│  │               │    │                       │  │
│  │  • Home       │    │   • capiauSidebar.js  │  │
│  │  • Browse     │    │   • capiauDragDrop.js │  │
│  │  • Setup      │    │   • capiauSync.js     │  │
│  └───────┬───────┘    └───────────┬───────────┘  │
│          │                        │              │
│  ┌───────┴────────────────────────┴───────────┐  │
│  │         ExoPlayer / Media3                 │  │
│  │   Native video player (HW acceleration)   │  │
│  └───────────────────────────────────────────┘  │
│          │                                      │
│  ┌───────┴──────────────────────────────────┐   │
│  │      Firebase SDK (Android native)        │   │
│  │   Firestore sync with web/TV clients      │   │
│  └───────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

## Remote Control Mapping

| Key | Player | Home |
|-----|--------|------|
| ▶️/⏸️ | Play/Pause | — |
| ◀️ | Seek -10s | — |
| ▶️ | Seek +10s | — |
| 🔴 Red button | Open Producer Mode | — |
| Menu/Info | Open Producer Mode | — |
| Back | Stop → Home | Exit |
| D-pad | Navigate controls | Navigate cards |
| Enter/Select | Toggle Play/Pause | Open item |
