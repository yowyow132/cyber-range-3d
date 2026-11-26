# ============================================
# CYBER RANGE 3D — ESP32 體感槍控制與肉鴿同步端 (防抖+連發+聲光回饋)
# ============================================
# 硬體對應：
#   按鈕 A (GPIO 5)  = 扣扳機 (送出 FIRE_DOWN / FIRE_UP，含開火音效與槍口閃光)
#   按鈕 B (GPIO 36) = 換彈夾 (送出 RELOAD，含上膛音效與藍光)
#   搖桿 IO8 (GPIO 35)  = VRx (左右移動)
#   搖桿 IO9 (GPIO 32)  = VRy (前後移動)
#   搖桿 IO10 (GPIO 17) = SW  (下壓衝刺 DASH)
#   OLED 螢幕        = 顯示子彈數(支援擴容)、血量條、即時狀態
#   WS2812 RGB + LED = 開火閃橘光、受傷閃紅光、換彈閃藍光、升級閃金光
#   蜂鳴器 (GPIO 14) = 非阻塞合成音效（開火／空倉／換彈／受擊／升級／陣亡）
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

# 聲光回饋開關
ENABLE_BUZZER = True
ENABLE_LIGHT_FX = True
BUZZER_DUTY = 320  # 蜂鳴器音量 (0~1023，建議 220~400)

# 外接類比搖桿設定 (EZ Start Kit+ 擴充排針 IO8 / IO9 / IO10)
ENABLE_JOYSTICK = True
PIN_JOY_X = 35      # IO8 (ADC1)
PIN_JOY_Y = 32      # IO9 (ADC1)
PIN_JOY_SW = 17     # IO10 (數位上拉，下壓觸發衝刺 DASH)
JOY_SWAP_XY = False
JOY_INVERT_X = False
JOY_INVERT_Y = False
JOY_DEADZONE = 0.14


def _norm_axis(raw, center):
    """將 12-bit ADC 讀值依自動校正中心點正規化為 [-1.0, 1.0] 並套用死區。"""
    if raw >= center:
        span = max(1, 4095 - center)
        val = (raw - center) / span
    else:
        span = max(1, center)
        val = (raw - center) / span
    if val > 1.0:
        val = 1.0
    elif val < -1.0:
        val = -1.0
    if abs(val) < JOY_DEADZONE:
        return 0.0
    return val

spoll = select.poll()
spoll.register(sys.stdin, select.POLLIN)

def set_rgb(r, g, b):
    if not ENABLE_LIGHT_FX:
        r = g = b = 0
    for i in range(NUM_PIXELS):
        np[i] = (r, g, b)
    np.write()

def set_board_leds(r=0, y=0, b=0):
    if not ENABLE_LIGHT_FX:
        r = y = b = 0
    try:
        led_red.value(1 if r else 0)
        led_yellow.value(1 if y else 0)
        led_blue.value(1 if b else 0)
    except Exception:
        pass

SFX_PATTERNS = {
    "fire": [(1450, 22), (760, 26), (420, 24)],
    "empty": [(220, 35)],
    "reload": [(440, 40), (660, 40), (880, 55)],
    "hit": [(190, 55), (125, 85)],
    "lvlup": [(523, 45), (659, 45), (784, 50), (1046, 85)],
    "over": [(400, 70), (260, 80), (140, 140)],
}
_sfx_queue = []
_sfx_step_end = 0

def play_sfx(name):
    global _sfx_queue, _sfx_step_end
    if not ENABLE_BUZZER:
        return
    seq = SFX_PATTERNS.get(name)
    if not seq:
        return
    _sfx_queue = list(seq)
    _sfx_step_end = 0

def update_sfx(now_ms):
    global _sfx_queue, _sfx_step_end
    if not ENABLE_BUZZER:
        return
    if _sfx_step_end != 0 and time.ticks_diff(now_ms, _sfx_step_end) < 0:
        return
    if _sfx_queue:
        freq, dur = _sfx_queue.pop(0)
        try:
            if freq > 0:
                buzzer.freq(freq)
                buzzer.duty(BUZZER_DUTY)
            else:
                buzzer.duty(0)
        except Exception:
            pass
        _sfx_step_end = time.ticks_add(now_ms, dur)
    elif _sfx_step_end != 0:
        _sfx_step_end = 0
        try:
            buzzer.duty(0)
        except Exception:
            pass

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
    for _ in range(2):
        try:
            oled.show()
            break
        except OSError:
            time.sleep_ms(20)

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

    joy_x = joy_y = joy_sw = None
    joy_cx = 2048
    joy_cy = 2048
    stable_sw = 1
    last_raw_sw = 1
    last_change_sw = 0
    last_joy_ms = 0
    was_moving = False

    if ENABLE_JOYSTICK:
        joy_x = ADC(Pin(PIN_JOY_X))
        joy_y = ADC(Pin(PIN_JOY_Y))
        joy_x.atten(ADC.ATTN_11DB)
        joy_y.atten(ADC.ATTN_11DB)
        joy_sw = Pin(PIN_JOY_SW, Pin.IN, Pin.PULL_UP)

        sx = 0
        sy = 0
        for _ in range(10):
            sx += joy_x.read()
            sy += joy_y.read()
            time.sleep_ms(4)
        avg_x = sx // 10
        avg_y = sy // 10
        joy_cx = avg_x if 1000 <= avg_x <= 3100 else 2048
        joy_cy = avg_y if 1000 <= avg_y <= 3100 else 2048

    rgb_clear_ms = 0
    rx_buf = ""
    need_redraw = True

    set_rgb(0, 10, 20)
    set_board_leds(0, 0, 1)
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
                    set_rgb(180, 95, 15)
                    set_board_leds(0, 1, 0)
                    play_sfx("fire")
                    rgb_clear_ms = time.ticks_add(now, 70)
                else:
                    set_rgb(60, 0, 0)
                    set_board_leds(1, 0, 0)
                    play_sfx("empty")
                    rgb_clear_ms = time.ticks_add(now, 80)
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
                set_rgb(0, 40, 120)
                set_board_leds(0, 0, 1)
                play_sfx("reload")
                rgb_clear_ms = time.ticks_add(now, 300)

        # --- 2.5 外接搖桿移動 (MOVE:x,y) 與下壓衝刺 (DASH) ---
        if ENABLE_JOYSTICK and joy_x:
            raw_sw = joy_sw.value()
            if raw_sw != last_raw_sw:
                last_raw_sw = raw_sw
                last_change_sw = now
            elif time.ticks_diff(now, last_change_sw) >= 35 and raw_sw != stable_sw:
                stable_sw = raw_sw
                if stable_sw == 0:
                    sys.stdout.write("DASH\n")

            if time.ticks_diff(now, last_joy_ms) >= 30:
                last_joy_ms = now
                vx = _norm_axis(joy_x.read(), joy_cx)
                vy = _norm_axis(joy_y.read(), joy_cy)
                if JOY_SWAP_XY:
                    vx, vy = vy, vx
                if JOY_INVERT_X:
                    vx = -vx
                if JOY_INVERT_Y:
                    vy = -vy
                moving = (vx != 0.0 or vy != 0.0)
                if moving or was_moving:
                    sys.stdout.write("MOVE:{:.2f},{:.2f}\n".format(vx, vy))
                    was_moving = moving

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

                        if new_state == "HIT" and (new_hp < hp or state != "HIT"):
                            set_rgb(160, 0, 0)
                            set_board_leds(1, 0, 0)
                            play_sfx("hit")
                            rgb_clear_ms = time.ticks_add(now, 220)
                        elif new_state == "LVLUP" and state != "LVLUP":
                            set_rgb(120, 100, 0)
                            set_board_leds(0, 1, 1)
                            play_sfx("lvlup")
                            rgb_clear_ms = time.ticks_add(now, 400)
                        elif new_state == "RELOAD" and state != "RELOAD":
                            set_rgb(0, 40, 120)
                            set_board_leds(0, 0, 1)
                            play_sfx("reload")
                            rgb_clear_ms = time.ticks_add(now, 300)
                        elif new_state == "OVER" and state != "OVER":
                            set_rgb(50, 0, 0)
                            set_board_leds(1, 0, 0)
                            play_sfx("over")
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

        # --- 4. 非阻塞音效與 RGB 燈光計時歸位 ---
        update_sfx(now)
        if rgb_clear_ms != 0 and time.ticks_diff(now, rgb_clear_ms) >= 0:
            rgb_clear_ms = 0
            if state == "OVER":
                set_rgb(40, 0, 0)
                set_board_leds(1, 0, 0)
            else:
                set_rgb(0, 8, 12)
                set_board_leds(0, 0, 0)

        # --- 5. 更新 OLED ---
        if need_redraw:
            need_redraw = False
            draw_gun_hud(ammo, hp, state, max_ammo)

        time.sleep_ms(8)

if __name__ == "__main__":
    main()
