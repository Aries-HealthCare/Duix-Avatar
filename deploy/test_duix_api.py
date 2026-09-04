#!/usr/bin/env python3
"""
Test and Healthcheck script for Duix-Avatar backend services.
Usage:
    python3 test_duix_api.py --host 127.0.0.1
    python3 test_duix_api.py --host <remote-gpu-server-ip>
"""

import argparse
import json
import sys
import urllib.request
import urllib.error
import socket

def check_socket(host: str, port: int, timeout: float = 3.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

def check_http(url: str, timeout: float = 5.0):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Duix-HealthCheck/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="ignore")[:300]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="ignore")[:300]
    except Exception as e:
        return None, str(e)

def main():
    parser = argparse.ArgumentParser(description="Duix-Avatar Health Check")
    parser.add_argument("--host", default="127.0.0.1", help="Host IP or hostname where Duix Docker is running")
    args = parser.parse_args()

    host = args.host
    print(f"==================================================")
    print(f"Testing Duix-Avatar Services on: {host}")
    print(f"==================================================")

    # 1. Check ASR service (port 10095)
    print(f"\n[1/3] FunASR Service (Port 10095)...")
    asr_ok = check_socket(host, 10095)
    if asr_ok:
        print(f"  ✅ Port 10095 is reachable and accepting connections.")
    else:
        print(f"  ❌ Port 10095 is NOT reachable. (FunASR service may still be starting or stopped)")

    # 2. Check TTS service (port 18180)
    print(f"\n[2/3] Fish-Speech TTS Service (Port 18180)...")
    tts_url = f"http://{host}:18180/docs"
    status, body = check_http(tts_url)
    if status in (200, 404, 405):
        print(f"  ✅ Fish-Speech TTS HTTP service responded (HTTP {status})")
    else:
        # Try raw socket
        if check_socket(host, 18180):
            print(f"  ✅ Port 18180 is open (service is up)")
        else:
            print(f"  ❌ Fish-Speech TTS is NOT reachable at {tts_url}: {body}")

    # 3. Check Face2Face Video Synthesis service (port 8383)
    print(f"\n[3/3] Face2Face Video Synthesis Service (Port 8383)...")
    f2f_url = f"http://{host}:8383/easy/query?code=test_health"
    status, body = check_http(f2f_url)
    if status is not None:
        print(f"  ✅ Face2Face Video API responded (HTTP {status})")
        print(f"     Response preview: {body.strip()}")
    else:
        if check_socket(host, 8383):
            print(f"  ✅ Port 8383 is open")
        else:
            print(f"  ❌ Face2Face Video API is NOT reachable at {f2f_url}: {body}")

    print(f"\n==================================================")
    print(f"Summary:")
    print(f" - ASR (10095):       {'UP' if asr_ok else 'DOWN'}")
    print(f" - TTS (18180):       {'UP' if status in (200, 404, 405) or check_socket(host, 18180) else 'DOWN'}")
    print(f" - Video Synth (8383):{'UP' if status is not None or check_socket(host, 8383) else 'DOWN'}")
    print(f"==================================================")

if __name__ == "__main__":
    main()
