# ============================================
# EZ Start Kit+ 課程選單
# ============================================
# 操作方式：
#   短按 B = 切換下一課
#   長按 A（按住超過 1 秒）= 執行課程
#
# 展示的 MCU 功能：
# 1. IRQ（中斷）：按鈕按下時 MCU 自動通知
# 2. Timer（計時器）防抖動：等一小段時間再處理
# ============================================

from lib.ezkit import *
from machine import Timer

# 課程清單
LESSONS = [
    ("demos/d1_led",       "第1課 LED燈"),
    ("demos/d2_rgb",       "第2課 RGB燈"),
    ("demos/d3_buzzer",    "第3課 蜂鳴器"),
    ("demos/d4_oled",      "第4課 OLED"),
    ("demos/d5_sensors",   "第5課 感測器"),
    ("demos/d6_buttons",   "第6課 按鈕"),
    ("demos/d7_ir",        "第7課 紅外線"),
    ("demos/d8_relay",     "第8課 繼電器"),
    ("demos/d9_full_demo", "第9課 全展示"),
]

current = 0
menu_changed = True
a_press_time = 0

# Timer 防抖動
# ESP32 有 4 個硬體 Timer（編號 0~3）
timer_b = Timer(0)


# === 按鈕 B：IRQ + Timer 防抖動 → 切換課程 ===

def on_btn_b_confirmed(timer):
    """Timer 倒數完，確認 B 真的被按了"""
    global current, menu_changed
    # 讀 3 次確認，避免雜訊誤判
    count = 0
    for _ in range(3):
        if btn_b.value() == 0:
            count += 1
        time.sleep(0.005)
    if count >= 2:              # 至少 2 次讀到按下
        current = (current + 1) % len(LESSONS)
        menu_changed = True
        buzzer.freq(523)
        buzzer.duty(512)
        time.sleep(0.03)
        buzzer.duty(0)


def on_btn_b_irq(pin):
    """按鈕 B 的 IRQ 中斷 — 啟動防抖動 Timer
    等 100ms 後再確認，過濾彈跳雜訊
    """
    timer_b.init(
        mode=Timer.ONE_SHOT,
        period=100,
        callback=on_btn_b_confirmed
    )


# === 按鈕 A：輪詢偵測長按 → 執行課程 ===
# A 用輪詢是因為需要即時顯示長按進度條

# 註冊 B 的 IRQ
btn_b.irq(trigger=Pin.IRQ_FALLING, handler=on_btn_b_irq)


def draw_menu():
    oled.fill(0)
    draw_text(oled, 24, 0, "選課選單")
    oled.hline(0, 17, 128, 1)

    name = LESSONS[current][1]
    draw_text(oled, 8, 22, name)

    oled.text("{}/{}".format(current + 1, len(LESSONS)), 48, 42, 1)

    oled.hline(0, 54, 128, 1)
    oled.text("B:next A:hold=run", 0, 56, 1)
    oled.show()


def run_lesson(idx):
    btn_b.irq(handler=None)    # 關掉 IRQ

    module_path = LESSONS[idx][0]
    mod_name = module_path.replace("/", ".")
    print("執行: {}".format(mod_name))

    # 刪除快取，這樣才能重複執行同一課
    import sys
    if mod_name in sys.modules:
        del sys.modules[mod_name]

    try:
        mod = __import__(mod_name)
    except Exception as e:
        oled.fill(0)
        oled.text("Error:", 0, 0, 1)
        oled.text(str(e)[:16], 0, 16, 1)
        oled.show()
        print("錯誤: {}".format(e))
        time.sleep(3)

    time.sleep(0.5)
    btn_b.irq(trigger=Pin.IRQ_FALLING, handler=on_btn_b_irq)


# === 主程式 ===
print("=== EZ Start Kit+ 課程選單 ===")

oled.fill(0)
draw_border()
typing_effect("歡迎", 24, 8)
time.sleep(0.3)
draw_text(oled, 8, 32, "選課開始!")
oled.show()
time.sleep(1)

last_a = 1

while True:
    a = btn_a.value()

    # 按鈕 A：偵測按下
    if a == 0 and last_a == 1:
        a_press_time = time.ticks_ms()

    # 按鈕 A：放開
    if a == 1 and last_a == 0:
        a_press_time = 0

    # 按住 A 時顯示進度條
    if a == 0 and a_press_time > 0:
        held = time.ticks_diff(time.ticks_ms(), a_press_time)
        oled.fill_rect(0, 54, 128, 10, 0)
        if held > 800:
            oled.text(">>> RUN! <<<", 16, 56, 1)
            oled.show()
            while btn_a.value() == 0:
                time.sleep(0.01)
            a_press_time = 0

            buzzer.freq(880)
            buzzer.duty(512)
            time.sleep(0.15)
            buzzer.duty(0)
            time.sleep(0.3)

            run_lesson(current)
            menu_changed = True
            last_a = 1
            time.sleep(0.5)
            continue
        else:
            bar_w = held * 100 // 800
            oled.rect(14, 56, 100, 7, 1)
            oled.fill_rect(15, 57, bar_w, 5, 1)
        oled.show()
        menu_changed = True
    elif menu_changed:
        draw_menu()
        menu_changed = False

    last_a = a
    time.sleep(0.03)
