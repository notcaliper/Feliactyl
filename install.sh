#!/bin/bash

# Feliactyl v2.2.0 - Auto Installer with Fail-Safe & Rollback
# Usage: bash <(curl -s https://raw.githubusercontent.com/notcaliper/Feliactyl/v2-features/install.sh)

set -e  # Exit on error (we handle rollback manually)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Installation state tracking
INSTALL_DIR="/var/www/feliactyl"
BACKUP_DIR="/var/backups/feliactyl-$(date +%Y%m%d-%H%M%S)"
CHECKPOINT_FILE="/tmp/feliactyl-install-checkpoint"
FAILED=0

# Track completed steps for rollback
COMPLETED_STEPS=()

# Trap errors for cleanup
trap 'cleanup_on_error' ERR INT TERM

cleanup_on_error() {
    local exit_code=$?
    if [ $exit_code -ne 0 ] && [ ${#COMPLETED_STEPS[@]} -gt 0 ]; then
        echo ""
        echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${RED}${BOLD}  Installation failed! Initiating rollback...${NC}"
        echo -e "${RED}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        rollback
    fi
    exit $exit_code
}

checkpoint() {
    echo "$1" >> "$CHECKPOINT_FILE"
    COMPLETED_STEPS+=("$1")
}

has_checkpoint() {
    [ -f "$CHECKPOINT_FILE" ] && grep -q "$1" "$CHECKPOINT_FILE"
}

clear_checkpoint() {
    rm -f "$CHECKPOINT_FILE"
}

# Retry function for flaky operations
retry() {
    local max_attempts=$1
    local delay=$2
    local description=$3
    shift 3
    
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        echo -e "${CYAN}[Attempt $attempt/$max_attempts] $description${NC}"
        if "$@"; then
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            echo -e "${YELLOW}  Failed, retrying in ${delay}s...${NC}"
            sleep $delay
        fi
        ((attempt++))
    done
    
    echo -e "${RED}  All $max_attempts attempts failed${NC}"
    return 1
}

# Rollback functions
rollback() {
    echo -e "${YELLOW}[Rollback] Undoing completed steps...${NC}"
    
    # Reverse order of completed steps
    for ((i=${#COMPLETED_STEPS[@]}-1; i>=0; i--)); do
        local step="${COMPLETED_STEPS[$i]}"
        echo -e "${YELLOW}  Rolling back: $step${NC}"
        
        case "$step" in
            "user_created")
                # Keep user, but stop processes
                sudo -u feliactyl pm2 stop all 2>/dev/null || true
                ;;
            "cloned")
                if [ -d "$INSTALL_DIR" ]; then
                    echo "  Backing up to $BACKUP_DIR"
                    mkdir -p "$BACKUP_DIR"
                    cp -r "$INSTALL_DIR" "$BACKUP_DIR/" 2>/dev/null || true
                    echo "  Not removing $INSTALL_DIR for safety - backup at $BACKUP_DIR"
                fi
                ;;
            "webserver_configured")
                # Disable config but don't delete
                case $WEBSERVER in
                    nginx)
                        rm -f /etc/nginx/sites-enabled/feliactyl.conf 2>/dev/null || true
                        nginx -t && systemctl reload nginx || true
                        ;;
                    apache2)
                        a2dissite feliactyl.conf 2>/dev/null || true
                        systemctl reload apache2 || true
                        ;;
                    caddy)
                        systemctl stop caddy 2>/dev/null || true
                        ;;
                esac
                ;;
            "services_started")
                sudo -u feliactyl pm2 stop all 2>/dev/null || true
                sudo -u feliactyl pm2 delete all 2>/dev/null || true
                ;;
        esac
    done
    
    echo -e "${GREEN}[Rollback] Completed. Check $BACKUP_DIR for backups.${NC}"
    echo -e "${YELLOW}To retry installation, fix the issue and run the installer again.${NC}"
}

# Verify checkpoint and resume if possible
resume_or_fresh() {
    if [ -f "$CHECKPOINT_FILE" ]; then
        echo ""
        echo -e "${YELLOW}${BOLD}Previous installation attempt detected!${NC}"
        echo ""
        echo -e "  Completed steps:"
        while IFS= read -r line; do
            echo "    - $line"
        done < "$CHECKPOINT_FILE"
        echo ""
        read -rp "Resume from last checkpoint? [Y/n]: " resume_choice
        resume_choice=${resume_choice:-Y}
        
        if [[ ! $resume_choice =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${YELLOW}Clearing checkpoint and starting fresh...${NC}"
            clear_checkpoint
            COMPLETED_STEPS=()
        else
            # Load completed steps from checkpoint
            while IFS= read -r line; do
                COMPLETED_STEPS+=("$line")
            done < "$CHECKPOINT_FILE"
            echo -e "${GREEN}Resuming installation...${NC}"
        fi
    fi
}

print_banner() {
  echo -e "${CYAN}"
  echo "  ███████╗███████╗██╗     ██╗ █████╗  ██████╗████████╗██╗   ██╗██╗     "
  echo "  ██╔════╝██╔════╝██║     ██║██╔══██╗██╔════╝╚══██╔══╝╚██╗ ██╔╝██║     "
  echo "  █████╗  █████╗  ██║     ██║███████║██║        ██║    ╚████╔╝ ██║     "
  echo "  ██╔══╝  ██╔══╝  ██║     ██║██╔══██║██║        ██║     ╚██╔╝  ██║     "
  echo "  ██║     ███████╗███████╗██║██║  ██║╚██████╗   ██║      ██║   ███████╗"
  echo "  ╚═╝     ╚══════╝╚══════╝╚═╝╚═╝  ╚═╝ ╚═════╝   ╚═╝      ╚═╝   ╚══════╝"
  echo -e "${NC}"
  echo -e "  ${BOLD}Feliactyl v2.2.0 — Auto Installer${NC}"
  echo -e "  ${YELLOW}github.com/notcaliper/Feliactyl${NC}"
  echo -e "  ${CYAN}discord.gg/N7C2nbYpQf${NC}"
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

setup_user() {
  step "Creating dedicated feliactyl user"
  
  # Create user if doesn't exist
  if ! id "feliactyl" &>/dev/null; then
    useradd -m -s /bin/bash -d /var/www/feliactyl feliactyl
    success "User 'feliactyl' created"
  else
    warn "User 'feliactyl' already exists"
  fi
  
  # Add to sudoers for PM2 (passwordless)
  if [ ! -f "/etc/sudoers.d/feliactyl" ]; then
    echo "feliactyl ALL=(ALL) NOPASSWD: /usr/bin/pm2" > /etc/sudoers.d/feliactyl
    chmod 440 /etc/sudoers.d/feliactyl
    success "Sudoers configured for feliactyl user"
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
  if has_checkpoint "cloned"; then
    warn "Feliactyl already cloned (checkpoint)"
    return 0
  fi
  
  step "Cloning Feliactyl into /var/www/feliactyl"
  
  # Backup existing if present
  if [ -d "/var/www/feliactyl" ] && [ ! -f "$INSTALL_DIR/.git/config" ]; then
    warn "Existing directory found, backing up"
    mv /var/www/feliactyl "/var/www/feliactyl.backup.$(date +%s)"
  fi
  
  # Clone with retry
  retry 3 5 "Cloning repository" bash -c "
    if [ -d '/var/www/feliactyl/.git' ]; then
      chown -R feliactyl:feliactyl /var/www/feliactyl
      cd /var/www/feliactyl && sudo -u feliactyl git pull
    else
      rm -rf /var/www/feliactyl
      git clone -b v2-features https://github.com/notcaliper/Feliactyl.git /var/www/feliactyl
      chown -R feliactyl:feliactyl /var/www/feliactyl
    fi
  "
  
  checkpoint "cloned"
  success "Feliactyl cloned"
}

install_npm_deps() {
  if has_checkpoint "npm_installed"; then
    warn "npm packages already installed (checkpoint)"
    return 0
  fi
  
  step "Installing npm packages"
  cd /var/www/feliactyl || error_exit "Could not enter /var/www/feliactyl"
  
  # Ensure proper ownership before npm operations
  chown -R feliactyl:feliactyl /var/www/feliactyl
  
  # Clean npm cache if previous attempt failed
  if [ -f "/tmp/npm-failed" ]; then
    warn "Previous npm failure detected, cleaning cache"
    sudo -u feliactyl npm cache clean --force 2>/dev/null || true
  fi
  
  # Install as feliactyl user with retry
  if ! retry 3 10 "Installing npm packages" sudo -u feliactyl npm install --production -q; then
    touch /tmp/npm-failed
    error_exit "npm install failed after 3 attempts"
  fi
  
  rm -f /tmp/npm-failed
  
  # Create required directories with proper ownership
  step "Creating required directories"
  mkdir -p /var/www/feliactyl/logs
  chown -R feliactyl:feliactyl /var/www/feliactyl/logs
  chown -R feliactyl:feliactyl /var/www/feliactyl/node_modules
  # Ensure feliactyl can write to parent directory for database.sqlite
  chown feliactyl:feliactyl /var/www/feliactyl
  
  checkpoint "npm_installed"
  success "npm packages installed"
}

configure_settings() {
  if has_checkpoint "settings_configured"; then
    warn "Settings already configured (checkpoint)"
    return 0
  fi
  
  step "Configuring settings.json"
  cd /var/www/feliactyl || error_exit "Could not enter /var/www/feliactyl"
  
  # Ensure proper ownership before file operations
  chown -R feliactyl:feliactyl /var/www/feliactyl
  
  # Backup existing settings
  if [ -f "settings.json" ] && [ ! -f "settings.json.backup" ]; then
    cp settings.json settings.json.backup
    chown feliactyl:feliactyl settings.json.backup
    success "Existing settings.json backed up"
  fi
  
  if [ ! -f "settings.json" ]; then
    cp example.settings.json settings.json
    chown feliactyl:feliactyl settings.json
    success "settings.json created from example"
  else
    warn "settings.json already exists — will update selectively"
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

  # Use jq if available, otherwise fallback to more robust sed patterns
  if command -v jq &>/dev/null; then
    # Use jq for proper JSON manipulation
    if jq --arg domain "$ptero_domain" \
         --arg key "$ptero_key" \
         --arg id "$oauth_id" \
         --arg secret "$oauth_secret" \
         --arg link "$feliactyl_domain" \
         --argjson port "$port" \
         '.pterodactyl.domain = $domain |
          .pterodactyl.key = $key |
          .api.client.oauth2.id = $id |
          .api.client.oauth2.secret = $secret |
          .api.client.oauth2.link = $link |
          .website.port = $port' settings.json > settings.json.tmp; then
      mv settings.json.tmp settings.json
      chown feliactyl:feliactyl settings.json
    else
      rm -f settings.json.tmp
      warn "jq processing failed, falling back to sed"
      # Fallback to sed
      sed -i "s|\"domain\": \"[^\"]*\"|\"domain\": \"${ptero_domain}\"|g" settings.json
      sed -i "s|\"key\": \"[^\"]*\"|\"key\": \"${ptero_key}\"|g" settings.json
      sed -i "s|\"id\": \"[^\"]*\"|\"id\": \"${oauth_id}\"|g" settings.json
      sed -i "s|\"secret\": \"[^\"]*\"|\"secret\": \"${oauth_secret}\"|g" settings.json
      sed -i "s|\"link\": \"[^\"]*\"|\"link\": \"${feliactyl_domain}\"|g" settings.json
      sed -i "s|\"port\": [0-9]*|\"port\": ${port}|g" settings.json
    fi
  else
    # Fallback to sed with more specific patterns
    sed -i "s|\"domain\": \"[^\"]*\"|\"domain\": \"${ptero_domain}\"|g" settings.json
    sed -i "s|\"key\": \"[^\"]*\"|\"key\": \"${ptero_key}\"|g" settings.json
    sed -i "s|\"id\": \"[^\"]*\"|\"id\": \"${oauth_id}\"|g" settings.json
    sed -i "s|\"secret\": \"[^\"]*\"|\"secret\": \"${oauth_secret}\"|g" settings.json
    sed -i "s|\"link\": \"[^\"]*\"|\"link\": \"${feliactyl_domain}\"|g" settings.json
    sed -i "s|\"port\": [0-9]*|\"port\": ${port}|g" settings.json
  fi

  success "settings.json updated"
  
  # Ensure proper ownership after sed modifications
  chown feliactyl:feliactyl /var/www/feliactyl/settings.json
  
  # Generate environment file for secrets
  step "Configuring environment variables (.env)"
  
  # Backup existing .env
  if [ -f ".env" ] && [ ! -f ".env.backup" ]; then
    cp .env .env.backup
    chown feliactyl:feliactyl .env.backup
    success "Existing .env backed up"
  fi
  
  if [ ! -f ".env" ]; then
    cp .env.example .env
    
    # Generate secure session secret
    session_secret=$(openssl rand -hex 32)
    
    # Update .env with provided values
    sed -i "s|PTERODACTYL_KEY=.*|PTERODACTYL_KEY=${ptero_key}|g" .env
    sed -i "s|DISCORD_OAUTH2_ID=.*|DISCORD_OAUTH2_ID=${oauth_id}|g" .env
    sed -i "s|DISCORD_OAUTH2_SECRET=.*|DISCORD_OAUTH2_SECRET=${oauth_secret}|g" .env
    sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=${session_secret}|g" .env
    sed -i "s|FELIACTYL_API_CODE=.*|FELIACTYL_API_CODE=$(openssl rand -hex 16)|g" .env
    sed -i "/DISCORD_BOT_TOKEN/d" .env
    
    # Secure the .env file
    chmod 600 .env
    chown feliactyl:feliactyl .env
    success ".env created with secure secrets (600 permissions)"
  else
    warn ".env already exists — skipping"
  fi
  
  checkpoint "settings_configured"
}

setup_webserver() {
  if has_checkpoint "webserver_configured"; then
    warn "Web server already configured (checkpoint)"
    return 0
  fi
  
  read -rp "  Your domain for Feliactyl (e.g. client.example.com): " domain
  
  # Get port from already configured settings.json
  if command -v jq &>/dev/null && [ -f "settings.json" ]; then
    port=$(jq -r '.website.port // 8000' settings.json)
  else
    # Fallback to grep
    port=$(grep '"port":' settings.json 2>/dev/null | head -1 | sed -n 's/.*"port": *\([0-9]*\).*/\1/p' || echo 8000)
  fi
  
  # Validate domain format
  if [[ ! $domain =~ ^[a-zA-Z0-9.-]+$ ]]; then
    error_exit "Invalid domain format"
  fi

  ufw allow 80 &>/dev/null
  ufw allow 443 &>/dev/null

  case $WEBSERVER in

    apache2)
      step "Setting up Apache2"
      
      # Write HTTP-only config initially
      cat > /etc/apache2/sites-available/feliactyl.conf <<EOF
<VirtualHost *:80>
    ServerName ${domain}

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
      
      # Test HTTP config first
      if ! apachectl configtest 2>/dev/null; then
        error_exit "Apache2 HTTP configuration invalid"
      fi
      
      # Certbot with retry
      if retry 2 30 "Obtaining SSL certificate" certbot certonly --apache -d "${domain}" --non-interactive --agree-tos -m "admin@${domain}" --quiet; then
        # SSL obtained - update with HTTPS redirect and SSL
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
        success "Apache2 configured with SSL"
      else
        warn "SSL certificate failed - running HTTP only"
      fi
      
      if apachectl configtest 2>/dev/null; then
        systemctl restart apache2
        success "Apache2 restarted"
      else
        error_exit "Apache2 configuration invalid"
      fi
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
      if systemctl reload caddy; then
        success "Caddy configured (automatic HTTPS via Let's Encrypt)"
      else
        warn "Caddy reload failed - checking configuration"
        caddy validate --config /etc/caddy/Caddyfile || error_exit "Caddy config invalid"
      fi
      ;;

    *)
      step "Setting up Nginx"
      
      # Write HTTP-only config initially (works without SSL)
      cat > /etc/nginx/sites-enabled/feliactyl.conf <<EOF
server {
    listen 80;
    server_name ${domain};

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
      
      # Test HTTP config first
      if ! nginx -t; then
        error_exit "Nginx HTTP configuration invalid"
      fi
      
      # Try to obtain SSL certificate
      if retry 2 30 "Obtaining SSL certificate" certbot certonly --nginx -d "${domain}" --non-interactive --agree-tos -m "admin@${domain}" --quiet; then
        # SSL obtained - update config with HTTPS redirect and SSL
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
        success "Nginx configured with SSL"
      else
        warn "SSL certificate failed - running HTTP only"
        warn "Fix DNS/ports, then run: certbot certonly --nginx -d ${domain}"
      fi
      
      if nginx -t; then
        systemctl restart nginx
        success "Nginx restarted"
      else
        error_exit "Nginx configuration invalid"
      fi
      ;;
  esac
  
  checkpoint "webserver_configured"
}

start_feliactyl() {
  if has_checkpoint "services_started"; then
    warn "Services already started (checkpoint)"
    return 0
  fi
  
  step "Starting Feliactyl with PM2 (Scalable Architecture)"
  cd /var/www/feliactyl || error_exit "Could not enter /var/www/feliactyl"
  
  # Ensure all files owned by feliactyl
  chown -R feliactyl:feliactyl /var/www/feliactyl
  
  # Test if Node.js app can start (quick test)
  step "Testing application startup"
  if ! sudo -u feliactyl timeout 10 node -e "require('./start.js')" 2>/dev/null; then
    warn "Quick startup test failed - continuing anyway"
  fi
  
  # Clean up any old processes (as feliactyl user)
  sudo -u feliactyl pm2 delete feliactyl-web &>/dev/null || true
  sudo -u feliactyl pm2 delete feliactyl-worker &>/dev/null || true
  sudo -u feliactyl pm2 delete feliactyl &>/dev/null || true
  
  # Ask for scaling preference
  echo ""
  echo -e "${BOLD}Select deployment mode:${NC}"
  echo -e "  ${CYAN}1)${NC} Development (single process, easier debugging)"
  echo -e "  ${CYAN}2)${NC} Production (multiple web instances + workers, recommended)"
  read -rp "  Choice [2]: " deploy_mode
  deploy_mode=${deploy_mode:-2}
  
  if [ "$deploy_mode" = "1" ]; then
    step "Starting in Development Mode"
    sudo -u feliactyl pm2 start start.js --name "feliactyl"
    success "Feliactyl started (development mode)"
  else
    step "Starting in Production Mode (Scalable Architecture)"
    
    # Ask for number of instances
    read -rp "  Number of web instances [2]: " web_instances
    web_instances=${web_instances:-2}
    read -rp "  Number of worker instances [2]: " worker_instances
    worker_instances=${worker_instances:-2}
    
    # Update ecosystem config with instance counts
    # Match "instances: process.env.XXX || N," and replace the entire expression
    sed -i "s|instances: process\.env\.WEB_INSTANCES\s*||\s*[0-9]*|instances: ${web_instances}|g" ecosystem.config.js
    sed -i "s|instances: process\.env\.WORKER_INSTANCES\s*||\s*[0-9]*|instances: ${worker_instances}|g" ecosystem.config.js
    # Also update the env vars in the file
    sed -i "s|WEB_INSTANCES: [0-9]*|WEB_INSTANCES: ${web_instances}|g" ecosystem.config.js
    sed -i "s|WORKER_INSTANCES: [0-9]*|WORKER_INSTANCES: ${worker_instances}|g" ecosystem.config.js
    chown feliactyl:feliactyl ecosystem.config.js
    
    # Start with ecosystem file as feliactyl user
    sudo -u feliactyl pm2 start ecosystem.config.js --env production
    
    success "Feliactyl started with ${web_instances} web instances and ${worker_instances} workers"
    
    echo ""
    echo -e "  ${CYAN}Scaling commands (run as feliactyl user):${NC}"
    echo -e "    sudo -u feliactyl pm2 scale feliactyl-web +1    # Add web instance"
    echo -e "    sudo -u feliactyl pm2 scale feliactyl-worker +1 # Add worker"
    echo -e "    sudo -u feliactyl pm2 monit                      # Monitor processes"
  fi
  
  # Setup PM2 startup for feliactyl user
  step "Configuring PM2 startup for feliactyl user"
  sudo -u feliactyl pm2 save
  
  # Generate startup script for feliactyl user
  # Capture the generated command and execute it properly
  startup_cmd=$(sudo -u feliactyl bash -c "export PATH=\"/usr/local/bin:/usr/bin:/bin:$PATH\"; pm2 startup systemd -u feliactyl --hp /var/www/feliactyl" 2>/dev/null | tail -n1)
  if [ -n "$startup_cmd" ]; then
    eval "$startup_cmd" &>/dev/null || true
  fi
  
  success "PM2 configuration saved and set to run on boot (as feliactyl user)"
  
  # Check health with retry
  step "Checking service health"
  # Get port from settings.json for health check
  if command -v jq &>/dev/null && [ -f "settings.json" ]; then
    health_port=$(jq -r '.website.port // 8000' settings.json)
  else
    health_port=$(grep '"port":' settings.json 2>/dev/null | head -1 | sed -n 's/.*"port": *\([0-9]*\).*/\1/p' || echo 8000)
  fi
  if retry 5 3 "Waiting for service to start" bash -c "curl -sf http://localhost:${health_port}/health/live | grep -qi 'ok\|alive\|true'"; then
    success "Health check passed - service is running"
  else
    warn "Health check failed - check logs with: sudo -u feliactyl pm2 logs"
    warn "You may need to run: sudo -u feliactyl pm2 start ecosystem.config.js"
  fi
  
  # Set proper permissions on PM2 files
  chown -R feliactyl:feliactyl /var/www/feliactyl/.pm2 2>/dev/null || true
  
  checkpoint "services_started"
  
  # Clear checkpoint on successful completion
  clear_checkpoint
}

print_done() {
  echo ""
  echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}${BOLD}  Feliactyl v2.2.0 installation complete!${NC}"
  echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  ${BOLD}Files:${NC}       /var/www/feliactyl (owned by feliactyl:feliactyl)"
  echo -e "  ${BOLD}Config:${NC}      /var/www/feliactyl/settings.json"
  echo -e "  ${BOLD}Secrets:${NC}      /var/www/feliactyl/.env (600 permissions)"
  echo -e "  ${BOLD}User:${NC}        feliactyl (dedicated service account)"
  echo ""
  echo -e "  ${CYAN}${BOLD}PM2 Commands (New Architecture):${NC}"
  echo -e "  ${YELLOW}Always run PM2 commands as feliactyl user:${NC}"
  echo -e "  ${BOLD}View logs:${NC}    sudo -u feliactyl pm2 logs feliactyl-web"
  echo -e "  ${BOLD}Worker logs:${NC}  sudo -u feliactyl pm2 logs feliactyl-worker"
  echo -e "  ${BOLD}Monitor:${NC}      sudo -u feliactyl pm2 monit"
  echo -e "  ${BOLD}Scale web:${NC}    sudo -u feliactyl pm2 scale feliactyl-web 4"
  echo -e "  ${BOLD}Scale workers:${NC} sudo -u feliactyl pm2 scale feliactyl-worker 3"
  echo -e "  ${BOLD}Restart:${NC}     sudo -u feliactyl pm2 reload feliactyl-web"
  echo -e "  ${BOLD}Stop all:${NC}    sudo -u feliactyl pm2 stop all"
  echo ""
  echo -e "  ${YELLOW}Or switch to feliactyl user: su - feliactyl${NC}"
  echo ""
  echo -e "  ${CYAN}${BOLD}Health Endpoints:${NC}"
  echo -e "  GET /health         - Full system status"
  echo -e "  GET /health/ready   - Ready for traffic"
  echo -e "  GET /health/workers - Worker statistics"
  echo ""
  echo -e "  ${YELLOW}Remember to review settings.json and .env for any remaining config.${NC}"
  echo ""
}

# --- Run ---
print_banner
check_root
check_os

# Check for previous attempt and offer resume
resume_or_fresh

# Only run steps that haven't been completed
if ! has_checkpoint "user_created"; then
  setup_user
  checkpoint "user_created"
fi

if ! has_checkpoint "dependencies_installed"; then
  choose_webserver
  install_dependencies
  install_node
  install_pm2
  checkpoint "dependencies_installed"
else
  # If resuming, we still need to know which webserver was selected
  # Default to nginx if we can't determine
  if [ -z "$WEBSERVER" ]; then
    if [ -f /etc/nginx/sites-enabled/feliactyl.conf ]; then
      WEBSERVER="nginx"
    elif [ -f /etc/apache2/sites-available/feliactyl.conf ]; then
      WEBSERVER="apache2"
    elif [ -f /etc/caddy/Caddyfile ]; then
      WEBSERVER="caddy"
    else
      warn "Could not determine webserver from previous install, defaulting to nginx"
      WEBSERVER="nginx"
    fi
  fi
  
  # Also need domain for various operations - read from settings.json if not set
  if [ -z "$domain" ] && [ -f "settings.json" ]; then
    if command -v jq &>/dev/null; then
      domain=$(jq -r '.api.client.oauth2.link // empty' settings.json | sed 's|https://||;s|http://||')
    fi
    # If still not set, try to extract from webserver config
    if [ -z "$domain" ]; then
      domain=$(grep 'server_name' /etc/nginx/sites-enabled/feliactyl.conf 2>/dev/null | head -1 | sed -n 's/.*server_name \([^;]*\);.*/\1/p')
    fi
    if [ -z "$domain" ]; then
      domain=$(grep 'ServerName' /etc/apache2/sites-available/feliactyl.conf 2>/dev/null | head -1 | awk '{print $2}')
    fi
  fi
fi

clone_feliactyl
install_npm_deps
configure_settings
setup_webserver
start_feliactyl

# Final success message
echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  Feliactyl v2.2.0 installed successfully!${NC}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

print_done
