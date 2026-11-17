# ============================================
# 第 2 課：RGB 全彩 LED
# ============================================
# 學習目標：
#   - 了解 WS2812 RGB LED 怎麼運作
#   - 學會用紅綠藍三原色混出任何顏色
#   - 用 HSV 色彩模型更直覺地選顏色
#
# 你會學到：
#   - RGB 三原色混色的概念
#   - NeoPixel 的基本用法
#   - HSV 色彩轉換（用「色相」選顏色更方便）
#   - 三顆 LED 各自顯示不同顏色
# ============================================

from lib.ezkit import *

print("=== 第 2 課：RGB 全彩 LED ===")

# --- 第一部分：基本顏色 ---
# 每顆 RGB LED 用 (紅, 綠, 藍) 三個數字設定顏色
# 每個數字 0~255，0=不亮，255=最亮
# 例如：(255, 0, 0) = 純紅色

oled_zh("第2課", "RGB 全彩 LED", "", "基本顏色")
time.sleep(1)

# 顯示基本顏色
colors = [
    ((255, 0, 0),   "紅色"),
    ((0, 255, 0),   "綠色"),
    ((0, 0, 255),   "藍色"),
    ((255, 255, 0), "黃色"),    # 紅+綠=黃
    ((0, 255, 255), "青色"),    # 綠+藍=青
    ((255, 0, 255), "紫色"),    # 紅+藍=紫
    ((255, 255, 255), "白色"),  # 全部混=白
]

for color, name in colors:
    np_fill(*color)                     # 三顆都亮同一色
    oled_zh("第2課", "RGB LED", name)
    time.sleep(0.6)

np_clear()
time.sleep(0.3)

# --- 第二部分：三顆各自不同顏色 ---
oled_zh("", "三顆各自顯色")
time.sleep(0.5)

np[0] = (255, 0, 0)    # 第 1 顆：紅色
np[1] = (0, 255, 0)    # 第 2 顆：綠色
np[2] = (0, 0, 255)    # 第 3 顆：藍色
np.write()              # 記得要 write() 才會更新
time.sleep(1.5)

# --- 第三部分：彩虹漸變 ---
# 用 HSV 色彩模型，只要改「色相 h」就能跑完所有顏色
# h=0 紅色，h=120 綠色，h=240 藍色，h=360 又回到紅色

oled.fill(0)
draw_border()
draw_text(oled, 24, 4, "彩虹漸變")
oled.show()

# 三顆 LED 各偏移 120 度，所以會同時顯示三種不同顏色
for hue in range(0, 720, 3):
    for i in range(NUM_PIXELS):
        r, g, b = hsv_to_rgb(hue + i * 120, 1.0, 0.3)
        np[i] = (r, g, b)
    np.write()

    # 在 OLED 上顯示每顆 LED 的 RGB 數值
    oled.fill_rect(4, 18, 120, 44, 0)
    for i in range(NUM_PIXELS):
        r, g, b = hsv_to_rgb(hue + i * 120, 1.0, 0.3)
        y = 20 + i * 14
        oled.text("L{}".format(i + 1), 4, y, 1)
        oled.text("R{} G{} B{}".format(r, g, b), 24, y, 1)
    oled.show()
    time.sleep(0.02)

# --- 第四部分：追逐閃爍 ---
oled.fill_rect(4, 20, 120, 40, 0)
draw_text(oled, 24, 32, "閃爍效果")
oled.show()

# 三顆輪流亮（追逐效果）
for j in range(12):
    for i in range(NUM_PIXELS):
        if i == j % NUM_PIXELS:
            r, g, b = hsv_to_rgb(j * 30, 1.0, 0.3)
            np[i] = (r, g, b)
        else:
            np[i] = (0, 0, 0)
    np.write()
    time.sleep(0.2)

# 三顆同時閃
for k in range(4):
    r, g, b = hsv_to_rgb(k * 90, 1.0, 0.3)
    np_fill(r, g, b)
    time.sleep(0.15)
    np_clear()
    time.sleep(0.1)

np_clear()
oled_zh("第2課完成!", "", "你學會了:", "RGB混色+彩虹")
print("=== 第 2 課完成 ===")
