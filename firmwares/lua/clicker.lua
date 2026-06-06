-- UniGeek Lua - COOKIE CLICKER - Galactic Edition
-- Save as /unigeek/lua/cookie_clicker.lua

local lcd = uni.lcd
local nav = uni.nav

-- Game variables
local cookies = 0
local total_cookies = 0
local cps = 0          -- cookies per second
local click_power = 1

local buildings = {
    {name = "Cursor",      count = 0, cost = 15,   base_prod = 0.1,   icon = "👆"},
    {name = "Grandma",     count = 0, cost = 100,  base_prod = 1,    icon = "👵"},
    {name = "Farm",        count = 0, cost = 500,  base_prod = 8,    icon = "🌾"},
    {name = "Mine",        count = 0, cost = 2000, base_prod = 40,   icon = "⛏️"},
    {name = "Factory",     count = 0, cost = 12000,base_prod = 200,  icon = "🏭"},
    {name = "Bank",        count = 0, cost = 45000,base_prod = 850,  icon = "🏦"},
    {name = "Temple",      count = 0, cost = 150000,base_prod = 3200, icon = "⛪"}
}

local upgrades = {
    {name = "Plastic Mouse",   cost = 200,   bought = false, effect = "click_power += 2"},
    {name = "Double Cookies",  cost = 800,   bought = false, effect = "click_power *= 2"},
    {name = "Quantum Oven",    cost = 4500,  bought = false, effect = "cps_multiplier = 1.5"},
    {name = "Galaxy Brain",    cost = 25000, bought = false, effect = "click_power *= 3"},
    {name = "Time Warp",       cost = 120000,bought = false, effect = "cps_multiplier = 2.5"}
}

local cps_multiplier = 1.0
local selected_item = 1
local last_time = 0
local frame = 0

function calculate_cps()
    local total = 0
    for i=1, #buildings do
        total = total + buildings[i].count * buildings[i].base_prod
    end
    return total * cps_multiplier
end

function buy_building(idx)
    local b = buildings[idx]
    if cookies >= b.cost then
        cookies = cookies - b.cost
        b.count = b.count + 1
        b.cost = math.floor(b.cost * 1.18)  -- increasing cost
        cps = calculate_cps()
    end
end

function buy_upgrade(idx)
    local u = upgrades[idx]
    if not u.bought and cookies >= u.cost then
        cookies = cookies - u.cost
        u.bought = true
        
        if u.name == "Plastic Mouse" then click_power = click_power + 2
        elseif u.name == "Double Cookies" then click_power = click_power * 2
        elseif u.name == "Quantum Oven" then cps_multiplier = cps_multiplier * 1.5
        elseif u.name == "Galaxy Brain" then click_power = click_power * 3
        elseif u.name == "Time Warp" then cps_multiplier = cps_multiplier * 2.5
        end
        
        cps = calculate_cps()
    end
end

function game_loop()
    while true do
        frame = frame + 1
        lcd.fillScreen(0x0000)
        
        -- Auto production every frame (smoothed)
        if frame % 8 == 0 then
            cookies = cookies + cps / 8
            total_cookies = total_cookies + cps / 8
        end
        
        -- Click with Button A
        if nav.getBtnA() then
            cookies = cookies + click_power
            total_cookies = total_cookies + click_power
            -- Visual click feedback
            lcd.fillCircle(120, 140, 28, 0xFFE0)
            uni.delay(40)
        end
        
        -- Button B: Buy selected item
        if nav.getBtnB() then
            if selected_item <= #buildings then
                buy_building(selected_item)
            else
                buy_upgrade(selected_item - #buildings)
            end
            uni.delay(120)
        end
        
        -- Cycle selection with A+B
        if nav.getBtnA() and nav.getBtnB() then
            selected_item = selected_item + 1
            if selected_item > #buildings + #upgrades then selected_item = 1 end
            uni.delay(150)
        end
        
        cps = calculate_cps()
        
        -- === DRAW ===
        -- Big cookie
        lcd.fillCircle(120, 140, 45, 0xFD20)
        lcd.fillCircle(120, 140, 38, 0xFFE0)
        lcd.drawString(112, 135, "🍪", 0x0000)
        
        -- Stats
        lcd.drawString(8, 8, "Cookies: " .. math.floor(cookies), 0xFFFF)
        lcd.drawString(8, 26, "Total: " .. math.floor(total_cookies), 0x07FF)
        lcd.drawString(8, 44, "CPS: " .. string.format("%.1f", cps), 0x07E0)
        lcd.drawString(8, 62, "Click: +" .. click_power, 0xF81F)
        
        -- Buildings list
        for i=1, #buildings do
            local b = buildings[i]
            local y = 90 + (i-1)*18
            local color = (selected_item == i) and 0xF81F or 0xFFFF
            
            lcd.drawString(8, y, b.icon .. " " .. b.name, color)
            lcd.drawString(155, y, "x" .. b.count, 0x07FF)
            lcd.drawString(195, y, math.floor(b.cost), 0xFFE0)
        end
        
        -- Upgrades section
        lcd.drawString(8, 225, "=== UPGRADES ===", 0xF800)
        for i=1, #upgrades do
            local u = upgrades[i]
            local idx = #buildings + i
            local y = 245 + (i-1)*16
            local color = (selected_item == idx) and 0xF81F or (u.bought and 0x4208 or 0x07FF)
            
            lcd.drawString(12, y, u.name, color)
            if not u.bought then
                lcd.drawString(195, y, math.floor(u.cost), 0xFFE0)
            else
                lcd.drawString(195, y, "✓", 0x07E0)
            end
        end
        
        lcd.push()
        uni.delay(45)
    end
end

-- Title Screen
lcd.fillScreen(0x0000)
lcd.drawString(55, 70, "GALACTIC", 0xF81F)
lcd.drawString(70, 95, "COOKIE", 0xFFE0)
lcd.drawString(72, 120, "CLICKER", 0x07FF)
lcd.drawString(45, 160, "A = Click Cookie", 0xFFFF)
lcd.drawString(45, 180, "B = Buy Selected", 0xFFFF)
lcd.drawString(40, 200, "A+B = Change Selection", 0xFFFF)
lcd.drawString(55, 240, "Press A or B to Start", 0x07E0)
lcd.push()

while not (nav.getBtnA() or nav.getBtnB()) do
    uni.delay(50)
end

game_loop()