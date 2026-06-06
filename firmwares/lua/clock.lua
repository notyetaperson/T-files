-- clock.lua — uni.time + uni.config: digital clock that picks up the device
-- theme colour and name.
-- Tip: if the time reads as 1970-01-01, the RTC hasn't been synced yet —
-- connect to WiFi once (e.g. via Manage WebAuthn > BIP39 Generate or any
-- WiFi screen) so NTP can set the clock.

local lcd    = require("uni.lcd")
local nav    = require("uni.nav")
local time   = require("uni.time")
local config = require("uni.config")

local W, H = lcd.w(), lcd.h()
local C_BG    = lcd.color(  0,   0,   0)
local C_DIM   = lcd.color(120, 120, 120)
local C_THEME = config.get("theme_color")
local NAME    = config.get("device_name")

local DAYS = { [0]="Sun", [1]="Mon", [2]="Tue", [3]="Wed", [4]="Thu", [5]="Fri", [6]="Sat" }

lcd.fillScreen(C_BG)
lcd.textSize(1)
lcd.textColor(C_DIM, C_BG)
lcd.textDatum(4)   -- middle-centre
lcd.print(math.floor(W / 2), math.floor(H / 2) + 28, NAME)
lcd.textDatum(0)

local lastSec = -1

while true do
  local btn = nav.btn()
  if btn == "back" then break end

  local t = time.now()
  if t.sec ~= lastSec then
    lastSec = t.sec

    local clock = string.format("%02d:%02d:%02d", t.hour, t.min, t.sec)
    local date  = string.format("%s  %04d-%02d-%02d",
                  DAYS[t.wday] or "?", t.year, t.month, t.day)

    lcd.textDatum(4)
    lcd.textSize(2)
    lcd.textColor(C_THEME, C_BG)
    lcd.print(math.floor(W / 2), math.floor(H / 2) - 12, clock)

    lcd.textSize(1)
    lcd.textColor(C_DIM, C_BG)
    lcd.print(math.floor(W / 2), math.floor(H / 2) + 12, date)
    lcd.textDatum(0)
  end

  -- 50 ms is fine — we only need to catch each second tick.
  uni.delay(50)
end
