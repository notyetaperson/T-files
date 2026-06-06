var display = require('display');
var keyboard = require('keyboard');
var audio = require('audio');

// Morse Code Generator
// Convert text into morse code with visuals & audio.
//
// MiskaJuro/bruce-apps/morse-code-generator

var tone = audio.tone;

const FREQ = 700;
const CHAR_W = 6;
const SCREEN_W = 240;

var exitApp = false;
var dotSpeed = 120; // default DOT length (ms)

const morseTable = {
  'A': '.-',   'B': '-...', 'C': '-.-.', 'D': '-..',
  'E': '.',    'F': '..-.', 'G': '--.',  'H': '....',
  'I': '..',   'J': '.---', 'K': '-.-',  'L': '.-..',
  'M': '--',   'N': '-.',   'O': '---',  'P': '.--.',
  'Q': '--.-', 'R': '.-.',  'S': '...',  'T': '-',
  'U': '..-',  'V': '...-', 'W': '.--',  'X': '-..-',
  'Y': '-.--', 'Z': '--..',
  '0': '-----','1': '.----','2': '..---','3': '...--',
  '4': '....-','5': '.....','6': '-....','7': '--...',
  '8': '---..','9': '----.'
};

// helper to set exit flag
function exit() {
  exitApp = true;
}

// sleep (allow exit with ESC)
function sleep(ms) {
  var start = Date.now();
  while (Date.now() - start < ms) {
    if (keyboard.getEscPress(true)) {
      exit();
      return true;
    }
  }
  return false;
}

// convert text to morse
function textToMorse(text) {
  text = String(text || '').toUpperCase();
  var out = [];
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (ch === ' ') { out.push('/'); continue; }
    if (ch in morseTable) out.push(morseTable[ch]);
  }
  return out.join(' ');
}

// draws main UI
function draw(symbol, plainText, morse, activeIndex) {
  display.fill(display.color(0, 0, 0));

  display.setTextSize(6);
  display.setTextColor(display.color(65, 248, 245));
  display.setTextAlign('center', 'middle');
  display.drawText(symbol, 120, 30);

  display.setTextSize(2);
  display.setTextColor(display.color(255, 255, 255));
  display.setTextAlign('center', 'top');
  display.drawText(plainText, 120, 60);

  display.setTextSize(1);
  display.setTextAlign('left', 'top');

  var visibleChars = Math.floor(SCREEN_W / CHAR_W);
  var start = 0;
  if (activeIndex > visibleChars - 10) start = activeIndex - (visibleChars - 10);
  if (start < 0) start = 0;

  var visible = morse.substring(start, start + visibleChars);
  var x = (SCREEN_W - visible.length * CHAR_W) / 2;
  var y = 90;

  for (var i = 0; i < visible.length; i++) {
    var globalIndex = start + i;
    var color = (globalIndex === activeIndex) ? display.color(255, 0, 0) : display.color(200, 200, 200);
    display.setTextColor(color);
    display.drawText(visible[i], x, y);
    x += CHAR_W;
  }
}

// play morse
function playMorse(text, DOT) {
  if (exitApp) return true;
  var DASH = DOT * 3;
  var morse = textToMorse(text);
  var index = 0;

  for (var i = 0; i < morse.length; i++) {
    if (exitApp || keyboard.getEscPress(true)) { exit(); return true; }

    var c = morse[i];

    if (c === '.') {
      draw('.', text, morse, index);
      tone(FREQ, DOT);
      if (sleep(DOT)) return true;
    } else if (c === '-') {
      draw('-', text, morse, index);
      tone(FREQ, DASH);
      if (sleep(DASH)) return true;
    } else {
      draw(' ', text, morse, index);
      if (sleep(DOT)) return true;
    }

    index++;
    if (sleep(DOT)) return true;
  }

  return false;
}

// finished screen
function drawFinished() {
  display.fill(display.color(0, 0, 0));
  display.setTextSize(3);
  display.setTextColor(display.color(65, 248, 245));
  display.setTextAlign('center', 'middle');
  display.drawText('Finished', 120, 40);

  display.setTextSize(1);
  display.setTextColor(display.color(225, 168, 106));
  display.setTextAlign('center', 'top');
  display.drawText('SELECT = again', 120, 75);
  display.drawText('POWER = exit', 120, 90);
}

// wait on finished screen for SELECT (continue) or ESC (exit)
function waitForContinueOrExit() {
  for (;;) {
    if (keyboard.getEscPress(true)) { exit(); return true; }
    if (keyboard.getSelPress(true)) return false;

    if (sleep(50)) return true;
  }
}


// MAIN LOOP
while (!exitApp) {
  if (keyboard.getEscPress(true)) break;

  var text = keyboard.keyboard('', 99, 'Enter text');
  if (keyboard.getEscPress(true)) break;

  var speedStr = keyboard.keyboard(String(dotSpeed), 6, 'DOT speed ms');
  if (keyboard.getEscPress(true)) break;

  var DOT = parseInt(speedStr, 10);
  if (!DOT) DOT = dotSpeed;
  dotSpeed = DOT;

  if (playMorse(text, DOT)) break;
  if (exitApp) break;

  drawFinished();
  if (waitForContinueOrExit()) break
}

display.fill(display.color(0, 0, 0));
