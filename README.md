# T-Files 📡

> A collection of scripts, tools, firmwares, and utilities for the **M5Stack T-Embed CC1101** and **T-Embed CC1101 Plus** running [Bruce firmware](https://github.com/pr3y/Bruce).

---

## 📁 Repository Structure

```
T-files/
├── danger/          # High-risk / use-with-caution tools
├── firmwares/       # Pre-built Bruce firmware .bin files
├── html/            # Web-based tools and portals
├── scripts/         # Bruce JS scripts (games, utilities, visualizers)
└── README.md
```

---

## 🎮 Scripts (`/scripts`)

Bruce JS scripts that run directly on the device via the Scripts menu. Copy `.js` files to the `/scripts` folder on your T-Embed.

### Games

| File | Description |
|------|-------------|
| `geodash.js` | Geometry Dash-style auto-runner. Jump over spikes, speed increases over time. |
| `slope.js` | Slope-style neon ball runner. Steer through obstacles, high score saved to storage. |
| `doom.js` | Wolfenstein/Doom-style raycaster FPS. Full DDA raycaster, 7 enemies, minimap, shooting. |
| `fortress.js` | Tower defense with 5 tower types, procedural paths, boss fight, power-ups, story dialogue. |
| `papercraft.js` | 2D Minecraft-style side-scroller. Mine blocks, craft tools, fight enemies, defeat the boss. |
| `starfire.js` | Bullet hell shmup. 5 waves + boss fight, power-ups, spread/laser/rapid fire. |

### Radio & RF Utilities

| File | Description |
|------|-------------|
| `waterfall.js` | Sub-GHz spectrum waterfall visualizer (CC1101). Draw pixel art and transmit it SSTV-style so any other waterfall display sees your image. |
| `adsb.js` | ADS-B aircraft listener. Connects to a local dump1090 server over WiFi and displays live aircraft data. |

### IR Utilities

| File | Description |
|------|-------------|
| `remote.js` | Universal IR remote. Browse by device category (TV, AC, projector, soundbar, camera, set-top box), pick a brand, fire commands. Saves sent log to SD. |

### Audio & Tone Tools

| File | Description |
|------|-------------|
| `brainfreq.js` | Psychoacoustic frequency generator. 18+ research-backed frequencies across Delta/Theta/Alpha/Beta/Gamma/Solfeggio bands. Hold encoder to play. |
| `memeboard.js` | Meme soundboard with 40+ classic jingles (Rickroll, Sandstorm, Nokia, Mario, Tetris, Nyan Cat, Coffin Dance, MLG Air Horn and more) recreated as buzzer tone sequences. |

---

## ⚠️ Danger (`/danger`)

Tools in this folder are for **authorized use only** on systems you own or have explicit permission to test. Misuse may be illegal in your jurisdiction.

---

## 💾 Firmwares (`/firmwares`)

Pre-compiled Bruce firmware `.bin` files for the T-Embed CC1101 and CC1101 Plus. Flash with `esptool` or the Bruce web flasher.

```bash
esptool.py --port /dev/ttyUSB0 write_flash 0x0 firmware.bin
```

Check [Bruce releases](https://github.com/pr3y/Bruce/releases) for the latest official builds.

---

## 🌐 HTML (`/html`)

Web-based tools and captive portal pages for use with Bruce's built-in web server.

---

## 🚀 Getting Started

### Requirements

- M5Stack T-Embed CC1101 or CC1101 Plus
- [Bruce firmware](https://github.com/pr3y/Bruce) flashed to the device
- A way to copy files to the device (USB mass storage, SD card, or Bruce's built-in file manager)

### Installing Scripts

1. Copy `.js` files to the `/scripts` folder on your device (via SD card or Bruce file manager)
2. From the Bruce main menu → **Scripts**
3. Select the script and run

### Installing Firmwares

1. Put the device in flash mode (hold boot button while connecting USB)
2. Flash with esptool or the [Bruce web flasher](https://bruce.computer/flasher)

---

## 🔧 Device Info

| Spec | Value |
|------|-------|
| MCU | ESP32-S3 |
| Display | 320×170 ST7789 |
| Sub-GHz radio | CC1101 (300–348 / 387–464 / 779–928 MHz) |
| IR | TX + RX |
| WiFi | 802.11 b/g/n |
| Bluetooth | BLE 5.0 |
| Storage | MicroSD |

---

## 📖 Resources

- [Bruce firmware](https://github.com/pr3y/Bruce)
- [Bruce JS interpreter docs](https://wiki.bruce.computer/interpreter/)
- [M5Stack T-Embed CC1101](https://docs.m5stack.com/en/atom/T-Embed-CC1101)
- [Bruce wiki](https://wiki.bruce.computer)

---

## 📄 License

Use responsibly. Only use RF/IR/WiFi tools on devices and networks you own or have explicit authorization to test.
