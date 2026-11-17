# ============================================
# OLED 可愛小貓咪動畫 (Cute Cat Animation)
# ============================================
from lib.ezkit import *
import time

def draw_circle(x0, y0, r, c=1):
    x = r
    y = 0
    err = 0
    while x >= y:
        oled.pixel(x0 + x, y0 + y, c)
        oled.pixel(x0 + y, y0 + x, c)
        oled.pixel(x0 - y, y0 + x, c)
        oled.pixel(x0 - x, y0 + y, c)
        oled.pixel(x0 - x, y0 - y, c)
        oled.pixel(x0 - y, y0 - x, c)
        oled.pixel(x0 + y, y0 - x, c)
        oled.pixel(x0 + x, y0 - y, c)
        if err <= 0:
            y += 1
            err += 2 * y + 1
        if err > 0:
            x -= 1
            err -= 2 * x + 1

def fill_circle(x0, y0, r, c=1):
    x = r
    y = 0
    err = 0
    while x >= y:
        oled.hline(x0 - x, y0 + y, 2 * x + 1, c)
        oled.hline(x0 - x, y0 - y, 2 * x + 1, c)
        oled.hline(x0 - y, y0 + x, 2 * y + 1, c)
        oled.hline(x0 - y, y0 - x, 2 * y + 1, c)
        if err <= 0:
            y += 1
            err += 2 * y + 1
        if err > 0:
            x -= 1
            err -= 2 * x + 1

def draw_cat(blink=False, whisker_offset=0):
    oled.fill(0)
    
    # 頂端文字
    oled.text("MEOW! Hello~", 16, 2, 1)

    # 1. 貓耳朵 (外耳 + 內耳)
    # 左耳
    oled.line(44, 20, 38, 5, 1)
    oled.line(38, 5, 54, 16, 1)
    oled.line(42, 18, 40, 9, 1)
    oled.line(40, 9, 50, 16, 1)
    
    # 右耳
    oled.line(84, 20, 90, 5, 1)
    oled.line(90, 5, 74, 16, 1)
    oled.line(86, 18, 88, 9, 1)
    oled.line(88, 9, 78, 16, 1)

    # 2. 貓臉 (實心圓臉底 + 黑色清出層次)
    fill_circle(64, 34, 21, 1)
    fill_circle(64, 34, 19, 0)
    draw_circle(64, 34, 21, 1)

    # 3. 貓眼睛
    if not blink:
        # 大大明亮的雙眼
        fill_circle(54, 31, 4, 1)
        fill_circle(74, 31, 4, 1)
        # 眼神光高光點
        oled.pixel(53, 30, 0)
        oled.pixel(73, 30, 0)
    else:
        # 開心眨眼笑瞇瞇 (^ ^)
        oled.line(50, 32, 54, 29, 1)
        oled.line(54, 29, 58, 32, 1)
        oled.line(70, 32, 74, 29, 1)
        oled.line(74, 29, 78, 32, 1)

    # 4. 貓鼻子 (小三角)
    oled.pixel(64, 37, 1)
    oled.line(63, 36, 65, 36, 1)

    # 5. 貓咪嘴巴 (w 形狀)
    oled.pixel(63, 39, 1)
    oled.pixel(65, 39, 1)
    oled.pixel(62, 40, 1)
    oled.pixel(66, 40, 1)
    oled.pixel(61, 39, 1)
    oled.pixel(67, 39, 1)

    # 6. 可愛鬍鬚 (帶微動態偏移)
    # 左鬍鬚
    oled.line(42, 35, 20, 32 + whisker_offset, 1)
    oled.line(41, 38, 18, 38, 1)
    oled.line(42, 41, 20, 44 - whisker_offset, 1)
    # 右鬍鬚
    oled.line(86, 35, 108, 32 + whisker_offset, 1)
    oled.line(87, 38, 110, 38, 1)
    oled.line(86, 41, 108, 44 - whisker_offset, 1)

    # 7. 小貓爪爪 (搭在下方)
    # 左爪
    oled.fill_rect(46, 52, 9, 5, 1)
    oled.pixel(49, 54, 0)
    oled.pixel(52, 54, 0)
    # 右爪
    oled.fill_rect(73, 52, 9, 5, 1)
    oled.pixel(76, 54, 0)
    oled.pixel(79, 54, 0)

    # 底部可愛符號
    oled.text("(=^..^=)", 32, 56, 1)

    oled.show()

print("Cute Cat Started!")
# 循環動畫：眨眼與動動鬍鬚
count = 0
while True:
    count += 1
    # 每 7 次眨一次眼睛
    is_blinking = (count % 7 == 0)
    w_offset = 1 if (count % 2 == 0) else -1
    
    draw_cat(blink=is_blinking, whisker_offset=w_offset)
    
    if is_blinking:
        time.sleep(0.25)
    else:
        time.sleep(0.5)
