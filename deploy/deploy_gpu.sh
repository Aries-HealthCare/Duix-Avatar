#!/usr/bin/env bash
# ==============================================================================
# Duix-Avatar GPU Server Deployment Script
# Target OS: Ubuntu 22.04 / Debian with NVIDIA GPU & Drivers
# ==============================================================================

set -e

echo "=== 1. Checking NVIDIA GPU & Driver ==="
if ! command -v nvidia-smi &> /dev/null; then
    echo "ERROR: nvidia-smi not found. Please install NVIDIA drivers first."
    exit 1
fi
nvidia-smi

echo "=== 2. Checking Docker & Compose ==="
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
fi

echo "=== 3. Checking NVIDIA Container Toolkit ==="
if ! dpkg -l | grep -q nvidia-container-toolkit; then
    echo "Installing NVIDIA Container Toolkit..."
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
      sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
      sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
    sudo apt-get update
    sudo apt-get install -y nvidia-container-toolkit
    sudo nvidia-ctk runtime configure --runtime=docker
    sudo systemctl restart docker
fi

echo "=== 4. Verifying Disk Space (Need >= 80GB) ==="
FREE_GB=$(df -BG / | awk 'NR==2 {gsub("G",""); print $4}')
echo "Available disk space: ${FREE_GB} GB"
if [ "$FREE_GB" -lt 60 ]; then
    echo "WARNING: Less than 60GB available. DUIX images require ~80GB uncompressed."
fi

echo "=== 5. Starting Duix-Avatar Containers ==="
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Pulling images (this may take 15-30 minutes depending on network)..."
docker compose -f docker-compose.server.yml pull

echo "Starting services in background..."
docker compose -f docker-compose.server.yml up -d

echo "=== 6. Status of Services ==="
docker compose -f docker-compose.server.yml ps

echo "=================================================================="
echo "Duix-Avatar Services are launching:"
echo " - Video Synthesis (Face2Face): http://<server-ip>:8383/easy"
echo " - Voice Cloning / TTS:         http://<server-ip>:18180"
echo " - Speech-to-Text / ASR:        http://<server-ip>:10095"
echo ""
echo "To test health from local machine or backend:"
echo "  python3 test_duix_api.py --host <server-ip>"
echo "=================================================================="
