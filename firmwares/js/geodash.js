// GEODASH - Geometry Dash style for LilyGo T-Embed (320x170)
var display = require("display");
var keyboard = require("keyboard");
var audio = require("audio");

var W = display.width();
var H = display.height();

var BLACK = display.color(0,0,0);
var WHITE = display.color(255,255,255);
var YELLOW = display.color(255,220,0);
var RED = display.color(220,50,50);
var CYAN = display.color(0,220,220);
var DARK = display.color(8,12,45);
var GRAY = display.color(70,70,70);

var GROUND_Y = H - 32;
var TILE = 18;
var PLAYER_SIZE = TILE - 2;
var PLAYER_X = Math.floor(W * 0.22);

var playerY = GROUND_Y - PLAYER_SIZE;
var velY = 0;
var onGround = true;
var score = 0;
var speed = 2.2;
var frameCount = 0;
var obstacles = [];
var obstacleTimer = 0;
var gameOver = false;
var gameStarted = false;
var bestScore = 0;

var particles = [];

function resetGame() {
  playerY = GROUND_Y - PLAYER_SIZE;
  velY = 0;
  onGround = true;
  score = 0;
  speed = 2.2;
  frameCount = 0;
  obstacles = [];
  obstacleTimer = 0;
  particles = [];
  gameOver = false;
}

function spawnObstacle() {
  var h = TILE;
  if (random(0,3) === 0) h = TILE + 8;
  obstacles.push({x: W, y: GROUND_Y - h, w: TILE-3, h: h});
}

function drawPlayer() {
  display.drawFillRect(PLAYER_X, playerY, PLAYER_SIZE, PLAYER_SIZE, YELLOW);
  display.drawRect(PLAYER_X, playerY, PLAYER_SIZE, PLAYER_SIZE, WHITE);
  display.drawFillRect(PLAYER_X + 10, playerY + 5, 4, 4, BLACK); // eye
}

function drawSpike(o) {
  var cx = o.x + Math.floor(o.w/2);
  display.drawLine(cx, o.y, o.x, o.y + o.h, RED);
  display.drawLine(cx, o.y, o.x + o.w, o.y + o.h, RED);
  display.drawLine(o.x, o.y + o.h, o.x + o.w, o.y + o.h, WHITE);
}

function drawGround() {
  display.drawFillRect(0, GROUND_Y, W, H - GROUND_Y, GRAY);
  display.drawLine(0, GROUND_Y, W, GROUND_Y, CYAN);
}

while (true) {
  if (keyboard.getEscPress()) break;

  if (!gameStarted) {
    display.fill(DARK);
    var mx = Math.floor(W/2);
    display.setTextAlign("center","middle");
    display.setTextSize(2);
    display.setTextColor(YELLOW);
    display.drawText("GEODASH", mx, Math.floor(H/2)-20);
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.drawText("Any / Sel = Jump", mx, Math.floor(H/2)+8);
    display.setTextAlign("left","top");
    if (keyboard.getAnyPress()) gameStarted = true;
    delay(16);
    continue;
  }

  if (gameOver) {
    display.fill(DARK);
    var mx = Math.floor(W/2);
    display.setTextAlign("center","middle");
    display.setTextSize(2);
    display.setTextColor(RED);
    display.drawText("DEAD", mx, Math.floor(H/2)-16);
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.drawText("Score: " + score, mx, Math.floor(H/2)+6);
    display.setTextAlign("left","top");
    if (keyboard.getAnyPress()) resetGame();
    delay(70);
    continue;
  }

  // Update
  frameCount++;
  if (frameCount % 280 === 0) speed += 0.25;

  if ((keyboard.getSelPress() || keyboard.getNextPress() || keyboard.getAnyPress()) && onGround) {
    velY = -9;
    onGround = false;
    audio.tone(620, 45, true);
  }

  velY += 0.65;
  playerY += velY;

  if (playerY >= GROUND_Y - PLAYER_SIZE) {
    playerY = GROUND_Y - PLAYER_SIZE;
    velY = 0;
    onGround = true;
  }

  obstacleTimer++;
  if (obstacleTimer > 42) {
    spawnObstacle();
    obstacleTimer = 0;
  }

  for (var i = obstacles.length-1; i >= 0; i--) {
    obstacles[i].x -= speed;
    if (obstacles[i].x < -20) {
      obstacles.splice(i,1);
      score++;
    }
  }

  // Collision
  for (var i = 0; i < obstacles.length; i++) {
    var o = obstacles[i];
    if (PLAYER_X + PLAYER_SIZE > o.x && PLAYER_X < o.x + o.w &&
        playerY + PLAYER_SIZE > o.y && playerY < o.y + o.h) {
      gameOver = true;
      if (score > bestScore) bestScore = score;
      audio.tone(280, 120);
      delay(80);
      audio.tone(180, 180);
    }
  }

  // Draw
  display.fill(DARK);
  drawGround();

  for (var i = 0; i < obstacles.length; i++) drawSpike(obstacles[i]);
  drawPlayer();

  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(6, 6);
  display.print(score);

  delay(16);
}