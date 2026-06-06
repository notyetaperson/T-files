# T-files 📡

> A LOT of files for the **T-Embed CC1101** and **T-Embed CC1101 Plus** running [Bruce firmware](https://github.com/pr3y/Bruce).

---

## 📁 Folder Structure

```
T-files/
├── danger/       # High-risk / use-with-caution files
├── firmwares/    # Bruce firmware binaries for flashing
├── html/         # HTML portal pages served over Bruce's web server
├── ir/           # Infrared remote signal files (.ir)
├── payloads/     # Bruce JS scripts and automation payloads
├── subghz/       # Sub-GHz signal captures (.sub)
└── wordlists/    # Wordlists for Wi-Fi attacks and other brute-force tasks
```

---

## 📂 What's Inside

### `firmwares/`
Pre-built Bruce firmware `.bin` files ready to flash onto your T-Embed CC1101 or CC1101 Plus via the web flasher or `esptool`.

### `html/`
Custom HTML pages that can be hosted from Bruce's built-in web server. Drop these onto the device and serve them over Wi-Fi for portal clones, landing pages, or evil twin setups.

### `ir/`
Infrared signal files in Bruce/Flipper Zero `.ir` format. Covers a wide range of devices — TVs, AC units, projectors, lighting systems, and more. Drop into the `ir/` folder on your device's SD card.

### `payloads/`
Bruce JS scripts (`.js`) for the device's JavaScript engine. Includes automation scripts, UI tools, radio utilities, and other fun stuff. Copy to the `/scripts/` directory on your device.

### `subghz/`
Sub-GHz captures in `.sub` format compatible with Bruce and Flipper Zero. Covers common frequencies (315 MHz, 433 MHz, 868 MHz, 915 MHz) — garage doors, weather sensors, key fobs, and other RF targets. Copy to `/subghz/` on the SD card.

### `wordlists/`
Text-based wordlists for Wi-Fi handshake cracking and PMKID attacks via Bruce's Wi-Fi tools. Compatible with Bruce's built-in wordlist attack feature.

### `danger/`
Files in here carry elevated risk — either destructive, highly disruptive, or only legal in specific contexts. Read the contents carefully and only use on networks/devices you own or have explicit permission to test.

---

## 🔧 Installation

### Option A — Clone to SD card
```bash
git clone https://github.com/notyetaperson/T-files
```
Then copy the relevant folders to your T-Embed's SD card, mirroring the directory structure Bruce expects:

| Folder | SD Card Path |
|--------|-------------|
| `ir/` | `/ir/` |
| `subghz/` | `/subghz/` |
| `payloads/` | `/scripts/` |
| `html/` | `/html/` |
| `wordlists/` | `/wordlists/` |

### Option B — Manual drop
Download individual files from the GitHub UI and copy them to the matching folder on the SD card.

---

## ⚡ Device Compatibility

| Device | Status |
|--------|--------|
| T-Embed CC1101 | ✅ |
| T-Embed CC1101 Plus | ✅ |
| Flipper Zero (IR / Sub-GHz files) | ✅ (partial) |

Most `.ir` and `.sub` files are cross-compatible with Flipper Zero. JS payloads are Bruce-specific.

---

## ⚠️ Legal Disclaimer

These files are provided for **educational purposes and authorized testing only**. Transmitting RF signals, capturing Sub-GHz traffic, cloning remotes, or running network attacks without the explicit permission of the owner is illegal in most jurisdictions.

**Use responsibly. You own what you do with this.**

---

## 🔗 Related

- [Bruce Firmware](https://github.com/pr3y/Bruce)
- [Bruce Documentation](https://bruce.computer)
- [T-Embed CC1101 Plus (LILYGO)](https://lilygo.cc)
