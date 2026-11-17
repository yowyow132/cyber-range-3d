# ============================================
# 第 9 課：全功能整合展示
# ============================================
# 學習目標：
#   - 把前面學的所有東西組合在一起
#   - 展示 EZ Start Kit+ 的全部功能
#
# 包含的元件：
#   LED（呼吸燈）、RGB LED（彩虹）、蜂鳴器（音階+旋律）、
#   OLED（動畫+中文）、可變電阻（控制亮度）、
#   感測器（溫濕度+光線）、按鈕（互動）、
#   紅外線（遙控偵測）、繼電器（開關）
# ============================================

from lib.ezkit import *

print("=== 第 9 課：全功能整合展示 ===")


def demo_opening():
    """開場動畫"""
    oled.fill(0)
    for i in range(0, 64, 2):
        oled.rect(64 - i, 32 - i // 2, i * 2, i, 1)
        oled.show()
        time.sleep(0.02)
    time.sleep(0.3)
    oled.fill(0)
    draw_border()
    typing_effect("歡迎", 24, 8)
    time.sleep(0.3)
    typing_effect("全功能展示", 8, 28)
    time.sleep(1)
    scroll_text("準備開始展示效果", 48)
    time.sleep(0.5)


def demo_breathing():
    """LED 呼吸燈"""
    oled.fill(0)
    draw_border()
    draw_text(oled, 16, 4, "呼吸燈效果")
    oled.show()
    leds = [(led_red_pwm, "紅"), (led_yellow_pwm, "黃"), (led_blue_pwm, "藍")]
    for led, name in leds:
        for duty in range(0, 1024, 16):
            led.duty(duty)
            pct = duty * 100 // 1023
            oled.fill_rect(4, 20, 120, 44, 0)
            draw_text(oled, 24, 20, "{}燈".format(name))
            draw_progress_bar(4, 40, 88, 14, pct)
            oled.text("{:>3}%".format(pct), 96, 43, 1)
            oled.show()
            time.sleep(0.01)
        for duty in range(1023, -1, -16):
            led.duty(duty)
            pct = duty * 100 // 1023
            oled.fill_rect(4, 20, 120, 44, 0)
            draw_text(oled, 24, 20, "{}燈".format(name))
            draw_progress_bar(4, 40, 88, 14, pct)
            oled.text("{:>3}%".format(pct), 96, 43, 1)
            oled.show()
            time.sleep(0.01)
        led.duty(0)
        time.sleep(0.2)
    oled.fill_rect(4, 20, 120, 20, 0)
    draw_text(oled, 8, 24, "同時呼吸中")
    oled.show()
    for _ in range(2):
        for duty in range(0, 1024, 16):
            led_red_pwm.duty(duty)
            led_yellow_pwm.duty(duty)
            led_blue_pwm.duty(duty)
            time.sleep(0.005)
        for duty in range(1023, -1, -16):
            led_red_pwm.duty(duty)
            led_yellow_pwm.duty(duty)
            led_blue_pwm.duty(duty)
            time.sleep(0.005)
    all_leds_off()
    time.sleep(0.5)


def demo_rgb():
    """RGB 彩虹漸變"""
    oled.fill(0)
    draw_border()
    draw_text(oled, 24, 4, "彩虹漸變")
    oled.show()
    for hue in range(0, 720, 3):
        for i in range(NUM_PIXELS):
            r, g, b = hsv_to_rgb(hue + i * 120, 1.0, 0.3)
            np[i] = (r, g, b)
        np.write()
        oled.fill_rect(4, 18, 120, 44, 0)
        for i in range(NUM_PIXELS):
            r, g, b = hsv_to_rgb(hue + i * 120, 1.0, 0.3)
            y = 20 + i * 14
            oled.text("L{}".format(i + 1), 4, y, 1)
            oled.text("R{} G{} B{}".format(r, g, b), 24, y, 1)
        oled.show()
        time.sleep(0.02)
    oled.fill_rect(4, 20, 120, 40, 0)
    draw_text(oled, 24, 32, "閃爍效果")
    oled.show()
    for j in range(12):
        for i in range(NUM_PIXELS):
            if i == j % NUM_PIXELS:
                r, g, b = hsv_to_rgb(j * 30, 1.0, 0.3)
                np[i] = (r, g, b)
            else:
                np[i] = (0, 0, 0)
        np.write()
        time.sleep(0.2)
    for k in range(4):
        r, g, b = hsv_to_rgb(k * 90, 1.0, 0.3)
        np_fill(r, g, b)
        time.sleep(0.15)
        np_clear()
        time.sleep(0.1)
    time.sleep(0.5)


def demo_buzzer():
    """蜂鳴器音階+旋律"""
    oled.fill(0)
    draw_border()
    draw_text(oled, 16, 4, "蜂鳴器展示")
    oled.show()
    notes = [262, 294, 330, 349, 392, 440, 494, 523]
    names = ["Do", "Re", "Mi", "Fa", "So", "La", "Si", "Do"]
    for i, (freq, name) in enumerate(zip(notes, names)):
        buzzer.freq(freq)
        buzzer.duty(512)
        r, g, b = hsv_to_rgb(i * 45, 1.0, 0.3)
        np_fill(r, g, b)
        oled.fill_rect(4, 20, 120, 40, 0)
        draw_text(oled, 24, 24, "音階")
        oled.text(" " + name, 56, 28, 1)
        draw_progress_bar(14, 46, 100, 12, (i + 1) * 100 // len(notes))
        oled.show()
        time.sleep(0.35)
    buzzer.duty(0)
    np_clear()
    time.sleep(0.3)
    oled.fill_rect(4, 20, 120, 40, 0)
    draw_text(oled, 24, 28, "小星星")
    oled.show()
    melody = [
        (262, 0.3), (262, 0.3), (392, 0.3), (392, 0.3),
        (440, 0.3), (440, 0.3), (392, 0.6),
        (349, 0.3), (349, 0.3), (330, 0.3), (330, 0.3),
        (294, 0.3), (294, 0.3), (262, 0.6),
    ]
    for freq, dur in melody:
        buzzer.freq(freq)
        buzzer.duty(512)
        r, g, b = hsv_to_rgb(freq % 360, 1.0, 0.2)
        np_fill(r, g, b)
        time.sleep(dur)
        buzzer.duty(0)
        np_clear()
        time.sleep(0.05)
    time.sleep(0.5)


def demo_pot():
    """旋鈕控制"""
    oled.fill(0)
    draw_border()
    draw_text(oled, 24, 4, "旋鈕控制")
    draw_text(oled, 16, 28, "轉動旋鈕!")
    oled.show()
    time.sleep(1)
    start = time.ticks_ms()
    while time.ticks_diff(time.ticks_ms(), start) < 10000:
        pot = potentiometer.read()
        pct = pot * 100 // 4095
        duty = pot * 1023 // 4095
        led_red_pwm.duty(duty)
        led_yellow_pwm.duty(duty)
        led_blue_pwm.duty(duty)
        if pot > 100:
            buzzer.freq(200 + pot)
            buzzer.duty(256)
        else:
            buzzer.duty(0)
        for i in range(NUM_PIXELS):
            hue = pot * 360 // 4095 + i * 120
            r, g, b = hsv_to_rgb(hue, 1.0, 0.3)
            np[i] = (r, g, b)
        np.write()
        oled.fill(0)
        draw_border()
        draw_text(oled, 24, 2, "旋鈕控制")
        oled.text("{}".format(pot), 48, 22, 1)
        draw_progress_bar(8, 34, 112, 10, pct)
        draw_text(oled, 8, 48, "亮度 {}%".format(pct))
        oled.show()
        time.sleep(0.05)
    buzzer.duty(0)
    all_leds_off()
    time.sleep(0.5)


def demo_sensors():
    """感測器讀取"""
    oled.fill(0)
    draw_border()
    draw_text(oled, 16, 4, "感測器讀取")
    oled.show()
    time.sleep(0.5)
    light_hist = []
    for _ in range(10):
        light = light_sensor.read()
        pot = potentiometer.read()
        light_hist.append(light)
        if len(light_hist) > 10:
            light_hist.pop(0)
        try:
            dht_sensor.measure()
            temp = dht_sensor.temperature()
            humi = dht_sensor.humidity()
        except Exception:
            temp = "--"
            humi = "--"
        if isinstance(temp, int):
            for i in range(NUM_PIXELS):
                hue = max(0, min(240, 240 - temp * 6)) + i * 20
                r, g, b = hsv_to_rgb(hue, 1.0, 0.2)
                np[i] = (r, g, b)
            np.write()
        oled.fill(0)
        draw_text(oled, 0, 0, "溫度{}C".format(temp))
        draw_text(oled, 0, 16, "濕度{}%".format(humi))
        draw_text(oled, 0, 32, "光線{}".format(light))
        if len(light_hist) > 1:
            max_v = max(light_hist) or 1
            for j in range(len(light_hist)):
                bh = light_hist[j] * 14 // max_v
                x = 80 + j * 4
                oled.fill_rect(x, 50 - bh, 3, bh, 1)
        oled.hline(80, 50, 48, 1)
        oled.show()
        time.sleep(1.2)
    np_clear()
    time.sleep(0.5)


def demo_buttons():
    """按鈕互動"""
    oled.fill(0)
    draw_border()
    draw_text(oled, 24, 4, "按鈕互動")
    draw_text(oled, 8, 28, "按 A 或 B")
    draw_text(oled, 24, 48, "等 10 秒")
    oled.show()
    count_a = 0
    count_b = 0
    last_a = 1
    last_b = 1
    rgb_hue = 0
    start = time.ticks_ms()
    while time.ticks_diff(time.ticks_ms(), start) < 10000:
        a = btn_a.value()
        b = btn_b.value()
        remain = 10 - time.ticks_diff(time.ticks_ms(), start) // 1000
        if a == 0 and last_a == 1:
            count_a += 1
            buzzer.freq(523)
            buzzer.duty(512)
            time.sleep(0.05)
            buzzer.duty(0)
        if b == 0 and last_b == 1:
            count_b += 1
            buzzer.freq(659)
            buzzer.duty(512)
            time.sleep(0.05)
            buzzer.duty(0)
        last_a = a
        last_b = b
        if a == 0:
            d = time.ticks_ms() % 2000
            if d > 1000:
                d = 2000 - d
            led_red_pwm.duty(d)
            np_fill(d * 255 // 1000, 0, 0)
        else:
            led_red_pwm.duty(0)
        if b == 0:
            for i in range(NUM_PIXELS):
                r, g, bb = hsv_to_rgb(rgb_hue + i * 120, 1.0, 0.3)
                np[i] = (r, g, bb)
            np.write()
            rgb_hue = (rgb_hue + 5) % 360
            led_blue_pwm.duty(512)
        else:
            if a != 0:
                np_clear()
            led_blue_pwm.duty(0)
        oled.fill(0)
        draw_border()
        draw_text(oled, 24, 2, "按鈕互動")
        oled.text("A: {}".format(count_a), 12, 22, 1)
        oled.text("B: {}".format(count_b), 68, 22, 1)
        draw_progress_bar(8, 36, 90, 8, remain * 10)
        oled.text("{}s".format(remain), 102, 35, 1)
        oled.show()
        time.sleep(0.03)
    all_leds_off()
    time.sleep(0.5)


def demo_ir():
    """紅外線接收"""
    oled.fill(0)
    draw_border()
    draw_text(oled, 8, 4, "紅外線接收")
    draw_text(oled, 8, 28, "按遙控器!")
    draw_text(oled, 24, 48, "等 8 秒")
    oled.show()
    count = 0
    last_val = 1
    start = time.ticks_ms()
    while time.ticks_diff(time.ticks_ms(), start) < 8000:
        val = ir_pin.value()
        if val == 0 and last_val == 1:
            count += 1
            for i in range(NUM_PIXELS):
                r, g, b = hsv_to_rgb(count * 40 + i * 120, 1.0, 0.3)
                np[i] = (r, g, b)
            np.write()
            led_blue_pwm.duty(1023)
            buzzer.freq(800)
            buzzer.duty(512)
            time.sleep(0.05)
            buzzer.duty(0)
            led_blue_pwm.duty(0)
            oled.fill(0)
            draw_border()
            draw_text(oled, 8, 4, "紅外線接收")
            draw_text(oled, 8, 28, "收到信號!")
            oled.text("x {}".format(count), 48, 50, 1)
            oled.show()
        last_val = val
        time.sleep(0.01)
    np_clear()
    time.sleep(0.5)


def demo_relay():
    """繼電器"""
    oled.fill(0)
    draw_border()
    draw_text(oled, 16, 4, "繼電器展示")
    oled.show()
    for i in range(5):
        relay.on()
        led_red_pwm.duty(1023)
        buzzer.freq(600)
        buzzer.duty(256)
        np_fill(255, 0, 0)
        oled.fill_rect(4, 20, 120, 40, 0)
        draw_text(oled, 48, 24, "開")
        oled.fill_rect(20, 46, 88, 10, 1)
        oled.show()
        time.sleep(0.5)
        relay.off()
        led_red_pwm.duty(0)
        buzzer.duty(0)
        np_clear()
        oled.fill_rect(4, 20, 120, 40, 0)
        draw_text(oled, 48, 24, "停")
        oled.rect(20, 46, 88, 10, 1)
        oled.show()
        time.sleep(0.5)
    relay.off()
    all_leds_off()
    time.sleep(0.5)


def demo_ending():
    """結束動畫"""
    for duty in range(0, 1024, 8):
        led_red_pwm.duty(duty)
        led_yellow_pwm.duty(duty)
        led_blue_pwm.duty(duty)
        for i in range(NUM_PIXELS):
            r, g, b = hsv_to_rgb(duty * 360 // 1023 + i * 120, 1.0, 0.3)
            np[i] = (r, g, b)
        np.write()
        time.sleep(0.005)
    oled.fill(0)
    draw_border()
    typing_effect("展示完成", 24, 8)
    time.sleep(0.5)
    draw_text(oled, 16, 32, "全功能完成!")
    oled.show()
    for duty in range(1023, -1, -8):
        led_red_pwm.duty(duty)
        led_yellow_pwm.duty(duty)
        led_blue_pwm.duty(duty)
        time.sleep(0.005)
    time.sleep(1)
    oled.fill(0)
    draw_border()
    draw_text(oled, 8, 24, "按 RST 重來")
    oled.show()
    all_leds_off()
    buzzer.duty(0)
    relay.off()


# === 執行全部展示 ===
demo_opening()
demo_breathing()
demo_rgb()
demo_buzzer()
demo_pot()
demo_sensors()
demo_buttons()
demo_ir()
demo_relay()
demo_ending()
print("=== 全功能展示完成 ===")
