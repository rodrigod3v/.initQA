#!/bin/bash
# VM Preparation Script for .initQA
set -e

echo "--- Starting VM Preparation ---"

# 1. Update system
sudo dnf update -y || sudo apt-get update -y

# 2. Check for Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo dnf install -y docker-ce docker-ce-cli containerd.io || \
    (curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh)
    sudo systemctl enable --now docker
    sudo usermod -aG docker $USER
else
    echo "Docker already installed: $(docker --version)"
fi

# 3. Check for Docker Compose
if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose already installed: $(docker compose version)"
fi

# 4. Configure Swap (Ensuring 1GB RAM stability)
if [ $(free -m | grep Swap | awk '{print $2}') -eq 0 ]; then
    echo "Creating 2GB swap file for performance..."
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
else
    echo "Swap already configured."
fi

# 5. Firewall config (Oracle Cloud/Generic)
echo "Configuring firewall..."
sudo firewall-cmd --permanent --add-port=80/tcp || true
sudo firewall-cmd --permanent --add-port=3000/tcp || true
sudo firewall-cmd --reload || true

echo "--- VM Preparation Complete ---"
echo "NOTE: Log out and back in for docker group changes to take effect."
