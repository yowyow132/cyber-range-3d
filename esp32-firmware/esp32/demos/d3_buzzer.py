# ============================================
# 第 3 課：蜂鳴器音效
# ============================================
# 學習目標：
#   - 了解蜂鳴器怎麼發出聲音
#   - 學會用不同頻率發出不同音階
#   - 用程式演奏一首簡單的歌曲
#
# 你會學到：
#   - 頻率（Hz）和音高的關係
#   - 怎麼用 PWM 的 freq() 控制音高
#   - 怎麼用 duty() 控制音量（0=靜音）
#   - 用清單（list）儲存一首歌的音符
# ============================================

from lib.ezkit import *

print("=== 第 3 課：蜂鳴器音效 ===")

# --- 第一部分：認識音階 ---
# 每個音符對應一個頻率（每秒震動幾次）
# 頻率越高，聲音越高；頻率越低，聲音越低
# 以下是 Do Re Mi Fa Sol La Si Do 的頻率

oled.fill(0)
draw_border()
draw_text(oled, 16, 4, "蜂鳴器展示")
oled.show()
time.sleep(0.5)

notes = [262, 294, 330, 349, 392, 440, 494, 523]
names = ["Do", "Re", "Mi", "Fa", "So", "La", "Si", "Do"]

for i in range(len(notes)):
    freq = notes[i]
    name = names[i]

    buzzer.freq(freq)       # 設定頻率（音高）
    buzzer.duty(512)        # 開始發聲（512 = 中等音量）

    # RGB LED 跟著音階變顏色
    r, g, b = hsv_to_rgb(i * 45, 1.0, 0.3)
    np_fill(r, g, b)

    # OLED 顯示目前的音符和進度
    oled.fill_rect(4, 20, 120, 40, 0)
    draw_text(oled, 24, 24, "音階")
    oled.text(" " + name, 56, 28, 1)
    draw_progress_bar(14, 46, 100, 12, (i + 1) * 100 // len(notes))
    oled.show()

    time.sleep(0.35)

buzzer.duty(0)              # 停止發聲
np_clear()
time.sleep(0.5)

# --- 第二部分：演奏小星星 ---
# 把每個音符的「頻率」和「持續時間」存在一個清單裡
# (頻率, 秒數) — 秒數越大，音符越長

oled.fill_rect(4, 20, 120, 40, 0)
draw_text(oled, 24, 28, "小星星")
oled.show()

melody = [
    # 一閃一閃亮晶晶
    (262, 0.3), (262, 0.3), (392, 0.3), (392, 0.3),
    (440, 0.3), (440, 0.3), (392, 0.6),
    # 滿天都是小星星
    (349, 0.3), (349, 0.3), (330, 0.3), (330, 0.3),
    (294, 0.3), (294, 0.3), (262, 0.6),
]

for freq, dur in melody:
    buzzer.freq(freq)       # 設定音高
    buzzer.duty(512)        # 開始發聲

    # RGB 隨音符閃動
    r, g, b = hsv_to_rgb(freq % 360, 1.0, 0.2)
    np_fill(r, g, b)

    time.sleep(dur)         # 等待音符的長度

    buzzer.duty(0)          # 短暫靜音（讓音符之間有間隔）
    np_clear()
    time.sleep(0.05)

oled_zh("第3課完成!", "", "你學會了:", "音階+演奏歌曲")
print("=== 第 3 課完成 ===")
