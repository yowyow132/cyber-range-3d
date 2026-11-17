# maker-esp32：創客入門 ESP32 學生資料夾

東華大學通識「創客入門－智慧生活裝置實作」115-1 用的 ESP32 資料夾：搭配 Circus **EZ Start Kit+** 擴充板，用 MicroPython 一課一個檔案學。
課堂上全部在 **VS Code** 裡做：用 Codex 擴充功能請 AI 幫忙準備環境、改程式，再用 VS Code 任務上傳到板子，自己看燈號驗收。

## 快速開始

1. **裝 VS Code 和 Codex 擴充功能**（教室電腦已裝好就跳過）。
2. VS Code 按 `Ctrl+Shift+P` → `Git: Clone` → 貼上 `https://github.com/cwstedctw/maker-esp32.git` → 選一個**路徑短**的位置（例如 `C:\maker`）。
3. 打開資料夾時選 **Yes, I trust the authors**（沒信任的話 Codex 和 ESP32 任務都不能用）。
4. Codex 用老師課程專案的 API key 登入（左邊 Codex 圖示 → **Use API Key**）。
5. 請 Codex 依這份 README 準備環境，或自己雙擊 `setup-vscode-codex.cmd`（Windows 一鍵安裝：VS Code、Python、uv、擴充功能、mpremote／esptool，最後跑環境檢查）。

操作步驟以課堂公告的手冊為準。

## 資料夾裡有什麼

```
esp32/                  上傳到 ESP32 的檔案
  boot.py、main.py      開機初始化、選單（按 B 換課、長按 A 執行）
  lib/ezkit.py          共用硬體模組（所有元件腳位）
  lib/ssd1306.py        OLED 驅動（micropython-lib，MIT；韌體沒內建）
  lib/zhfont.py         中文點陣字型
  demos/d1_led.py … d9_full_demo.py   九課範例
tools/
  check_env.ps1         Windows 環境檢查（-Fix 自動修部分項目）
  upload.ps1            Windows 上傳（VS Code 任務會呼叫它）
  upload.sh             Mac／Linux／Git Bash 上傳
  gen_font.py           產生中文字型
.vscode/                VS Code 任務與設定
setup-vscode-codex.cmd  Windows 一鍵安裝（雙擊）
```

## VS Code 任務

`Ctrl+Shift+P`（Mac 是 `⌘⇧P`）→ `Tasks: Run Task`。同一組任務在 Mac／Linux 會自動改跑 `tools/upload.sh`（Windows 跑 `.ps1`）：

| 任務 | 做什麼 |
|---|---|
| ESP32: 環境檢查 | 檢查 Python、uv、mpremote／esptool、USB 驅動、COM port、韌體版本 |
| ESP32: Upload all | 上傳全部檔案（開機進選單） |
| ESP32: Upload lesson (pick one) | 只上傳一課當 `main.py`（開機直接跑那一課） |
| ESP32: Soft reset | 軟重開 |
| ESP32: Serial monitor | 看板子印出的文字；`Ctrl+C` 中斷、`Ctrl+]` 離開 |
| ESP32: Generate font | 重新產生中文字型 |

Mac 終端機也可以直接跑：`./tools/upload.sh d1_led`（連接埠預設自動找；要指定就 `ESP32_PORT=/dev/cu.usbserial-0001 ./tools/upload.sh d1_led`，用 `ls /dev/cu.*` 找）。

## 版本

- 韌體：MicroPython **v1.29.0**（ESP32_GENERIC，2026-08-24），燒在 `0x1000`。板子是舊版時「環境檢查」會提醒，請助教重燒。
- mpremote 1.29.0、esptool 5.6.0（`uv sync` 依 `uv.lock` 安裝）。
- USB 晶片是 Silicon Labs **CP2102**：Windows 要有 CP210x 驅動才會出現 COM port（安裝要系統管理員；教室電腦由學校預裝）；Mac 不用裝驅動（macOS 內建），插上就多一個 `/dev/cu.usbserial-…`。

## 助教：重燒韌體（板子不是 v1.29.0、或跑著不理 Ctrl+C 的舊程式）

先跑過一次一鍵安裝或 `uv sync`，在 `maker-esp32` 裡（`COM4` 換成環境檢查找到的連接埠）：

```powershell
# 1. 先備份整顆 4 MB flash（約 100 秒；要還原就 write-flash 0 這個檔）
uv run esptool --port COM4 --baud 460800 read-flash 0 ALL backup-板子編號.bin
# Mac 用 /dev/cu.usbserial-0001；Intel Mac 實測 --baud 460800 讀回來會不完整，拿掉 --baud 用預設速率（約 5 分鐘）
# 2. 下載韌體：https://micropython.org/resources/firmware/ESP32_GENERIC-20260824-v1.29.0.bin
# 3. 清除再寫入
uv run esptool --port COM4 erase-flash
uv run esptool --port COM4 --baud 460800 write-flash -z 0x1000 ESP32_GENERIC-20260824-v1.29.0.bin
# 4. 確認版本，應該印出 MicroPython v1.29.0
uv run mpremote connect COM4 exec "import sys; print(sys.version)"
```

最後跑 VS Code 任務「ESP32: Upload all」把課程放回去。燒錄中斷就按住 BOOT、短按 EN，再重跑第 3 步。

## 硬體對應表（EZ Start Kit+）

| 元件 | GPIO |
|------|------|
| 紅色 LED | 16 |
| 黃色 LED | 12 |
| 藍/綠色 LED | 13 |
| WS2812 RGB LED x3 | 26 |
| 被動蜂鳴器 | 14 |
| 按鈕 A | 5 |
| 按鈕 B | 36 |
| 光敏電阻 | 39 |
| 可變電阻 | 34 |
| DHT11 溫濕度 | 15 |
| 紅外線接收 | 33 |
| 繼電器 | 25 |
| OLED (I2C) | SDA=21, SCL=22 |

## 規矩

- 金鑰只貼在 Codex 的登入欄；不要寫進程式、不要 commit、不要截圖。
- AI 說「完成了」不算數：自己看到檔案、看到燈號才算。
