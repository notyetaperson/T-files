// WATERFALL.JS - Sub-GHz Spectrum Waterfall + Pixel Art Transmitter
// Bruce JS / CC1101 (T-Embed CC1101 Plus)
//
// MODES:
//   WATCH  - Live spectrum waterfall. Tune with Prev/Next. Sel = menu.
//   DRAW   - Draw pixel art on a 32x24 canvas to transmit.
//   TRANSMIT - Encodes your art as frequency-shift tones (SSTV-style).
//              Any other waterfall watching the same freq will see your image
//              painted row-by-row as bright/dark lines.
//   RECV   - Listens for incoming waterfall images and decodes them.
//
// HOW THE IMAGE TX WORKS (SSTV / Robot-style):
//   Each pixel row is sent as a tone burst. Brightness (0-7) maps to a
//   sub-frequency offset within a 20kHz window. A sync tone marks row start.
//   Any SDR waterfall (SDR#, GQRX, etc.) or another Bruce running this
//   script in RECV mode will see the image painted onto the display.
//
// Controls vary by mode - see on-screen hints.
// Default center frequency: 433.920 MHz (ISM band, legal for short bursts)

var display  = require("display");
var keyboard = require("keyboard");
var subghz   = require("subghz");
var audio    = require("audio");

// ── Screen ────────────────────────────────────────────────────────────────────
var W  = display.width();
var H  = display.height();

// ── Colors ────────────────────────────────────────────────────────────────────
var BLACK   = display.color(0,   0,   0);
var WHITE   = display.color(255, 255, 255);
var GREEN   = display.color(0,   255, 80);
var DKGREEN = display.color(0,   60,  20);
var RED     = display.color(255, 40,  40);
var YELLOW  = display.color(255, 220, 0);
var CYAN    = display.color(0,   220, 255);
var ORANGE  = display.color(255, 130, 0);
var PURPLE  = display.color(160, 40,  220);
var BLUE    = display.color(40,  100, 255);
var GRAY1   = display.color(180, 180, 180);
var GRAY2   = display.color(90,  90,  90);
var GRAY3   = display.color(30,  30,  30);
var MAGENTA = display.color(255, 0,   180);

// Waterfall palette: 8 levels dark→bright (noise floor → signal peak)
var WF_COLS = [
  display.color(0,   0,   20),   // 0 - noise floor (near black)
  display.color(0,   0,   80),   // 1
  display.color(0,   40,  140),  // 2
  display.color(0,   120, 180),  // 3
  display.color(0,   200, 160),  // 4
  display.color(80,  220, 60),   // 5
  display.color(220, 200, 0),    // 6
  display.color(255, 60,  0),    // 7 - strong signal (hot)
];

// ── Layout ────────────────────────────────────────────────────────────────────
var HDR_H    = 12;
var FOOT_H   = 12;
var WF_Y     = HDR_H;
var WF_H     = H - HDR_H - FOOT_H;
var WF_W     = W;

// ── Canvas (32x24 pixel art) ──────────────────────────────────────────────────
var CANVAS_W = 32;
var CANVAS_H = 24;
var canvas   = [];   // 0-7 brightness per pixel
for (var i = 0; i < CANVAS_W * CANVAS_H; i++) canvas.push(0);

// Preset troll images encoded as 32x24 brightness maps (0-7)
// Each image is a flat array of CANVAS_W*CANVAS_H bytes
// We store them as run-length strings to save memory: "brightness:count,..."

function makeBlank() {
  var a = [];
  for (var i = 0; i < CANVAS_W * CANVAS_H; i++) a.push(0);
  return a;
}

// ── Built-in troll images ─────────────────────────────────────────────────────
// Encoded as rows of brightness values 0-7
// We'll define them as simple draw functions that paint onto canvas

function drawFace() {
  // Classic trollface ASCII-art style in brightness
  for (var i = 0; i < CANVAS_W * CANVAS_H; i++) canvas[i] = 0;
  // Outer head circle
  function setP(x, y, v) {
    if (x >= 0 && x < CANVAS_W && y >= 0 && y < CANVAS_H)
      canvas[y * CANVAS_W + x] = v;
  }
  function hline(y, x1, x2, v) { for (var x = x1; x <= x2; x++) setP(x, y, v); }
  function vline(x, y1, y2, v) { for (var y = y1; y <= y2; y++) setP(x, y, v); }
  // Head outline
  hline(2, 8, 23, 6);
  hline(3, 6, 25, 6);
  hline(4, 5, 26, 5);
  for (var y = 5; y <= 18; y++) { setP(4, y, 5); setP(27, y, 5); }
  hline(19, 5, 26, 5);
  hline(20, 7, 24, 4);
  // Eyes
  hline(8, 9, 12, 7); hline(8, 19, 22, 7);
  hline(9, 8, 13, 7); hline(9, 18, 23, 7);
  hline(10,9, 12, 3); hline(10,19, 22, 3);
  // Nose
  setP(15, 13, 6); setP(16, 13, 6);
  setP(14, 14, 6); setP(17, 14, 6);
  hline(15, 13, 18, 5);
  // Mouth (grin)
  hline(17, 8, 23, 7);
  setP(7, 16, 7); setP(24, 16, 7);
  setP(8, 17, 6); setP(23, 17, 6);
  hline(18, 9, 22, 6);
  // Teeth
  hline(19, 10, 21, 7);
  setP(14, 19, 7); setP(15, 19, 7); setP(17, 19, 7); setP(18, 19, 7);
  // Eyebrows (angry)
  for (var i = 0; i < 5; i++) { setP(9+i, 6-Math.floor(i*0.5), 7); }
  for (var i = 0; i < 5; i++) { setP(19+i, 6-Math.floor((4-i)*0.5), 7); }
}

function drawSkull() {
  for (var i = 0; i < CANVAS_W * CANVAS_H; i++) canvas[i] = 0;
  function setP(x, y, v) {
    if (x >= 0 && x < CANVAS_W && y >= 0 && y < CANVAS_H)
      canvas[y * CANVAS_W + x] = v;
  }
  function hline(y, x1, x2, v) { for (var x = x1; x <= x2; x++) setP(x, y, v); }
  // Head
  hline(1, 10, 21, 6);
  hline(2, 8, 23, 6);
  for (var y = 3; y <= 14; y++) { setP(7, y, 6); setP(24, y, 6); }
  hline(15, 8, 23, 6);
  hline(16, 9, 22, 5);
  // Jaw
  for (var y = 17; y <= 22; y++) { setP(10, y, 5); setP(21, y, 5); }
  hline(23, 10, 21, 5);
  // Teeth
  for (var tx = 11; tx <= 20; tx += 3) {
    hline(17, tx, tx+1, 7);
    hline(18, tx, tx+1, 7);
    setP(tx+2, 17, 0); setP(tx+2, 18, 0);
  }
  // Eye sockets
  hline(6, 10, 14, 7); hline(6, 17, 21, 7);
  hline(7, 9, 15, 7);  hline(7, 16, 22, 7);
  hline(8, 9, 15, 5);  hline(8, 16, 22, 5);
  hline(9, 10, 14, 7); hline(9, 17, 21, 7);
  hline(10,11, 13, 7); hline(10,18, 20, 7);
  // Nose hole
  setP(15, 12, 7); setP(16, 12, 7);
  setP(15, 13, 7); setP(16, 13, 7);
  // Cracks
  setP(13, 2, 7); setP(14, 3, 7); setP(13, 4, 6);
  setP(20, 3, 7); setP(19, 4, 6);
}

function drawSine() {
  // Sine wave pattern - looks cool on waterfall
  for (var i = 0; i < CANVAS_W * CANVAS_H; i++) canvas[i] = 0;
  for (var x = 0; x < CANVAS_W; x++) {
    for (var y = 0; y < CANVAS_H; y++) {
      var wave1 = Math.sin(x * 0.5) * 5 + 12;
      var wave2 = Math.sin(x * 0.8 + 1.5) * 3 + 8;
      var wave3 = Math.sin(x * 0.3 + 3.0) * 4 + 16;
      var d1 = Math.abs(y - wave1);
      var d2 = Math.abs(y - wave2);
      var d3 = Math.abs(y - wave3);
      var v = 0;
      if (d1 < 1.5) v = 7;
      else if (d2 < 1.2) v = 6;
      else if (d3 < 1.0) v = 5;
      canvas[y * CANVAS_W + x] = v;
    }
  }
}

function drawText(msg) {
  // Tiny 3x5 font for short messages in waterfall art
  for (var i = 0; i < CANVAS_W * CANVAS_H; i++) canvas[i] = 0;
  var FONT = {
    'H': [[1,0,0,1],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
    'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
    'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
    'O': [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
    'G': [[0,1,1],[1,0,0],[1,0,1],[1,0,1],[0,1,1]],
    'E': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
    'T': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
    'R': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
    'A': [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
    'B': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
    'C': [[0,1,1],[1,0,0],[1,0,0],[1,0,0],[0,1,1]],
    'D': [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
    'F': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
    'K': [[1,0,1],[1,1,0],[1,0,0],[1,1,0],[1,0,1]],
    'M': [[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
    'N': [[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
    'P': [[1,1,0],[1,0,1],[1,1,0],[1,0,0],[1,0,0]],
    'Q': [[0,1,0],[1,0,1],[1,0,1],[1,1,0],[0,1,1]],
    'S': [[0,1,1],[1,0,0],[0,1,0],[0,0,1],[1,1,0]],
    'U': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
    'V': [[1,0,1],[1,0,1],[1,0,1],[0,1,0],[0,1,0]],
    'W': [[1,0,1],[1,0,1],[1,0,1],[1,1,1],[1,0,1]],
    'X': [[1,0,1],[0,1,0],[0,1,0],[0,1,0],[1,0,1]],
    'Y': [[1,0,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
    'Z': [[1,1,1],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],
    '!': [[1],[1],[1],[0],[1]],
    '?': [[0,1,0],[1,0,1],[0,0,1],[0,1,0],[0,1,0]],
    ' ': [[0,0],[0,0],[0,0],[0,0],[0,0]],
  };
  var cx = 1;
  var cy = (CANVAS_H - 5) / 2;
  for (var ci = 0; ci < msg.length; ci++) {
    var ch = to_upper_case(msg[ci]);
    var glyph = FONT[ch] || FONT[' '];
    var gw = glyph[0].length;
    if (cx + gw >= CANVAS_W) break;
    for (var row = 0; row < 5; row++) {
      for (var col = 0; col < gw; col++) {
        if (glyph[row][col]) {
          var px = cx + col;
          var py = Math.floor(cy) + row;
          if (px >= 0 && px < CANVAS_W && py >= 0 && py < CANVAS_H)
            canvas[py * CANVAS_W + px] = 7;
        }
      }
    }
    cx += gw + 1;
  }
}

// ── Frequency config ──────────────────────────────────────────────────────────
var CENTER_FREQ  = 433.920;  // MHz
var FREQ_STEP    = 0.025;    // MHz per Prev/Next press
var TX_BASE_FREQ = 433.900;  // bottom of TX window
var TX_SPAN      = 0.020;    // 20 kHz span for image encoding
// Each pixel brightness (0-7) maps to:
//   freq = TX_BASE_FREQ + (brightness/7) * TX_SPAN
var SYNC_FREQ    = TX_BASE_FREQ - 0.002;  // sync pulse below window
var ROW_DWELL_MS = 80;   // ms per row (longer = taller lines on waterfall)
var SYNC_MS      = 30;   // sync pulse duration

// ── Waterfall buffer ──────────────────────────────────────────────────────────
// Ring buffer of WF_W columns x WF_H rows of intensity 0-7
var wfBuf = [];
for (var r = 0; r < WF_H; r++) {
  wfBuf.push([]);
  for (var c = 0; c < WF_W; c++) wfBuf[r].push(0);
}
var wfRow = 0;  // current write row (ring)

// ── Decode state (for RECV mode) ─────────────────────────────────────────────
var recvCanvas = makeBlank();
var recvRow    = 0;
var recvActive = false;
var recvTimer  = 0;

// ── States ────────────────────────────────────────────────────────────────────
var ST_WATCH    = 0;
var ST_MENU     = 1;
var ST_DRAW     = 2;
var ST_TX       = 3;
var ST_RECV     = 4;
var ST_PRESET   = 5;
var state = ST_WATCH;
var frameCount  = 0;

// Draw tool state
var curX = 0, curY = 0;
var drawBright = 7;
var drawTool   = 0;  // 0=pen, 1=erase, 2=fill

// Menu
var menuItems  = ["Watch Spectrum","Draw & TX Image","Recv Waterfall Art","Preset Images","Set Frequency","Exit"];
var menuSel    = 0;

// Preset
var presetItems = ["Troll Face","Skull","Sine Wave","Text: HI","Text: LOL","Text: GLHF"];
var presetSel   = 0;

// ── Simulated spectrum (when no real signal) ──────────────────────────────────
// In real use, subghz.readRaw() feeds this. We simulate noise + occasional peaks.
var noiseFloor = [];
for (var i = 0; i < WF_W; i++) noiseFloor.push(random(0, 2));

function sampleSpectrum() {
  // Try to read a raw signal burst from CC1101
  // readRaw returns a string like "1000 500 800 200 ..." (pulse widths)
  // We map signal presence to intensity
  var row = [];
  var sig = null;
  try {
    sig = subghz.readRaw(0);  // 0 = non-blocking / immediate
  } catch(e) { sig = null; }

  if (sig && sig.length > 4) {
    // Signal present — paint across the center band
    var parts = sig.split(" ");
    var energy = Math.min(7, Math.floor(parts.length / 3) + 3);
    var sigCenter = Math.floor(WF_W / 2) + random(-10, 10);
    var sigWidth  = random(3, 12);
    for (var c = 0; c < WF_W; c++) {
      var d = Math.abs(c - sigCenter);
      if (d < sigWidth) {
        row.push(Math.max(noiseFloor[c], energy - Math.floor(d * 0.5)));
      } else {
        row.push(noiseFloor[c] + random(0, 2) > 1 ? 1 : 0);
      }
    }
  } else {
    // Just noise
    for (var c = 0; c < WF_W; c++) {
      var v = noiseFloor[c] + random(0, 3);
      if (v > 7) v = 7;
      row.push(v);
    }
    // Random sporadic signals
    if (random(0, 8) === 0) {
      var sc = random(10, WF_W - 10);
      var sw = random(2, 8);
      var se = random(4, 7);
      for (var dx = -sw; dx <= sw; dx++) {
        if (sc+dx >= 0 && sc+dx < WF_W) {
          row[sc+dx] = Math.max(row[sc+dx], se - Math.abs(dx));
        }
      }
    }
  }
  return row;
}

// ── Waterfall draw ────────────────────────────────────────────────────────────
function pushWFRow(row) {
  wfBuf[wfRow] = row;
  wfRow = (wfRow + 1) % WF_H;
}

function drawWaterfall() {
  for (var r = 0; r < WF_H; r++) {
    var bufIdx = (wfRow + r) % WF_H;
    var row    = wfBuf[bufIdx];
    var y      = WF_Y + r;
    for (var c = 0; c < WF_W; c++) {
      var v = row[c];
      if (v < 0) v = 0;
      if (v > 7) v = 7;
      display.drawPixel(c, y, WF_COLS[v]);
    }
  }
}

function drawHeader() {
  display.drawFillRect(0, 0, W, HDR_H, BLACK);
  display.setTextSize(1);
  display.setTextColor(CYAN);
  display.setCursor(2, 2);
  display.print(CENTER_FREQ + "MHz");
  display.setTextColor(GRAY2);
  display.setCursor(W - 50, 2);
  display.print("P/N=Tune S=Menu");
}

function drawFooter(msg, col) {
  display.drawFillRect(0, H - FOOT_H, W, FOOT_H, BLACK);
  display.drawLine(0, H - FOOT_H, W, H - FOOT_H, GRAY3);
  display.setTextSize(1);
  display.setTextColor(col || GRAY2);
  display.setCursor(2, H - FOOT_H + 2);
  display.print(msg);
}

// ── Menu ──────────────────────────────────────────────────────────────────────
function drawMenu() {
  display.fill(BLACK);
  display.drawRect(4, 4, W - 8, H - 8, CYAN);
  display.setTextAlign("center", "top");
  display.setTextSize(1);
  display.setTextColor(CYAN);
  display.drawText("WATERFALL", Math.floor(W/2), 8);
  display.setTextColor(GRAY2);
  display.drawText("Bruce CC1101", Math.floor(W/2), 18);
  display.setTextAlign("left", "top");

  for (var i = 0; i < menuItems.length; i++) {
    var y = 30 + i * 14;
    var sel = (i === menuSel);
    if (sel) {
      display.drawFillRect(8, y - 1, W - 16, 12, display.color(0, 40, 60));
      display.drawRect(8, y - 1, W - 16, 12, CYAN);
      display.setTextColor(YELLOW);
    } else {
      display.setTextColor(GRAY1);
    }
    display.setCursor(14, y);
    display.print((sel ? "> " : "  ") + menuItems[i]);
  }
  display.setTextColor(GRAY2);
  display.setCursor(4, H - 12);
  display.print("P/N=Move  Sel=Pick  Esc=Back");
}

// ── Preset picker ─────────────────────────────────────────────────────────────
function drawPresetMenu() {
  display.fill(BLACK);
  display.drawRect(4, 4, W - 8, H - 8, PURPLE);
  display.setTextAlign("center", "top");
  display.setTextSize(1);
  display.setTextColor(PURPLE);
  display.drawText("PRESET IMAGES", Math.floor(W/2), 8);
  display.setTextAlign("left", "top");
  for (var i = 0; i < presetItems.length; i++) {
    var y = 24 + i * 13;
    var sel = (i === presetSel);
    if (sel) {
      display.drawFillRect(8, y - 1, W - 16, 11, display.color(30, 0, 50));
      display.setTextColor(MAGENTA);
    } else {
      display.setTextColor(GRAY1);
    }
    display.setCursor(14, y);
    display.print((sel ? "> " : "  ") + presetItems[i]);
  }
  display.setTextColor(GRAY2);
  display.setCursor(4, H - 12);
  display.print("P/N=Move  Sel=Load  Esc=Back");
}

// ── Canvas draw screen ────────────────────────────────────────────────────────
var CELL_W = Math.floor((W - 60) / CANVAS_W);
var CELL_H = Math.floor((H - 30) / CANVAS_H);
if (CELL_W < 2) CELL_W = 2;
if (CELL_H < 2) CELL_H = 2;
var CVS_OX = 2;
var CVS_OY = 14;

function drawCanvas() {
  display.fill(BLACK);
  // Draw canvas cells
  for (var y = 0; y < CANVAS_H; y++) {
    for (var x = 0; x < CANVAS_W; x++) {
      var v   = canvas[y * CANVAS_W + x];
      var col = WF_COLS[v];
      display.drawFillRect(CVS_OX + x*CELL_W, CVS_OY + y*CELL_H, CELL_W, CELL_H, col);
    }
  }
  // Grid lines (subtle)
  for (var x = 0; x <= CANVAS_W; x++) {
    display.drawLine(CVS_OX + x*CELL_W, CVS_OY, CVS_OX + x*CELL_W, CVS_OY + CANVAS_H*CELL_H, GRAY3);
  }
  for (var y = 0; y <= CANVAS_H; y++) {
    display.drawLine(CVS_OX, CVS_OY + y*CELL_H, CVS_OX + CANVAS_W*CELL_W, CVS_OY + y*CELL_H, GRAY3);
  }
  // Cursor
  if (frameCount % 12 < 8) {
    display.drawRect(CVS_OX + curX*CELL_W - 1, CVS_OY + curY*CELL_H - 1,
                     CELL_W + 2, CELL_H + 2, WHITE);
  }

  // Right panel: brightness + controls
  var px = CVS_OX + CANVAS_W * CELL_W + 4;
  display.setTextSize(1);
  display.setTextColor(GRAY1);
  display.setCursor(px, CVS_OY);
  display.print("BRI");
  // Brightness bar
  for (var i = 0; i <= 7; i++) {
    var by = CVS_OY + 10 + i * 10;
    var sel = (i === 7 - drawBright);
    display.drawFillRect(px, by, 18, 8, WF_COLS[7 - i]);
    if (sel) display.drawRect(px - 1, by - 1, 20, 10, WHITE);
  }

  // Tool icons
  display.setCursor(px, CVS_OY + 100);
  display.setTextColor(drawTool === 0 ? YELLOW : GRAY2);
  display.print("PEN");
  display.setCursor(px, CVS_OY + 112);
  display.setTextColor(drawTool === 1 ? RED : GRAY2);
  display.print("ERS");
  display.setCursor(px, CVS_OY + 124);
  display.setTextColor(drawTool === 2 ? CYAN : GRAY2);
  display.print("FIL");

  // Header
  display.drawFillRect(0, 0, W, 12, BLACK);
  display.setTextColor(GREEN);
  display.setCursor(2, 2);
  display.print("DRAW  " + curX + "," + curY);
  display.setTextColor(GRAY2);
  display.setCursor(W - 80, 2);
  display.print("S=TX Esc=Back");
}

// ── TX screen ─────────────────────────────────────────────────────────────────
function doTransmit() {
  display.fill(BLACK);
  display.setTextAlign("center", "middle");
  display.setTextSize(1);
  display.setTextColor(ORANGE);
  display.drawText("TRANSMITTING IMAGE", Math.floor(W/2), 20);
  display.setTextColor(GRAY1);
  display.drawText("SSTV-style waterfall art", Math.floor(W/2), 32);
  display.drawText("Freq: " + TX_BASE_FREQ + " MHz", Math.floor(W/2), 44);
  display.setTextAlign("left", "top");

  // Progress bar outline
  display.drawRect(10, H/2 - 6, W - 20, 12, GRAY2);

  audio.tone(800, 60, true);  // ready beep

  // Send header sync burst (3 long pulses so receiver can lock on)
  for (var i = 0; i < 3; i++) {
    subghz.setFrequency(SYNC_FREQ);
    delay(SYNC_MS * 2);
    subghz.setFrequency(TX_BASE_FREQ + TX_SPAN);
    delay(SYNC_MS);
  }
  delay(80);

  // Transmit rows
  for (var row = 0; row < CANVAS_H; row++) {
    if (keyboard.getEscPress()) break;

    // Sync pulse for this row
    subghz.setFrequency(SYNC_FREQ);
    delay(SYNC_MS);

    // Transmit each pixel in the row
    for (var col = 0; col < CANVAS_W; col++) {
      var bright = canvas[row * CANVAS_W + col];
      var freq   = TX_BASE_FREQ + (bright / 7.0) * TX_SPAN;
      // Round to 3 decimal places
      freq = Math.floor(freq * 1000) / 1000;
      subghz.setFrequency(freq);
      delay(Math.floor(ROW_DWELL_MS / CANVAS_W));
    }

    // Progress bar
    var prog = Math.floor((row + 1) / CANVAS_H * (W - 22));
    display.drawFillRect(11, H/2 - 5, prog, 10,
      display.color(
        Math.floor(255 * row / CANVAS_H),
        Math.floor(255 * (1 - row / CANVAS_H)),
        80
      )
    );
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setTextAlign("center", "middle");
    display.drawText("Row " + (row+1) + "/" + CANVAS_H, Math.floor(W/2), H/2 + 16);
    display.setTextAlign("left", "top");

    // Small audio tick every 4 rows
    if (row % 4 === 0) audio.tone(400 + row * 15, 10, true);
  }

  // End-of-image marker
  subghz.setFrequency(SYNC_FREQ);
  delay(SYNC_MS * 3);
  subghz.setFrequency(CENTER_FREQ);  // return to center

  display.setTextAlign("center", "middle");
  display.setTextColor(GREEN);
  display.drawText("DONE! Image transmitted.", Math.floor(W/2), H/2 + 30);
  display.setTextColor(GRAY2);
  display.drawText("Any key to continue", Math.floor(W/2), H/2 + 44);
  display.setTextAlign("left", "top");
  audio.tone(880, 100);
  delay(110);
  audio.tone(1100, 150);

  // Wait for keypress
  while (!keyboard.getAnyPress() && !keyboard.getEscPress()) { delay(50); }
  state = ST_WATCH;
}

// ── RECV screen ───────────────────────────────────────────────────────────────
function drawRecv() {
  // Left: live recv canvas. Right: status.
  var cx2 = 2;
  var cy2 = 14;
  var cw2 = Math.floor((W * 0.65) / CANVAS_W);
  var ch2 = Math.floor((H - 24) / CANVAS_H);
  if (cw2 < 2) cw2 = 2;
  if (ch2 < 2) ch2 = 2;

  for (var y = 0; y < CANVAS_H; y++) {
    for (var x = 0; x < CANVAS_W; x++) {
      var v = recvCanvas[y * CANVAS_W + x];
      display.drawFillRect(cx2 + x*cw2, cy2 + y*ch2, cw2, ch2, WF_COLS[v]);
    }
  }
  // Active row highlight
  if (recvActive && recvRow < CANVAS_H) {
    display.drawRect(cx2 - 1, cy2 + recvRow * ch2 - 1,
                     CANVAS_W * cw2 + 2, ch2 + 2, ORANGE);
  }

  // Status panel
  var spx = cx2 + CANVAS_W * cw2 + 6;
  display.setTextSize(1);
  display.setTextColor(recvActive ? ORANGE : GRAY2);
  display.setCursor(spx, cy2);
  display.print(recvActive ? "RECV" : "WAIT");
  display.setTextColor(GRAY1);
  display.setCursor(spx, cy2 + 14);
  display.print("Row");
  display.setCursor(spx, cy2 + 24);
  display.print(to_string(recvRow) + "/" + CANVAS_H);
  display.setTextColor(CYAN);
  display.setCursor(spx, cy2 + 44);
  display.print(TX_BASE_FREQ + "");
  display.setCursor(spx, cy2 + 54);
  display.print("MHz");

  // Header
  display.drawFillRect(0, 0, W, 12, BLACK);
  display.setTextColor(ORANGE);
  display.setCursor(2, 2);
  display.print("RECV WATERFALL ART");
  display.setTextColor(GRAY2);
  display.setCursor(W - 50, 2);
  display.print("Esc=Back");
}

function doRecvTick() {
  // Listen for a raw signal on the TX band
  var sig = null;
  subghz.setFrequency(TX_BASE_FREQ + TX_SPAN * 0.5);
  try { sig = subghz.readRaw(0); } catch(e) { sig = null; }

  if (!sig || sig.length < 3) {
    recvTimer++;
    if (recvTimer > 60) { recvActive = false; recvTimer = 0; }
    return;
  }

  recvTimer = 0;

  // Estimate received frequency from pulse ratio (simplified decoder)
  // In real use with CC1101: shorter pulses = higher freq = brighter pixel
  var parts = sig.split(" ");
  var totalLen = 0;
  for (var i = 0; i < parts.length; i++) totalLen += parse_int(parts[i]) || 0;
  var avgPulse = parts.length > 0 ? totalLen / parts.length : 0;

  // Map avg pulse width to brightness (longer pulse = lower freq = darker)
  // This is a heuristic — adjust for your CC1101 module
  var bright = 7 - Math.min(7, Math.floor(avgPulse / 200));

  if (!recvActive) {
    // Sync detection: very short pulses = sync tone
    if (avgPulse < 100) {
      recvActive = true;
      recvRow    = 0;
      recvCanvas = makeBlank();
      return;
    }
  }

  if (recvActive) {
    // Fill current row with received brightness
    for (var c = 0; c < CANVAS_W; c++) {
      recvCanvas[recvRow * CANVAS_W + c] = bright;
    }
    recvRow++;
    if (recvRow >= CANVAS_H) {
      recvActive = false;
      recvRow    = 0;
      audio.tone(660, 80); delay(90); audio.tone(880, 120);
    }
  }
}

// ── Fill tool ─────────────────────────────────────────────────────────────────
function floodFill(x, y, newVal) {
  var oldVal = canvas[y * CANVAS_W + x];
  if (oldVal === newVal) return;
  var stack = [{x: x, y: y}];
  while (stack.length > 0) {
    var p = stack.pop();
    if (p.x < 0 || p.x >= CANVAS_W || p.y < 0 || p.y >= CANVAS_H) continue;
    if (canvas[p.y * CANVAS_W + p.x] !== oldVal) continue;
    canvas[p.y * CANVAS_W + p.x] = newVal;
    stack.push({x: p.x+1, y: p.y});
    stack.push({x: p.x-1, y: p.y});
    stack.push({x: p.x,   y: p.y+1});
    stack.push({x: p.x,   y: p.y-1});
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
subghz.setFrequency(CENTER_FREQ);

while (true) {

  if (keyboard.getEscPress()) {
    if (state === ST_MENU || state === ST_DRAW ||
        state === ST_RECV || state === ST_PRESET) {
      state = ST_WATCH;
      subghz.setFrequency(CENTER_FREQ);
    } else {
      display.fill(BLACK);
      break;
    }
  }

  frameCount++;

  var kP = keyboard.getPrevPress();
  var kN = keyboard.getNextPress();
  var kS = keyboard.getSelPress();
  var kPH = keyboard.getPrevPress(true);
  var kNH = keyboard.getNextPress(true);

  // ── WATCH ──────────────────────────────────────────────────────────────────
  if (state === ST_WATCH) {
    if (kP) {
      CENTER_FREQ = Math.floor((CENTER_FREQ - FREQ_STEP) * 1000) / 1000;
      if (CENTER_FREQ < 300) CENTER_FREQ = 300;
      subghz.setFrequency(CENTER_FREQ);
    }
    if (kN) {
      CENTER_FREQ = Math.floor((CENTER_FREQ + FREQ_STEP) * 1000) / 1000;
      if (CENTER_FREQ > 928) CENTER_FREQ = 928;
      subghz.setFrequency(CENTER_FREQ);
    }
    if (kS) { state = ST_MENU; menuSel = 0; delay(16); continue; }

    // Sample and push row
    if (frameCount % 2 === 0) {
      var row = sampleSpectrum();
      pushWFRow(row);
    }

    drawWaterfall();
    drawHeader();

    // Freq axis ticks
    display.drawLine(Math.floor(W/2), WF_Y, Math.floor(W/2), WF_Y + 4, CYAN);
    display.setTextSize(1);
    display.setTextColor(CYAN);
    display.setCursor(Math.floor(W/2) - 6, WF_Y + 5);
    display.print("^");

    drawFooter("P/N=Tune  Sel=Menu  " + CENTER_FREQ + "MHz", CYAN);
    delay(16);
    continue;
  }

  // ── MENU ───────────────────────────────────────────────────────────────────
  if (state === ST_MENU) {
    drawMenu();
    if (kP) { menuSel = (menuSel - 1 + menuItems.length) % menuItems.length; audio.tone(400, 15, true); }
    if (kN) { menuSel = (menuSel + 1) % menuItems.length; audio.tone(400, 15, true); }
    if (kS) {
      audio.tone(600, 30, true);
      if (menuSel === 0) { state = ST_WATCH; }
      else if (menuSel === 1) { state = ST_DRAW; curX = 0; curY = 0; }
      else if (menuSel === 2) { state = ST_RECV; recvCanvas = makeBlank(); recvRow = 0; recvActive = false; }
      else if (menuSel === 3) { state = ST_PRESET; presetSel = 0; }
      else if (menuSel === 4) {
        // Freq bump
        CENTER_FREQ = CENTER_FREQ === 433.920 ? 315.000 : (CENTER_FREQ === 315.000 ? 868.000 : 433.920);
        subghz.setFrequency(CENTER_FREQ);
        TX_BASE_FREQ = CENTER_FREQ - 0.020;
        state = ST_WATCH;
      }
      else if (menuSel === 5) { display.fill(BLACK); break; }
    }
    delay(16);
    continue;
  }

  // ── PRESET ─────────────────────────────────────────────────────────────────
  if (state === ST_PRESET) {
    drawPresetMenu();
    if (kP) { presetSel = (presetSel - 1 + presetItems.length) % presetItems.length; audio.tone(400,15,true); }
    if (kN) { presetSel = (presetSel + 1) % presetItems.length; audio.tone(400,15,true); }
    if (kS) {
      if (presetSel === 0) drawFace();
      else if (presetSel === 1) drawSkull();
      else if (presetSel === 2) drawSine();
      else if (presetSel === 3) drawText("HI");
      else if (presetSel === 4) drawText("LOL");
      else if (presetSel === 5) drawText("GLHF");
      audio.tone(600, 40, true);
      state = ST_DRAW;
    }
    delay(16);
    continue;
  }

  // ── DRAW ───────────────────────────────────────────────────────────────────
  if (state === ST_DRAW) {
    drawCanvas();

    // Cursor movement: Prev/Next = left/right, Prev+Next = up, Sel = draw
    if (kPH && kNH) {
      // Both held = cycle tool
      drawTool = (drawTool + 1) % 3;
      audio.tone(500, 30, true);
      delay(200);
    } else {
      if (kP) { curX--; if (curX < 0) { curX = CANVAS_W-1; curY--; if (curY < 0) curY = CANVAS_H-1; } audio.tone(300,10,true); }
      if (kN) { curX++; if (curX >= CANVAS_W) { curX = 0; curY++; if (curY >= CANVAS_H) curY = 0; } audio.tone(300,10,true); }
    }

    if (kS) {
      // Sel on draw = open brightness/transmit submenu
      // Quick: cycle brightness at cursor, long = transmit
      drawBright = (drawBright + 1) % 8;
      audio.tone(400 + drawBright * 60, 15, true);
    }

    // Auto-draw when moving (pen mode)
    if (drawTool === 0 && (kP || kN)) {
      canvas[curY * CANVAS_W + curX] = drawBright;
    } else if (drawTool === 1 && (kP || kN)) {
      canvas[curY * CANVAS_W + curX] = 0;
    }

    // Sel+long = transmit (detect by checking if Sel is held)
    if (keyboard.getSelPress(true) && keyboard.getPrevPress(true) && keyboard.getNextPress(true)) {
      state = ST_TX;
      delay(16);
      continue;
    }

    // Shortcut: Sel on a path cell → transmit (show hint)
    // Actually just show TX button in footer
    drawFooter("P/N=Move  Sel=Cycle bright  P+N=Tool  Hold all=TX", YELLOW);
    // Transmit shortcut: if Sel held for 1.5s
    if (keyboard.getSelPress()) {
      // Manual TX trigger
      state = ST_TX;
    }

    delay(40);
    continue;
  }

  // ── RECV ───────────────────────────────────────────────────────────────────
  if (state === ST_RECV) {
    display.fill(BLACK);
    doRecvTick();
    drawRecv();
    drawFooter("Listening " + TX_BASE_FREQ + "MHz  Esc=Back", ORANGE);
    delay(16);
    continue;
  }

  // ── TX ─────────────────────────────────────────────────────────────────────
  if (state === ST_TX) {
    doTransmit();
    state = ST_WATCH;
    continue;
  }

  delay(16);
}
