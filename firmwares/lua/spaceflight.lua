-- UniGeek Lua - SPACEFLIGHT SIMULATOR
-- Save as /unigeek/lua/spaceflight_sim.lua

local lcd = uni.lcd
local nav = uni.nav

-- Game constants
local W = 240
local H = 320
local GRAVITY = 0.018
local THRUST = 0.35
local ROT_SPEED = 0.085

-- Ship state
local ship = {
    x = 120,
    y = 80,
    vx = 0.8,
    vy = 1.2,
    angle = 0,      -- in radians
    fuel = 1000,
    landed = false,
    crashed = false
}

local score = 0
local altitude = 0
local velocity = 0
local game_over = false
local success = false

-- Planet (central body)
local planet_x = 120
local planet_y = 420
local planet_r = 65

-- Asteroids
local asteroids = {}

function init_asteroids()
    asteroids = {}
    for i = 1, 8 do
        table.insert(asteroids, {
            x = math.random(20, 220),
            y = math.random(40, 180),
            size = math.random(6, 14),
            vx = math.random(-1,1) * 0.6,
            vy = math.random(-1,1) * 0.6
        })
    end
end

function update_physics()
    -- Gravity towards planet
    local dx = planet_x - ship.x
    local dy = planet_y - ship.y
    local dist = math.sqrt(dx*dx + dy*dy)
    
    if dist > 20 then
        local force = GRAVITY * 8000 / (dist * dist)
        ship.vx = ship.vx + (dx / dist) * force
        ship.vy = ship.vy + (dy / dist) * force
    end
    
    -- Apply thrust
    if nav.getBtnA() and ship.fuel > 0 then
        ship.vx = ship.vx + math.sin(ship.angle) * THRUST
        ship.vy = ship.vy - math.cos(ship.angle) * THRUST
        ship.fuel = ship.fuel - 2.8
    end
    
    -- Rotation
    if nav.getBtnB() then
        ship.angle = ship.angle + ROT_SPEED
    end
    if nav.getBtnA() and nav.getBtnB() then   -- Left rotation when both pressed
        ship.angle = ship.angle - ROT_SPEED * 1.6
    end
    
    -- Update position
    ship.x = ship.x + ship.vx
    ship.y = ship.y + ship.vy
    
    -- Velocity magnitude
    velocity = math.sqrt(ship.vx*ship.vx + ship.vy*ship.vy)
    altitude = math.max(0, dist - planet_r - 12)
    
    -- Boundary
    if ship.x < 0 or ship.x > W then ship.vx = -ship.vx * 0.6; ship.x = math.max(0, math.min(W, ship.x)) end
    if ship.y < 0 then ship.y = 0; ship.vy = 0.5 end
    
    -- Collision with planet
    if dist < planet_r + 14 then
        if velocity < 1.8 and math.abs(ship.angle) < 0.4 then
            ship.landed = true
            success = true
            score = math.floor(800 + ship.fuel * 0.6)
        else
            ship.crashed = true
            game_over = true
        end
    end
    
    -- Asteroid collisions
    for i=1, #asteroids do
        local a = asteroids[i]
        local adx = a.x - ship.x
        local ady = a.y - ship.y
        if math.sqrt(adx*adx + ady*ady) < a.size + 9 then
            ship.crashed = true
            game_over = true
        end
        -- Move asteroids
        a.x = a.x + a.vx
        a.y = a.y + a.vy
        -- Bounce on edges
        if a.x < 10 or a.x > W-10 then a.vx = -a.vx end
        if a.y < 30 or a.y > 200 then a.vy = -a.vy end
    end
end

function draw_ship()
    lcd.fillRect(ship.x-2, ship.y-2, 4, 4, 0xFFFF) -- center dot
    
    -- Ship body
    local nx = math.sin(ship.angle)
    local ny = -math.cos(ship.angle)
    lcd.drawLine(ship.x, ship.y, ship.x + nx*14, ship.y + ny*14, 0x07FF)
    
    -- Thruster flame
    if nav.getBtnA() and ship.fuel > 0 then
        local fx = ship.x - nx * 12
        local fy = ship.y - ny * 12
        lcd.fillRect(fx-3, fy-3, 6, 8, 0xF800)
    end
end

function draw()
    lcd.fillScreen(0x0008)  -- Deep space
    
    -- Stars
    for i = 1, 25 do
        lcd.fillRect((i*17)%240, (i*31 + frame*2)%280, 1, 1, 0xFFFF)
    end
    
    -- Planet
    lcd.fillCircle(planet_x, planet_y, planet_r, 0x03BF)
    lcd.fillCircle(planet_x-12, planet_y-18, 18, 0x01E7) -- atmosphere highlight
    
    -- Asteroids
    for i=1, #asteroids do
        local a = asteroids[i]
        lcd.fillCircle(a.x, a.y, a.size, 0xB5B5)
    end
    
    draw_ship()
    
    -- HUD
    lcd.drawString(8, 8, "ALT: " .. math.floor(altitude) .. "km", 0x07FF)
    lcd.drawString(8, 26, "VEL: " .. string.format("%.1f", velocity), 0x07FF)
    lcd.drawString(8, 44, "FUEL: " .. math.floor(ship.fuel), 0xF81F)
    lcd.drawString(8, 62, "ANGLE: " .. math.floor(ship.angle * 57.3) .. "°", 0xFFFF)
    
    if ship.landed then
        lcd.drawString(65, 140, "SUCCESSFUL LANDING!", 0x07E0)
        lcd.drawString(75, 165, "Score: " .. score, 0xFFFF)
    end
end

function game_loop()
    init_asteroids()
    local frame = 0
    
    while true do
        frame = frame + 1
        lcd.fillScreen(0x0008)
        
        if not game_over then
            update_physics()
            draw()
        else
            if success then
                lcd.drawString(55, 120, "MISSION SUCCESS!", 0x07E0)
            else
                lcd.drawString(75, 120, "CRASHED!", 0xF800)
            end
            lcd.drawString(60, 150, "Final Score: " .. score, 0xFFFF)
            lcd.drawString(45, 180, "A/B to Restart", 0xFFFF)
            
            if nav.getBtnA() or nav.getBtnB() then
                ship.x = 120; ship.y = 80; ship.vx = 0.8; ship.vy = 1.2
                ship.angle = 0; ship.fuel = 1000
                ship.landed = false; ship.crashed = false
                game_over = false; success = false
                init_asteroids()
            end
        end
        
        lcd.push()
        uni.delay(35)
    end
end

-- Title Screen
lcd.fillScreen(0x0000)
lcd.drawString(45, 70, "SPACEFLIGHT SIM", 0x07FF)
lcd.drawString(55, 100, "Orbital Lander", 0xFFFF)
lcd.drawString(35, 140, "A = Thrust", 0xF81F)
lcd.drawString(35, 160, "B = Rotate Right", 0xF81F)
lcd.drawString(30, 180, "A+B = Rotate Left", 0xF81F)
lcd.drawString(50, 220, "Press A/B to Launch", 0xFFFF)
lcd.push()

while not (nav.getBtnA() or nav.getBtnB()) do
    uni.delay(50)
end

game_loop()