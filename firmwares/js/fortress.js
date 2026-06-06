// FORTRESS.JS - Tower Defense for Bruce JS
// Prev=Left/Select, Next=Right/Confirm, Sel=Action, Esc=Back/Quit
//
// HOW TO PLAY:
//   On the build menu: Prev/Next = cycle tower type, Sel = place on highlighted cell
//   During wave: Sel = open shop/pause, Esc = quit
//   Towers cost gold. Earn gold by killing enemies.
//   Survive all waves including the BOSS wave to win!

var display  = require("display");
var keyboard = require("keyboard");
var audio    = require("audio");

// ── Screen ────────────────────────────────────────────────────────────────────
var W  = display.width();
var H  = display.height();

// ── Colors ────────────────────────────────────────────────────────────────────
var BLACK   = display.color(0,0,0);
var WHITE   = display.color(255,255,255);
var RED     = display.color(220,40,40);
var DKRED   = display.color(120,0,0);
var GREEN   = display.color(40,200,60);
var DKGREEN = display.color(20,80,20);
var BLUE    = display.color(50,130,255);
var CYAN    = display.color(0,210,220);
var YELLOW  = display.color(230,200,0);
var ORANGE  = display.color(230,110,0);
var PURPLE  = display.color(160,40,220);
var GRAY1   = display.color(180,180,180);
var GRAY2   = display.color(100,100,100);
var GRAY3   = display.color(50,50,50);
var BROWN   = display.color(130,80,30);
var DKBROWN = display.color(70,40,10);
var PATH_C  = display.color(180,150,90);
var GRASS_C = display.color(30,90,30);
var GOLD_C  = display.color(255,210,0);
var PINK    = display.color(255,100,180);

// ── Grid layout ───────────────────────────────────────────────────────────────
// Grid area: top portion. HUD: bottom strip.
var HUD_H   = Math.max(18, Math.floor(H * 0.22));
var GRID_H  = H - HUD_H;
var CELL    = Math.max(8, Math.floor(Math.min(W, GRID_H) / 10));
var COLS    = Math.floor(W / CELL);
var ROWS    = Math.floor(GRID_H / CELL);
var GRID_OX = Math.floor((W - COLS * CELL) / 2);
var GRID_OY = 0;

// ── Tower types ───────────────────────────────────────────────────────────────
// id, name, cost, range(cells), damage, fireRate(frames), color, symbol
var TOWER_TYPES = [
  { id:0, name:"Arrow",  cost:15, range:2.5, dmg:1, rate:30, col:BROWN,  sym:"A" },
  { id:1, name:"Canon",  cost:30, range:2.0, dmg:3, rate:55, col:GRAY2,  sym:"C" },
  { id:2, name:"Ice",    cost:25, range:2.2, dmg:1, rate:40, col:CYAN,   sym:"I", slow:true },
  { id:3, name:"Flame",  cost:35, range:1.8, dmg:2, rate:20, col:ORANGE, sym:"F", splash:true },
  { id:4, name:"Zap",    cost:50, range:3.0, dmg:4, rate:70, col:YELLOW, sym:"Z" },
];

// ── Story lines ───────────────────────────────────────────────────────────────
var STORY = [
  "Year 2147. The demon horde\napproaches your fortress.",
  "Wave 1: Scouts ahead!\nBuild your defenses!",
  "Wave 2: They brought\narmored crawlers!",
  "Wave 3: A shaman joins\nthe horde. Watch out!",
  "Wave 4: The horde grows\nbolder. Hold the line!",
  "BOSS WAVE: The DEMON LORD\nitself marches forward!!",
  "VICTORY! The demon lord\nhas fallen. You win!",
];

// ── Game state ────────────────────────────────────────────────────────────────
var gold, lives, wave, score;
var towers, enemies, bullets, particles;
var path;           // array of {x,y} grid coords
var grid;           // 2D: 0=grass, 1=path, 2=tower
var frameCount;
var spawnQueue, spawnTimer, spawnInterval;
var waveActive, waveDone, gameOver, gameWon;
var selectedTower;  // index into TOWER_TYPES
var cursorCol, cursorRow;
var storyTimer;
var storyMsg;
var powerups;       // dropped power-up items
var shopOpen;
var totalWaves = 5; // waves 1-4 normal, wave 5 = boss

// ── Procedural path generator ─────────────────────────────────────────────────
function generatePath() {
  // Random waypoint path from left edge to right edge
  var pts = [];
  // Start mid-left
  var startRow = Math.floor(ROWS / 2) + random(-1, 2);
  if (startRow < 1) startRow = 1;
  if (startRow >= ROWS-1) startRow = ROWS-2;
  pts.push({ x: 0, y: startRow });

  // Random waypoints
  var numWP = 3 + random(0, 3);
  var lastY = startRow;
  for (var i = 1; i <= numWP; i++) {
    var wpX = Math.floor((COLS / (numWP + 1)) * i);
    var dy  = random(-2, 3);
    var wpY = lastY + dy;
    if (wpY < 1) wpY = 1;
    if (wpY >= ROWS-1) wpY = ROWS-2;
    pts.push({ x: wpX, y: wpY });
    lastY = wpY;
  }
  pts.push({ x: COLS-1, y: lastY });

  // Expand waypoints into full path cells
  var cells = [];
  var cellSet = {};
  for (var p = 0; p < pts.length - 1; p++) {
    var ax = pts[p].x,   ay = pts[p].y;
    var bx = pts[p+1].x, by = pts[p+1].y;
    // Walk horizontally then vertically
    var cx = ax, cy = ay;
    while (cx !== bx) {
      var key = cx + "," + cy;
      if (!cellSet[key]) { cells.push({x:cx,y:cy}); cellSet[key]=1; }
      cx += (bx > cx) ? 1 : -1;
    }
    while (cy !== by) {
      var key2 = cx + "," + cy;
      if (!cellSet[key2]) { cells.push({x:cx,y:cy}); cellSet[key2]=1; }
      cy += (by > cy) ? 1 : -1;
    }
    var lastKey = cx + "," + cy;
    if (!cellSet[lastKey]) { cells.push({x:cx,y:cy}); cellSet[lastKey]=1; }
  }
  return cells;
}

function buildGrid(pathCells) {
  var g = [];
  for (var r = 0; r < ROWS; r++) {
    g.push([]);
    for (var c = 0; c < COLS; c++) { g[r].push(0); }
  }
  for (var i = 0; i < pathCells.length; i++) {
    var pc = pathCells[i];
    if (pc.y >= 0 && pc.y < ROWS && pc.x >= 0 && pc.x < COLS) {
      g[pc.y][pc.x] = 1;
    }
  }
  return g;
}

function isOnPath(col, row) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  return grid[row][col] === 1;
}
function hasTower(col, row) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  return grid[row][col] === 2;
}

// ── Enemy wave definitions ────────────────────────────────────────────────────
function makeEnemy(type, pathIdx) {
  // type: 0=scout,1=crawler,2=shaman,3=brute,4=BOSS
  var e = {
    pathIdx: pathIdx || 0,
    px: 0, py: 0,   // pixel position
    t: 0.0,         // interpolation along path segment
    hp: 1, maxHp: 1,
    spd: 1.0,       // path cells per second equiv
    col: RED, size: 3,
    reward: 5,
    slow: 0,        // slow timer
    type: type,
    animFrame: 0,
    boss: false,
  };
  if (type === 0) { e.hp=2;  e.maxHp=2;  e.spd=1.4; e.col=RED;    e.size=3; e.reward=5;  }
  if (type === 1) { e.hp=5;  e.maxHp=5;  e.spd=0.9; e.col=BROWN;  e.size=4; e.reward=8;  }
  if (type === 2) { e.hp=4;  e.maxHp=4;  e.spd=1.1; e.col=PURPLE; e.size=3; e.reward=10; }
  if (type === 3) { e.hp=10; e.maxHp=10; e.spd=0.7; e.col=GRAY1;  e.size=5; e.reward=15; }
  if (type === 4) { // BOSS
    e.hp=80; e.maxHp=80; e.spd=0.45; e.col=DKRED; e.size=7;
    e.reward=100; e.boss=true;
  }
  // Set initial pixel position
  if (path.length > 0) {
    e.px = GRID_OX + path[0].x * CELL + CELL/2;
    e.py = GRID_OY + path[0].y * CELL + CELL/2;
  }
  return e;
}

function buildSpawnQueue(waveNum) {
  var q = [];
  if (waveNum === 1) {
    for (var i=0;i<6;i++)  q.push(0);
  } else if (waveNum === 2) {
    for (var i=0;i<4;i++)  q.push(0);
    for (var i=0;i<4;i++)  q.push(1);
  } else if (waveNum === 3) {
    for (var i=0;i<3;i++)  q.push(0);
    for (var i=0;i<3;i++)  q.push(1);
    for (var i=0;i<3;i++)  q.push(2);
  } else if (waveNum === 4) {
    for (var i=0;i<4;i++)  q.push(1);
    for (var i=0;i<4;i++)  q.push(2);
    for (var i=0;i<3;i++)  q.push(3);
  } else if (waveNum === 5) {
    for (var i=0;i<3;i++)  q.push(3);
    q.push(4); // BOSS
    for (var i=0;i<3;i++)  q.push(3);
  }
  return q;
}

// ── Reset / Init ──────────────────────────────────────────────────────────────
function initGame() {
  gold        = 80;
  lives       = 20;
  wave        = 0;
  score       = 0;
  towers      = [];
  enemies     = [];
  bullets     = [];
  particles   = [];
  powerups    = [];
  frameCount  = 0;
  waveActive  = false;
  waveDone    = false;
  gameOver    = false;
  gameWon     = false;
  selectedTower = 0;
  cursorCol   = Math.floor(COLS/2);
  cursorRow   = Math.floor(ROWS/2);
  storyTimer  = 0;
  storyMsg    = STORY[0];
  shopOpen    = false;
  spawnQueue  = [];
  spawnTimer  = 0;
  spawnInterval = 55;

  path = generatePath();
  grid = buildGrid(path);
}

// ── Pixel position of path cell ───────────────────────────────────────────────
function pathPx(idx) {
  if (idx < 0) idx = 0;
  if (idx >= path.length) idx = path.length-1;
  return { x: GRID_OX + path[idx].x * CELL + Math.floor(CELL/2),
           y: GRID_OY + path[idx].y * CELL + Math.floor(CELL/2) };
}

// ── Update enemies ────────────────────────────────────────────────────────────
function updateEnemies() {
  for (var i = enemies.length-1; i >= 0; i--) {
    var e = enemies[i];
    if (e.slow > 0) e.slow--;

    var spd = e.spd * (e.slow > 0 ? 0.4 : 1.0);
    // Advance along path
    e.t += spd * 0.04;
    while (e.t >= 1.0 && e.pathIdx < path.length-1) {
      e.t -= 1.0;
      e.pathIdx++;
    }
    // Reached end
    if (e.pathIdx >= path.length-1 && e.t >= 1.0) {
      lives -= (e.boss ? 5 : 1);
      enemies.splice(i, 1);
      audio.tone(150, 60, true);
      if (lives <= 0) { lives = 0; gameOver = true; }
      continue;
    }
    // Interpolate pixel pos
    var a = pathPx(e.pathIdx);
    var b = pathPx(e.pathIdx+1);
    e.px = Math.floor(a.x + (b.x - a.x) * e.t);
    e.py = Math.floor(a.y + (b.y - a.y) * e.t);
    e.animFrame = (e.animFrame + 1) % 6;
  }
}

// ── Tower shooting ────────────────────────────────────────────────────────────
function updateTowers() {
  for (var ti = 0; ti < towers.length; ti++) {
    var tw = towers[ti];
    tw.cooldown = (tw.cooldown || 0) - 1;
    if (tw.cooldown > 0) continue;

    var tt    = TOWER_TYPES[tw.typeId];
    var rangeP = tt.range * CELL;
    var tx    = GRID_OX + tw.col * CELL + Math.floor(CELL/2);
    var ty_   = GRID_OY + tw.row * CELL + Math.floor(CELL/2);

    // Find closest enemy in range
    var best = -1, bestDist = 99999;
    for (var ei = 0; ei < enemies.length; ei++) {
      var e = enemies[ei];
      var dx = e.px - tx, dy = e.py - ty_;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= rangeP && dist < bestDist) {
        bestDist = dist; best = ei;
      }
    }
    if (best < 0) continue;

    tw.cooldown = tt.rate;
    var target = enemies[best];

    if (tt.splash) {
      // Flame: AOE damage around target
      for (var ei2 = 0; ei2 < enemies.length; ei2++) {
        var e2 = enemies[ei2];
        var dx2 = e2.px - target.px, dy2 = e2.py - target.py;
        if (Math.sqrt(dx2*dx2+dy2*dy2) < CELL*1.2) {
          e2.hp -= tt.dmg;
        }
      }
      spawnParticles(target.px, target.py, ORANGE, 5);
      audio.tone(200, 20, true);
    } else {
      // Projectile bullet
      bullets.push({
        x: tx, y: ty_,
        tx: target.px, ty: target.py,
        targetIdx: best,
        spd: 5,
        dmg: tt.dmg,
        col: tt.col,
        slow: tt.slow || false,
        size: tt.id === 4 ? 3 : 2,
      });
      audio.tone(tt.id===4 ? 600 : (tt.id===2 ? 400 : 300), 15, true);
    }
  }
}

// ── Update bullets ────────────────────────────────────────────────────────────
function updateBullets() {
  for (var i = bullets.length-1; i >= 0; i--) {
    var b = bullets[i];
    // Track target if still alive
    if (b.targetIdx >= 0 && b.targetIdx < enemies.length) {
      b.tx = enemies[b.targetIdx].px;
      b.ty = enemies[b.targetIdx].py;
    }
    var dx = b.tx - b.x, dy = b.ty - b.y;
    var dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < b.spd + 2) {
      // Hit
      if (b.targetIdx >= 0 && b.targetIdx < enemies.length) {
        var e = enemies[b.targetIdx];
        e.hp -= b.dmg;
        if (b.slow) e.slow = 40;
        spawnParticles(e.px, e.py, b.col, 3);
        if (e.hp <= 0) {
          gold  += e.reward;
          score += e.reward;
          // Chance to drop power-up
          if (random(0,5) === 0) {
            powerups.push({ x: e.px, y: e.py, type: random(0,3), life: 180 });
          }
          spawnParticles(e.px, e.py, YELLOW, 6);
          audio.tone(e.boss ? 800 : 500, 30, true);
          enemies.splice(b.targetIdx, 1);
          // Adjust remaining bullet target indices
          for (var j = 0; j < bullets.length; j++) {
            if (bullets[j].targetIdx > b.targetIdx) bullets[j].targetIdx--;
          }
        }
      }
      bullets.splice(i, 1);
      continue;
    }
    b.x += (dx / dist) * b.spd;
    b.y += (dy / dist) * b.spd;
  }
}

// ── Particles ─────────────────────────────────────────────────────────────────
function spawnParticles(x, y, col, n) {
  for (var i = 0; i < n; i++) {
    particles.push({ x:x, y:y, vx:random(-3,4)-1.5, vy:random(-3,4)-1.5, life:10, col:col });
  }
}

function updateParticles() {
  for (var i = particles.length-1; i >= 0; i--) {
    var p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.15;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ── Power-ups ─────────────────────────────────────────────────────────────────
// type: 0=+gold(20), 1=+life, 2=freeze all, 3=nuke(dmg all)
var POWERUP_NAMES = ["+20G","<3","ICE","NUK"];
var POWERUP_COLS  = [GOLD_C, PINK, CYAN, ORANGE];

function updatePowerups() {
  for (var i = powerups.length-1; i >= 0; i--) {
    powerups[i].life--;
    if (powerups[i].life <= 0) powerups.splice(i, 1);
  }
}

function collectPowerup(pu) {
  if (pu.type === 0) { gold += 20; audio.tone(700, 60, true); }
  else if (pu.type === 1) { lives = Math.min(lives+1, 20); audio.tone(600, 60, true); }
  else if (pu.type === 2) { // freeze
    for (var i=0;i<enemies.length;i++) enemies[i].slow = 80;
    audio.tone(400, 100, true);
  } else { // nuke
    for (var i=enemies.length-1;i>=0;i--) {
      enemies[i].hp -= 8;
      if (enemies[i].hp <= 0) {
        gold  += enemies[i].reward;
        score += enemies[i].reward;
        spawnParticles(enemies[i].px, enemies[i].py, ORANGE, 8);
        enemies.splice(i, 1);
      }
    }
    audio.tone(200, 200, true);
  }
}

// ── Drawing ───────────────────────────────────────────────────────────────────
function drawGrid() {
  // Grass background
  display.drawFillRect(GRID_OX, GRID_OY, COLS*CELL, ROWS*CELL, GRASS_C);

  // Path cells
  for (var i = 0; i < path.length; i++) {
    var pc = path[i];
    display.drawFillRect(GRID_OX+pc.x*CELL, GRID_OY+pc.y*CELL, CELL, CELL, PATH_C);
    // Path texture lines
    display.drawLine(GRID_OX+pc.x*CELL, GRID_OY+pc.y*CELL+Math.floor(CELL/2),
                     GRID_OX+pc.x*CELL+CELL-1, GRID_OY+pc.y*CELL+Math.floor(CELL/2), BROWN);
  }

  // Grid lines (subtle)
  for (var r = 0; r <= ROWS; r++) {
    display.drawLine(GRID_OX, GRID_OY+r*CELL, GRID_OX+COLS*CELL, GRID_OY+r*CELL, DKGREEN);
  }
  for (var c = 0; c <= COLS; c++) {
    display.drawLine(GRID_OX+c*CELL, GRID_OY, GRID_OX+c*CELL, GRID_OY+ROWS*CELL, DKGREEN);
  }

  // Start / End markers
  if (path.length > 0) {
    var sp = path[0];
    display.drawFillRect(GRID_OX+sp.x*CELL+1, GRID_OY+sp.y*CELL+1, CELL-2, CELL-2, GREEN);
    display.setTextSize(1); display.setTextColor(BLACK);
    display.setCursor(GRID_OX+sp.x*CELL+1, GRID_OY+sp.y*CELL+1);
    display.print("S");
    var ep = path[path.length-1];
    display.drawFillRect(GRID_OX+ep.x*CELL+1, GRID_OY+ep.y*CELL+1, CELL-2, CELL-2, RED);
    display.setTextColor(WHITE);
    display.setCursor(GRID_OX+ep.x*CELL+1, GRID_OY+ep.y*CELL+1);
    display.print("E");
  }
}

function drawTowers() {
  for (var i = 0; i < towers.length; i++) {
    var tw = towers[i];
    var tt = TOWER_TYPES[tw.typeId];
    var tx = GRID_OX + tw.col * CELL;
    var ty2= GRID_OY + tw.row * CELL;
    var cx = tx + Math.floor(CELL/2);
    var cy = ty2+ Math.floor(CELL/2);
    // Base
    display.drawFillRect(tx+1, ty2+1, CELL-2, CELL-2, GRAY3);
    // Tower body
    display.drawFillCircle(cx, cy, Math.floor(CELL/2)-1, tt.col);
    display.drawCircle(cx, cy, Math.floor(CELL/2)-1, WHITE);
    // Symbol
    display.setTextSize(1); display.setTextColor(BLACK);
    display.setCursor(cx - 2, cy - 3);
    display.print(tt.sym);
    // Range ring flash when shooting
    if (tw.cooldown !== undefined && tw.cooldown > tt.rate - 4) {
      display.drawCircle(cx, cy, Math.floor(tt.range * CELL), display.color(80,80,80));
    }
  }
}

function drawEnemies() {
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    var sz = e.size;
    var col = (e.slow > 0) ? CYAN : e.col;

    if (e.boss) {
      // Boss: big animated square
      var bob = (e.animFrame < 3) ? 1 : -1;
      display.drawFillRect(e.px - sz, e.py - sz + bob, sz*2, sz*2, DKRED);
      display.drawRect(e.px - sz, e.py - sz + bob, sz*2, sz*2, YELLOW);
      display.drawFillCircle(e.px, e.py + bob, Math.floor(sz*0.6), RED);
      // Boss eyes
      display.drawFillRect(e.px-sz+2, e.py-sz+bob+2, 2, 2, YELLOW);
      display.drawFillRect(e.px+sz-4, e.py-sz+bob+2, 2, 2, YELLOW);
    } else {
      // Normal enemy: animated circle
      var bob2 = (e.animFrame < 3) ? 1 : 0;
      display.drawFillCircle(e.px, e.py + bob2, sz, col);
      // Eyes
      display.drawPixel(e.px - 1, e.py - 1 + bob2, WHITE);
      display.drawPixel(e.px + 1, e.py - 1 + bob2, WHITE);
    }

    // HP bar (only if damaged)
    if (e.hp < e.maxHp) {
      var bw  = sz * 2 + 2;
      var bx2 = e.px - sz - 1;
      var by2 = e.py - sz - 3;
      display.drawFillRect(bx2, by2, bw, 2, DKRED);
      display.drawFillRect(bx2, by2, Math.floor(bw * e.hp / e.maxHp), 2, GREEN);
    }
  }
}

function drawBullets() {
  for (var i = 0; i < bullets.length; i++) {
    var b = bullets[i];
    display.drawFillCircle(Math.floor(b.x), Math.floor(b.y), b.size, b.col);
  }
}

function drawParticles() {
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    display.drawPixel(Math.floor(p.x), Math.floor(p.y), p.col);
  }
}

function drawPowerups() {
  for (var i = 0; i < powerups.length; i++) {
    var pu = powerups[i];
    var col = POWERUP_COLS[pu.type];
    var pulse = (pu.life % 20 < 10) ? 1 : 0;
    display.drawFillRect(pu.x - 4, pu.y - 4 + pulse, 8, 8, col);
    display.drawRect(pu.x - 4, pu.y - 4 + pulse, 8, 8, WHITE);
    display.setTextSize(1); display.setTextColor(BLACK);
    display.setCursor(pu.x - 3, pu.y - 3 + pulse);
    display.print(POWERUP_NAMES[pu.type][0]);
  }
}

function drawCursor() {
  var cx = GRID_OX + cursorCol * CELL;
  var cy = GRID_OY + cursorRow * CELL;
  var canPlace = !isOnPath(cursorCol, cursorRow) && !hasTower(cursorCol, cursorRow);
  var col = canPlace ? GREEN : RED;
  // Flashing border
  if (frameCount % 10 < 7) {
    display.drawRect(cx, cy, CELL, CELL, col);
    display.drawRect(cx+1, cy+1, CELL-2, CELL-2, col);
  }
}

function drawHUD() {
  var hy = ROWS * CELL + GRID_OY;
  display.drawFillRect(0, hy, W, H - hy, BLACK);
  display.drawLine(0, hy, W, hy, GRAY2);

  display.setTextSize(1);

  // Gold
  display.setTextColor(GOLD_C);
  display.setCursor(2, hy + 2);
  display.print("G:" + gold);

  // Lives
  display.setTextColor(RED);
  display.setCursor(2, hy + 12);
  display.print("L:" + lives);

  // Wave
  display.setTextColor(CYAN);
  var waveStr = "W:" + wave + "/" + totalWaves;
  display.setCursor(Math.floor(W/2) - 12, hy + 2);
  display.print(waveStr);

  // Score
  display.setTextColor(YELLOW);
  display.setCursor(Math.floor(W/2) - 12, hy + 12);
  display.print("S:" + score);

  // Tower selector
  var tt = TOWER_TYPES[selectedTower];
  display.setTextColor(tt.col);
  display.setCursor(W - 36, hy + 2);
  display.print(tt.sym + "$" + tt.cost);

  // Status
  display.setTextColor(GRAY1);
  display.setCursor(W - 36, hy + 12);
  if (!waveActive && wave < totalWaves) {
    display.print("SEL=GO");
  } else if (waveActive) {
    var alive = enemies.length + spawnQueue.length;
    display.print("E:" + alive);
  }
}

function drawStory(msg) {
  // Semi-opaque overlay
  for (var row = Math.floor(H*0.25); row < Math.floor(H*0.75); row += 2) {
    display.drawLine(0, row, W, row, display.color(0,0,10));
  }
  display.drawFillRect(4, Math.floor(H*0.27), W-8, Math.floor(H*0.46), display.color(10,10,30));
  display.drawRect(4, Math.floor(H*0.27), W-8, Math.floor(H*0.46), CYAN);

  display.setTextAlign("center","middle");
  display.setTextSize(1);
  display.setTextColor(WHITE);

  // Split message on \n
  var lines = [];
  var cur = "";
  for (var i = 0; i < msg.length; i++) {
    if (msg[i] === "\n") { lines.push(cur); cur = ""; }
    else cur += msg[i];
  }
  if (cur.length > 0) lines.push(cur);

  var midY = Math.floor(H/2);
  for (var li = 0; li < lines.length; li++) {
    display.drawText(lines[li], Math.floor(W/2), midY - 8 + li * 12);
  }
  display.setTextColor(CYAN);
  display.drawText("Any key...", Math.floor(W/2), midY + 18);
  display.setTextAlign("left","top");
}

function drawGameOver() {
  display.fill(BLACK);
  display.setTextAlign("center","middle");
  display.setTextSize(2);
  display.setTextColor(RED);
  display.drawText("GAME OVER", Math.floor(W/2), Math.floor(H/2) - 20);
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.drawText("Score: " + score, Math.floor(W/2), Math.floor(H/2));
  display.drawText("Wave: " + wave, Math.floor(W/2), Math.floor(H/2) + 12);
  display.setTextColor(YELLOW);
  display.drawText("Any = Retry", Math.floor(W/2), Math.floor(H/2) + 26);
  display.setTextColor(GRAY2);
  display.drawText("Esc = Quit", Math.floor(W/2), Math.floor(H/2) + 38);
  display.setTextAlign("left","top");
}

function drawWin() {
  display.fill(display.color(0,20,0));
  display.setTextAlign("center","middle");
  display.setTextSize(2);
  display.setTextColor(GREEN);
  display.drawText("VICTORY!", Math.floor(W/2), Math.floor(H/2) - 22);
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.drawText(STORY[6], Math.floor(W/2), Math.floor(H/2));
  display.setTextColor(YELLOW);
  display.drawText("Score: " + score, Math.floor(W/2), Math.floor(H/2) + 14);
  display.setTextColor(CYAN);
  display.drawText("Any = Play Again", Math.floor(W/2), Math.floor(H/2) + 28);
  display.setTextColor(GRAY2);
  display.drawText("Esc = Quit", Math.floor(W/2), Math.floor(H/2) + 40);
  display.setTextAlign("left","top");
}

function drawStartScreen() {
  display.fill(BLACK);
  display.setTextAlign("center","middle");
  display.setTextSize(2);
  display.setTextColor(GREEN);
  display.drawText("FORTRESS", Math.floor(W/2), Math.floor(H/2) - 30);
  display.setTextSize(1);
  display.setTextColor(YELLOW);
  display.drawText("Tower Defense", Math.floor(W/2), Math.floor(H/2) - 12);
  display.setTextColor(WHITE);
  display.drawText("Prev/Next = Move cursor", Math.floor(W/2), Math.floor(H/2) + 4);
  display.drawText("Sel = Place tower", Math.floor(W/2), Math.floor(H/2) + 14);
  display.drawText("Prev+Next = Change tower", Math.floor(W/2), Math.floor(H/2) + 24);
  display.setTextColor(CYAN);
  display.drawText("Any key = Start", Math.floor(W/2), Math.floor(H/2) + 38);
  display.setTextColor(GRAY2);
  display.drawText("Esc = Quit", Math.floor(W/2), Math.floor(H/2) + 50);
  display.setTextAlign("left","top");
}

// ── Shop overlay ──────────────────────────────────────────────────────────────
function drawShop() {
  display.drawFillRect(2, 2, W-4, H-4, display.color(5,5,20));
  display.drawRect(2, 2, W-4, H-4, CYAN);
  display.setTextAlign("center","top");
  display.setTextSize(1);
  display.setTextColor(GOLD_C);
  display.drawText("TOWERS  Gold:" + gold, Math.floor(W/2), 6);
  display.setTextAlign("left","top");

  for (var i = 0; i < TOWER_TYPES.length; i++) {
    var tt2 = TOWER_TYPES[i];
    var ty3 = 20 + i * 18;
    var sel = (i === selectedTower);
    if (sel) {
      display.drawFillRect(4, ty3-1, W-8, 16, display.color(20,20,60));
      display.drawRect(4, ty3-1, W-8, 16, tt2.col);
    }
    display.setTextColor(tt2.col);
    display.setCursor(8, ty3);
    display.print("[" + tt2.sym + "] " + tt2.name);
    display.setTextColor(gold >= tt2.cost ? GOLD_C : RED);
    display.setCursor(W - 36, ty3);
    display.print("$" + tt2.cost);
    display.setTextColor(GRAY1);
    display.setCursor(8, ty3 + 8);
    display.print("DMG:" + tt2.dmg + " RNG:" + tt2.range + (tt2.slow?" SLW":(tt2.splash?" AOE":"")));
  }

  display.setTextColor(CYAN);
  display.setTextAlign("center","top");
  display.drawText("Prev/Next=Select  Sel=Close", Math.floor(W/2), H - 14);
  display.setTextAlign("left","top");
}

// ── STATE MACHINE ─────────────────────────────────────────────────────────────
var ST_START  = 0;
var ST_STORY  = 1;
var ST_BUILD  = 2;   // between waves: place towers
var ST_WAVE   = 3;
var ST_OVER   = 4;
var ST_WIN    = 5;
var ST_SHOP   = 6;
var state = ST_START;

initGame();

// ── Main loop ─────────────────────────────────────────────────────────────────
while (true) {

  if (keyboard.getEscPress()) {
    if (state === ST_SHOP) { state = ST_BUILD; delay(16); continue; }
    display.fill(BLACK);
    break;
  }

  frameCount++;

  // ── START ──────────────────────────────────────────────────────────────────
  if (state === ST_START) {
    drawStartScreen();
    if (keyboard.getAnyPress()) {
      state = ST_STORY;
      storyMsg = STORY[0];
      audio.tone(440,80); delay(90); audio.tone(550,80);
    }
    delay(16);
    continue;
  }

  // ── STORY ──────────────────────────────────────────────────────────────────
  if (state === ST_STORY) {
    // Render game world behind story
    drawGrid();
    drawTowers();
    drawStory(storyMsg);
    if (keyboard.getAnyPress()) {
      state = ST_BUILD;
      audio.tone(500, 50, true);
    }
    delay(16);
    continue;
  }

  // ── BUILD phase ────────────────────────────────────────────────────────────
  if (state === ST_BUILD) {
    drawGrid();
    drawTowers();
    drawPowerups();
    drawCursor();
    drawHUD();

    var kP = keyboard.getPrevPress();
    var kN = keyboard.getNextPress();
    var kS = keyboard.getSelPress();
    var kPH= keyboard.getPrevPress(true);
    var kNH= keyboard.getNextPress(true);

    // Prev+Next held = cycle tower type
    if (kPH && kNH) {
      selectedTower = (selectedTower + 1) % TOWER_TYPES.length;
      audio.tone(600, 30, true);
      delay(150);
    } else {
      // Move cursor
      if (kP) { cursorCol--; if (cursorCol < 0) cursorCol = 0; audio.tone(300,15,true); }
      if (kN) { cursorCol++; if (cursorCol >= COLS) cursorCol = COLS-1; audio.tone(300,15,true); }
    }

    // Sel = open shop OR start wave if no tower placed
    if (kS) {
      var canPlace = !isOnPath(cursorCol, cursorRow) && !hasTower(cursorCol, cursorRow);
      var tt3 = TOWER_TYPES[selectedTower];
      if (canPlace && gold >= tt3.cost) {
        towers.push({ col:cursorCol, row:cursorRow, typeId:selectedTower, cooldown:0 });
        grid[cursorRow][cursorCol] = 2;
        gold -= tt3.cost;
        audio.tone(500, 40, true);
        delay(50);
        audio.tone(650, 40, true);
      } else if (!canPlace && !isOnPath(cursorCol, cursorRow)) {
        // Open shop
        state = ST_SHOP;
      } else if (gold < tt3.cost) {
        audio.tone(150, 60, true);
      }
    }

    // Prev held (no next) = move cursor row up/down via long presses is tricky;
    // use row change: double-tap Sel on a tower cell opens shop
    // Start wave button: show instruction in HUD "Sel on grass=place, Prev+Next=tower, long Sel=start"
    // Long press Sel on path = start wave
    if (isOnPath(cursorCol, cursorRow) && kS && wave < totalWaves) {
      wave++;
      spawnQueue = buildSpawnQueue(wave);
      spawnTimer = 0;
      waveActive = true;
      state = ST_WAVE;
      storyMsg = STORY[wave] || "";
      if (storyMsg.length > 0) {
        // Brief story flash before wave
        drawGrid(); drawTowers();
        drawStory(storyMsg);
        delay(1200);
      }
      audio.tone(300,60); delay(70); audio.tone(400,60); delay(70); audio.tone(500,100);
    }

    delay(16);
    continue;
  }

  // ── SHOP ───────────────────────────────────────────────────────────────────
  if (state === ST_SHOP) {
    drawGrid(); drawTowers();
    drawShop();
    var kP2 = keyboard.getPrevPress();
    var kN2 = keyboard.getNextPress();
    var kS2 = keyboard.getSelPress();
    if (kP2) { selectedTower = (selectedTower - 1 + TOWER_TYPES.length) % TOWER_TYPES.length; audio.tone(400,20,true); }
    if (kN2) { selectedTower = (selectedTower + 1) % TOWER_TYPES.length; audio.tone(400,20,true); }
    if (kS2) { state = ST_BUILD; audio.tone(500,40,true); }
    delay(16);
    continue;
  }

  // ── WAVE ───────────────────────────────────────────────────────────────────
  if (state === ST_WAVE) {

    // Spawn enemies
    if (spawnQueue.length > 0) {
      spawnTimer--;
      if (spawnTimer <= 0) {
        var etype = spawnQueue.shift();
        enemies.push(makeEnemy(etype, 0));
        spawnTimer = spawnInterval + (etype === 4 ? 40 : 0);
      }
    }

    updateEnemies();
    updateTowers();
    updateBullets();
    updateParticles();
    updatePowerups();

    // Check power-up collection (if enemy walks near a powerup, auto-collect doesn't make sense;
    // powerups are collected when player presses Sel during wave near one — simplified: auto collect)
    // Auto-collect if any enemy passes over it (no — powerups are for player bonus, just auto-grant after delay)
    // Actually: powerup auto-collects after 60 frames (gift for killing)
    for (var i = powerups.length-1; i >= 0; i--) {
      if (powerups[i].life < 120) { // auto collect after half life
        collectPowerup(powerups[i]);
        spawnParticles(powerups[i].x, powerups[i].y, POWERUP_COLS[powerups[i].type], 6);
        powerups.splice(i, 1);
      }
    }

    // Wave complete?
    if (spawnQueue.length === 0 && enemies.length === 0) {
      waveActive = false;
      // Bonus gold
      var bonus = 10 + wave * 5;
      gold += bonus;
      audio.tone(660,80); delay(90); audio.tone(784,80); delay(90); audio.tone(880,120);
      if (wave >= totalWaves) {
        state = ST_WIN;
      } else {
        state = ST_BUILD;
        // Regenerate path for variety every 2 waves
        if (wave % 2 === 0) {
          path = generatePath();
          grid = buildGrid(path);
          // Remove any towers now on path
          for (var ti2 = towers.length-1; ti2 >= 0; ti2--) {
            if (isOnPath(towers[ti2].col, towers[ti2].row)) {
              gold += Math.floor(TOWER_TYPES[towers[ti2].typeId].cost * 0.5);
              towers.splice(ti2, 1);
            }
          }
          storyMsg = "Path changed! +$" + bonus + " bonus!";
          drawGrid(); drawTowers();
          drawStory(storyMsg);
          delay(1500);
        }
      }
      delay(16);
      continue;
    }

    // Dead?
    if (gameOver) { state = ST_OVER; delay(16); continue; }

    // Draw
    drawGrid();
    drawTowers();
    drawPowerups();
    drawEnemies();
    drawBullets();
    drawParticles();
    drawHUD();

    delay(16);
    continue;
  }

  // ── GAME OVER ──────────────────────────────────────────────────────────────
  if (state === ST_OVER) {
    drawGameOver();
    if (keyboard.getAnyPress()) {
      initGame();
      state = ST_STORY;
      storyMsg = STORY[0];
      audio.tone(440,60);
    }
    delay(80);
    continue;
  }

  // ── WIN ────────────────────────────────────────────────────────────────────
  if (state === ST_WIN) {
    drawWin();
    if (keyboard.getAnyPress()) {
      initGame();
      state = ST_STORY;
      storyMsg = STORY[0];
      audio.tone(523,80); delay(100); audio.tone(659,80);
    }
    delay(80);
    continue;
  }

  delay(16);
}
