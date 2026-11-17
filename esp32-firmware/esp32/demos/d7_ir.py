# ============================================
# 第 7 課：紅外線接收
# ============================================
# 學習目標：
#   - 了解紅外線遙控器的原理
#   - 學會偵測紅外線訊號
#   - 收到訊號時做出反應（燈光+聲音）
#
# 你會學到：
#   - 紅外線接收器的基本用法
#   - 跟按鈕類似的邊緣偵測技巧
#   - 結合多個元件做出互動效果
# ============================================

from lib.ezkit import *

print("=== 第 7 課：紅外線接收 ===")

# 紅外線遙控器發出人眼看不到的光（紅外線）
# 板子上的紅外線接收器會偵測到這些光
# 當收到訊號時，ir_pin.value() 會從 1 變成 0

oled.fill(0)
draw_border()
draw_text(oled, 8, 4, "紅外線接收")
draw_text(oled, 8, 28, "按遙控器!")
draw_text(oled, 24, 48, "等 8 秒")
oled.show()

count = 0           # 收到幾次訊號
last_val = 1        # 上一次的狀態
start = time.ticks_ms()

# 持續偵測 15 秒
while time.ticks_diff(time.ticks_ms(), start) < 15000:
    val = ir_pin.value()    # 讀取紅外線接收器

    # 偵測訊號的瞬間（從 1 變成 0）
    if val == 0 and last_val == 1:
        count += 1

        # 收到訊號 → 三顆 RGB 亮不同顏色
        for i in range(NUM_PIXELS):
            r, g, b = hsv_to_rgb(count * 40 + i * 120, 1.0, 0.3)
            np[i] = (r, g, b)
        np.write()

        # 藍燈閃一下 + 嗶一聲
        led_blue_pwm.duty(1023)
        buzzer.freq(800)
        buzzer.duty(512)
        time.sleep(0.05)
        buzzer.duty(0)
        led_blue_pwm.duty(0)

        # 在 OLED 上顯示
        oled.fill(0)
        draw_border()
        draw_text(oled, 8, 4, "紅外線接收")
        draw_text(oled, 8, 28, "收到信號!")
        oled.text("x {}".format(count), 48, 50, 1)
        oled.show()

        print("收到紅外線訊號！第 {} 次".format(count))

    last_val = val
    time.sleep(0.01)    # 短暫等待，避免重複偵測

np_clear()
oled_zh("第7課完成!", "收到{}次信號".format(count), "你學會了:", "紅外線接收")
print("=== 第 7 課完成 ===")
