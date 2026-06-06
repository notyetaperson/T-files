-- inputs.lua — demo of uni.input, uni.dialog, uni.notify.
-- Press OK to open a select menu, pick a prompt type, see the result toast.
-- Press BACK to exit.

local lcd    = require("uni.lcd")
local nav    = require("uni.nav")
local input  = require("uni.input")
local dialog = require("uni.dialog")
local notify = require("uni.notify")

local W, H = lcd.w(), lcd.h()
local C_BG  = lcd.color(  0,   0,   0)
local C_FG  = lcd.color(255, 255, 255)
local C_DIM = lcd.color(120, 120, 120)

local function _drawChrome()
  lcd.fillScreen(C_BG)
  lcd.textSize(1)
  lcd.textColor(C_FG)
  lcd.print(2, 2,  "Tier-2 input demo")
  lcd.textColor(C_DIM)
  lcd.print(2, H - 22, "OK   open menu")
  lcd.print(2, H - 10, "BACK exit")
end

_drawChrome()

while true do
  local btn = nav.btn()
  if btn == "back" then break end

  if btn == "ok" then
    local pick = dialog.select("Pick a prompt", {
      "Text",
      "Number",
      "Hex",
      "IP",
      "Confirm",
    })

    if pick == "Text" then
      local name = input.text("Your name?", "Anon")
      if name then notify.show("hi " .. name, 1000) end

    elseif pick == "Number" then
      local age = input.number("Age?", 0, 120, 18)
      if age then notify.show("got " .. age, 1000) end

    elseif pick == "Hex" then
      local h = input.hex("Hex value?", "DEADBEEF")
      if h then notify.show("hex: " .. h, 1000) end

    elseif pick == "IP" then
      local ip = input.ip("Server IP?", "192.168.1.1")
      if ip then notify.show("ip: " .. ip, 1000) end

    elseif pick == "Confirm" then
      if dialog.confirm("Are you sure?") then
        notify.show("yes!", 800)
      else
        notify.show("no / cancelled", 800)
      end
    end

    -- Touch-board popups wipe the full screen on exit; redraw the chrome.
    _drawChrome()
  end

  uni.delay(16)
end
