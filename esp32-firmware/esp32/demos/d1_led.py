# ============================================
# 第 1 課：LED 燈控制
# ============================================
# 學習目標：
#   - 了解怎麼用程式控制 LED 開和關
#   - 學會用 PWM 控制 LED 的亮度（呼吸燈效果）
#
# 你會學到：
#   - Pin（腳位）的基本用法
#   - on() / off() 開關燈
#   - PWM 是什麼？怎麼用 duty 控制亮度
#   - for 迴圈和 time.sleep() 控制時間
# ============================================

from lib.ezkit import *

print("=== 第 1 課：LED 燈控制 ===")

# --- 第一部分：基本開關 ---
# LED 最簡單的用法就是 on() 和 off()

oled_zh("第1課", "LED 燈控制", "", "基本開關")
time.sleep(1)

# 紅黃藍三顆 LED 輪流亮（跑馬燈）
for _ in range(3):          # 重複 3 次
    led_red.on()            # 紅燈亮
    time.sleep(0.3)         # 等 0.3 秒
    led_red.off()           # 紅燈滅

    led_yellow.on()         # 黃燈亮
    time.sleep(0.3)
    led_yellow.off()

    led_blue.on()           # 藍燈亮
    time.sleep(0.3)
    led_blue.off()

print("跑馬燈完成！")
time.sleep(0.5)

# --- 第二部分：PWM 呼吸燈 ---
# PWM 就像快速開關燈，開的時間越長就越亮
# duty 值：0 = 全暗，1023 = 最亮

oled.fill(0)
draw_border()
draw_text(oled, 16, 4, "呼吸燈效果")
oled.show()

# 用一個表來記錄三顆 LED 和它們的名字
leds = [
    (led_red_pwm, "紅"),
    (led_yellow_pwm, "黃"),
    (led_blue_pwm, "藍"),
]

# 每顆 LED 各做一次呼吸效果
for led, name in leds:
    # 漸漸變亮（duty 從 0 增加到 1023）
    for duty in range(0, 1024, 16):
        led.duty(duty)      # 設定亮度
        pct = duty * 100 // 1023
        oled.fill_rect(4, 20, 120, 44, 0)
        draw_text(oled, 24, 20, "{}燈".format(name))
        draw_progress_bar(4, 40, 88, 14, pct)
        oled.text("{:>3}%".format(pct), 96, 43, 1)
        oled.show()
        time.sleep(0.01)

    # 漸漸變暗（duty 從 1023 減少到 0）
    for duty in range(1023, -1, -16):
        led.duty(duty)
        pct = duty * 100 // 1023
        oled.fill_rect(4, 20, 120, 44, 0)
        draw_text(oled, 24, 20, "{}燈".format(name))
        draw_progress_bar(4, 40, 88, 14, pct)
        oled.text("{:>3}%".format(pct), 96, 43, 1)
        oled.show()
        time.sleep(0.01)

    led.duty(0)             # 確保燈滅
    time.sleep(0.2)

# 三顆同時呼吸
oled.fill_rect(4, 20, 120, 20, 0)
draw_text(oled, 8, 24, "同時呼吸中")
oled.show()

for _ in range(2):
    for duty in range(0, 1024, 16):
        led_red_pwm.duty(duty)
        led_yellow_pwm.duty(duty)
        led_blue_pwm.duty(duty)
        time.sleep(0.005)
    for duty in range(1023, -1, -16):
        led_red_pwm.duty(duty)
        led_yellow_pwm.duty(duty)
        led_blue_pwm.duty(duty)
        time.sleep(0.005)

all_leds_off()
oled_zh("第1課完成!", "", "你學會了:", "LED 開關+呼吸燈")
print("=== 第 1 課完成 ===")
