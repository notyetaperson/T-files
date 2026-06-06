-- savedata.lua — uni.json + uni.path + uni.sd: persistent key/value store.
-- Survives reboots. Stored at /unigeek/games/savedata.json.

local lcd    = require("uni.lcd")
local nav    = require("uni.nav")
local sd     = require("uni.sd")
local input  = require("uni.input")
local dialog = require("uni.dialog")
local notify = require("uni.notify")
local json   = require("uni.json")
local path   = require("uni.path")

local SAVE_PATH = path.join("/unigeek", "games", "savedata.json")

local function _defaults()
  return { name = "Anon", count = 0 }
end

local function _load()
  if not sd.exists(SAVE_PATH) then return _defaults() end
  local raw = sd.read(SAVE_PATH)
  if not raw or #raw == 0 then return _defaults() end
  local t = json.decode(raw)
  return (type(t) == "table") and t or _defaults()
end

local function _save(state)
  sd.mkdir(path.dirname(SAVE_PATH))   -- ensures /unigeek/games exists
  sd.write(SAVE_PATH, json.encode(state))
end

local state = _load()

local W, H = lcd.w(), lcd.h()
local C_BG    = lcd.color(  0,   0,   0)
local C_FG    = lcd.color(255, 255, 255)
local C_GREEN = lcd.color( 60, 210,  80)
local C_DIM   = lcd.color(120, 120, 120)

local function _drawAll()
  lcd.fillScreen(C_BG)
  lcd.textSize(1)
  lcd.textColor(C_FG)
  lcd.print(2, 2, "Save data demo")
  lcd.textColor(C_GREEN, C_BG)
  lcd.print(2, 20, string.format("Name:  %-16s", state.name))
  lcd.print(2, 32, string.format("Count: %-10d", state.count))
  lcd.textColor(C_DIM)
  lcd.print(2, H - 34, "OK    rename")
  lcd.print(2, H - 22, "UP    +1 (auto-save)")
  lcd.print(2, H - 10, "DOWN  reset")
end

_drawAll()

while true do
  local btn = nav.btn()
  if btn == "back" then break end

  if btn == "ok" then
    local n = input.text("New name?", state.name)
    if n and #n > 0 then
      state.name = n
      _save(state)
      notify.show("saved", 600)
    end
    _drawAll()

  elseif btn == "up" then
    state.count = state.count + 1
    _save(state)
    -- Use the in-place text update path: textColor with bg + padding.
    lcd.textSize(1)
    lcd.textColor(C_GREEN, C_BG)
    lcd.print(2, 32, string.format("Count: %-10d", state.count))

  elseif btn == "down" then
    if dialog.confirm("Reset counter?") then
      state.count = 0
      _save(state)
      notify.show("reset", 500)
    end
    _drawAll()
  end

  uni.delay(16)
end
