# ============================================
# 第 5 課：感測器讀取
# ============================================
# 學習目標：
#   - 了解怎麼讀取感測器的數值
#   - 學會使用 DHT11 量溫度和濕度
#   - 學會使用光敏電阻和可變電阻
#   - 把數值顯示在 OLED 上
#
# 你會學到：
#   - ADC（類比轉數位）的概念
#   - DHT11 的用法（measure → 讀值）
#   - 怎麼在 OLED 上畫簡單的圖表
#   - try / except 錯誤處理
# ============================================

from lib.ezkit import *

print("=== 第 5 課：感測器讀取 ===")

oled.fill(0)
draw_border()
draw_text(oled, 16, 4, "感測器讀取")
oled.show()
time.sleep(1)

# --- 第一部分：可變電阻（旋鈕）---
# 可變電阻就是一個旋鈕，轉動時電壓會改變
# ADC 把電壓轉成數字：0（最小）到 4095（最大）

oled_zh("旋鈕讀取", "", "轉動旋鈕!")
time.sleep(0.5)

for _ in range(30):
    pot = potentiometer.read()       # 讀取旋鈕的值（0~4095）
    pct = pot * 100 // 4095          # 轉成百分比

    oled.fill(0)
    draw_border()
    draw_text(oled, 16, 2, "旋鈕控制")
    oled.text("{}".format(pot), 48, 22, 1)
    draw_progress_bar(8, 34, 112, 10, pct)
    draw_text(oled, 24, 48, "{}%".format(pct))
    oled.show()
    time.sleep(0.15)

time.sleep(0.3)

# --- 第二部分：光敏電阻 ---
# 光敏電阻會根據光線強弱改變電阻值
# 光線越亮，讀到的數字越大（或越小，看電路接法）

oled_zh("光線感測", "", "用手遮光試試!")
time.sleep(1)

light_history = []  # 記錄歷史數值，用來畫圖表

for _ in range(30):
    light = light_sensor.read()      # 讀取光線值
    light_history.append(light)
    if len(light_history) > 15:
        light_history.pop(0)         # 只保留最近 15 筆

    oled.fill(0)
    draw_text(oled, 0, 0, "光線")
    oled.text("{}".format(light), 40, 4, 1)

    # 畫歷史圖表（長條圖）
    if len(light_history) > 1:
        max_v = max(light_history) or 1
        for j in range(len(light_history)):
            bar_h = light_history[j] * 30 // max_v
            x = 8 + j * 7
            oled.fill_rect(x, 55 - bar_h, 6, bar_h, 1)
    oled.hline(8, 55, 120, 1)
    oled.show()
    time.sleep(0.3)

time.sleep(0.3)

# --- 第三部分：DHT11 溫濕度 ---
# DHT11 可以同時量溫度和濕度
# 用法：先呼叫 measure()，再分別讀 temperature() 和 humidity()
# 注意：DHT11 每次讀取要間隔至少 1 秒

oled_zh("溫濕度感測")
time.sleep(0.5)

for _ in range(8):
    light = light_sensor.read()
    pot = potentiometer.read()

    # try/except 是錯誤處理
    # 如果 DHT11 讀取失敗（例如感測器壞了），程式不會當掉
    try:
        dht_sensor.measure()                # 先量測
        temp = dht_sensor.temperature()     # 再讀溫度
        humi = dht_sensor.humidity()        # 再讀濕度
    except Exception:
        temp = "--"
        humi = "--"

    # RGB LED 依溫度變色（冷=藍，熱=紅）
    if isinstance(temp, int):
        for i in range(NUM_PIXELS):
            hue = max(0, min(240, 240 - temp * 6)) + i * 20
            r, g, b = hsv_to_rgb(hue, 1.0, 0.2)
            np[i] = (r, g, b)
        np.write()

    # 在 OLED 上顯示所有感測器數值
    oled.fill(0)
    draw_text(oled, 0, 0, "溫度{}C".format(temp))
    draw_text(oled, 0, 16, "濕度{}%".format(humi))
    draw_text(oled, 0, 32, "光線{}".format(light))
    oled.text("Pot:{}".format(pot), 0, 52, 1)
    oled.show()

    print("溫度:{}C 濕度:{}% 光線:{} 旋鈕:{}".format(temp, humi, light, pot))
    time.sleep(1.2)

np_clear()
oled_zh("第5課完成!", "", "你學會了:", "感測器讀取")
print("=== 第 5 課完成 ===")
