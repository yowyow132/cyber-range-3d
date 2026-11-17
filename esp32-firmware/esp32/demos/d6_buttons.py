# ============================================
# 第 6 課：按鈕互動
# ============================================
# 學習目標：
#   - 了解按鈕怎麼運作
#   - 學會偵測「按下」和「放開」
#   - 結合按鈕控制 LED、蜂鳴器、RGB
#
# 你會學到：
#   - 按鈕的 value() 讀值（0=按下, 1=沒按）
#   - 怎麼偵測「按下的瞬間」（邊緣偵測）
#   - while 迴圈做互動程式
#   - 用 time.ticks_ms() 計時
# ============================================

from lib.ezkit import *

print("=== 第 6 課：按鈕互動 ===")

# --- 第一部分：基本按鈕讀取 ---
# 按鈕接法：沒按 = 1（高電位），按下 = 0（低電位）

oled.fill(0)
draw_border()
draw_text(oled, 24, 4, "按鈕互動")
draw_text(oled, 8, 28, "按 A 或 B")
draw_text(oled, 24, 48, "等 10 秒")
oled.show()
time.sleep(0.5)

count_a = 0         # 記錄按鈕 A 被按了幾次
count_b = 0         # 記錄按鈕 B 被按了幾次
last_a = 1          # 上一次按鈕 A 的狀態
last_b = 1          # 上一次按鈕 B 的狀態
rgb_hue = 0         # RGB 的色相角度

# time.ticks_ms() 回傳開機到現在經過了幾毫秒（1000毫秒=1秒）
start = time.ticks_ms()

# 持續偵測 10 秒
while time.ticks_diff(time.ticks_ms(), start) < 10000:
    a = btn_a.value()   # 讀取按鈕 A（0=按下, 1=沒按）
    b = btn_b.value()   # 讀取按鈕 B
    remain = 10 - time.ticks_diff(time.ticks_ms(), start) // 1000

    # --- 偵測「按下的瞬間」---
    # 只有在狀態從 1 變成 0 的那一刻才算「按下」
    # 這樣按住不放只會算一次，不會一直重複計算

    if a == 0 and last_a == 1:      # A 剛被按下
        count_a += 1
        buzzer.freq(523)            # 發出「嗶」一聲
        buzzer.duty(512)
        time.sleep(0.05)
        buzzer.duty(0)

    if b == 0 and last_b == 1:      # B 剛被按下
        count_b += 1
        buzzer.freq(659)            # 發出不同音高的「嗶」
        buzzer.duty(512)
        time.sleep(0.05)
        buzzer.duty(0)

    last_a = a      # 記住這次的狀態，下次迴圈比較用
    last_b = b

    # --- 按住 A = 紅色呼吸燈 ---
    if a == 0:
        d = time.ticks_ms() % 2000
        if d > 1000:
            d = 2000 - d
        led_red_pwm.duty(d)
        np_fill(d * 255 // 1000, 0, 0)
    else:
        led_red_pwm.duty(0)

    # --- 按住 B = RGB 彩虹轉 ---
    if b == 0:
        for i in range(NUM_PIXELS):
            r, g, bb = hsv_to_rgb(rgb_hue + i * 120, 1.0, 0.3)
            np[i] = (r, g, bb)
        np.write()
        rgb_hue = (rgb_hue + 5) % 360
        led_blue_pwm.duty(512)
    else:
        if a != 0:
            np_clear()
        led_blue_pwm.duty(0)

    # --- 在 OLED 上顯示計數 ---
    oled.fill(0)
    draw_border()
    draw_text(oled, 24, 2, "按鈕互動")
    oled.text("A: {}".format(count_a), 12, 22, 1)
    oled.text("B: {}".format(count_b), 68, 22, 1)
    draw_progress_bar(8, 36, 90, 8, remain * 10)
    oled.text("{}s".format(remain), 102, 35, 1)
    oled.show()

    time.sleep(0.03)

all_leds_off()
oled_zh("第6課完成!", "A:{}次 B:{}次".format(count_a, count_b), "你學會了:", "按鈕+邊緣偵測")
print("=== 第 6 課完成 ===")
print("按鈕 A: {} 次, 按鈕 B: {} 次".format(count_a, count_b))
