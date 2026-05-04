<div align="center">

<br>

<img src="https://raw.githubusercontent.com/notcaliper/Feliactyl/v2-features/assets/default/img/logo.svg" width="120" alt="Feliactyl Logo" />

<br>

# ✦ Feliactyl

### A modern, feature-rich Pterodactyl client panel

<br>

[![Version](https://img.shields.io/badge/✦%20version-2.0-7c3aed?style=for-the-badge)](https://github.com/notcaliper/Feliactyl/releases)
[![Node](https://img.shields.io/badge/node.js-%E2%89%A520-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/github/license/notcaliper/Feliactyl?style=for-the-badge&color=ec4899)](LICENSE)
[![Stars](https://img.shields.io/github/stars/notcaliper/Feliactyl?style=for-the-badge&color=f59e0b&logo=github)](https://github.com/notcaliper/Feliactyl/stargazers)
[![Issues](https://img.shields.io/github/issues/notcaliper/Feliactyl?style=for-the-badge&color=ef4444)](https://github.com/notcaliper/Feliactyl/issues)

<br>

[🚀 Quick Install](#-quick-install) &nbsp;·&nbsp; [✨ Features](#-features) &nbsp;·&nbsp; [📖 Manual Install](#-manual-installation) &nbsp;·&nbsp; [⚙️ Configuration](#%EF%B8%8F-configuration) &nbsp;·&nbsp; [🔄 Updating](#-updating)

<br>

</div>

---

> Feliactyl is a fork of [Heliactyl](https://github.com/Heliactyl-Project/Heliactyl) 13.3, maintained by [**notcaliper**](https://github.com/notcaliper).  
> Completely redesigned with a modern dark UI, plan store, discount system, advanced admin tools, and much more — starting fresh at **v2.0**.

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🖥️ Core
- 🗄️ **Resource Management** — create & manage servers
- 🪙 **Coins** — AFK earning, Linkvertise, gifting
- 🔄 **Server Renewal** — coin-gated renewals
- 🎟️ **Coupons** — grant coins & resources
- 🌐 **Server Control** — create, edit, delete
- 💳 **Payments** — buy coins via Stripe
- 🔐 **OAuth2 Login** — Discord authentication
- 🔑 **Credentials** — regen password in-panel
- 🎁 **Join for Rewards** — earn coins via Discord
- 📡 **API** — for bots & integrations

</td>
<td width="50%" valign="top">

### 🛒 Store & Plans
- 💾 **Resource Store** — buy RAM, Disk, CPU, slots
- 📦 **Plan Upgrades** — purchase plans with coins
- 🏷️ **Discounts** — admin % discounts with expiry

### 🛡️ Admin Panel
- 👥 **All Users** — Discord ID, coins, plan, resources
- 📋 **Plans Manager** — create/delete with cost control
- ⚙️ **Settings Editor** — full config from the UI
- 🎮 **J4R Manager** — manage reward servers
- 🔧 **User Tools** — set coins, plans, resources

### 🎨 UI & UX
- 🌙 **Dark Sidebar** — modern navigation
- 📊 **Smart Chips** — 25/50/75/100% resource presets
- 🚨 **Banners** — error/success feedback
- 🛡️ **Adblocker Detection** — on AFK earn page

</td>
</tr>
</table>

---

## ⚠️ Notice

> We cannot force you to keep the **"Powered by Feliactyl"** footer credit, but we kindly ask you to.  
> It helps the project grow and get better. We won't provide support for installations that remove it.  
> We may file a DMCA takedown if our software is misrepresented.

---

## 🚀 Quick Install

> **Prerequisites:** Ubuntu 20.04+ VPS · Pterodactyl panel on a domain · Domain pointed at your VPS

Run this **single command** as root on your VPS:

```bash
bash <(curl -s https://raw.githubusercontent.com/notcaliper/Feliactyl/v2-features/install.sh)
```

The installer will:
- ✅ Install Node.js 20, PM2, and your chosen web server (**Nginx / Apache2 / Caddy**)
- ✅ Clone Feliactyl and install dependencies
- ✅ Prompt for your Pterodactyl & Discord OAuth2 credentials
- ✅ Generate SSL certificate and configure reverse proxy
- ✅ Start Feliactyl with PM2 and enable on-boot autostart

---

## 📖 Manual Installation

<details>
<summary><b>Click to expand manual install steps</b></summary>

<br>

### Step 1 — System Dependencies

```bash
sudo apt update -y && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx git

# Install Node.js 20.x
curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2 — Download Feliactyl

```bash
cd /var/www
git clone -b v2-features https://github.com/notcaliper/Feliactyl.git feliactyl
cd feliactyl
npm install
```

### Step 3 — Configure Settings

```bash
cp example.settings.json settings.json
nano settings.json
```

| Field | Description |
|:---|:---|
| `pterodactyl.domain` | Panel URL e.g. `https://panel.example.com` |
| `pterodactyl.key` | Application API key — Admin → API → Create |
| `api.client.oauth2.id` | Discord OAuth2 client ID |
| `api.client.oauth2.secret` | Discord OAuth2 client secret |
| `api.client.oauth2.link` | Your Feliactyl domain |
| `api.client.oauth2.callbackpath` | Callback path (default `/callback`) |
| `website.port` | Port to run on (default `8000`) |

### Step 4 — Test Run

```bash
npm start
```

Visit `http://your-server-ip:8000` to confirm, then stop with `Ctrl+C`.

### Step 5 — SSL & Nginx

```bash
sudo ufw allow 80 && sudo ufw allow 443
sudo certbot certonly --nginx -d your.domain.com
```

```nginx
# /etc/nginx/sites-enabled/feliactyl.conf
server {
    listen 80;
    server_name <domain>;
    return 301 https://$server_name$request_uri;
}
server {
    listen 443 ssl http2;
    server_name <domain>;
    ssl_certificate     /etc/letsencrypt/live/<domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    location /afkwspath {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_pass http://localhost:<port>/afkwspath;
    }
    location / {
        proxy_pass http://localhost:<port>/;
        proxy_buffering off;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo nginx -t && sudo systemctl restart nginx
```

### Step 6 — Run with PM2

```bash
npm install -g pm2
pm2 start start.js --name "feliactyl"
pm2 save && pm2 startup
```

</details>

---

## ⚙️ Configuration

### Changing Egg IDs

Pterodactyl egg IDs vary per installation:
- **Minecraft Java:** `https://your-panel.com/admin/nests/view/1`
- **Other eggs:** Import from [parkervcp/eggs](https://github.com/parkervcp/eggs), then grab the ID from the panel

Update under `api.client.eggs` in `settings.json`.

---

## 🔄 Updating

**From Heliactyl v13.x → Feliactyl v2**

```bash
# 1. Back up your data
cp settings.json settings.json.bak
cp database.sqlite database.sqlite.bak

# 2. Pull latest and reinstall
git pull
npm install
pm2 restart feliactyl
```

**Between Feliactyl v2 releases**

```bash
git pull && npm install && pm2 restart feliactyl
```

---

## 📦 PM2 Reference

| Command | Description |
|:---|:---|
| `pm2 logs feliactyl` | View live logs |
| `pm2 restart feliactyl` | Restart the panel |
| `pm2 stop feliactyl` | Stop the panel |
| `pm2 list` | Show all running processes |

---

<div align="center">

Made with 💜 by [notcaliper](https://github.com/notcaliper) · Forked from [Heliactyl](https://github.com/Heliactyl-Project/Heliactyl)

*Legacy Heliactyl versions (pre-13.3) and Feliactyl v1 are unsupported. Please use v2.*

</div>

