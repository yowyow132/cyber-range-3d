<#
.SYNOPSIS
    EZ Start Kit+ 上傳工具
.DESCRIPTION
    上傳 MicroPython 檔案到 ESP32
.PARAMETER Lesson
    指定單一課程（例如 d1_led），只上傳該課程作為 main.py
.PARAMETER Port
    指定 COM port（預設自動偵測，或使用環境變數 ESP32_PORT）
#>

param(
    [string]$Lesson,
    [string]$Port
)

$ErrorActionPreference = 'Stop'

# --- 偵測 COM Port ---
if (!$Port) {
    $Port = $env:ESP32_PORT
}
if (!$Port) {
    # 自動偵測
    $comDev = Get-CimInstance Win32_PnPEntity 2>$null |
        Where-Object { $_.Name -match '(COM\d+)' -and $_.Name -match 'CH340|CH341|CP210|FTDI|USB-SERIAL|USB Serial|Silicon Labs' } |
        Select-Object -First 1
    if ($comDev -and $comDev.Name -match '(COM\d+)') {
        $Port = $Matches[1]
    } else {
        $Port = "auto"
    }
}

function Invoke-Mp {
    # 參數不能叫 $Args：那是 PowerShell 的自動變數，傳進來會變成空的，
    # mpremote 只收到 connect 就進 REPL 卡住不結束（5.1 與 7 都一樣，2026-11-04 實測）
    param([string[]]$MpArgs, [switch]$AllowFail)
    $oldPref = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    if ($AllowFail) {
        & uv run mpremote connect $Port @MpArgs 2>$null | Out-Null
    } else {
        & uv run mpremote connect $Port @MpArgs
    }
    $code = $LASTEXITCODE
    $ErrorActionPreference = $oldPref
    if ($code -ne 0 -and -not $AllowFail) {
        Write-Host "  !! mpremote 失敗（$($MpArgs -join ' ')），結束代碼 $code" -ForegroundColor Red
        exit $code
    }
}

# --- 上傳邏輯 ---
if (!$Lesson) {
    # === 上傳全部檔案 ===
    Write-Host ""
    Write-Host "=== 上傳全部檔案到 ESP32 ===" -ForegroundColor Cyan
    Write-Host "連接埠: $Port" -ForegroundColor Gray
    Write-Host ""

    # 建立目錄（已存在會報錯，忽略）
    Invoke-Mp @("mkdir", ":lib") -AllowFail
    Invoke-Mp @("mkdir", ":demos") -AllowFail

    # 上傳 lib（ssd1306.py：ESP32_GENERIC 韌體沒內建 OLED 驅動，ezkit.py 一開頭就 import）
    Write-Host "[1/4] 上傳 lib/ssd1306.py、lib/zhfont.py ..." -ForegroundColor Yellow
    Invoke-Mp @("cp", "esp32/lib/ssd1306.py", ":lib/ssd1306.py")
    Invoke-Mp @("cp", "esp32/lib/zhfont.py", ":lib/zhfont.py")

    Write-Host "[2/4] 上傳 lib/ezkit.py ..." -ForegroundColor Yellow
    Invoke-Mp @("cp", "esp32/lib/ezkit.py", ":lib/ezkit.py")

    # 上傳 demos
    Write-Host "[3/4] 上傳 demos/ ..." -ForegroundColor Yellow
    $demoFiles = Get-ChildItem "esp32/demos/*.py"
    foreach ($f in $demoFiles) {
        Write-Host "       $($f.Name)" -ForegroundColor Gray
        Invoke-Mp @("cp", "esp32/demos/$($f.Name)", ":demos/$($f.Name)")
    }

    # 上傳 boot.py + main.py
    Write-Host "[4/4] 上傳 boot.py + main.py ..." -ForegroundColor Yellow
    Invoke-Mp @("cp", "esp32/boot.py", ":boot.py")
    Invoke-Mp @("cp", "esp32/main.py", ":main.py")

    Write-Host ""
    Write-Host "=== 上傳完成！重新啟動 ESP32 ===" -ForegroundColor Green
    Invoke-Mp @("reset")

} else {
    # === 上傳單一課程 ===
    $lessonFile = "esp32/demos/$Lesson.py"
    if (!(Test-Path $lessonFile)) {
        Write-Host "找不到檔案: $lessonFile" -ForegroundColor Red
        Write-Host ""
        Write-Host "可用的課程：" -ForegroundColor Yellow
        Get-ChildItem "esp32/demos/*.py" | ForEach-Object {
            Write-Host "  $($_.BaseName)" -ForegroundColor Gray
        }
        exit 1
    }

    Write-Host ""
    Write-Host "=== 上傳 $Lesson 到 ESP32 ===" -ForegroundColor Cyan
    Write-Host "連接埠: $Port" -ForegroundColor Gray

    # 確保 lib 存在（已存在會報錯，忽略）
    Invoke-Mp @("mkdir", ":lib") -AllowFail
    Invoke-Mp @("cp", "esp32/lib/ssd1306.py", ":lib/ssd1306.py")
    Invoke-Mp @("cp", "esp32/lib/zhfont.py", ":lib/zhfont.py")
    Invoke-Mp @("cp", "esp32/lib/ezkit.py", ":lib/ezkit.py")

    # 把課程上傳為 main.py
    Invoke-Mp @("cp", $lessonFile, ":main.py")

    Write-Host ""
    Write-Host "=== 上傳完成！重新啟動 ESP32 ===" -ForegroundColor Green
    Invoke-Mp @("reset")
}
