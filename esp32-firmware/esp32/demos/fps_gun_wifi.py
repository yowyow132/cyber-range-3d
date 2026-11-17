"""
Cyber Range 3D — ESP32 Wi-Fi 無線體感槍韌體範本 (WebSocket + 搖桿 + MPU6050 陀螺儀)
================================================================================
支援：
1. Wi-Fi STA 連線 + 內建 RFC 6455 WebSocket Server (port 8765)
   -> 連線後 OLED 會顯示 ESP32 IP（例如 192.168.1.105:8765），在網頁點「📶 Wi-Fi 無線槍控」輸入即可！
2. 既有 EZ Start Kit+ 按鍵與顯示（蜂鳴器保持靜音）：
   - 按鈕 A (GPIO 5)：FIRE_DOWN / FIRE_UP
   - 按鈕 B (GPIO 36)：RELOAD
   - OLED：即時顯示 Wi-Fi IP、剩餘彈藥、HP、與目前狀態
   - RGB NeoPixel：射擊白光、換彈黃光、受擊紅光、升級藍光
3. 擴充硬體（買到零件接好線後，將下方開關改成 True 即可啟用）：
   - ENABLE_JOYSTICK = True：VRx=GPIO34, VRy=GPIO35, SW(下壓衝刺)=GPIO32 -> MOVE:x,y / DASH
   - ENABLE_MPU6050  = True：I2C (SDA=21, SCL=22, 0x68) -> AIM:dx,dy + 上抬體感跳躍 JUMP
"""

import time
import network
import socket
import hashlib
import ubinascii
import struct
from machine import Pin, ADC
from lib.ezkit import *

try:
    buzzer.duty(0)
except Exception:
    pass

# ==========================================
# 1. 使用者設定區（請填入家裡/手機熱點 Wi-Fi）
# ==========================================
WIFI_SSID = "YOUR_WIFI_SSID"
WIFI_PASS = "YOUR_WIFI_PASSWORD"
WS_PORT = 8765

ENABLE_JOYSTICK = False
ENABLE_MPU6050 = False

# 搖桿腳位建議使用 ADC1（避免與 Wi-Fi 衝突）
PIN_JOY_X = 34
PIN_JOY_Y = 35
PIN_JOY_SW = 32


# ==========================================
# 2. 輕量 RFC 6455 WebSocket 伺服器 (MicroPython)
# ==========================================
class SimpleWSServer:
    def __init__(self, port=8765):
        self.srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.srv.bind(("0.0.0.0", port))
        self.srv.listen(1)
        self.srv.settimeout(0)
        self.client = None
        self.rx_buf = b""

    def _handshake(self, conn):
        conn.settimeout(1.5)
        try:
            req = conn.recv(1024).decode("utf-8", "ignore")
        except Exception:
            conn.close()
            return False

        key = None
        for line in req.split("\r\n"):
            if line.lower().startswith("sec-websocket-key:"):
                key = line.split(":", 1)[1].strip()
                break
        if not key:
            conn.close()
            return False

        magic = key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        accept = ubinascii.b2a_base64(hashlib.sha1(magic.encode()).digest()).decode().strip()
        resp = (
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
        )
        conn.send(resp.encode())
        conn.settimeout(0)
        return True

    def poll(self):
        # 接受新連線（同時只服務一把槍）
        try:
            conn, _ = self.srv.accept()
            if self._handshake(conn):
                if self.client:
                    try:
                        self.client.close()
                    except Exception:
                        pass
                self.client = conn
                self.rx_buf = b""
        except OSError:
            pass

        if not self.client:
            return []

        msgs = []
        try:
            data = self.client.recv(512)
            if data == b"":
                self.close_client()
                return []
            if data:
                self.rx_buf += data
                while len(self.rx_buf) >= 2:
                    b0 = self.rx_buf[0]
                    b1 = self.rx_buf[1]
                    opcode = b0 & 0x0F
                    masked = (b1 & 0x80) != 0
                    length = b1 & 0x7F
                    idx = 2
                    if length == 126:
                        if len(self.rx_buf) < 4:
                            break
                        length = struct.unpack(">H", self.rx_buf[2:4])[0]
                        idx = 4
                    elif length == 127:
                        if len(self.rx_buf) < 10:
                            break
                        length = struct.unpack(">Q", self.rx_buf[2:10])[0]
                        idx = 10
                    mask_len = 4 if masked else 0
                    if len(self.rx_buf) < idx + mask_len + length:
                        break
                    mask = self.rx_buf[idx:idx + 4] if masked else b""
                    payload = bytearray(self.rx_buf[idx + mask_len:idx + mask_len + length])
                    self.rx_buf = self.rx_buf[idx + mask_len + length:]
                    if masked:
                        for i in range(length):
                            payload[i] ^= mask[i % 4]
                    if opcode == 0x8:
                        self.close_client()
                        break
                    elif opcode in (0x1, 0x2):
                        msgs.append(bytes(payload).decode("utf-8", "ignore"))
        except OSError:
            pass
        return msgs

    def send_text(self, text):
        if not self.client:
            return False
        raw = text.encode("utf-8")
        n = len(raw)
        if n < 126:
            hdr = bytes([0x81, n])
        else:
            hdr = bytes([0x81, 126]) + struct.pack(">H", n)
        try:
            self.client.send(hdr + raw)
            return True
        except Exception:
            self.close_client()
            return False

    def close_client(self):
        if self.client:
            try:
                self.client.close()
            except Exception:
                pass
            self.client = None
        self.rx_buf = b""


# ==========================================
# 3. MPU6050 陀螺儀輕量讀取 (共用 EZKit I2C)
# ==========================================
class SimpleMPU6050:
    def __init__(self, i2c, addr=0x68):
        self.i2c = i2c
        self.addr = addr
        self.i2c.writeto_mem(self.addr, 0x6B, b"\x00")  # 喚醒 MPU6050
        self.last_jump_ms = 0

    def read_gyro_and_jump(self, now_ms):
        data = self.i2c.readfrom_mem(self.addr, 0x3B, 14)
        ax, ay, az, _, gx, gy, gz = struct.unpack(">hhhhhhh", data)
        # 依實際安裝方向微調 gx/gy/gz 對應 Yaw/Pitch
        dx = (-gz / 131.0) * 0.14
        dy = (gx / 131.0) * 0.14
        if abs(dx) < 0.08:
            dx = 0.0
        if abs(dy) < 0.08:
            dy = 0.0

        # 體感上抬跳躍偵測（1G ≈ 16384，快速上抬加速度突破閾值觸發 JUMP）
        jump = False
        if az > 25500 and time.ticks_diff(now_ms, self.last_jump_ms) > 650:
            self.last_jump_ms = now_ms
            jump = True
        return dx, dy, jump


# ==========================================
# 4. Wi-Fi 連線與主迴圈
# ==========================================
def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        oled.fill(0)
        oled.text("Connecting WiFi", 0, 12)
        oled.text(WIFI_SSID[:16], 0, 28)
        oled.show()
        wlan.connect(WIFI_SSID, WIFI_PASS)
        for _ in range(30):
            if wlan.isconnected():
                break
            time.sleep_ms(300)
    return wlan


ammo = 22
max_ammo = 22
hp_pct = 100
state = "WAIT"
ip_str = "NO WIFI"


def draw_oled():
    oled.fill(0)
    oled.text(ip_str[:16], 0, 0)
    oled.text(f"AMMO:{ammo}/{max_ammo}", 0, 14)
    pips = min(ammo, 24)
    for i in range(pips):
        oled.fill_rect(i * 5, 28, 3, 7, 1)
    oled.text(f"HP:{hp_pct}% {state}", 0, 40)
    draw_progress_bar(0, 52, 128, 10, hp_pct)
    oled.show()


def set_rgb(r, g, b):
    for i in range(3):
        np[i] = (r, g, b)
    np.write()


def main():
    global ammo, max_ammo, hp_pct, state, ip_str
    wlan = connect_wifi()
    if wlan.isconnected():
        ip_str = wlan.ifconfig()[0]
    ws = SimpleWSServer(WS_PORT)

    joy_x = joy_y = joy_sw = None
    if ENABLE_JOYSTICK:
        joy_x = ADC(Pin(PIN_JOY_X))
        joy_y = ADC(Pin(PIN_JOY_Y))
        joy_x.atten(ADC.ATTN_11DB)
        joy_y.atten(ADC.ATTN_11DB)
        joy_sw = Pin(PIN_JOY_SW, Pin.IN, Pin.PULL_UP)

    mpu = None
    if ENABLE_MPU6050:
        try:
            mpu = SimpleMPU6050(i2c)
        except Exception:
            mpu = None

    last_a = btn_a.value()
    last_b = btn_b.value()
    last_sw = 1
    last_a_ms = 0
    last_b_ms = 0
    last_joy_ms = 0
    last_oled_ms = 0
    dirty = True

    draw_oled()
    set_rgb(0, 20, 40)

    while True:
        now = time.ticks_ms()

        # 1. 處理網頁回傳狀態
        for msg in ws.poll():
            for line in msg.strip().splitlines():
                if line.startswith("S:"):
                    parts = line[2:].split(",")
                    if len(parts) >= 3:
                        try:
                            ammo = int(parts[0])
                            hp_pct = int(parts[1])
                            state = parts[2]
                            if len(parts) >= 4:
                                max_ammo = max(1, int(parts[3]))
                            dirty = True
                            if state == "HIT":
                                set_rgb(80, 0, 0)
                            elif state == "RELOAD":
                                set_rgb(60, 40, 0)
                            elif state == "LVLUP":
                                set_rgb(0, 40, 80)
                            else:
                                set_rgb(0, 30, 15)
                        except ValueError:
                            pass

        # 2. 按鈕 A (射擊) / 按鈕 B (換彈)
        cur_a = btn_a.value()
        if cur_a != last_a and time.ticks_diff(now, last_a_ms) > 28:
            last_a = cur_a
            last_a_ms = now
            if cur_a == 0:
                ws.send_text("FIRE_DOWN\n")
                set_rgb(60, 60, 60)
            else:
                ws.send_text("FIRE_UP\n")

        cur_b = btn_b.value()
        if cur_b != last_b and time.ticks_diff(now, last_b_ms) > 40:
            last_b = cur_b
            last_b_ms = now
            if cur_b == 0:
                ws.send_text("RELOAD\n")

        # 3. 搖桿移動 + SW 下壓衝刺
        if ENABLE_JOYSTICK and joy_x and time.ticks_diff(now, last_joy_ms) > 35:
            last_joy_ms = now
            vx = (joy_x.read() - 2048) / 2048.0
            vy = -(joy_y.read() - 2048) / 2048.0
            ws.send_text(f"MOVE:{vx:.2f},{vy:.2f}\n")

            cur_sw = joy_sw.value()
            if cur_sw == 0 and last_sw == 1:
                ws.send_text("DASH\n")
            last_sw = cur_sw

        # 4. MPU6050 陀螺儀瞄準 + 上抬跳躍
        if mpu:
            dx, dy, jumped = mpu.read_gyro_and_jump(now)
            if dx != 0.0 or dy != 0.0:
                ws.send_text(f"AIM:{dx:.2f},{dy:.2f}\n")
            if jumped:
                ws.send_text("JUMP\n")

        if dirty and time.ticks_diff(now, last_oled_ms) > 60:
            draw_oled()
            last_oled_ms = now
            dirty = False

        time.sleep_ms(8)


if __name__ == "__main__":
    main()
