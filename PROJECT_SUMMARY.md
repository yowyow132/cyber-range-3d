# 專案現況總結與接手指南（PROJECT SUMMARY & HANDOFF）

> 本文件彙整目前 **CYBER RANGE 3D: ROGUELITE** 專案的開發目標、已完成項目、檔案架構與跨電腦接手／演示注意事項，方便在另一台電腦（或由下一位協作者／AI 助理）快速無縫接續開發與燒錄。

---

## 一、我們在做什麼？（專案核心）
這是一個結合 **網頁 3D 肉鴿射擊遊戲（Three.js r128）** 與 **ESP32 MicroPython 實體體感槍控（EZ Start Kit+）** 的軟硬體整合專案：
- **電腦／手機瀏覽器** 負責執行 3D 賽博龐克競技場 FPS 遊戲、動態合成器配樂、肉鴿流派系統與視覺回饋。
- **ESP32 開發板** 透過 **USB Web Serial** 或 **Wi-Fi WebSocket** 作為實體槍把控制器，傳送開火／換彈／移動／體感瞄準指令，並接收網頁回傳的剩餘彈藥、HP 與遊戲狀態顯示於板載 **OLED 與 RGB NeoPixel**。

---

## 二、目前已完成的功能

### 1. 網頁端 3D 遊戲本體（根目錄）
- **開局流派與肉鴿構築**（`roguelite-data.js`、`index.html`）：
  - 3 種開局武器：**脈衝突擊步槍**（全自動高機動）、**電漿榴彈砲**（拋物線爆破／破盾）、**穿甲磁軌狙擊**（貫穿光束／高暴擊）。
  - 擊殺掉落 EXP 寶石，升級進入 **時間凍結 3D 全息卡牌選擇**（直接開槍射擊卡牌或按 `1 / 2 / 3` 裝備），並含覺醒與終極進化前置（`firerate x3`、`survival x3`、`firepower x3`、`exclusive x2`）。
  - **狙擊覺醒強化**：雙層粗能量光束與擴展命中寬度；**衝鋒槍極速覺醒補償**：額外補傷害、暴擊與彈匣。
- **3D 賽博競技場美術與互動機關**（`world-art.js`、`assets/`、`models/`）：
  - AI 貼圖天空球（`assets/cyber_sky.jpg`）、全息霓虹廣告看板（`assets/holo_ad_1.jpg`、`holo_ad_2.jpg`）、高架環形天橋、6 種天際線大樓原型、Wedge Spinner 懸浮飛車與中央動畫反應爐（`models/PrimaryIonDrive.glb`）。
  - **立體分岔連鎖閃電弧**、**場地彈射跳台**（可騰空俯射持盾怪）、**可射爆連鎖能量桶**、以及動態戰場事件（空投補給箱、戰術 EMP 信標、黃金獎勵無人機）。
- **多階段地面預警 Boss 系統**：
  - Boss 出招前具明確 3D 預警與提示：`orbital_strike`（紅色倒數轟炸圓圈＋光柱）、`ground_shockwave`（可按 `Space` 或踩跳台躍過的擴散震波環，`+100 騰空閃避`）、`charge_dash`（紅色直線路徑預警後突進）、`fan` / `spiral` 彈幕。
  - 血量 `<= 45%` 進入 **第 2 階段狂暴覺醒**，召喚護衛機並加速出招。
- **音訊與手感優化（符合工作室品管標準）**：
  - **Web Audio 賽博合成器 BGM（F Minor / 124 BPM）** 依「選單／戰鬥／Boss」即時變奏 ＋ 濾波白噪音分層槍聲／爆破音效（含 `±7%` 隨機音高與連殺升調）。
  - 敵機 **受擊閃白（Hit Flash）**、**連殺 Combo 倍率**、`ESC`／`P` **暫停構築檢視面板**、`localStorage` 分流派最高紀錄記憶、總音量與滑鼠靈敏度滑桿。
  - **Pointer Lock 降級相容模式**：即使在內嵌視窗或未鎖定滑鼠環境也能直接遊玩不卡死。
- **🎯 演示模式（無敵靶機）**：
  - 主選單可直接進入「演示模式」：玩家無敵、不刷一般怪、中央只有一座人形全息靶機，每發命中即掉落藍色 EXP 寶石，歸零自動重置，方便現場展示武器與升級系統。
- **📱 手機專屬觸控介面（嚴格限定手機顯示）**：
  - 僅在觸控／行動裝置（`pointer: coarse` 或手機 UA）顯示左下虛擬搖桿、右滑轉視角、開火／跳躍／衝刺／換彈／暫停鈕與橫屏自適應 HUD；電腦版完全隱藏。

### 2. ESP32 實體槍控韌體（`esp32-firmware/`）
- `esp32/demos/fps_gun.py`：USB 有線 Web Serial 版本（含開火/換彈防抖、狀態同步與聲光回饋）。
- `esp32/demos/fps_gun_wifi.py`：Wi-Fi STA ＋ Port `8765` WebSocket Server（整合 OLED 狀態顯示、按鈕 A 開火 / 按鈕 B 換彈）。
- **已開啟非阻塞聲光回饋（`ENABLE_BUZZER` / `ENABLE_LIGHT_FX`）**：兩版本均支援開火脈衝掃頻音效＋橘白閃光、空倉低音＋紅閃、換彈升調音＋藍光、受擊低頻警訊＋紅光、升級四音階琶音＋金光、陣亡關機音，並同步控制 NeoPixel 與板載紅/黃/藍 LED。
- 已預留 `ENABLE_JOYSTICK`（GPIO 34/35/32）與 `ENABLE_MPU6050`（I2C 21/22）外接搖桿與陀螺儀開關（目前預設 `False`）。
- 附 `tools/upload.ps1`、`pyproject.toml`、`uv.lock` 供快速燒錄（Windows 若遇 `pyyaml` 編譯問題，建議以 `uv venv --python 3.12` 建立環境）。

### 3. 手機無線陀螺儀與體感中繼（`server.py`、`gyro.html`）
- **免買外接感測器方案**：電腦接 USB ESP32 負責實體開槍/換彈/聲光，手機綁在槍上作為無線 6 軸陀螺儀與體感器，透過 Wi-Fi 或 5G 傳回電腦遊戲。
- **`server.py` 雙協議中繼伺服器**：
  - Port `8088`（HTTP + WS）：電腦開啟 `http://localhost:8088/` 玩遊戲並連接 USB ESP32。
  - Port `8443`（HTTPS + WSS）：自動產生 `.certs/` 自簽憑證供同區網手機開啟 `https://<區網IP>:8443/gyro.html`；若電腦與手機不在同區網（如學校電腦＋手機 5G），可搭配 `cloudflared tunnel --url http://127.0.0.1:8088` 取得公網 HTTPS/WSS 通道。
- **`gyro.html` 手機體感控制器**：
  - **2 步自動方向校正（`🧭 自動校正`）**：依提示「往右轉」與「往上抬」即自動鎖定任意貼附角度（豎放／平放／橫放／側放）與正負號，並保存於 `localStorage`。
  - **體感跳躍與衝刺**：以低通濾波追蹤世界垂直重力方向，自動分離「快速上抬 (`JUMP`)」與「快速往前推 (`DASH`)」，含防回彈與防轉身誤觸濾波及可調門檻滑桿。
  - **固定螢幕人體工學優化**：預設 `2.8x` 高靈敏度（最高 `6.0x`）、**偏轉邊緣自動續轉**（偏離中心超過 `20°` 即平順持續轉向，不用轉身背對螢幕也能打背後）、**🔄 回頭 180°**（`TURN_180`）、**⏸ 按住移正離合器**與**↺ 歸零中心**，並支援虛擬移動搖桿與彈藥/HP 即時同步。

### 4. 工作室規格文件
- `GAME_SPEC.md`、`ART_SPEC.md`、`AUDIO_SPEC.md`、`README.md`。

---

## 三、跨電腦接手與演示必看注意事項

1. **燒錄 ESP32 前記得補回 Wi-Fi 帳密**：
   - `esp32-firmware/esp32/demos/fps_gun_wifi.py` 為安全起見已移除密碼（目前是 `YOUR_WIFI_SSID` / `YOUR_WIFI_PASSWORD`），在新電腦燒錄前請先填上熱點帳密，再於 `esp32-firmware/` 執行 `uv sync --python 3.12` 與 `powershell -ExecutionPolicy Bypass -File .\tools\upload.ps1 -Lesson fps_gun_wifi`（需先確認有裝 CH340/CP210x USB 驅動）。
2. **啟動電腦遊戲＋手機陀螺儀伺服器**：
   - 執行 `esp32-firmware\.venv\Scripts\python.exe server.py`，電腦開 `http://localhost:8088/`。
   - **同區網（家裡 Wi-Fi）**：手機開 `https://<電腦區網IP>:8443/gyro.html`。
   - **不同網路（學校電腦＋手機 5G）**：另開 `cloudflared tunnel --url http://127.0.0.1:8088`，手機用 5G 開產生的 `https://*.trycloudflare.com/gyro.html` 即可連線。
3. **「手機當螢幕 + ESP32 無線玩」連線限制（重要）**：
   - GitHub Pages 網址為 `https://`，瀏覽器會因 **Mixed Content 安全規範** 阻擋連線 ESP32 的未加密 `ws://<ESP32_IP>:8765`。
   - 要用手機螢幕連 ESP32 時，請讓**電腦與 ESP32 連同一個手機熱點**，電腦開 `server.py`（或 `python -m http.server 8088`），手機瀏覽器改開 **`http://<電腦區網IP>:8088/`**，即可配對 `📶 Wi-Fi 無線槍控`。

---

## 四、接下來預計要做的事（Next Steps）
1. **外接硬體接線實測（選配）**：若後續購買類比搖桿與 MPU6050 陀螺儀，可將 `fps_gun_wifi.py` 內的 `ENABLE_JOYSTICK` 與 `ENABLE_MPU6050` 改為 `True` 實測。
2. **實戰手感微調**：持續微調手機陀螺儀靈敏度、偏轉續轉角度與體感跳躍/衝刺觸發門檻，並依實際展示環境調整體驗。
