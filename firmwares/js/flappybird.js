var display = require('display');
var keyboard = require('keyboard');
var audio = require('audio');

function main() {
  // --- SPRITES ---
  var birdWidth = 16, birdHeight = 12;
  var birdSprite = [
    new Uint8Array([0x00, 0x00, 0xe0, 0x07, 0x10, 0x08, 0x28, 0x10, 0x44, 0x10, 0x44, 0x20, 0x44, 0x20, 0x7c, 0x3f, 0x44, 0x20, 0x44, 0x20, 0x28, 0x10, 0x10, 0x08]),
    new Uint8Array([0x00, 0x00, 0xe0, 0x07, 0x10, 0x08, 0x28, 0x10, 0x44, 0x10, 0x44, 0x20, 0x44, 0x20, 0x7c, 0x3f, 0x44, 0x20, 0x44, 0x20, 0xf0, 0x0f, 0x00, 0x00])
  ];
  var cloudSprite = new Uint8Array([0x00, 0x00, 0x00, 0x1e, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x73, 0x00, 0x00, 0x00, 0x00, 0x18, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x80, 0x00, 0x00, 0x00, 0x00, 0x02, 0x80, 0x07, 0x00, 0x00, 0x00, 0x02, 0x80, 0xfc, 0x00, 0x00, 0xc0, 0x03, 0x40, 0x80, 0x00, 0x00, 0x60, 0x00, 0x00, 0x80, 0x07, 0xc0, 0x3f, 0x00, 0x00, 0x00, 0x04, 0x60, 0x00, 0x00, 0x00, 0x00, 0x1c, 0x20, 0x00, 0x00, 0x00, 0x00, 0x10, 0x36, 0x02, 0x00, 0x00, 0x00, 0x20, 0x03, 0xfc, 0xff, 0xff, 0xff, 0x3f]);

  // --- COLORS & DISPLAY ---
  var black = display.color(0, 0, 0);
  var white = display.color(255, 255, 255);
  var birdColor = display.color(255, 200, 0); // Define here to prevent start error
  var displayWidth = display.width();
  var displayHeight = display.height();
  var sprite = display.createSprite();
  
  // --- STATE ---
  var birdY = 60, birdVelocity = 0, gravity = 700, flapStrength = -250;
  var pipeX = 300, pipeWidth = 40, pipeGap = 70, pipeGapY = 50;
  var score = 0, oldTime = now();
  var clouds = [{x: random(200, 300), y: 20}, {x: random(400, 500), y: 40}];

  keyboard.setLongPress(true);

  while (true) {
    if (keyboard.getPrevPress(true)) break;

    var nowTime = now();
    var deltaTime = (nowTime - oldTime) / 1000;
    oldTime = nowTime;

    // --- DAY/NIGHT CYCLE ---
    var isNight = (Math.floor(score / 500) % 2 === 1);
    var skyColor = isNight ? display.color(20, 24, 82) : display.color(113, 197, 207);
    var pipeColor = isNight ? display.color(0, 100, 0) : display.color(0, 200, 0);

    // --- INPUT ---
    if (keyboard.getSelPress(true)) {
      birdVelocity = flapStrength;
      audio.tone(500, 30, true);
    }

    // --- PHYSICS ---
    birdVelocity += gravity * deltaTime;
    birdY += birdVelocity * deltaTime;
    pipeX -= (160 + (score * 5)) * deltaTime;

    if (pipeX < -pipeWidth) {
      pipeX = displayWidth;
      pipeGapY = random(25, 75);
      score++;
      audio.tone(880, 40, true);
    }

    // --- CLOUDS ---
    for (var i = 0; i < 2; i++) {
      clouds[i].x -= 50 * deltaTime;
      if (clouds[i].x < -46) { clouds[i].x = displayWidth + 20; clouds[i].y = random(10, 50); }
    }

    // --- COLLISION ---
    var isDead = false;
    if (birdY > 155 || birdY < -5) isDead = true;
    if (10 + birdWidth > pipeX && 10 < pipeX + pipeWidth) {
      if (birdY < pipeGapY || birdY + birdHeight > pipeGapY + pipeGap) isDead = true;
    }

    if (isDead) {
      audio.tone(100, 200);
      display.fill(black);
      display.setTextColor(white); // Fixed Visibility
      display.setTextSize(3);
      display.drawText('GAME OVER', 50, 40);
      display.setTextSize(2);
      display.drawText('SCORE: ' + score, 85, 90);
      delay(1000);
      while (!keyboard.getAnyPress()) { delay(10); }
      // Reset State
      birdY = 60; birdVelocity = 0; pipeX = displayWidth; score = 0; oldTime = now();
      continue;
    }

    // --- DRAWING ---
    sprite.fill(skyColor);
    for (var i = 0; i < 2; i++) {
      sprite.drawXBitmap(Math.floor(clouds[i].x), clouds[i].y, cloudSprite, 46, 13, display.color(200, 200, 200));
    }
    sprite.drawFillRect(pipeX, 0, pipeWidth, pipeGapY, pipeColor);
    sprite.drawFillRect(pipeX, pipeGapY + pipeGap, pipeWidth, displayHeight, pipeColor);
    sprite.drawFillRect(0, 160, displayWidth, 10, display.color(222, 184, 135));

    var animFrame = Math.floor((nowTime % 300) / 150);
    sprite.drawXBitmap(10, Math.floor(birdY), birdSprite[animFrame], birdWidth, birdHeight, birdColor);

    sprite.setTextColor(white);
    sprite.setTextSize(2); 
    sprite.drawText(score, 15, 10);
    
    sprite.pushSprite();
    delay(10);
  }
}

main();