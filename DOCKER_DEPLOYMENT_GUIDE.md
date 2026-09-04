# DUIX-Avatar Docker Deployment & Integration Guide

This guide details how to deploy and operate the [Duix-Avatar](https://github.com/duixcom/Duix-Avatar.git) backend services using Docker, connect the local client, and integrate avatar generation into the Aries Healthcare Ecosystem.

---

## 1. System & Hardware Requirements

| Component | Requirement | Note |
| :--- | :--- | :--- |
| **GPU** | NVIDIA GPU with >= 8GB VRAM (RTX 3070/4070/4090, A10G, T4, L4) | Required for PyTorch CUDA inference |
| **Driver** | NVIDIA Driver >= 525.xx + NVIDIA Container Toolkit | Required for Docker `runtime: nvidia` |
| **RAM** | Minimum 16 GB (32 GB recommended) | Required for loading FunASR + Fish-Speech |
| **Disk Space** | Minimum 80–100 GB free disk space | 3 Docker images total ~40 GB compressed |
| **Host OS** | Ubuntu 20.04/22.04 LTS or Windows 10/11 with WSL2 | Native Linux / WSL2 with NVIDIA passthrough |

### Why Docker Cannot Run the AI Inference on Apple Silicon Macs
- macOS uses Apple Metal/MPS architecture.
- The `guiji2025/duix.avatar`, `guiji2025/fish-speech-ziming`, and `guiji2025/fun-asr` Docker images are compiled exclusively for `linux/amd64` and rely on NVIDIA CUDA tensor cores.
- Docker Desktop on macOS runs a virtualized Linux VM on Apple Silicon without NVIDIA GPU passthrough (`runtime: nvidia` is unavailable).
- Furthermore, local disk space on this Mac is currently near capacity (2.0 GB free on `/Volumes/Personal`, 23 GB on root `/`), whereas pulling these images requires ~80–100 GB.

---

## 2. Cloud GPU One-Click Deployment (Recommended)

You can spin up an NVIDIA GPU instance on any provider (RunPod, Vast.ai, Lambda Labs, AWS EC2 `g5.xlarge`, or GCP Compute Engine):

### Step 1: Clone and Enter the Repository
```bash
git clone --depth 1 https://github.com/duixcom/Duix-Avatar.git
cd Duix-Avatar/deploy
```

### Step 2: Run the Deployment Script
```bash
chmod +x deploy_gpu.sh
./deploy_gpu.sh
```
The script will automatically:
1. Verify NVIDIA drivers (`nvidia-smi`).
2. Install Docker and NVIDIA Container Toolkit if missing.
3. Pull the official Docker images.
4. Launch the 3 services (`duix-avatar-asr`, `duix-avatar-tts`, `duix-avatar-gen-video`) in the background.

### Step 3: Verify the Endpoints
Run the verification script from any machine:
```bash
python3 test_duix_api.py --host <YOUR_GPU_SERVER_IP>
```

Expected output:
```text
==================================================
Testing Duix-Avatar Services on: <YOUR_GPU_SERVER_IP>
==================================================

[1/3] FunASR Service (Port 10095)...
  ✅ Port 10095 is reachable and accepting connections.

[2/3] Fish-Speech TTS Service (Port 18180)...
  ✅ Fish-Speech TTS HTTP service responded (HTTP 200)

[3/3] Face2Face Video Synthesis Service (Port 8383)...
  ✅ Face2Face Video API responded (HTTP 200)

==================================================
Summary:
 - ASR (10095):       UP
 - TTS (18180):       UP
 - Video Synth (8383): UP
==================================================
```

---

## 3. Running the Desktop Client on macOS (Connected to Remote GPU)

We have patched `Duix-Avatar/src/main/util/ffmpeg.js` and `Duix-Avatar/src/main/config/config.js` to ensure the desktop GUI runs seamlessly on macOS and routes API requests to your GPU Docker server:

1. Install local dependencies:
   ```bash
   cd /Volumes/Personal/Aries-HealthCare-EcoSystem/Duix-Avatar
   npm install
   ```

2. Point the client to your Docker GPU server:
   ```bash
   export DUIX_HOST="<YOUR_GPU_SERVER_IP>"
   npm run dev
   ```

3. The Electron GUI will launch on macOS, using the local interface while delegating heavy video generation and voice cloning to the GPU Docker container.

---

## 4. Integrating with Aries Healthcare Admin Dashboard & Backend

In your ecosystem, `AriesXpert-Admin-Dashboard` and `ariesxpert-backend` can directly invoke avatar video generation using the Duix API:

### 1. Submit Video Generation Job
**Endpoint:** `POST http://<DUIX_HOST>:8383/easy/submit`
```json
{
  "video_url": "/code/data/avatars/portrait_base.mp4",
  "audio_url": "/code/data/voice/audio_speech.wav",
  "code": "job_uuid_94812",
  "chaofen": 0,
  "watermark_switch": 0,
  "pn": 1
}
```

### 2. Poll Task Progress
**Endpoint:** `GET http://<DUIX_HOST>:8383/easy/query?code=job_uuid_94812`

**Response:**
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "status": "success",
    "progress": 100,
    "video_url": "/code/data/output/job_uuid_94812.mp4"
  }
}
```

### 3. Note on `aries-avatar-render-engine`
Notice that your workspace already contains `aries-avatar-render-engine` (`/Volumes/Personal/Aries-HealthCare-EcoSystem/aries-avatar-render-engine`), which implements the exact same FastAPI + Celery + MinIO wrapper for the `guiji2025/heygem.ai` (DUIX core engine) inference container. You can use either direct DUIX Docker endpoints or the Celery-queued Aries engine.
