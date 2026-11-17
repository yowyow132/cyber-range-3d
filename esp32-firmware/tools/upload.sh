#!/bin/bash
# ============================================
# EZ Start Kit+ 上傳工具（Mac／Linux／Git Bash）
# ============================================
# 用法：
#   ./tools/upload.sh              上傳全部檔案到 ESP32
#   ./tools/upload.sh d1_led       只上傳第 1 課當作 main.py
#   ./tools/upload.sh d5_sensors   只上傳第 5 課當作 main.py
# 連接埠：預設 auto（自動找）；要指定就先 export ESP32_PORT=/dev/cu.usbserial-0001（Windows 寫 COM4）
# ============================================

PORT="${ESP32_PORT:-auto}"
# Mac／Linux 一開序列埠板子就會重開（CP210x 的 DTR），要等開機訊息印完才進得了 raw REPL，
# 所以每次連線先 sleep 2（2026-11-04 Intel Mac 實測：沒這行會 "could not enter raw repl"）
MPREMOTE="uv run mpremote connect $PORT sleep 2"

if [ -z "$1" ]; then
    echo "=== 上傳全部檔案到 ESP32 ==="
    echo "連接埠: $PORT"
    echo ""

    # 建立目錄結構（已存在會報錯，忽略）
    $MPREMOTE mkdir :lib 2>/dev/null
    $MPREMOTE mkdir :demos 2>/dev/null

    # 上傳 lib（ssd1306.py：ESP32_GENERIC 韌體沒內建 OLED 驅動，ezkit.py 一開頭就 import）
    echo "[1/4] 上傳 lib/ssd1306.py、lib/zhfont.py ..."
    $MPREMOTE cp esp32/lib/ssd1306.py :lib/ssd1306.py || exit 1
    $MPREMOTE cp esp32/lib/zhfont.py :lib/zhfont.py || exit 1
    echo "[2/4] 上傳 lib/ezkit.py ..."
    $MPREMOTE cp esp32/lib/ezkit.py :lib/ezkit.py || exit 1

    # 上傳 demos
    echo "[3/4] 上傳 demos/ ..."
    for f in esp32/demos/*.py; do
        name=$(basename "$f")
        echo "       $name"
        $MPREMOTE cp "$f" ":demos/$name" || exit 1
    done

    # 上傳 boot.py 和 main.py
    echo "[4/4] 上傳 boot.py + main.py ..."
    $MPREMOTE cp esp32/boot.py :boot.py || exit 1
    $MPREMOTE cp esp32/main.py :main.py || exit 1

    echo ""
    echo "=== 上傳完成！重新啟動 ESP32 ==="
    $MPREMOTE reset
else
    # 上傳單一課程當作 main.py（方便學生一次學一課）
    LESSON="esp32/demos/$1.py"
    if [ ! -f "$LESSON" ]; then
        echo "找不到檔案: $LESSON"
        echo ""
        echo "可用的課程："
        ls esp32/demos/*.py | sed 's/esp32\/demos\//  /;s/.py//'
        exit 1
    fi

    echo "=== 上傳 $1 到 ESP32 ==="
    echo "連接埠: $PORT"

    # 確保 lib 目錄存在（已存在會報錯，忽略）
    $MPREMOTE mkdir :lib 2>/dev/null
    $MPREMOTE cp esp32/lib/ssd1306.py :lib/ssd1306.py || exit 1
    $MPREMOTE cp esp32/lib/zhfont.py :lib/zhfont.py || exit 1
    $MPREMOTE cp esp32/lib/ezkit.py :lib/ezkit.py || exit 1

    # 把課程上傳為 main.py
    $MPREMOTE cp "$LESSON" :main.py || exit 1

    echo ""
    echo "=== 上傳完成！重新啟動 ESP32 ==="
    $MPREMOTE reset
fi
