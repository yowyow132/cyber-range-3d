"""
Cyber Range 3D — 遊戲伺服器 ＋ 手機 HTTPS/WSS 陀螺儀中繼站
============================================================
- HTTP  + WS  (Port 8088): 電腦端開啟 http://localhost:8088/ 玩遊戲並連接 USB ESP32
- HTTPS + WSS (Port 8443): 手機端開啟 https://<電腦區網IP>:8443/gyro.html 當無線陀螺儀
"""

import asyncio
import datetime
import ipaddress
import json
import mimetypes
import socket
import ssl
from pathlib import Path
from urllib.parse import parse_qs, urlparse

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

    # 阻擋存取隱藏憑證資料夾與後端程式
    if ".certs" in target.parts or target.name == "server.py":
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


async def main():
    lan_ips = get_lan_ips()
    cert_path, key_path = ensure_self_signed_cert(lan_ips)

    ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_ctx.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))

    print("=" * 60)
    print("CYBER RANGE 3D 伺服器已啟動！")
    print(f"  電腦遊戲網址 (HTTP):  http://localhost:{HTTP_PORT}/")
    for ip in lan_ips:
        print(f"  手機陀螺儀網址 (HTTPS): https://{ip}:{HTTPS_PORT}/gyro.html")
    if not lan_ips:
        print(f"  手機陀螺儀網址 (HTTPS): https://<你的區網IP>:{HTTPS_PORT}/gyro.html")
    print("=" * 60, flush=True)

    async with (
        serve(ws_handler, "0.0.0.0", HTTP_PORT, process_request=handle_http_request),
        serve(ws_handler, "0.0.0.0", HTTPS_PORT, ssl=ssl_ctx, process_request=handle_http_request),
    ):
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
