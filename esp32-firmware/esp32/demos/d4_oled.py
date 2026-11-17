# ============================================
# 第 4 課：OLED 螢幕顯示
# ============================================
# 學習目標：
#   - 了解 OLED 螢幕的基本操作
#   - 學會顯示文字、畫圖形
#   - 學會顯示中文字
#   - 做出動畫效果（捲動、打字機）
#
# 你會學到：
#   - oled.text() 顯示英文
#   - draw_text() 顯示中文
#   - oled.rect() / fill_rect() 畫方框
#   - oled.pixel() 畫點
#   - oled.show() 把畫面送出去
#   - 動畫的原理：不斷清除→重畫→顯示
# ============================================

from lib.ezkit import *

print("=== 第 4 課：OLED 螢幕顯示 ===")

# --- 第一部分：基本文字 ---
# oled.text("文字", x, y, 顏色)
# x = 水平位置（0~127），y = 垂直位置（0~63）
# 顏色：1=白色（亮），0=黑色（暗）

oled.fill(0)                    # 清空螢幕（填滿黑色）
oled.text("Hello ESP32!", 0, 0, 1)
oled.text("OLED 128x64", 0, 16, 1)
oled.text("Line 3", 0, 32, 1)
oled.text("Line 4", 0, 48, 1)
oled.show()                     # 記得要 show() 才會顯示
time.sleep(2)

# --- 第二部分：顯示中文 ---
# 內建的 oled.text() 只能顯示英文
# 要顯示中文，我們用自己做的 draw_text()
# 每個中文字佔 16x16 像素，一行最多 8 個字

oled.fill(0)
draw_text(oled, 0, 0, "你好世界")      # 顯示不了？因為字型檔沒有這些字
draw_text(oled, 0, 16, "歡迎")         # 這些字在字型檔裡有
draw_text(oled, 0, 32, "溫度 25C")     # 中英文混合也可以
draw_text(oled, 0, 48, "亮度 80%")
oled.show()
time.sleep(2)

# --- 第三部分：畫圖形 ---
oled.fill(0)

# 畫空心方框
oled.rect(0, 0, 40, 20, 1)             # (x, y, 寬, 高, 顏色)

# 畫實心方框
oled.fill_rect(50, 0, 40, 20, 1)

# 畫水平線
oled.hline(0, 30, 128, 1)              # (x, y, 長度, 顏色)

# 畫垂直線
oled.vline(64, 32, 32, 1)              # (x, y, 長度, 顏色)

# 畫單獨的點（像素）
for i in range(10):
    oled.pixel(100 + i, 5 + i, 1)      # 畫一條斜線

oled.text("Shapes!", 0, 50, 1)
oled.show()
time.sleep(2)

# --- 第四部分：進度條 ---
oled.fill(0)
draw_border()
draw_text(oled, 16, 4, "進度條展示")
oled.show()

# 進度從 0% 到 100%
for pct in range(101):
    oled.fill_rect(4, 24, 120, 38, 0)  # 清除整個區域
    draw_progress_bar(4, 26, 88, 16, pct)
    oled.text("{:>3}%".format(pct), 96, 30, 1)
    oled.show()
    time.sleep(0.03)

time.sleep(0.5)

# --- 第五部分：數學動畫 ---
# 用 sin() 和 cos() 三角函數來畫旋轉的圖形
# 這就是數學在程式裡的應用！
import math

# 旋轉指針（像時鐘）
# 原理：圓上的點 = (中心x + 半徑 * cos(角度), 中心y + 半徑 * sin(角度))
# 時鐘的 0 度在 12 點鐘方向，所以要減 90 度
cx, cy = 32, 32     # 圓心位置
radius = 24          # 半徑

oled.fill(0)
draw_text(oled, 68, 0, "旋轉")
oled.text("sin/cos", 68, 20, 1)

for angle in list(range(0, 360, 3)) + [360]:
    # 減 90 度讓 0 度從 12 點鐘方向開始
    rad = math.radians(angle - 90)
    x = int(cx + radius * math.cos(rad))
    y = int(cy + radius * math.sin(rad))

    # 畫圓形外框
    oled.fill_rect(0, 0, 64, 64, 0)
    for a2 in range(0, 360, 15):
        r2 = math.radians(a2 - 90)
        ox = int(cx + radius * math.cos(r2))
        oy = int(cy + radius * math.sin(r2))
        oled.pixel(ox, oy, 1)

    # 畫 12 點的標記（小線段）
    for mark in range(0, 360, 90):
        mr = math.radians(mark - 90)
        mx1 = int(cx + 20 * math.cos(mr))
        my1 = int(cy + 20 * math.sin(mr))
        mx2 = int(cx + 24 * math.cos(mr))
        my2 = int(cy + 24 * math.sin(mr))
        oled.pixel(mx1, my1, 1)
        oled.pixel(mx2, my2, 1)

    # 畫指針
    steps = 20
    for s in range(steps + 1):
        px = int(cx + (x - cx) * s / steps)
        py = int(cy + (y - cy) * s / steps)
        oled.pixel(px, py, 1)

    oled.fill_rect(x - 1, y - 1, 3, 3, 1)

    # 右邊顯示角度
    oled.fill_rect(68, 32, 60, 20, 0)
    oled.text("{}deg".format(angle), 68, 36, 1)
    oled.show()
    if angle == 360:
        time.sleep(1)       # 360 度停留久一點
    else:
        time.sleep(0.01)

time.sleep(0.3)

# 正弦波動畫
# sin() 函數畫出來就是一個波浪形
oled.fill(0)
oled.text("sin() wave", 24, 0, 1)

for offset in range(0, 120, 2):
    oled.fill_rect(0, 12, 128, 52, 0)
    oled.hline(0, 38, 128, 1)          # 中線

    # 畫正弦波
    for x in range(128):
        rad = math.radians((x + offset) * 4)
        y = int(38 + 20 * math.sin(rad))
        oled.pixel(x, y, 1)

    # 第二條波（頻率不同，展示疊加）
    for x in range(128):
        rad = math.radians((x + offset) * 6)
        y = int(38 + 10 * math.sin(rad))
        oled.pixel(x, y, 1)

    oled.show()
    time.sleep(0.02)

time.sleep(0.3)

# 旋轉方塊 + 三角形
# 用 sin/cos 旋轉每個角的座標
oled.fill(0)
oled.text("rotate shapes", 16, 0, 1)

def draw_rotating_shape(corners, center_x, center_y, angle):
    """旋轉並畫出一個多邊形"""
    rad = math.radians(angle)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)
    pts = []
    for ox, oy in corners:
        rx = int(center_x + ox * cos_a - oy * sin_a)
        ry = int(center_y + ox * sin_a + oy * cos_a)
        pts.append((rx, ry))
    # 畫每條邊
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        steps = max(abs(x2 - x1), abs(y2 - y1)) or 1
        for s in range(steps + 1):
            px = int(x1 + (x2 - x1) * s / steps)
            py = int(y1 + (y2 - y1) * s / steps)
            if 0 <= px < 128 and 0 <= py < 64:
                oled.pixel(px, py, 1)

# 方塊的四個角
box = [(-14, -14), (14, -14), (14, 14), (-14, 14)]
# 三角形的三個角
tri = [(0, -16), (14, 12), (-14, 12)]

for angle in range(0, 360, 2):
    oled.fill_rect(0, 12, 128, 52, 0)

    # 左邊：旋轉方塊
    draw_rotating_shape(box, 32, 38, angle)

    # 右邊：旋轉三角形（反方向轉）
    draw_rotating_shape(tri, 96, 38, -angle)

    oled.show()
    time.sleep(0.015)

time.sleep(0.5)

# --- 第六部分：星空 ---
import random

oled.fill(0)
oled.text("starry sky", 24, 0, 1)
oled.show()
time.sleep(0.3)

# 產生 60 顆星星，每顆有位置和閃爍速度
stars = []
for _ in range(60):
    sx = random.randint(0, 127)
    sy = random.randint(8, 63)
    speed = random.randint(1, 5)    # 閃爍速度
    stars.append([sx, sy, speed, 0])  # x, y, speed, phase

for frame in range(80):
    oled.fill(0)
    oled.text("starry sky", 24, 0, 1)
    for s in stars:
        # 用 sin 做閃爍（亮→暗→亮）
        s[3] += s[2]
        brightness = math.sin(s[3] * 0.1)
        if brightness > 0.3:
            oled.pixel(s[0], s[1], 1)
            # 亮的星星畫十字
            if brightness > 0.8:
                for d in [(-1,0),(1,0),(0,-1),(0,1)]:
                    nx, ny = s[0]+d[0], s[1]+d[1]
                    if 0 <= nx < 128 and 8 <= ny < 64:
                        oled.pixel(nx, ny, 1)
    oled.show()
    time.sleep(0.04)

time.sleep(0.3)

# --- 第七部分：螢火蟲 ---
# 每隻螢火蟲有位置、速度、亮度週期

oled.fill(0)
oled.text("firefly", 36, 0, 1)
oled.show()
time.sleep(0.3)

flies = []
for _ in range(15):
    fx = random.randint(10, 118)
    fy = random.randint(12, 58)
    vx = (random.randint(0, 10) - 5) / 5.0   # 速度 -1.0 ~ 1.0
    vy = (random.randint(0, 10) - 5) / 5.0
    phase = random.randint(0, 100)
    flies.append([float(fx), float(fy), vx, vy, phase])

for frame in range(120):
    oled.fill(0)

    for f in flies:
        # 移動
        f[0] += f[2]
        f[1] += f[3]
        # 碰到邊緣反彈
        if f[0] < 2 or f[0] > 125:
            f[2] = -f[2]
        if f[1] < 2 or f[1] > 61:
            f[3] = -f[3]
        # 隨機改變方向（像螢火蟲飄動）
        if random.randint(0, 10) == 0:
            f[2] += (random.randint(0, 10) - 5) / 10.0
            f[3] += (random.randint(0, 10) - 5) / 10.0
            # 限速
            f[2] = max(-1.5, min(1.5, f[2]))
            f[3] = max(-1.5, min(1.5, f[3]))

        # 閃爍亮度
        f[4] += 3
        glow = math.sin(f[4] * 0.05)
        ix, iy = int(f[0]), int(f[1])

        if glow > 0:
            # 畫光暈（中心亮，周圍漸暗）
            oled.pixel(ix, iy, 1)
            if glow > 0.3:
                for d in [(-1,0),(1,0),(0,-1),(0,1)]:
                    nx, ny = ix+d[0], iy+d[1]
                    if 0 <= nx < 128 and 0 <= ny < 64:
                        oled.pixel(nx, ny, 1)
            if glow > 0.7:
                for d in [(-1,-1),(1,-1),(-1,1),(1,1)]:
                    nx, ny = ix+d[0], iy+d[1]
                    if 0 <= nx < 128 and 0 <= ny < 64:
                        oled.pixel(nx, ny, 1)

    oled.show()
    time.sleep(0.03)

time.sleep(0.3)

# --- 第八部分：文字旋轉 ---
from lib.zhfont import FONT
import framebuf

def get_char_pixels(ch, scale=1):
    """取出中文字的亮點座標（放大版，相對於中心）"""
    pixels = []
    if ch in FONT:
        data = FONT[ch]
        for row in range(16):
            val = (data[row * 2] << 8) | data[row * 2 + 1]
            for col in range(16):
                if val & (1 << (15 - col)):
                    for dy in range(scale):
                        for dx in range(scale):
                            px = (col * scale + dx) - 8 * scale
                            py = (row * scale + dy) - 8 * scale
                            pixels.append((px, py))
    return pixels

def get_text_pixels(text, scale=2):
    """取出英文字的亮點座標（用內建字型渲染後讀取）"""
    w = len(text) * 8
    h = 8
    buf = bytearray(w * h // 8 + w)
    fb = framebuf.FrameBuffer(buf, w, h, framebuf.MONO_HLSB)
    fb.fill(0)
    fb.text(text, 0, 0, 1)
    pixels = []
    cx = w * scale // 2
    cy = h * scale // 2
    for row in range(h):
        for col in range(w):
            if fb.pixel(col, row):
                for dy in range(scale):
                    for dx in range(scale):
                        px = col * scale + dx - cx
                        py = row * scale + dy - cy
                        pixels.append((px, py))
    return pixels

# 旋轉「好」— 放大 3 倍
pixels = get_char_pixels("好", 3)
cx2, cy2 = 64, 32

oled.fill(0)
oled.text("rotate text", 20, 0, 1)
oled.show()
time.sleep(0.3)

for angle in range(0, 720, 4):
    rad = math.radians(angle)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)
    scale = 0.6 + 0.6 * math.sin(math.radians(angle))

    oled.fill(0)
    for ox, oy in pixels:
        rx = int(cx2 + (ox * cos_a - oy * sin_a) * scale)
        ry = int(cy2 + (ox * sin_a + oy * cos_a) * scale)
        if 0 <= rx < 128 and 0 <= ry < 64:
            oled.pixel(rx, ry, 1)
    oled.show()
    time.sleep(0.01)

time.sleep(0.3)

# --- 第九部分：粒子效果 ---
# "GOOD" 粒子組合 + 爆炸

all_targets = []
target_pixels = get_char_pixels("好", 3)
for ox, oy in target_pixels:
    tx = cx2 + ox
    ty = cy2 + oy
    sx = random.randint(0, 127)
    sy = random.randint(0, 63)
    all_targets.append([sx, sy, tx, ty])

oled.fill(0)
oled.text("particle", 32, 0, 1)
oled.show()
time.sleep(0.3)

# 組合
for frame in range(35):
    t = (frame + 1) / 35.0
    t = 1 - (1 - t) * (1 - t)  # ease-out
    oled.fill(0)
    for p in all_targets:
        x = int(p[0] + (p[2] - p[0]) * t)
        y = int(p[1] + (p[3] - p[1]) * t)
        if 0 <= x < 128 and 0 <= y < 64:
            oled.pixel(x, y, 1)
    oled.show()
    time.sleep(0.03)

time.sleep(1)

# 爆炸
for p in all_targets:
    p[0] = p[2]
    p[1] = p[3]
    a = random.randint(0, 359)
    spd = random.randint(3, 8)
    rad = math.radians(a)
    p[2] = int(p[0] + spd * 15 * math.cos(rad))
    p[3] = int(p[1] + spd * 15 * math.sin(rad))

for frame in range(25):
    t = (frame + 1) / 25.0
    oled.fill(0)
    for p in all_targets:
        x = int(p[0] + (p[2] - p[0]) * t)
        y = int(p[1] + (p[3] - p[1]) * t)
        if 0 <= x < 128 and 0 <= y < 64:
            oled.pixel(x, y, 1)
    oled.show()
    time.sleep(0.03)

time.sleep(0.3)

# --- 第十部分：螺旋線 ---
# 用極座標 r = a * theta 畫螺旋

oled.fill(0)
oled.text("spiral", 40, 0, 1)

for max_angle in range(0, 1440, 8):
    oled.fill_rect(0, 10, 128, 54, 0)
    for a in range(0, max_angle, 3):
        rad = math.radians(a)
        r = a * 0.02
        x = int(64 + r * math.cos(rad))
        y = int(38 + r * math.sin(rad))
        if 0 <= x < 128 and 10 <= y < 64:
            oled.pixel(x, y, 1)
    oled.show()
    time.sleep(0.01)

time.sleep(0.5)

# --- 第十一部分：動畫效果 ---

# 邊框動畫
oled.fill(0)
for i in range(0, 64, 2):
    oled.rect(64 - i, 32 - i // 2, i * 2, i, 1)
    oled.show()
    time.sleep(0.02)
time.sleep(0.5)

# 打字機效果
oled.fill(0)
draw_border()
typing_effect("歡迎", 24, 8)
time.sleep(0.3)

# 捲動文字
scroll_text("準備開始展示效果", 48)

oled_zh("第4課完成!", "", "你學會了:", "OLED 文字+圖形")
print("=== 第 4 課完成 ===")
