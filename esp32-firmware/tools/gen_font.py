"""
在電腦上執行，產生 zhfont.py 給 ESP32 使用。
用 Pillow 把中文字渲染成 16x16 點陣圖資料。
"""
from PIL import Image, ImageDraw, ImageFont
import sys

# 需要用到的所有中文字
CHARS = "展示開始紅黃藍燈彩虹蜂鳴器音階感測溫度濕光線按鈕繼電完成準備讀取中呼吸亮控制旋調互動外遙模式等秒進條閃爍漸變歡迎全功能效果轉收信號部小星或接到重來色同時停第課選單上下執行你好世界三不也了些以們做偵可各合喀因圖在型基奏字學己形我手文曲會有本檔次歌沒混演為用的緣聲聽自英裡要試這遮邊關顆顏顯綠青紫白"

# Windows 內建微軟正黑體
FONT_PATH = "C:/Windows/Fonts/msjh.ttc"
FONT_SIZE = 15  # 配合 16x16 格子，稍大避免筆畫太細


def char_to_bitmap(ch, font):
    img = Image.new("1", (16, 16), 0)
    draw = ImageDraw.Draw(img)
    bbox = font.getbbox(ch)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = (16 - w) // 2 - bbox[0]
    y = (16 - h) // 2 - bbox[1]
    draw.text((x, y), ch, fill=1, font=font)
    # 轉成 bytes: 每行 2 bytes, 共 16 行 = 32 bytes
    data = bytearray(32)
    for row in range(16):
        val = 0
        for col in range(16):
            if img.getpixel((col, row)):
                val |= 1 << (15 - col)
        data[row * 2] = (val >> 8) & 0xFF
        data[row * 2 + 1] = val & 0xFF
    return bytes(data)


def main():
    font = ImageFont.truetype(FONT_PATH, FONT_SIZE)
    lines = []
    lines.append("# Auto-generated Chinese bitmap font (16x16)")
    lines.append("# Do not edit manually")
    lines.append("")
    lines.append("FONT = {")
    for ch in CHARS:
        bmp = char_to_bitmap(ch, font)
        lines.append("    {}: {},".format(repr(ch), repr(bmp)))
    lines.append("}")
    lines.append("")
    lines.append("")
    lines.append("def draw_text(oled, x, y, text):")
    lines.append('    """在 OLED 上繪製中文字串，每字 16x16"""')
    lines.append("    for ch in text:")
    lines.append("        if ch in FONT:")
    lines.append("            data = FONT[ch]")
    lines.append("            for row in range(16):")
    lines.append("                val = (data[row * 2] << 8) | data[row * 2 + 1]")
    lines.append("                for col in range(16):")
    lines.append("                    if val & (1 << (15 - col)):")
    lines.append("                        oled.pixel(x + col, y + row, 1)")
    lines.append("            x += 16")
    lines.append("        elif ch == ' ':")
    lines.append("            x += 8")
    lines.append("        else:")
    lines.append("            # ASCII fallback: use built-in font")
    lines.append("            oled.text(ch, x, y + 4, 1)")
    lines.append("            x += 8")

    with open("zhfont.py", "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("Generated zhfont.py with {} characters".format(len(CHARS)))


if __name__ == "__main__":
    main()
