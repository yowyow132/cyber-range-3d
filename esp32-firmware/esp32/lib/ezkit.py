# ============================================
# ezkit.py — EZ Start Kit+ 共用模組
# ============================================
# 這個檔案把板子上所有硬體的設定集中在一起，
# 這樣每一課的範例只要寫 from lib.ezkit import *
# 就可以直接使用所有元件，不用重複寫設定。
# ============================================

from machine import Pin, ADC, PWM, SoftI2C
import dht
import neopixel
import time
from lib import ssd1306  # 指定套件內的驅動，避免載入板上其他同名檔案
from lib.zhfont import draw_text


# === LED 燈 ===
# 板子上有三顆 LED，分別是紅、黃、藍
# Pin(腳位, Pin.OUT) 表示這個腳位是「輸出」，用來控制 LED 亮或滅

led_red = Pin(16, Pin.OUT)      # 紅色 LED 接在 GPIO 16
led_yellow = Pin(12, Pin.OUT)   # 黃色 LED 接在 GPIO 12
led_blue = Pin(13, Pin.OUT)     # 藍色 LED 接在 GPIO 13

# PWM 版本的 LED
# PWM 就像快速開關燈，開的時間越長就越亮
# 可以控制亮度（0=全暗, 1023=最亮），不只是開跟關
# freq=1000 表示每秒開關 1000 次，人眼看不到閃爍

led_red_pwm = PWM(Pin(16), freq=1000, duty=0)
led_yellow_pwm = PWM(Pin(12), freq=1000, duty=0)
led_blue_pwm = PWM(Pin(13), freq=1000, duty=0)


# === 按鈕 ===
# Pin.IN 表示這個腳位是「輸入」，用來讀取按鈕狀態
# PULL_UP 讓按鈕沒按的時候保持高電位（讀到 1）
# 按下按鈕時會讀到 0

btn_a = Pin(5, Pin.IN, Pin.PULL_UP)   # 按鈕 A 接在 GPIO 5
btn_b = Pin(36, Pin.IN)                # 按鈕 B 接在 GPIO 36


# === 感測器 ===
# ADC 把感測器的類比訊號轉成數字（0~4095）
# 數字越大表示訊號越強
# ATTN_11DB 讓 ADC 可以讀到 0~3.3V 的範圍

light_sensor = ADC(Pin(39))            # 光敏電阻（感測光線強弱）
light_sensor.atten(ADC.ATTN_11DB)

potentiometer = ADC(Pin(34))           # 可變電阻（旋鈕）
potentiometer.atten(ADC.ATTN_11DB)


# === 蜂鳴器 ===
# 用 PWM 控制蜂鳴器發出不同頻率的聲音
# freq=頻率（Hz），數字越大聲音越高
# duty=音量（0=靜音, 512=一般音量）

buzzer = PWM(Pin(14), freq=1000, duty=0)


# === DHT11 溫濕度感測器 ===
# 可以量測溫度（0~50°C）和濕度（20~80%）

dht_sensor = dht.DHT11(Pin(15))


# === WS2812 RGB LED（三顆全彩 LED）===
# 每顆 LED 可以顯示任何顏色
# 用 (紅, 綠, 藍) 三個數字設定顏色，每個 0~255

NUM_PIXELS = 3
np = neopixel.NeoPixel(Pin(26), NUM_PIXELS)


# === 紅外線接收器 ===
# 接收遙控器發出的紅外線訊號

ir_pin = Pin(33, Pin.IN)


# === 繼電器 ===
# 繼電器就像一個電子開關，可以控制大電壓的電器
# on() = 開，off() = 關

relay = Pin(25, Pin.OUT)
relay.value(0)  # 開機時預設關閉


# === OLED 螢幕（1.3 吋，128x64 像素）===
# I2C 是一種通訊方式，用兩條線（SDA 資料線、SCL 時鐘線）跟螢幕溝通

i2c = SoftI2C(sda=Pin(21), scl=Pin(22))
oled = ssd1306.SSD1306_I2C(128, 64, i2c)


# ============================================
# 以下是工具函式，讓你更方便地控制硬體
# ============================================

def oled_zh(line1="", line2="", line3="", line4=""):
    """在 OLED 上顯示中文，最多四行，每行最多 8 個中文字"""
    oled.fill(0)  # 先清空螢幕
    if line1:
        draw_text(oled, 0, 0, line1)
    if line2:
        draw_text(oled, 0, 16, line2)
    if line3:
        draw_text(oled, 0, 32, line3)
    if line4:
        draw_text(oled, 0, 48, line4)
    oled.show()  # 把畫面送到螢幕上


def draw_border():
    """畫一個邊框在螢幕周圍"""
    oled.rect(0, 0, 128, 64, 1)


def draw_progress_bar(x, y, w, h, pct):
    """畫一個進度條
    x, y = 左上角位置
    w, h = 寬度和高度
    pct = 百分比（0~100）
    """
    oled.rect(x, y, w, h, 1)  # 外框
    fill_w = int((w - 2) * pct / 100)
    if fill_w > 0:
        oled.fill_rect(x + 1, y + 1, fill_w, h - 2, 1)  # 填滿的部分


def scroll_text(text, y, speed=3):
    """讓文字從右邊捲到左邊（跑馬燈效果）"""
    text_w = len(text) * 16
    for x in range(128, -text_w, -speed):
        oled.fill_rect(0, y, 128, 16, 0)
        draw_text(oled, x, y, text)
        oled.show()
        time.sleep(0.02)


def typing_effect(text, x, y, delay=0.15):
    """打字機效果，一個字一個字慢慢出現"""
    for i in range(len(text)):
        ch = text[i]
        draw_text(oled, x + i * 16, y, ch)
        oled.show()
        time.sleep(delay)


def all_leds_off():
    """關閉所有 LED（包含紅黃藍和 RGB）"""
    led_red_pwm.duty(0)
    led_yellow_pwm.duty(0)
    led_blue_pwm.duty(0)
    for i in range(NUM_PIXELS):
        np[i] = (0, 0, 0)
    np.write()


def np_fill(r, g, b):
    """讓三顆 RGB LED 都亮同一個顏色"""
    for i in range(NUM_PIXELS):
        np[i] = (r, g, b)
    np.write()


def np_clear():
    """關閉所有 RGB LED"""
    np_fill(0, 0, 0)


def hsv_to_rgb(h, s, v):
    """把 HSV 色彩轉換成 RGB
    這個函式讓你用「色相」來選顏色，比較直覺：
    h = 色相（0~360）：0=紅, 60=黃, 120=綠, 180=青, 240=藍, 300=紫
    s = 飽和度（0~1）：0=灰色, 1=鮮豔
    v = 亮度（0~1）：0=全黑, 1=最亮
    回傳 (r, g, b) 三個數字，每個 0~255
    """
    h = h % 360
    c = v * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = v - c
    if h < 60:
        r, g, b = c, x, 0
    elif h < 120:
        r, g, b = x, c, 0
    elif h < 180:
        r, g, b = 0, c, x
    elif h < 240:
        r, g, b = 0, x, c
    elif h < 300:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x
    return (int((r + m) * 255), int((g + m) * 255), int((b + m) * 255))
