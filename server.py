"""
Cyber Range 3D — 遊戲伺服器 ＋ 手機 HTTPS/WSS 陀螺儀中繼站
============================================================
- HTTP  + WS  (Port 8088): 電腦端開啟 http://localhost:8088/ 玩遊戲並連接 USB ESP32
- HTTPS + WSS (Port 8443): 手機端開啟 https://<電腦區網IP>:8443/gyro.html 當無線陀螺儀
"""

import argparse
import asyncio
import datetime
import ipaddress
import json
import mimetypes
import re
import shutil
import socket
import ssl
import sys
import webbrowser
from pathlib import Path
from urllib.parse import parse_qs, urlparse

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
import websockets
from websockets.asyncio.server import serve
from websockets.datastructures import Headers
from websockets.http11 import Response

ROOT_DIR = Path(__file__).resolve().parent
CERT_DIR = ROOT_DIR / ".certs"
CERT_FILE = CERT_DIR / "cert.pem"
KEY_FILE = CERT_DIR / "key.pem"
IPS_META_FILE = CERT_DIR / "ips.json"

HTTP_PORT = 8088
HTTPS_PORT = 8443

# Ensure common web/3D MIME types are registered on Windows
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("model/gltf-binary", ".glb")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/png", ".png")

GAME_CLIENTS: set = set()
GYRO_CLIENTS: set = set()
TUNNEL_STATE: dict = {
    "enabled": False,
    "status": "off",
    "url": None,
    "gyro_url": None,
    "error": None,
}
TRYCLOUDFLARE_RE = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com", re.IGNORECASE)


def get_lan_ips() -> list[str]:
    """收集本機所有非 Loopback / 非 Link-Local 的 IPv4 位址。"""
    ips: list[str] = []
    try:
        # Probe preferred outbound interface IP first
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            primary = s.getsockname()[0]
            if primary and not primary.startswith("127."):
                ips.append(primary)
    except OSError:
        pass

    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip and not ip.startswith("127.") and not ip.startswith("169.254.") and ip not in ips:
                ips.append(ip)
    except OSError:
        pass
    return ips


def ensure_self_signed_cert(lan_ips: list[str]) -> tuple[Path, Path]:
    """建立（或更新）包含本機所有 IP SAN 的自簽 TLS 憑證供手機 HTTPS/WSS 使用。"""
    CERT_DIR.mkdir(parents=True, exist_ok=True)
    if CERT_FILE.exists() and KEY_FILE.exists() and IPS_META_FILE.exists():
        try:
            saved_ips = json.loads(IPS_META_FILE.read_text(encoding="utf-8"))
            if set(saved_ips) == set(lan_ips):
                return CERT_FILE, KEY_FILE
        except Exception:
            pass

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, "Cyber Range 3D Local Relay"),
    ])

    san_entries: list[x509.GeneralName] = [
        x509.DNSName("localhost"),
        x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
    ]
    for ip in lan_ips:
        try:
            san_entries.append(x509.IPAddress(ipaddress.ip_address(ip)))
        except ValueError:
            pass

    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=365))
        .add_extension(x509.SubjectAlternativeName(san_entries), critical=False)
        .sign(key, hashes.SHA256())
    )

    KEY_FILE.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    CERT_FILE.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    IPS_META_FILE.write_text(json.dumps(lan_ips), encoding="utf-8")
    return CERT_FILE, KEY_FILE


def make_http_response(status: int, reason: str, content_type: str, body: bytes) -> Response:
    headers = Headers([
        ("Content-Type", content_type),
        ("Content-Length", str(len(body))),
        ("Cache-Control", "no-cache"),
        ("Access-Control-Allow-Origin", "*"),
    ])
    return Response(status, reason, headers, body)


async def handle_http_request(connection, request):
    """將非 WebSocket 的 HTTP/HTTPS 請求作為靜態檔案與 /api/info 回應。"""
    upgrade = (request.headers.get("Upgrade") or "").lower()
    parsed = urlparse(request.path)
    if upgrade == "websocket" and parsed.path == "/ws":
        return None  # 交由 WebSocket handshake 處理

    if parsed.path == "/api/info":
        ips = get_lan_ips()
        payload = json.dumps({
            "lan_ips": ips,
            "http_port": HTTP_PORT,
            "https_port": HTTPS_PORT,
            "gyro_urls": [f"https://{ip}:{HTTPS_PORT}/gyro.html" for ip in ips],
            "gyro_connected": len(GYRO_CLIENTS),
            "tunnel_enabled": TUNNEL_STATE["enabled"],
            "tunnel_status": TUNNEL_STATE["status"],
            "tunnel_url": TUNNEL_STATE["url"],
            "tunnel_gyro_url": TUNNEL_STATE["gyro_url"],
            "tunnel_error": TUNNEL_STATE["error"],
        }).encode("utf-8")
        return make_http_response(200, "OK", "application/json; charset=utf-8", payload)

    rel_path = parsed.path.lstrip("/") or "index.html"
    if rel_path.endswith("/"):
        rel_path += "index.html"

    try:
        target = (ROOT_DIR / rel_path).resolve()
        target.relative_to(ROOT_DIR)
    except Exception:
        return make_http_response(403, "Forbidden", "text/plain; charset=utf-8", b"Forbidden")

    # 阻擋存取隱藏憑證資料夾、虛擬環境、執行檔與後端程式
    if (
        ".certs" in target.parts
        or ".venv" in target.parts
        or target.name in ("server.py", "run.bat", "cloudflared.exe")
    ):
        return make_http_response(403, "Forbidden", "text/plain; charset=utf-8", b"Forbidden")

    if not target.is_file():
        return make_http_response(404, "Not Found", "text/plain; charset=utf-8", b"Not Found")

    mime, _ = mimetypes.guess_type(str(target))
    if not mime:
        mime = "application/octet-stream"
    if mime.startswith("text/") or mime in ("application/javascript", "application/json"):
        mime = f"{mime}; charset=utf-8"

    return make_http_response(200, "OK", mime, target.read_bytes())


async def broadcast(targets: set, message: str):
    if not targets:
        return
    dead = []
    for ws in list(targets):
        try:
            await ws.send(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        targets.discard(ws)


async def ws_handler(websocket):
    parsed = urlparse(websocket.request.path)
    qs = parse_qs(parsed.query)
    role = qs.get("role", ["game"])[0]
    if role not in ("game", "gyro"):
        role = "game"

    pool = GYRO_CLIENTS if role == "gyro" else GAME_CLIENTS
    pool.add(websocket)

    if role == "gyro":
        await broadcast(GAME_CLIENTS, f"GYRO_STATUS:connected:{len(GYRO_CLIENTS)}\n")
    else:
        status = f"connected:{len(GYRO_CLIENTS)}" if GYRO_CLIENTS else "disconnected:0"
        await websocket.send(f"GYRO_STATUS:{status}\n")
        if TUNNEL_STATE["gyro_url"]:
            await websocket.send(f"TUNNEL_URL:{TUNNEL_STATE['gyro_url']}\n")

    try:
        async for msg in websocket:
            text = msg if isinstance(msg, str) else msg.decode("utf-8", "ignore")
            if role == "gyro":
                await broadcast(GAME_CLIENTS, text)
            else:
                await broadcast(GYRO_CLIENTS, text)
    except websockets.ConnectionClosed:
        pass
    finally:
        pool.discard(websocket)
        if role == "gyro":
            status = f"connected:{len(GYRO_CLIENTS)}" if GYRO_CLIENTS else "disconnected:0"
            await broadcast(GAME_CLIENTS, f"GYRO_STATUS:{status}\n")


def find_cloudflared() -> str | None:
    local_exe = ROOT_DIR / "cloudflared.exe"
    if local_exe.is_file():
        return str(local_exe)
    return shutil.which("cloudflared")


async def run_cloudflare_tunnel():
    """啟動 cloudflared quick tunnel 並自動解析公開 HTTPS 網址。"""
    exe = find_cloudflared()
    if not exe:
        TUNNEL_STATE["status"] = "error"
        TUNNEL_STATE["error"] = "找不到 cloudflared.exe"
        print("⚠️  找不到 cloudflared.exe，略過公網穿牆通道（仍可使用同區網連線）。", flush=True)
        return

    TUNNEL_STATE["status"] = "starting"
    print("⏳ 正在啟動 Cloudflare 穿牆通道（約 3~6 秒）...", flush=True)

    proc = None
    try:
        proc = await asyncio.create_subprocess_exec(
            exe,
            "tunnel",
            "--no-autoupdate",
            "--url",
            f"http://127.0.0.1:{HTTP_PORT}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        assert proc.stdout is not None
        while True:
            line_bytes = await proc.stdout.readline()
            if not line_bytes:
                break
            line = line_bytes.decode("utf-8", errors="ignore").strip()
            match = TRYCLOUDFLARE_RE.search(line)
            if match and not TUNNEL_STATE["url"]:
                base_url = match.group(0)
                gyro_url = f"{base_url}/gyro.html"
                TUNNEL_STATE["url"] = base_url
                TUNNEL_STATE["gyro_url"] = gyro_url
                TUNNEL_STATE["status"] = "ready"
                TUNNEL_STATE["error"] = None
                print("\n" + "=" * 60)
                print("⚡ Cloudflare 穿牆通道已就緒！（學校防火牆可用）")
                print(f"  手機 5G 陀螺儀網址: {gyro_url}")
                print("  👉 直接在電腦遊戲點「📱 掃碼連手機陀螺儀」掃 QR Code 即可！")
                print("=" * 60 + "\n", flush=True)
                await broadcast(GAME_CLIENTS, f"TUNNEL_URL:{gyro_url}\n")

        rc = await proc.wait()
        if TUNNEL_STATE["status"] != "ready":
            TUNNEL_STATE["status"] = "error"
            TUNNEL_STATE["error"] = f"cloudflared 已結束 (code {rc})"
            print(f"⚠️  cloudflared 啟動失敗 (code {rc})，仍可使用同區網連線。", flush=True)
    except asyncio.CancelledError:
        if proc and proc.returncode is None:
            proc.terminate()
            try:
                await asyncio.wait_for(proc.wait(), timeout=3)
            except asyncio.TimeoutError:
                proc.kill()
        raise
    except Exception as exc:
        TUNNEL_STATE["status"] = "error"
        TUNNEL_STATE["error"] = str(exc)
        print(f"⚠️  cloudflared 異常：{exc}", flush=True)


async def main(enable_tunnel: bool = False, open_browser: bool = False):
    lan_ips = get_lan_ips()
    cert_path, key_path = ensure_self_signed_cert(lan_ips)

    ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_ctx.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))

    TUNNEL_STATE["enabled"] = enable_tunnel
    TUNNEL_STATE["status"] = "starting" if enable_tunnel else "off"

    print("=" * 60)
    print("CYBER RANGE 3D 伺服器已啟動！")
    print(f"  電腦遊戲網址 (HTTP):  http://localhost:{HTTP_PORT}/")
    for ip in lan_ips:
        print(f"  同區網手機陀螺儀 (HTTPS): https://{ip}:{HTTPS_PORT}/gyro.html")
    if not lan_ips:
        print(f"  同區網手機陀螺儀 (HTTPS): https://<你的區網IP>:{HTTPS_PORT}/gyro.html")
    print("=" * 60, flush=True)

    tunnel_task = None
    try:
        async with (
            serve(ws_handler, "0.0.0.0", HTTP_PORT, process_request=handle_http_request, compression=None),
            serve(ws_handler, "0.0.0.0", HTTPS_PORT, ssl=ssl_ctx, process_request=handle_http_request, compression=None),
        ):
            if open_browser:
                try:
                    webbrowser.open(f"http://localhost:{HTTP_PORT}/")
                except Exception:
                    pass
            if enable_tunnel:
                tunnel_task = asyncio.create_task(run_cloudflare_tunnel())
            await asyncio.Future()
    finally:
        if tunnel_task and not tunnel_task.done():
            tunnel_task.cancel()
            try:
                await tunnel_task
            except asyncio.CancelledError:
                pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cyber Range 3D 本機遊戲與手機陀螺儀中繼伺服器")
    parser.add_argument("--tunnel", action="store_true", help="自動啟動 cloudflared 穿牆通道")
    parser.add_argument("--open", action="store_true", help="啟動後自動開啟瀏覽器遊戲頁面")
    args = parser.parse_args()
    try:
        asyncio.run(main(enable_tunnel=args.tunnel, open_browser=args.open))
    except KeyboardInterrupt:
        pass
