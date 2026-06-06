-- UniGeek Lua - TETRIS with Fun Special Pieces
-- Save as /unigeek/lua/tetris_fun.lua

local lcd = uni.lcd
local nav = uni.nav

local BLOCK_SIZE = 12
local GRID_WIDTH = 10
local GRID_HEIGHT = 18
local BOARD_X = 60
local BOARD_Y = 20

-- Enhanced shapes with special effects
local pieces = {
    { shape = {{1,1,1,1}},           color = 0x07FF, name = "I",      special = nil },
    { shape = {{1,1},{1,1}},         color = 0xFFE0, name = "O",      special = nil },
    { shape = {{0,1,0},{1,1,1}},     color = 0xF81F, name = "T",      special = nil },
    { shape = {{1,1,0},{0,1,1}},     color = 0x07E0, name = "S",      special = nil },
    { shape = {{0,1,1},{1,1,0}},     color = 0xF800, name = "Z",      special = nil },
    { shape = {{1,0,0},{1,1,1}},     color = 0x001F, name = "J",      special = nil },
    { shape = {{0,0,1},{1,1,1}},     color = 0xFD20, name = "L",      special = nil },
    
    -- === FUN SPECIAL PIECES ===
    { shape = {{1,1},{1,1}},         color = 0xF800, name = "💥",     special = "explosive" },   -- Bomb
    { shape = {{1,1,1},{1,0,1}},     color = 0x0000, name = "🌌",     special = "blackhole" },   -- Black Hole
    { shape = {{1,1,1,1}},           color = 0xFFE0, name = "⚡",     special = "laser" },       -- Laser
    { shape = {{0,1,0},{1,1,1}},     color = 0xFFFF, name = "🌈",     special = "rainbow" },     -- Rainbow
    { shape = {{1,1,0},{1,1,0}},     color = 0x07FF, name = "👻",     special = "ghost" },       -- Ghost
    { shape = {{1,1},{1,1}},         color = 0xF81F, name = "×2",     special = "multiplier" }   -- Multiplier
}

local board = {}
local current = {}
local score = 0
local level = 1
local drop_timer = 0
local game_over = false
local multiplier_timer = 0
local ghost_active = false

function init_board()
    board = {}
    for y=1, GRID_HEIGHT do
        board[y] = {}
        for x=1, GRID_WIDTH do board[y][x] = 0 end
    end
end

function new_piece()
    local idx = math.random(1, #pieces)
    current = {
        type = idx,
        x = math.floor(GRID_WIDTH/2) - 1,
        y = 1,
        shape = pieces[idx].shape,
        color = pieces[idx].color,
        special = pieces[idx].special
    }
    
    if check_collision(current.x, current.y) then
        game_over = true
    end
end

function check_collision(px, py)
    local s = current.shape
    for y=1, #s do
        for x=1, #s[y] do
            if s[y][x] == 1 then
                local bx = px + x - 1
                local by = py + y - 1
                if bx < 1 or bx > GRID_WIDTH or by > GRID_HEIGHT then return true end
                if by >= 1 and board[by][bx] ~= 0 then
                    if not ghost_active then return true end
                end
            end
        end
    end
    return false
end

function lock_piece()
    local s = current.shape
    for y=1, #s do
        for x=1, #s[y] do
            if s[y][x] == 1 then
                local bx = current.x + x - 1
                local by = current.y + y - 1
                if by >= 1 then
                    board[by][bx] = current.type
                end
            end
        end
    end

    -- Trigger special effects
    if current.special == "explosive" then
        explode(current.x + 1, current.y + 1)
    elseif current.special == "blackhole" then
        blackhole_effect(current.x + 1, current.y + 1)
    elseif current.special == "laser" then
        laser_clear(current.y + 1)
    elseif current.special == "rainbow" then
        rainbow_clear()
    elseif current.special == "ghost" then
        ghost_active = true
    elseif current.special == "multiplier" then
        multiplier_timer = 8
    end

    clear_lines()
    new_piece()
    ghost_active = false
end

function explode(cx, cy)
    for y = cy-1, cy+1 do
        for x = cx-1, cx+1 do
            if x >= 1 and x <= GRID_WIDTH and y >= 1 and y <= GRID_HEIGHT then
                board[y][x] = 0
            end
        end
    end
    score = score + 150
end

function blackhole_effect(cx, cy)
    for y = cy-2, cy+2 do
        for x = cx-1, cx+1 do
            if x >= 1 and x <= GRID_WIDTH and y >= 1 and y <= GRID_HEIGHT then
                board[y][x] = 0
            end
        end
    end
    -- Clear column below
    for y = cy, GRID_HEIGHT do
        board[y][cx] = 0
    end
    score = score + 200
end

function laser_clear(row)
    for x=1, GRID_WIDTH do
        board[row][x] = 0
    end
    score = score + 300
end

function rainbow_clear()
    for i=1, 2 do
        local r = math.random(1, GRID_HEIGHT)
        for x=1, GRID_WIDTH do board[r][x] = 0 end
    end
    score = score + 250
end

function clear_lines()
    local lines = 0
    for y = GRID_HEIGHT, 1, -1 do
        local full = true
        for x = 1, GRID_WIDTH do
            if board[y][x] == 0 then full = false; break end
        end
        if full then
            lines = lines + 1
            table.remove(board, y)
            table.insert(board, 1, {})
            for x=1, GRID_WIDTH do board[1][x] = 0 end
            y = y + 1
        end
    end
    
    local mult = (multiplier_timer > 0) and 2 or 1
    score = score + (lines * 100 * level * mult)
    if multiplier_timer > 0 then multiplier_timer = multiplier_timer - 1 end
    
    if score > level * 1200 then level = level + 1 end
end

function draw_board()
    lcd.drawRect(BOARD_X-3, BOARD_Y-3, GRID_WIDTH*BLOCK_SIZE+6, GRID_HEIGHT*BLOCK_SIZE+6, 0xFFFF)
    
    for y=1, GRID_HEIGHT do
        for x=1, GRID_WIDTH do
            if board[y][x] ~= 0 then
                local c = pieces[board[y][x]].color
                lcd.fillRect(BOARD_X + (x-1)*BLOCK_SIZE, BOARD_Y + (y-1)*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, c)
            else
                lcd.fillRect(BOARD_X + (x-1)*BLOCK_SIZE, BOARD_Y + (y-1)*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, 0x1111)
            end
        end
    end
end

function draw_piece()
    local s = current.shape
    for y=1, #s do
        for x=1, #s[y] do
            if s[y][x] == 1 then
                lcd.fillRect(BOARD_X + (current.x + x - 2)*BLOCK_SIZE,
                           BOARD_Y + (current.y + y - 2)*BLOCK_SIZE,
                           BLOCK_SIZE, BLOCK_SIZE, current.color)
            end
        end
    end
end

-- Main Game Loop
function game_loop()
    init_board()
    new_piece()
    
    while true do
        lcd.fillScreen(0x0000)
        
        if not game_over then
            drop_timer = drop_timer + 1
            local drop_speed = math.max(4, 28 - level*2)
            
            if drop_timer >= drop_speed then
                if not check_collision(current.x, current.y + 1) then
                    current.y = current.y + 1
                else
                    lock_piece()
                end
                drop_timer = 0
            end

            -- Controls
            if nav.getBtnA() then
                if not check_collision(current.x - 1, current.y) then current.x = current.x - 1 end
            end
            if nav.getBtnB() then
                if not check_collision(current.x + 1, current.y) then current.x = current.x + 1 end
            end
            if nav.getBtnA() and nav.getBtnB() then  -- Hard drop
                while not check_collision(current.x, current.y + 1) do
                    current.y = current.y + 1
                    score = score + 3
                end
                lock_piece()
            end

            draw_board()
            draw_piece()
            
            lcd.drawString(10, 25, "Score: " .. score, 0xFFFF)
            lcd.drawString(10, 45, "Level: " .. level, 0xFFFF)
            if multiplier_timer > 0 then
                lcd.drawString(10, 65, "×2 ACTIVE!", 0xF81F)
            end
        else
            lcd.drawString(65, 55, "GAME OVER", 0xF800)
            lcd.drawString(55, 80, "Score: " .. score, 0xFFFF)
            lcd.drawString(40, 105, "A/B to Restart", 0xFFFF)
            
            if nav.getBtnA() or nav.getBtnB() then
                score = 0; level = 1; multiplier_timer = 0
                init_board()
                new_piece()
                game_over = false
            end
        end
        
        lcd.push()
        uni.delay(35)
    end
end

-- Title Screen
lcd.fillScreen(0x0000)
lcd.drawString(70, 45, "FUN TETRIS", 0xFFFF)
lcd.drawString(35, 75, "Explosive & Black Hole!", 0xF81F)
lcd.drawString(45, 100, "Press A/B to Start", 0xFFFF)
lcd.push()

while not (nav.getBtnA() or nav.getBtnB()) do uni.delay(50) end
game_loop()