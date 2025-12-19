#!/bin/bash
set -e

# =============================================================================
# Tequity VM Setup Script (One-time)
# =============================================================================
# Run this script once to prepare the VM for deployment
# Usage: bash setup-vm.sh
# =============================================================================

echo "=== Tequity VM Setup Script ==="
echo ""

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo ""
    echo "Docker installed. Please log out and back in, then re-run this script."
    echo "Run: exit"
    echo "Then SSH back in and run: bash setup-vm.sh"
    exit 0
fi

echo "Docker is installed: $(docker --version)"

# Install Docker Compose v2 (plugin)
if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    sudo apt install -y docker-compose-plugin
fi

echo "Docker Compose is installed: $(docker compose version)"

# Install Caddy
if ! command -v caddy &> /dev/null; then
    echo "Installing Caddy..."
    sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt update
    sudo apt install caddy -y
fi

echo "Caddy is installed: $(caddy version)"

# Create directories
echo "Creating directories..."
sudo mkdir -p /opt/tequity
sudo mkdir -p /opt/tequity/backups
sudo mkdir -p /var/log/tequity
sudo mkdir -p /var/log/caddy
sudo chown -R $USER:$USER /opt/tequity
sudo chown -R $USER:$USER /var/log/tequity

# Install helpful tools
echo "Installing utility tools..."
sudo apt install -y curl jq htop ncdu fail2ban

# Setup fail2ban for SSH protection
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Install Tequity systemd service
echo "Installing Tequity systemd service..."
if [ -f /opt/tequity/tequity.service ]; then
    sudo cp /opt/tequity/tequity.service /etc/systemd/system/tequity.service
    sudo systemctl daemon-reload
    sudo systemctl enable tequity
    echo "Tequity service installed and enabled for auto-start on boot"
else
    echo "Note: Copy tequity.service to /opt/tequity/ first, then run:"
    echo "  sudo cp /opt/tequity/tequity.service /etc/systemd/system/"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable tequity"
fi

# Setup firewall (UFW)
echo "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp    # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp   # HTTPS
echo "y" | sudo ufw enable
sudo ufw status

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo ""
echo "1. Copy deployment files to /opt/tequity:"
echo "   scp docker-compose.yml .env Caddyfile tequity.service deploy.sh user@VM_IP:/opt/tequity/"
echo ""
echo "2. Install systemd service (if not already done):"
echo "   sudo cp /opt/tequity/tequity.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable tequity"
echo ""
echo "3. Copy Caddyfile to Caddy config:"
echo "   sudo cp /opt/tequity/Caddyfile /etc/caddy/Caddyfile"
echo ""
echo "4. Configure DNS - Add A records pointing to this VM's IP:"
echo "   tequity1.lightningleapanalytics.com -> $(curl -s ifconfig.me)"
echo "   admin.tequity1.lightningleapanalytics.com -> $(curl -s ifconfig.me)"
echo ""
echo "5. Reload Caddy:"
echo "   sudo systemctl reload caddy"
echo ""
echo "6. Add Cloud SQL authorized network:"
echo "   Add this VM's IP ($(curl -s ifconfig.me)) to Cloud SQL authorized networks in GCP Console"
echo ""
echo "7. Create .env file from .env.example and fill in values"
echo ""
echo "8. Start the service:"
echo "   sudo systemctl start tequity"
echo ""
echo "=== Systemd Commands Reference ==="
echo ""
echo "  Start:   sudo systemctl start tequity"
echo "  Stop:    sudo systemctl stop tequity"
echo "  Restart: sudo systemctl restart tequity"
echo "  Status:  sudo systemctl status tequity"
echo "  Logs:    journalctl -u tequity -f"
echo "  Deploy:  sudo systemctl reload tequity  (pulls new images and restarts)"
echo ""
