#!/bin/bash

# Feliactyl v2 - Auto Installer
# Usage: bash <(curl -s https://raw.githubusercontent.com/notcaliper/Feliactyl/v2-features/install.sh)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_banner() {
  echo -e "${CYAN}"
  echo "  ███████╗███████╗██╗     ██╗ █████╗  ██████╗████████╗██╗   ██╗██╗     "
  echo "  ██╔════╝██╔════╝██║     ██║██╔══██╗██╔════╝╚══██╔══╝╚██╗ ██╔╝██║     "
  echo "  █████╗  █████╗  ██║     ██║███████║██║        ██║    ╚████╔╝ ██║     "
  echo "  ██╔══╝  ██╔══╝  ██║     ██║██╔══██║██║        ██║     ╚██╔╝  ██║     "
  echo "  ██║     ███████╗███████╗██║██║  ██║╚██████╗   ██║      ██║   ███████╗"
  echo "  ╚═╝     ╚══════╝╚══════╝╚═╝╚═╝  ╚═╝ ╚═════╝   ╚═╝      ╚═╝   ╚══════╝"
  echo -e "${NC}"
  echo -e "  ${BOLD}Feliactyl v2 — Auto Installer${NC}"
  echo -e "  ${YELLOW}https://github.com/notcaliper/Feliactyl${NC}"
  echo ""
}

step() {
  echo -e "\n${CYAN}${BOLD}[+] $1${NC}"
}

success() {
  echo -e "${GREEN}[✓] $1${NC}"
}

warn() {
  echo -e "${YELLOW}[!] $1${NC}"
}

error_exit() {
  echo -e "${RED}[✗] $1${NC}"
  exit 1
}

check_root() {
  if [ "$EUID" -ne 0 ]; then
    error_exit "Please run as root: sudo bash install.sh"
  fi
}

check_os() {
  if ! grep -qiE "ubuntu|debian" /etc/os-release 2>/dev/null; then
    warn "This installer is designed for Ubuntu/Debian. Proceed with caution."
  fi
}

choose_webserver() {
  echo ""
  echo -e "${BOLD}Select a web server:${NC}"
  echo -e "  ${CYAN}1)${NC} Nginx   (recommended)"
  echo -e "  ${CYAN}2)${NC} Apache2"
  echo -e "  ${CYAN}3)${NC} Caddy   (automatic HTTPS)"
  read -rp "  Choice [1]: " ws_choice
  ws_choice=${ws_choice:-1}
  case $ws_choice in
    2) WEBSERVER="apache2" ;;
    3) WEBSERVER="caddy"   ;;
    *) WEBSERVER="nginx"   ;;
  esac
  success "Selected: ${WEBSERVER}"
}

install_dependencies() {
  step "Installing system dependencies"
  apt-get update -y -q
  apt-get install -y -q git curl ufw

  case $WEBSERVER in
    apache2)
      apt-get install -y -q apache2 certbot python3-certbot-apache
      a2enmod proxy proxy_http proxy_wstunnel ssl rewrite headers &>/dev/null
      ;;
    caddy)
      apt-get install -y -q debian-keyring debian-archive-keyring apt-transport-https
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
      apt-get update -y -q
      apt-get install -y -q caddy
      ;;
    *)
      apt-get install -y -q nginx certbot python3-certbot-nginx
      ;;
  esac
  success "System dependencies installed"
}

install_node() {
  step "Installing Node.js 20.x"
  if command -v node &>/dev/null; then
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -ge 20 ]; then
      success "Node.js $(node -v) already installed"
      return
    fi
  fi
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &>/dev/null
  apt-get install -y -q nodejs
  success "Node.js $(node -v) installed"
}

install_pm2() {
  step "Installing PM2"
  npm install -g pm2 -q
  success "PM2 installed"
}

clone_feliactyl() {
  step "Cloning Feliactyl into /var/www/feliactyl"
  if [ -d "/var/www/feliactyl" ]; then
    warn "/var/www/feliactyl already exists — pulling latest changes"
    git -C /var/www/feliactyl pull
  else
    git clone -b v2-features https://github.com/notcaliper/Feliactyl.git /var/www/feliactyl
  fi
  success "Feliactyl cloned"
}

install_npm_deps() {
  step "Installing npm packages"
  cd /var/www/feliactyl || error_exit "Could not enter /var/www/feliactyl"
  npm install -q
  success "npm packages installed"
}

configure_settings() {
  step "Configuring settings.json"
  cd /var/www/feliactyl || error_exit "Could not enter /var/www/feliactyl"
  if [ ! -f "settings.json" ]; then
    cp example.settings.json settings.json
    success "settings.json created from example"
  else
    warn "settings.json already exists — skipping"
  fi

  echo ""
  echo -e "${BOLD}Please fill in the following values:${NC}"

  read -rp "  Pterodactyl domain (e.g. https://panel.example.com): " ptero_domain
  read -rp "  Pterodactyl application API key: " ptero_key
  read -rp "  Discord OAuth2 client ID: " oauth_id
  read -rp "  Discord OAuth2 client secret: " oauth_secret
  read -rp "  Your Feliactyl domain (e.g. https://client.example.com): " feliactyl_domain
  read -rp "  Port to run on [8000]: " port
  port=${port:-8000}

  sed -i "s|\"domain\": \".*pterodactyl|\"domain\": \"${ptero_domain}|g" settings.json
  sed -i "s|\"key\": \"ptla.*\"|\"key\": \"${ptero_key}\"|g" settings.json
  sed -i "s|\"id\": \".*oauth\"|\"id\": \"${oauth_id}\"|g" settings.json
  sed -i "s|\"secret\": \".*\"|\"secret\": \"${oauth_secret}\"|g" settings.json
  sed -i "s|\"link\": \"https://.*\"|\"link\": \"${feliactyl_domain}\"|g" settings.json
  sed -i "s|\"port\": [0-9]*|\"port\": ${port}|g" settings.json

  success "settings.json updated"
}

setup_webserver() {
  read -rp "  Your domain for Feliactyl (e.g. client.example.com): " domain
  read -rp "  Port Feliactyl runs on [8000]: " port
  port=${port:-8000}

  ufw allow 80 &>/dev/null
  ufw allow 443 &>/dev/null

  case $WEBSERVER in

    apache2)
      step "Setting up Apache2"
      cat > /etc/apache2/sites-available/feliactyl.conf <<EOF
<VirtualHost *:80>
    ServerName ${domain}
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}\$1 [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName ${domain}

    SSLEngine on
    SSLCertificateFile    /etc/letsencrypt/live/${domain}/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/${domain}/privkey.pem

    ProxyPreserveHost On
    ProxyRequests Off

    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/afkwspath(.*) "ws://localhost:${port}/afkwspath\$1" [P,L]

    ProxyPass        / http://localhost:${port}/
    ProxyPassReverse / http://localhost:${port}/

    RequestHeader set X-Forwarded-For %{REMOTE_ADDR}s
</VirtualHost>
EOF
      a2ensite feliactyl.conf &>/dev/null
      a2dissite 000-default.conf &>/dev/null
      certbot certonly --apache -d "${domain}" --non-interactive --agree-tos -m "admin@${domain}" || warn "SSL cert failed — run: certbot certonly --apache -d ${domain}"
      systemctl restart apache2
      success "Apache2 configured and restarted"
      ;;

    caddy)
      step "Setting up Caddy"
      cat > /etc/caddy/Caddyfile <<EOF
${domain} {
    reverse_proxy /afkwspath localhost:${port} {
        header_up Upgrade {http.upgrade}
        header_up Connection {http.connection}
        transport http {
            versions h1
        }
    }
    reverse_proxy localhost:${port} {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
    }
}
EOF
      systemctl reload caddy
      success "Caddy configured (automatic HTTPS via Let's Encrypt)"
      ;;

    *)
      step "Setting up Nginx"
      cat > /etc/nginx/sites-enabled/feliactyl.conf <<EOF
server {
    listen 80;
    server_name ${domain};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain};

    ssl_certificate     /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
    ssl_session_cache   shared:SSL:10m;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location /afkwspath {
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_pass http://localhost:${port}/afkwspath;
    }

    location / {
        proxy_pass http://localhost:${port}/;
        proxy_buffering off;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF
      certbot certonly --nginx -d "${domain}" --non-interactive --agree-tos -m "admin@${domain}" || warn "SSL cert failed — run: certbot certonly --nginx -d ${domain}"
      nginx -t && systemctl restart nginx
      success "Nginx configured and restarted"
      ;;
  esac
}

start_feliactyl() {
  step "Starting Feliactyl with PM2"
  cd /var/www/feliactyl || error_exit "Could not enter /var/www/feliactyl"
  pm2 delete feliactyl &>/dev/null || true
  pm2 start start.js --name "feliactyl"
  pm2 save
  pm2 startup | tail -n1 | bash &>/dev/null || true
  success "Feliactyl started and set to run on boot"
}

print_done() {
  echo ""
  echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}${BOLD}  Feliactyl v2 installation complete!${NC}"
  echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  ${BOLD}Files:${NC}   /var/www/feliactyl"
  echo -e "  ${BOLD}Logs:${NC}    pm2 logs feliactyl"
  echo -e "  ${BOLD}Restart:${NC} pm2 restart feliactyl"
  echo -e "  ${BOLD}Stop:${NC}    pm2 stop feliactyl"
  echo ""
  echo -e "  ${YELLOW}Remember to review settings.json for any remaining config.${NC}"
  echo ""
}

# --- Run ---
print_banner
check_root
check_os
choose_webserver
install_dependencies
install_node
install_pm2
clone_feliactyl
install_npm_deps
configure_settings
setup_webserver
start_feliactyl
print_done
