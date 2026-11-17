# ============================================
# Google Chrome 小恐龍跳躍遊戲 (夜間靜音 + 自動防卡版)
# ============================================
# 特色：
#   1. 完全靜音：不干擾室友安眠
#   2. 開機動態：恐龍原地踏步踏步，絕對不卡死
#   3. 自動起跑：可按 A 鍵起跳，亦可 3 秒後自動奔跑
#   4. 循環遊玩：撞到仙人掌 1.5 秒後自動重開或按鍵立即重開
# ============================================

from lib.ezkit import *
import time
import random

# 強制關閉蜂鳴器，完全靜音
try:
    buzzer.duty(0)
except:
    pass

# 繪製小恐龍
def draw_dino(x, y, leg_state, jumping=False):
    x = int(x)
    y = int(y)
    # 頭部與眼睛
    oled.fill_rect(x + 7, y, 7, 5, 1)
    oled.pixel(x + 9, y + 1, 0)
    oled.fill_rect(x + 11, y + 3, 3, 1, 0)
    oled.fill_rect(x + 7, y + 5, 4, 3, 1)
    # 身體與小手
    oled.fill_rect(x + 3, y + 6, 8, 5, 1)
    oled.fill_rect(x + 1, y + 7, 2, 3, 1)
    oled.pixel(x, y + 8, 1)
    oled.fill_rect(x + 10, y + 8, 2, 2, 1)

    # 腿部動畫
    if jumping:
        oled.vline(x + 5, y + 11, 3, 1)
        oled.vline(x + 8, y + 11, 2, 1)
    elif leg_state == 0:
        oled.vline(x + 5, y + 11, 4, 1)
        oled.hline(x + 5, y + 14, 2, 1)
        oled.vline(x + 8, y + 11, 2, 1)
    else:
        oled.vline(x + 5, y + 11, 2, 1)
        oled.vline(x + 8, y + 11, 4, 1)
        oled.hline(x + 8, y + 14, 2, 1)

# 繪製仙人掌
def draw_cactus(x, y, h=14):
    x = int(x)
    y = int(y)
    oled.fill_rect(x + 2, y, 3, h, 1)
    if h >= 12:
        oled.vline(x, y + 4, 5, 1)
        oled.hline(x, y + 8, 2, 1)
    oled.vline(x + 5, y + 2, h - 6, 1)
    oled.hline(x + 4, y + 6, 2, 1)

# 繪製雲朵
def draw_cloud(x, y):
    x = int(x)
    y = int(y)
    oled.hline(x + 4, y, 8, 1)
    oled.hline(x + 2, y + 1, 12, 1)
    oled.hline(x, y + 2, 16, 1)

def main():
    GROUND_Y = 54
    DINO_W = 14
    DINO_H = 15
    DINO_X = 14

    high_score = 0

    while True:
        # 重設 LED 與螢幕
        led_red.value(0)
        led_yellow.value(0)
        led_blue.value(1)
        
        # --- 動態起跑準備畫面 (倒數 3 秒，期間恐龍踏步踏步，按 A 可立即開始) ---
        start_time = time.ticks_ms()
        leg_step = 0
        countdown = 3
        while time.ticks_diff(time.ticks_ms(), start_time) < 3000:
            # 檢查按鍵
            if btn_a.value() == 0 or btn_b.value() == 0:
                break
            
            elapsed = time.ticks_diff(time.ticks_ms(), start_time)
            countdown = 3 - (elapsed // 1000)
            leg_step = (elapsed // 150) % 2
            
            oled.fill(0)
            oled.text("DINO RUNNER", 20, 4, 1)
            # 原地踏步小恐龍
            draw_dino(56, 24, leg_step)
            oled.hline(0, 39, 128, 1)
            
            # 倒數提示
            oled.text("Ready in {}s...".format(max(1, countdown)), 18, 44, 1)
            oled.text("Press A to Jump", 4, 54, 1)
            oled.show()
            time.sleep_ms(50)

        # 遊戲初始化
        dino_y = float(GROUND_Y - DINO_H)
        vy = 0.0
        gravity = 0.72
        jump_force = -6.2
        is_grounded = True
        
        score = 0
        speed = 3.6
        leg_frame = 0
        frame_count = 0
        
        cactus_x = 135.0
        cactus_h = 13
        cactus_w = 7

        cloud_x = 90.0
        cloud_y = 10
        ground_offset = 0

        running = True

        while running:
            frame_count += 1
            btn_now = btn_a.value()
            
            # 1. 跳躍輸入 (按鈕 A 或 B)
            if (btn_now == 0 or btn_b.value() == 0) and is_grounded:
                vy = jump_force
                is_grounded = False

            # 2. 恐龍重力物理
            if not is_grounded:
                dino_y += vy
                vy += gravity
                if dino_y >= GROUND_Y - DINO_H:
                    dino_y = GROUND_Y - DINO_H
                    vy = 0.0
                    is_grounded = True

            # 3. 障礙物與地面移動
            cactus_x -= speed
            if cactus_x < -10:
                cactus_x = 128 + random.randint(15, 60)
                cactus_h = random.choice([11, 13, 15])
            
            cloud_x -= 0.6
            if cloud_x < -20:
                cloud_x = 130
                cloud_y = random.randint(6, 16)

            ground_offset = (ground_offset + int(speed)) % 16

            # 計分與微幅加速
            score += 1
            if score % 100 == 0:
                speed = min(speed + 0.3, 6.5)

            if frame_count % 3 == 0:
                leg_frame = 1 - leg_frame

            # 4. 碰撞判定
            d_x1 = DINO_X + 4
            d_x2 = DINO_X + DINO_W - 2
            d_y1 = int(dino_y) + 2
            d_y2 = int(dino_y) + DINO_H

            c_x1 = int(cactus_x) + 1
            c_x2 = int(cactus_x) + cactus_w - 1
            c_y1 = GROUND_Y - cactus_h
            c_y2 = GROUND_Y

            if (d_x1 < c_x2 and d_x2 > c_x1 and d_y2 > c_y1 and d_y1 < c_y2):
                running = False

            # 5. 渲染畫面
            oled.fill(0)
            draw_cloud(cloud_x, cloud_y)

            # 地面線與碎石點
            oled.hline(0, GROUND_Y, 128, 1)
            for gx in range(0, 128, 14):
                px = (gx - ground_offset) % 128
                oled.pixel(px, GROUND_Y + 3, 1)
                oled.pixel((px + 5) % 128, GROUND_Y + 6, 1)

            draw_cactus(cactus_x, GROUND_Y - cactus_h, cactus_h)
            draw_dino(DINO_X, dino_y, leg_frame, jumping=(not is_grounded))

            score_str = "{:04d}".format(score)
            hi_str = "HI {:04d}".format(high_score)
            oled.text(score_str, 94, 2, 1)
            oled.text(hi_str, 36, 2, 1)

            oled.show()
            time.sleep_ms(20)

        # --- Game Over 結算 ---
        led_blue.value(0)
        led_red.value(1) # 紅燈警示
        
        if score > high_score:
            high_score = score

        oled.fill_rect(16, 16, 96, 32, 0)
        oled.rect(16, 16, 96, 32, 1)
        oled.rect(18, 18, 92, 28, 1)
        oled.text("GAME OVER!", 26, 22, 1)
        oled.text("Score: {}".format(score), 28, 33, 1)
        oled.show()

        # 等待 1.5 秒自動重啟 (或按按鍵秒重啟)
        wait_start = time.ticks_ms()
        while time.ticks_diff(time.ticks_ms(), wait_start) < 1800:
            if time.ticks_diff(time.ticks_ms(), wait_start) > 400:
                if btn_a.value() == 0 or btn_b.value() == 0:
                    break
            time.sleep_ms(30)

if __name__ == "__main__":
    main()
