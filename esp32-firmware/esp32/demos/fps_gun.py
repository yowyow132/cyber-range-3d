# ============================================
# CYBER RANGE 3D — ESP32 體感槍控制與肉鴿同步端 (防抖+連發支援)
# ============================================
# 硬體對應：
#   按鈕 A (GPIO 5)  = 扣扳機 (送出 FIRE_DOWN / FIRE_UP)
#   按鈕 B (GPIO 36) = 換彈夾 (送出 RELOAD)
#   OLED 螢幕        = 顯示子彈數(支援擴容)、血量條、即時狀態
#   WS2812 RGB 燈    = 開火閃橘光、受傷閃紅光、換彈閃藍光、升級閃金光
# ============================================

from lib.ezkit import *
import sys
import time
try:
    import select
except ImportError:
    import uselect as select

try:
    buzzer.duty(0)
except:
    pass

spoll = select.poll()
spoll.register(sys.stdin, select.POLLIN)

def set_rgb(r, g, b):
    for i in range(NUM_PIXELS):
        np[i] = (r, g, b)
    np.write()

def draw_gun_hud(ammo, hp, state, max_ammo=8):
    oled.fill(0)
    oled.text("CYBER GUN", 0, 0, 1)
    if state == "HIT":
        oled.text("! HIT !", 72, 0, 1)
    elif state == "RELOAD":
        oled.text("RELOAD..", 64, 0, 1)
    elif state == "LVLUP":
        oled.text("LVL UP!", 72, 0, 1)
    elif state == "OVER":
        oled.text("DEAD", 92, 0, 1)
    else:
        oled.text("READY", 86, 0, 1)

    oled.hline(0, 10, 128, 1)
    oled.text("AMMO: {:02d}/{:02d}".format(ammo, max_ammo), 0, 14, 1)

    cols = max(1, min(max_ammo, 24))
    pip_w = max(3, min(8, 120 // cols - 2))
    step = pip_w + 2
    for i in range(cols):
        bx = i * step + 4
        if bx + pip_w > 126:
            break
        if i < ammo:
            oled.fill_rect(bx, 25, pip_w, 10, 1)
        else:
            oled.rect(bx, 25, pip_w, 10, 1)

    oled.text("HP: {:3d}%".format(max(0, hp)), 0, 41, 1)
    draw_progress_bar(0, 52, 128, 10, max(0, min(100, hp)))
    oled.show()

def main():
    ammo = 8
    max_ammo = 8
    hp = 100
    state = "READY"

    # 按鈕防抖動狀態
    DEBOUNCE_MS = 28
    stable_a = 1
    last_raw_a = 1
    last_change_a = 0

    stable_b = 1
    last_raw_b = 1
    last_change_b = 0

    rgb_clear_ms = 0
    rx_buf = ""
    need_redraw = True

    set_rgb(0, 10, 20)
    draw_gun_hud(ammo, hp, state, max_ammo)

    while True:
        now = time.ticks_ms()

        # --- 1. 按鈕 A 防抖動偵測 (FIRE_DOWN / FIRE_UP) ---
        raw_a = btn_a.value()
        if raw_a != last_raw_a:
            last_raw_a = raw_a
            last_change_a = now
        elif time.ticks_diff(now, last_change_a) >= DEBOUNCE_MS and raw_a != stable_a:
            stable_a = raw_a
            if stable_a == 0:
                sys.stdout.write("FIRE_DOWN\n")
                if ammo > 0 and state not in ("RELOAD", "OVER"):
                    set_rgb(80, 35, 0)
                    rgb_clear_ms = time.ticks_add(now, 70)
                else:
                    set_rgb(30, 0, 0)
                    rgb_clear_ms = time.ticks_add(now, 70)
            else:
                sys.stdout.write("FIRE_UP\n")

        # --- 2. 按鈕 B 防抖動偵測 (RELOAD) ---
        raw_b = btn_b.value()
        if raw_b != last_raw_b:
            last_raw_b = raw_b
            last_change_b = now
        elif time.ticks_diff(now, last_change_b) >= DEBOUNCE_MS and raw_b != stable_b:
            stable_b = raw_b
            if stable_b == 0:
                sys.stdout.write("RELOAD\n")
                set_rgb(0, 20, 60)
                rgb_clear_ms = time.ticks_add(now, 300)

        # --- 3. 讀取電腦同步狀態 (S:ammo,hp,state,max_ammo) ---
        while spoll.poll(0):
            ch = sys.stdin.read(1)
            if ch == '\n' or ch == '\r':
                line = rx_buf.strip()
                rx_buf = ""
                if line.startswith("S:"):
                    try:
                        parts = line[2:].split(",")
                        new_ammo = int(parts[0])
                        new_hp = int(parts[1])
                        new_state = parts[2] if len(parts) > 2 else "PLAY"
                        new_max = int(parts[3]) if len(parts) > 3 else max_ammo

                        if new_state == "HIT" and new_hp < hp:
                            set_rgb(100, 0, 0)
                            rgb_clear_ms = time.ticks_add(now, 220)
                        elif new_state == "LVLUP":
                            set_rgb(80, 70, 0)
                            rgb_clear_ms = time.ticks_add(now, 400)
                        elif new_state == "RELOAD":
                            set_rgb(0, 30, 80)
                            rgb_clear_ms = time.ticks_add(now, 300)
                        elif new_state == "OVER":
                            set_rgb(50, 0, 0)
                            rgb_clear_ms = 0

                        if (new_ammo != ammo or new_hp != hp or
                            new_state != state or new_max != max_ammo):
                            ammo = new_ammo
                            hp = new_hp
                            state = new_state
                            max_ammo = new_max
                            need_redraw = True
                    except:
                        pass
            else:
                if len(rx_buf) < 64:
                    rx_buf += ch

        # --- 4. RGB 燈光計時歸位 ---
        if rgb_clear_ms != 0 and time.ticks_diff(now, rgb_clear_ms) >= 0:
            rgb_clear_ms = 0
            if state == "OVER":
                set_rgb(40, 0, 0)
            else:
                set_rgb(0, 8, 12)

        # --- 5. 更新 OLED ---
        if need_redraw:
            need_redraw = False
            draw_gun_hud(ammo, hp, state, max_ammo)

        time.sleep_ms(8)

if __name__ == "__main__":
    main()
