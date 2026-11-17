# ============================================
# 第 8 課：繼電器控制
# ============================================
# 學習目標：
#   - 了解繼電器的功能和用途
#   - 學會控制繼電器的開和關
#   - 結合 LED、蜂鳴器做出同步效果
#
# 你會學到：
#   - 繼電器就像一個「電子開關」
#   - 它可以用小電壓（3.3V）控制大電壓（110V）的電器
#   - on() = 開，off() = 關
#   - 聽到「喀」一聲就是繼電器在切換
#
# 注意：這個範例只示範繼電器的切換，
#       沒有接 110V 的電器，很安全！
# ============================================

from lib.ezkit import *

print("=== 第 8 課：繼電器控制 ===")

oled.fill(0)
draw_border()
draw_text(oled, 16, 4, "繼電器展示")
draw_text(oled, 8, 28, "聽喀喀聲!")
oled.show()
time.sleep(1)

# --- 繼電器開關 5 次 ---
# 每次開關都搭配紅燈 + 蜂鳴器 + RGB LED

for i in range(5):
    # === 開 ===
    relay.on()                  # 繼電器開（會聽到「喀」一聲）
    led_red_pwm.duty(1023)      # 紅燈全亮
    buzzer.freq(600)
    buzzer.duty(256)            # 蜂鳴器小聲提示
    np_fill(255, 0, 0)          # RGB 亮紅色

    oled.fill_rect(4, 20, 120, 40, 0)
    draw_text(oled, 48, 24, "開")
    oled.fill_rect(20, 46, 88, 10, 1)   # 實心進度條=開
    oled.show()
    time.sleep(0.5)

    # === 關 ===
    relay.off()                 # 繼電器關（又聽到「喀」一聲）
    led_red_pwm.duty(0)         # 紅燈滅
    buzzer.duty(0)              # 蜂鳴器靜音
    np_clear()                  # RGB 滅

    oled.fill_rect(4, 20, 120, 40, 0)
    draw_text(oled, 48, 24, "停")
    oled.rect(20, 46, 88, 10, 1)        # 空心進度條=關
    oled.show()
    time.sleep(0.5)

relay.off()
all_leds_off()
oled_zh("第8課完成!", "", "你學會了:", "繼電器控制")
print("=== 第 8 課完成 ===")
