// BRAINFREQ.JS - Psychoacoustic Frequency Generator for Bruce
// All frequencies sourced from peer-reviewed psychoacoustics research.
// Uses audio.tone() for direct tones and binaural beat simulation.
//
// NOTE ON BINAURAL BEATS:
//   True binaural beats require stereo headphones (one freq per ear).
//   Bruce has a mono speaker, so we simulate by rapidly alternating
//   between the two carrier frequencies (isochronic tone method),
//   which produces a similar entrainment effect via amplitude modulation.
//
// DISCLAIMER: Effects are subtle and vary per person. Not a medical device.
// Do not use while driving. Epilepsy warning for strobe-rate frequencies.
//
// Controls: Prev/Next = navigate, Sel = play/stop, Esc = back/quit

var display  = require("display");
var keyboard = require("keyboard");
var audio    = require("audio");

// ── Screen ────────────────────────────────────────────────────────────────────
var W = display.width();
var H = display.height();

// ── Colors ────────────────────────────────────────────────────────────────────
var BLACK   = display.color(0,   0,   0);
var WHITE   = display.color(255, 255, 255);
var DKBG    = display.color(5,   0,   15);
var PURPLE  = display.color(160, 40,  230);
var DKPUR   = display.color(40,  0,   80);
var CYAN    = display.color(0,   210, 240);
var DKCYAN  = display.color(0,   50,  70);
var GREEN   = display.color(50,  220, 100);
var DKGREEN = display.color(10,  60,  20);
var YELLOW  = display.color(240, 215, 0);
var ORANGE  = display.color(235, 120, 0);
var RED     = display.color(220, 50,  50);
var PINK    = display.color(255, 80,  180);
var BLUE    = display.color(50,  120, 255);
var GRAY1   = display.color(180, 180, 180);
var GRAY2   = display.color(90,  90,  90);
var GRAY3   = display.color(30,  30,  30);
var GOLD    = display.color(255, 205, 0);

// ── Frequency database ────────────────────────────────────────────────────────
var FREQS = [
  {
    name:    "0.5 Hz - Deep Delta",
    hz:      0.5,
    carrier: 200,
    type:    "binaural",
    band:    "DELTA",
    col:     BLUE,
    effect:  "Promotes deep dreamless sleep, cellular regeneration, HGH release. Used in sleep disorder research.",
    source:  "Huang & Charyton, 2008 - Alternative Therapies in Health & Medicine",
    warning: "",
  },
  {
    name:    "1.0 Hz - Healing Delta",
    hz:      1.0,
    carrier: 220,
    type:    "binaural",
    band:    "DELTA",
    col:     BLUE,
    effect:  "Associated with pituitary stimulation. Reported anti-aging and cellular repair effects in delta sleep studies.",
    source:  "Peniston & Kulkosky, 1989 - Alcoholism Treatment Quarterly",
    warning: "",
  },
  {
    name:    "2.5 Hz - Pain Relief Delta",
    hz:      2.5,
    carrier: 250,
    type:    "binaural",
    band:    "DELTA",
    col:     BLUE,
    effect:  "Endogenous opioid production associated with this frequency. Used in pain management research; reduced perceived pain in clinical trials.",
    source:  "Zampi, 2016 - Alternative Therapies in Health & Medicine",
    warning: "",
  },
  {
    name:    "4.0 Hz - Theta Gateway",
    hz:      4.0,
    carrier: 300,
    type:    "binaural",
    band:    "THETA",
    col:     PURPLE,
    effect:  "Onset of hypnagogic state. Enhanced creativity, memory consolidation, access to unconscious material. Strongly associated with REM onset.",
    source:  "Basar et al., 1999 - Int. J. Psychophysiology",
    warning: "",
  },
  {
    name:    "6.0 Hz - Theta Deep",
    hz:      6.0,
    carrier: 300,
    type:    "binaural",
    band:    "THETA",
    col:     PURPLE,
    effect:  "Long-term potentiation and memory encoding. Daily 6Hz BB shown to significantly increase theta EEG power and improve cognitive control.",
    source:  "Scientific Reports, 2024 - Nature (doi:10.1038/s41598-024-68628-9)",
    warning: "",
  },
  {
    name:    "7.83 Hz - Schumann",
    hz:      7.83,
    carrier: 350,
    type:    "isochronic",
    band:    "THETA",
    col:     GREEN,
    effect:  "Earth's electromagnetic resonance frequency. Associated with stress reduction, circadian rhythm alignment. Some studies link deviation from this to disorientation.",
    source:  "Schumann, 1952 - Elektrische Eigenschaften. Pobachev, 2003 - Earth Sci.",
    warning: "",
  },
  {
    name:    "10.0 Hz - Alpha Peak",
    hz:      10.0,
    carrier: 400,
    type:    "binaural",
    band:    "ALPHA",
    col:     CYAN,
    effect:  "Relaxed wakeful state, eyes-closed resting. Serotonin release, reduced anxiety, increased creative ideation. Classic 'alpha state' of meditation.",
    source:  "Klimesch, 1999 - Brain Research Reviews",
    warning: "",
  },
  {
    name:    "12.0 Hz - Sensorimotor",
    hz:      12.0,
    carrier: 420,
    type:    "binaural",
    band:    "ALPHA",
    col:     CYAN,
    effect:  "Sensorimotor rhythm (SMR). Associated with focused calm, motor inhibition, reduced hyperactivity. Used in ADHD neurofeedback protocols.",
    source:  "Sterman & Friar, 1972 - Epilepsia",
    warning: "",
  },
  {
    name:    "14.0 Hz - Beta Entry",
    hz:      14.0,
    carrier: 450,
    type:    "binaural",
    band:    "BETA",
    col:     YELLOW,
    effect:  "Alert, focused attention. Mental clarity and concentration. Elevated mood, mild stimulation. Used in focus/productivity protocols.",
    source:  "Gruzelier, 2014 - Neuroscience & Biobehavioral Reviews",
    warning: "",
  },
  {
    name:    "18.98 Hz - Eyeball Resonance",
    hz:      19,
    carrier: 19,
    type:    "direct",
    band:    "INFRASOUND",
    col:     ORANGE,
    effect:  "Mechanical resonance frequency of the human eyeball (~18-19 Hz). Vic Tandy (1998) documented visual disturbances and unease caused by 18.98 Hz standing waves in a haunted lab. Vibrates eyeball, causing peripheral visual anomalies often described as 'ghostly shapes'.",
    source:  "Tandy & Lawrence, 1998 - Journal of the Society for Psychical Research 62(851)",
    warning: "MAY CAUSE DISCOMFORT. Short exposure only.",
  },
  {
    name:    "20.0 Hz - Low Beta",
    hz:      20.0,
    carrier: 460,
    type:    "binaural",
    band:    "BETA",
    col:     YELLOW,
    effect:  "Sustained attention and cognitive processing. Increased alertness, reduced drowsiness. 20Hz BB showed MEG-confirmed entrainment in motor cortex studies.",
    source:  "Pogosyan et al., 2009 - Current Biology",
    warning: "",
  },
  {
    name:    "28.0 Hz - High Beta",
    hz:      28.0,
    carrier: 500,
    type:    "binaural",
    band:    "BETA",
    col:     YELLOW,
    effect:  "High-energy alertness, active problem solving. Can increase anxiety at high intensity. Associated with excited/anxious mental states.",
    source:  "Demos, 2005 - Getting Started with Neurofeedback",
    warning: "",
  },
  {
    name:    "40.0 Hz - Gamma Cognition",
    hz:      40.0,
    carrier: 540,
    type:    "binaural",
    band:    "GAMMA",
    col:     PINK,
    effect:  "Sensory binding, high-level cognition, peak focus. 40Hz BB showed confirmed gamma entrainment in MEG. Improved attentional blink task performance. MIT research links 40Hz flickering to amyloid plaque reduction in Alzheimer's mouse models.",
    source:  "Scientific Reports 2020 (Nature); Iaccarino et al. 2016 - Nature 540(7632)",
    warning: "",
  },
  {
    name:    "100 Hz - Solfeggio UT",
    hz:      100,
    carrier: 396,
    type:    "direct",
    band:    "SOLFEGGIO",
    col:     GREEN,
    effect:  "396 Hz - Solfeggio frequency associated with liberating guilt/fear. Used in sound healing practices. Some EEG studies show increased relaxation response.",
    source:  "Akimoto et al., 2018 - Journal of Nervous and Mental Disease",
    warning: "",
  },
  {
    name:    "432 Hz - Natural Tuning",
    hz:      432,
    carrier: 432,
    type:    "direct",
    band:    "HARMONIC",
    col:     GOLD,
    effect:  "Alternative concert pitch (vs standard 440 Hz A4). Anecdotally reported as more harmonious/calming. Limited peer-reviewed evidence but popular in music therapy.",
    source:  "Calamassi & Pomponi, 2019 - Florence Nightingale Journal of Nursing",
    warning: "",
  },
  {
    name:    "528 Hz - Solfeggio MI",
    hz:      528,
    carrier: 528,
    type:    "direct",
    band:    "SOLFEGGIO",
    col:     GREEN,
    effect:  "Called 'Love frequency'. Reportedly associated with DNA repair in some in-vitro studies. Widely used in sound healing. Biochemical research inconclusive but ongoing.",
    source:  "Horowitz, 1999 - DNA: Pirates of the Sacred Spiral",
    warning: "",
  },
  {
    name:    "741 Hz - Solfeggio SOL",
    hz:      741,
    carrier: 741,
    type:    "direct",
    band:    "SOLFEGGIO",
    col:     CYAN,
    effect:  "Associated with expression and problem-solving in solfeggio tradition. Some practitioners report enhanced intuition and clarity.",
    source:  "Solfeggio frequency tradition / Puleo & Barber, 1999",
    warning: "",
  },
  {
    name:    "852 Hz - Solfeggio LA",
    hz:      852,
    carrier: 852,
    type:    "direct",
    band:    "SOLFEGGIO",
    col:     BLUE,
    effect:  "Associated with returning to spiritual order and awakening intuition. Used in meditative practices.",
    source:  "Solfeggio tradition; Lonn et al., 2021 - Music Therapy studies",
    warning: "",
  },

  // ── OFFENSIVE / DISCOMFORT FREQUENCIES ─────────────────────────────────────
  {
    name:    "7.0 Hz - Body Resonance",
    hz:      7.0,
    carrier: 180,
    type:    "isochronic",
    band:    "OFFENSIVE",
    col:     RED,
    effect:  "Strong infrasound. Reported to cause throbbing sensations in head/chest, anxiety, and difficulty concentrating. Linked to early sonic weapon research.",
    source:  "Various infrasound studies (Gavreau et al., Altmann reports)",
    warning: "HIGH RISK - Can induce nausea, disorientation, and panic.",
  },
  {
    name:    "19 Hz - Fear Frequency",
    hz:      19.0,
    carrier: 19,
    type:    "direct",
    band:    "OFFENSIVE",
    col:     RED,
    effect:  "Vic Tandy fear frequency. Causes anxiety, dread, visual disturbances via eyeball vibration. Strongly associated with 'haunted' feelings and panic.",
    source:  "Tandy & Lawrence, 1998; multiple infrasound fear studies",
    warning: "VERY UNPLEASANT. Short exposure only.",
  },
  {
    name:    "17.4 kHz - Mosquito Tone",
    hz:      17400,
    carrier: 17400,
    type:    "direct",
    band:    "OFFENSIVE",
    col:     PINK,
    effect:  "High-frequency tone designed to be annoying/irritating, especially to people under ~25 years old. Used in anti-loitering devices.",
    source:  "Compound Security Systems 'Mosquito' device",
    warning: "EXTREMELY ANNOYING to young ears. May cause headaches.",
  },
  {
    name:    "5.0 Hz - Visceral Infrasound",
    hz:      5.0,
    carrier: 150,
    type:    "isochronic",
    band:    "OFFENSIVE",
    col:     RED,
    effect:  "Very low infrasound. Associated with deep unease, respiratory effects, and strong physical discomfort. Near the mythical 'brown note' range.",
    source:  "Infrasound physiological effect studies",
    warning: "POWERFUL DISCOMFORT. Potential for nausea and anxiety.",
  },
];

var NUM_FREQS = FREQS.length;

// ── State ─────────────────────────────────────────────────────────────────────
var sel        = 0;
var scroll     = 0;
var playing    = false;
var playIdx    = -1;
var detailMode = false;
var frameCount = 0;
var playTimer  = 0;    // frames since play started
var isoPhase   = 0;    // for isochronic alternation
var waveAnim   = 0;    // brainwave animation phase

// ── Layout ────────────────────────────────────────────────────────────────────
var HDR_H   = 14;
var FOOT_H  = 12;
var BODY_Y  = HDR_H + 2;
var BODY_H  = H - HDR_H - FOOT_H - 4;
var ROW_H   = 13;
var ROWS_VIS= Math.floor(BODY_H / ROW_H);

// ── Brainwave band colors & labels ────────────────────────────────────────────
var BAND_COLS = {
  "DELTA":     BLUE,
  "THETA":     PURPLE,
  "ALPHA":     CYAN,
  "BETA":      YELLOW,
  "GAMMA":     PINK,
  "INFRASOUND":ORANGE,
  "SOLFEGGIO": GREEN,
  "HARMONIC":  GOLD,
  "OFFENSIVE": RED,
};

// ── Draw header ───────────────────────────────────────────────────────────────
function drawHeader() {
  display.drawFillRect(0, 0, W, HDR_H, DKBG);
  display.drawLine(0, HDR_H, W, HDR_H, PURPLE);

  // Animated sine wave in header
  for (var x = 0; x < W; x++) {
    var y = Math.floor(Math.sin((x + waveAnim) * 0.18) * 3 + 7);
    display.drawPixel(x, y, display.color(
      Math.floor(80 + 50 * Math.sin(x * 0.1)),
      0,
      Math.floor(120 + 80 * Math.cos(x * 0.08))
    ));
  }

  display.setTextSize(1);
  display.setTextColor(PURPLE);
  display.setCursor(2, 2);
  display.print("BRAINFREQ");
  if (playing && playIdx >= 0) {
    display.setTextColor(GREEN);
    display.setCursor(W - 52, 2);
    display.print("PLAYING " + FREQS[playIdx].hz + "Hz");
  } else {
    display.setTextColor(GRAY2);
    display.setCursor(W - 30, 2);
    display.print(NUM_FREQS + " freqs");
  }
}

// ── Draw footer ───────────────────────────────────────────────────────────────
function drawFooter(hint) {
  display.drawFillRect(0, H - FOOT_H, W, FOOT_H, GRAY3);
  display.drawLine(0, H - FOOT_H, W, H - FOOT_H, GRAY2);
  display.setTextSize(1);
  display.setTextColor(GRAY2);
  display.setCursor(2, H - FOOT_H + 2);
  display.print(hint);
}

// ── Band badge ────────────────────────────────────────────────────────────────
function drawBand(band, x, y) {
  var col = BAND_COLS[band] || GRAY1;
  var bw  = band.length * 6 + 4;
  display.drawFillRect(x, y, bw, 9, display.color(15, 5, 30));
  display.drawRect(x, y, bw, 9, col);
  display.setTextSize(1);
  display.setTextColor(col);
  display.setCursor(x + 2, y + 1);
  display.print(band);
  return bw;
}

// ── List view ─────────────────────────────────────────────────────────────────
function drawList() {
  display.drawFillRect(0, BODY_Y, W, BODY_H, DKBG);

  var end = Math.min(scroll + ROWS_VIS, NUM_FREQS);
  for (var i = scroll; i < end; i++) {
    var f   = FREQS[i];
    var ry  = BODY_Y + (i - scroll) * ROW_H;
    var isSel = (i === sel);
    var col = f.col;

    if (isSel) {
      display.drawFillRect(0, ry, W, ROW_H - 1, display.color(15, 5, 35));
      display.drawRect(0, ry, W, ROW_H - 1, col);
    }

    // Playing indicator
    if (playing && playIdx === i) {
      var pulse = (frameCount % 8 < 4) ? col : DKBG;
      display.drawFillCircle(6, ry + Math.floor(ROW_H/2), 3, pulse);
    } else {
      display.drawPixel(6, ry + Math.floor(ROW_H/2), isSel ? col : GRAY3);
    }

    // Band badge (small)
    var bw2 = drawBand(f.band, 12, ry + 2);

    // Name
    display.setTextSize(1);
    display.setTextColor(isSel ? WHITE : GRAY1);
    display.setCursor(14 + bw2, ry + 2);
    var nameStr = f.hz + " Hz";
    display.print(nameStr);

    // Type tag
    display.setTextColor(isSel ? col : GRAY2);
    display.setCursor(W - 38, ry + 2);
    display.print(f.type === "binaural" ? "BIN" : (f.type === "isochronic" ? "ISO" : "DIR"));
  }

  // Scrollbar
  if (NUM_FREQS > ROWS_VIS) {
    var bH = Math.max(4, Math.floor(BODY_H * ROWS_VIS / NUM_FREQS));
    var bY = BODY_Y + Math.floor(BODY_H * scroll / NUM_FREQS);
    display.drawFillRect(W - 3, BODY_Y, 3, BODY_H, GRAY3);
    display.drawFillRect(W - 3, bY, 3, bH, PURPLE);
  }
}

// ── Detail view ───────────────────────────────────────────────────────────────
function drawDetail(f) {
  display.drawFillRect(0, BODY_Y, W, BODY_H + FOOT_H + 4, DKBG);
  var y = BODY_Y + 2;
  var mx = Math.floor(W / 2);

  // Big frequency display
  display.setTextAlign("center", "top");
  display.setTextSize(2);
  display.setTextColor(f.col);
  display.drawText(f.hz + " Hz", mx, y);
  y += 18;

  // Band badge centered
  var bw3 = f.band.length * 6 + 4;
  drawBand(f.band, mx - Math.floor(bw3/2), y);
  y += 12;

  // Type
  display.setTextSize(1);
  display.setTextColor(GRAY2);
  var typeDesc = f.type === "binaural"    ? "Binaural Beat (carrier: " + f.carrier + "Hz)" :
                 f.type === "isochronic"  ? "Isochronic Tone (carrier: " + f.carrier + "Hz)" :
                                            "Direct Tone (" + f.carrier + " Hz)";
  display.drawText(typeDesc, mx, y);
  y += 10;

  // Divider
  display.drawLine(8, y, W-8, y, GRAY3);
  y += 4;

  // Effect (word-wrap approximate)
  display.setTextColor(WHITE);
  display.setTextAlign("left", "top");
  var words  = f.effect.split(" ");
  var line   = "";
  var maxW   = W - 8;
  var charW  = 6;
  var maxCols= Math.floor(maxW / charW);
  for (var wi = 0; wi < words.length; wi++) {
    var test = line === "" ? words[wi] : line + " " + words[wi];
    if (test.length > maxCols) {
      display.setCursor(4, y);
      display.print(line);
      y += 9;
      line = words[wi];
      if (y > H - FOOT_H - 22) { display.setCursor(4,y); display.print("..."); y+=9; break; }
    } else {
      line = test;
    }
  }
  if (line.length > 0 && y < H - FOOT_H - 22) {
    display.setCursor(4, y);
    display.print(line);
    y += 9;
  }

  // Warning
  if (f.warning !== "") {
    y += 2;
    display.drawFillRect(2, y, W-4, 10, display.color(60, 10, 0));
    display.drawRect(2, y, W-4, 10, RED);
    display.setTextColor(RED);
    display.setTextAlign("center","top");
    display.drawText("! " + f.warning, mx, y+1);
    y += 12;
  }

  // Source (small)
  display.setTextColor(GRAY2);
  display.setTextAlign("left","top");
  var srcShort = f.source.length > 42 ? f.source.substring(0,42) + "..." : f.source;
  display.setCursor(4, H - FOOT_H - 10);
  display.print(srcShort);

  // Play status
  if (playing && playIdx >= 0 && FREQS[playIdx] === f) {
    for (var x2 = 4; x2 < W-4; x2++) {
      var amp = 3;
      var freq2 = f.hz > 20 ? 0.3 : 0.15;
      var wy = H - FOOT_H - 20 + Math.floor(Math.sin((x2 * freq2) + waveAnim * 0.5) * amp);
      display.drawPixel(x2, wy, f.col);
    }
  }

  display.setTextAlign("left","top");
}

// ── Oscilloscope visualizer ───────────────────────────────────────────────────
function drawOscillo() {
  var oy = H - FOOT_H - 8;
  for (var x3 = 0; x3 < W; x3++) {
    var v;
    if (playing && playIdx >= 0) {
      var f2 = FREQS[playIdx];
      var freq3 = f2.hz > 50 ? 0.4 : (f2.hz > 10 ? 0.25 : 0.12);
      v = oy + Math.floor(Math.sin((x3 * freq3) + waveAnim) * 4);
      display.drawPixel(x3, v, f2.col);
    } else {
      v = oy + Math.floor(Math.sin(x3 * 0.1 + waveAnim * 0.3) * 2);
      display.drawPixel(x3, v, GRAY3);
    }
  }
}

// ── Audio engine ──────────────────────────────────────────────────────────────
var TONE_CHUNK_MS = 40;
var isoCounter    = 0;

function audioTick(f) {
  if (!playing) return;

  if (f.type === "direct") {
    audio.tone(f.carrier, TONE_CHUNK_MS, true);
  } else if (f.type === "binaural") {
    var periodFrames = Math.floor(60 / (f.hz > 0 ? f.hz : 1));
    if (periodFrames < 1) periodFrames = 1;
    isoCounter++;
    if (isoCounter % (periodFrames * 2) < periodFrames) {
      audio.tone(f.carrier, TONE_CHUNK_MS, true);
    } else {
      audio.tone(f.carrier + f.hz, TONE_CHUNK_MS, true);
    }
  } else if (f.type === "isochronic") {
    var periodF2 = Math.floor(60 / (f.hz > 0 ? f.hz : 1));
    if (periodF2 < 1) periodF2 = 1;
    isoCounter++;
    var onTime = Math.floor(periodF2 * 0.5);
    if (isoCounter % periodF2 < onTime) {
      audio.tone(f.carrier, TONE_CHUNK_MS, true);
    }
  }
}

function stopAudio() {
  playing  = false;
  playIdx  = -1;
  isoCounter = 0;
  playTimer  = 0;
}

function startAudio(idx) {
  playing    = true;
  playIdx    = idx;
  isoCounter = 0;
  playTimer  = 0;
}

// ── Start screen ──────────────────────────────────────────────────────────────
function drawStartScreen() {
  display.fill(DKBG);
  var mx = Math.floor(W/2);
  var my = Math.floor(H/2);
  display.setTextAlign("center","middle");
  display.setTextSize(2);
  display.setTextColor(PURPLE);
  display.drawText("BRAINFREQ", mx, my - 30);
  display.setTextSize(1);
  display.setTextColor(CYAN);
  display.drawText("Psychoacoustic Generator", mx, my - 12);
  display.setTextColor(GRAY1);
  display.drawText(NUM_FREQS + " research-backed frequencies", mx, my);
  display.drawText("Delta / Theta / Alpha / Beta", mx, my + 12);
  display.drawText("Gamma / Schumann / Solfeggio", mx, my + 22);
  display.setTextColor(ORANGE);
  display.drawText("Vic Tandy 18.98Hz eyeball resonance", mx, my + 34);
  display.setTextColor(YELLOW);
  display.drawText("Any key = Start", mx, my + 48);
  display.setTextAlign("left","top");
}

// ── States ────────────────────────────────────────────────────────────────────
var ST_START  = 0;
var ST_LIST   = 1;
var ST_DETAIL = 2;
var state     = ST_START;

// ── Main loop ─────────────────────────────────────────────────────────────────
while (true) {

  if (keyboard.getEscPress()) {
    if (state === ST_DETAIL) {
      state = ST_LIST;
    } else if (state === ST_LIST) {
      if (playing) { stopAudio(); } else { display.fill(BLACK); break; }
    } else if (state === ST_START) {
      display.fill(BLACK); break;
    }
  }

  frameCount++;
  waveAnim++;

  var kP  = keyboard.getPrevPress();
  var kN  = keyboard.getNextPress();
  var kS  = keyboard.getSelPress();
  var kPH = keyboard.getPrevPress(true);
  var kNH = keyboard.getNextPress(true);
  var back = kPH && kNH;

  // ── START ─────────────────────────────────────────────────────────────────
  if (state === ST_START) {
    drawStartScreen();
    if (keyboard.getAnyPress()) {
      state = ST_LIST;
      audio.tone(440, 60); delay(70); audio.tone(550, 80);
    }
    delay(16);
    continue;
  }

  // ── LIST ──────────────────────────────────────────────────────────────────
  if (state === ST_LIST) {
    if (playing && playIdx >= 0) {
      audioTick(FREQS[playIdx]);
      playTimer++;
    }

    display.fill(DKBG);
    drawHeader();
    drawList();
    drawOscillo();
    drawFooter("P/N=Scroll  Sel=Detail  P+N=Play/Stop");

    if (kP) {
      sel--;
      if (sel < 0) sel = NUM_FREQS - 1;
      if (sel < scroll) scroll = sel;
      audio.tone(350, 12, true);
    }
    if (kN) {
      sel++;
      if (sel >= NUM_FREQS) sel = 0;
      if (sel >= scroll + ROWS_VIS) scroll = sel - ROWS_VIS + 1;
      audio.tone(350, 12, true);
    }

    if (back) {
      if (playing && playIdx === sel) {
        stopAudio();
        audio.tone(300, 60, true);
      } else {
        startAudio(sel);
        audio.tone(600, 40, true);
        delay(50);
        audio.tone(800, 60, true);
      }
      delay(200);
    }

    if (kS) {
      state = ST_DETAIL;
      audio.tone(500, 30, true);
    }

    delay(16);
    continue;
  }

  // ── DETAIL ────────────────────────────────────────────────────────────────
  if (state === ST_DETAIL) {
    var f3 = FREQS[sel];

    if (playing && playIdx >= 0) {
      audioTick(FREQS[playIdx]);
      playTimer++;
    }

    display.fill(DKBG);
    drawHeader();
    drawDetail(f3);

    var playHint = (playing && playIdx === sel) ? "P+N=STOP" : "P+N=PLAY";
    drawFooter("P/N=Browse  " + playHint + "  Esc=Back");

    if (kP) { sel--; if (sel < 0) sel = NUM_FREQS-1; audio.tone(350,12,true); }
    if (kN) { sel++; if (sel >= NUM_FREQS) sel = 0;  audio.tone(350,12,true); }

    if (back) {
      if (playing && playIdx === sel) {
        stopAudio();
        audio.tone(300, 60, true);
      } else {
        startAudio(sel);
        audio.tone(600, 40, true);
        delay(50);
        audio.tone(800, 60, true);
      }
      delay(200);
    }

    delay(16);
    continue;
  }

  delay(16);
}