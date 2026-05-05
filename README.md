<div align="center">

<img src="assets/default/img/banner.svg" alt="Feliactyl Banner" width="800" />

<br>

[![Node](https://img.shields.io/badge/node.js-%E2%89%A520-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-ec4899?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/notcaliper/Feliactyl?style=for-the-badge&color=f59e0b&logo=github)](https://github.com/notcaliper/Feliactyl/stargazers)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/N7C2nbYpQf)
[![Version](https://img.shields.io/badge/version-2.2.0-a855f7?style=for-the-badge)](https://github.com/notcaliper/Feliactyl/releases)

<br>

[🚀 Quick Install](#-quick-install) &nbsp;·&nbsp; [✨ Features](#-features) &nbsp;·&nbsp; [📖 Manual Install](#-manual-installation) &nbsp;·&nbsp; [⚙️ Configuration](#%EF%B8%8F-configuration) &nbsp;·&nbsp; [🛡️ Admin Panel](#%EF%B8%8F-admin-panel) &nbsp;·&nbsp; [🔄 Updating](#-updating) &nbsp;·&nbsp; [❓ FAQ](#-faq)

<br>

</div>

---

> **Feliactyl** is a fork of [Heliactyl](https://github.com/Heliactyl-Project/Heliactyl) 13.3, maintained by [**notcaliper**](https://github.com/notcaliper).  
> Completely redesigned with a modern dark UI, plan store, discount system, advanced admin tools, and much more — starting fresh at **v2.0**.

Feliactyl provides your users with a self-service dashboard to create and manage game servers on a Pterodactyl panel, earn virtual coins to purchase resources, upgrade plans, gift coins, and more — all without ever needing access to the Pterodactyl admin area. It bridges the gap between your hosting infrastructure and your end users with a polished, secure, and feature-rich interface built on Express.js and EJS.

Designed for both small hosting communities and large-scale deployments, Feliactyl v2 introduces a **microservices architecture** with background economy workers, a fully atomic transaction system, and horizontal scaling support via PM2 — so your dashboard stays fast and reliable even under heavy load.

---

## ✨ Features

<div align="center">

| 🖥️ Core Platform | 🛒 Store & Economy |
|:---|:---|
| 🗄️ Resource Management — create, modify & delete servers | 💾 Resource Store — buy RAM, Disk, CPU, Slots with coins |
| 🪙 Coin Economy — AFK, Linkvertise, gifting, admin tools | 📦 Plan System — tiered plans with resource allocations |
| 🔄 Server Renewal — coin-gated with configurable delay | 🏷️ Discount Codes — percentage off with optional expiry |
| 🎟️ Coupon System — codes that grant coins & resources | � Smart Presets — 25 / 50 / 75 / 100% fill buttons |
| 💳 Stripe Payments — real-money coin purchases | 💰 Coin Gifting — send coins to other users |
| 🔐 Discord OAuth2 — one-click login | 🔗 Linkvertise Rewards — earn by visiting links |
| 🎁 Join for Rewards — earn by joining Discord servers | |
| 📡 REST API — external bot & integration support | |

| 🛡️ Admin Panel | 🎨 UI & UX |
|:---|:---|
| � Users Manager — all users, coins, plans, resources | 🌙 Dark Sidebar — glassy nav with icon bubbles |
| 📋 Plans Manager — create/delete with full control | 🏆 Topbar + Breadcrumbs — dynamic path & coin chip |
| ⚙️ Settings Editor — full config from the web UI | 🖼️ Discord Avatars — real profile pictures from CDN |
| 🎮 J4R Manager — manage reward Discord servers | 🚨 Alert Banners — success/error feedback everywhere |
| 🔧 User Tools — set coins, plans & resources per user | �️ Adblocker Detection — blocks AFK earning |
| 📊 Promote/Demote — toggle panel admin status | 📱 Responsive Layout — desktop & tablet friendly |
| � Audit Logs — searchable action & firewall logs | 🔔 Live Activity Feed — real-time AFK earn events |
| ⏱️ AFK Settings — configure rate & cycle from UI | |

</div>

---

## 🏗️ Architecture

Feliactyl v2 runs on a **microservices architecture** that separates HTTP serving from economy processing:

```
┌─────────────────────────────────────────────┐
│           Load Balancer / Nginx             │
└────────────────────┬────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │  Web     │ │  Web     │ │  Web     │  Express.js instances
  │  Server 1│ │  Server 2│ │  Server N│
  └────┬─────┘ └────┬─────┘ └────┬─────┘
        └────────────┼────────────┘
                     │  Job Queue
        ┌────────────┼────────────┐
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Economy  │ │ Economy  │ │ Economy  │  Background Workers
  │ Worker 1 │ │ Worker 2 │ │ Worker N │
  └──────────┘ └──────────┘ └──────────┘
                     │
              ┌──────▼──────┐
              │  Database   │  SQLite / PostgreSQL / MySQL
              └─────────────┘
```

- **Web servers** handle HTTP, sessions, OAuth2, and page rendering
- **Economy workers** process coin transactions atomically in the background — preventing race conditions and double-spend exploits
- **Worker Manager** spawns, monitors, and auto-restarts workers
- **Queue Service** persists pending jobs on shutdown and recovers them on startup — no transactions are ever lost
- **Health Service** exposes `/health` endpoints for monitoring integration

---

## ⚠️ Notice

> We cannot force you to keep the **"Powered by Feliactyl"** footer credit, but we kindly ask you to.  
> It helps the project grow and get better. We will not provide support for installations that remove it.  
> We may file a DMCA takedown if our software is misrepresented or relicensed without permission.

---

## 🚀 Quick Install

> **Prerequisites:**
> - VPS running Ubuntu 20.04 or later
> - Working Pterodactyl panel accessible via a domain
> - A domain name pointed at your VPS
> - A Discord application with OAuth2 enabled ([create one here](https://discord.com/developers/applications))

Run this **single command** as root on your VPS:

```bash
bash <(curl -s https://raw.githubusercontent.com/notcaliper/Feliactyl/v2-features/install.sh)
```

The installer will handle everything automatically:
- ✅ Install Node.js 20, PM2, and your chosen web server (**Nginx / Apache2 / Caddy**)
- ✅ Clone Feliactyl and install all npm dependencies
- ✅ Prompt for your Pterodactyl domain, API key, and Discord OAuth2 credentials
- ✅ Auto-generate your `settings.json` from your inputs
- ✅ Obtain an SSL certificate via Let's Encrypt and configure the reverse proxy
- ✅ Start Feliactyl using the scalable PM2 ecosystem configuration
- ✅ Enable on-boot autostart via `pm2 startup`

### Post-Install: Scale Your Installation

After the installer finishes, your dashboard is live. Scale horizontally as your user base grows:

```bash
# Verify everything is healthy
curl https://your-domain.com/health

# Scale web servers for more concurrent users
pm2 scale feliactyl-web 4

# Scale background economy workers
pm2 scale feliactyl-worker 3

# Monitor all processes in real time
pm2 monit
```

---

## 📖 Manual Installation

<details>
<summary><b>Click to expand full manual installation guide</b></summary>

<br>

### Step 1 — System Dependencies

Update your system and install required packages:

```bash
sudo apt update -y && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx git curl

# Install Node.js 20.x via NodeSource
curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify versions
node -v   # should print v20.x.x
npm -v
```

### Step 2 — Download Feliactyl

Clone the repository and install npm packages:

```bash
cd /var/www
git clone -b v2-features https://github.com/notcaliper/Feliactyl.git feliactyl
cd feliactyl
npm install
```

### Step 3 — Configure Settings

Copy the example config and fill in your values:

```bash
cp example.settings.json settings.json
nano settings.json
```

| Field | Description | Example |
|:---|:---|:---|
| `name` | Your dashboard name | `"My Dashboard"` |
| `pterodactyl.domain` | Full URL to your panel | `"https://panel.example.com"` |
| `pterodactyl.key` | Application API key | `"ptla_xxxxx"` |
| `api.client.oauth2.id` | Discord application client ID | `"123456789"` |
| `api.client.oauth2.secret` | Discord application client secret | `"abc123..."` |
| `api.client.oauth2.link` | Your Feliactyl domain | `"https://dash.example.com"` |
| `api.client.oauth2.callbackpath` | OAuth2 callback path | `"/callback"` |
| `website.port` | Port to listen on | `8000` |
| `website.secret` | Express session secret | Any long random string |

> **Getting your Pterodactyl API key:** Panel Admin → Application API → Create. Needs Read & Write on Users and Servers.

> **Getting Discord OAuth2 credentials:** [discord.com/developers/applications](https://discord.com/developers/applications) → New Application → OAuth2. Add redirect URI: `https://your-domain.com/callback`.

### Step 4 — Environment Variables (Recommended)

Store sensitive secrets in `.env` instead of `settings.json`:

```bash
cp .env.example .env
nano .env
```

```env
PTERODACTYL_KEY=ptla_your_key_here
DISCORD_CLIENT_SECRET=your_discord_secret
SESSION_SECRET=a_very_long_random_string
STRIPE_KEY=sk_live_your_stripe_key
```

Feliactyl loads `.env` at startup and overlays these over `settings.json` automatically.

### Step 5 — Test Run

```bash
npm start
```

Visit `http://your-server-ip:8000`. You should see the login page. Check console output for errors. Stop with `Ctrl+C` when confirmed.

### Step 6 — SSL Certificate & Nginx

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

sudo certbot certonly --nginx -d your.domain.com
```

Create the Nginx site config:

```bash
nano /etc/nginx/sites-enabled/feliactyl.conf
```

```nginx
server {
    listen 80;
    server_name your.domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your.domain.com;

    ssl_certificate     /etc/letsencrypt/live/your.domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your.domain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # WebSocket support for AFK earn page
    location /afkwspath {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_pass http://localhost:8000/afkwspath;
    }

    location / {
        proxy_pass http://localhost:8000/;
        proxy_buffering off;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo nginx -t && sudo systemctl restart nginx
```

### Step 7 — Run with PM2

```bash
npm install -g pm2
```

**Development mode** (single process, easy debugging):
```bash
pm2 start start.js --name "feliactyl"
```

**Production mode** (recommended — scalable microservices):
```bash
pm2 start ecosystem.config.js --env production
```

Production mode runs multiple web server instances and separate background economy workers with automatic restart on failure and health monitoring.

```bash
# Save process list and enable startup on reboot
pm2 save
pm2 startup
# Run the command it outputs to register the startup hook
```

### Step 8 — Verify

```bash
pm2 list                              # all processes online?
pm2 logs feliactyl-web                # check for errors
curl http://localhost:8000/health     # health check
```

### Scaling

```bash
# Handle more concurrent users
pm2 scale feliactyl-web 4

# Process more economy transactions in parallel
pm2 scale feliactyl-worker 3
```

</details>

---

## ⚙️ Configuration

Most of Feliactyl's configuration lives in `settings.json`. Almost everything can also be edited live from **Admin → Settings** without touching the file. Below is a breakdown of every major section.

### General

```json
{
  "name": "My Dashboard",
  "icon": "https://example.com/icon.png",
  "defaulttheme": "Default",
  "website": {
    "port": 8000,
    "secret": "your-session-secret"
  }
}
```

| Field | Purpose |
|:---|:---|
| `name` | Dashboard name shown in UI and browser tab |
| `icon` | URL to your favicon/logo |
| `defaulttheme` | Folder name inside `Public/Themes/` to use |
| `website.port` | HTTP port Express listens on |
| `website.secret` | Secret for signing session cookies — keep private |

### Pterodactyl

The API key must be an **Application** key (not a Client key), created in Panel Admin → Application API. It needs Read & Write on Users and Servers.

```json
{
  "pterodactyl": {
    "domain": "https://panel.example.com",
    "key": "ptla_yourkeyhere"
  }
}
```

### Discord OAuth2

```json
{
  "api": {
    "client": {
      "oauth2": {
        "id": "your_discord_app_id",
        "secret": "your_discord_app_secret",
        "link": "https://dash.example.com",
        "callbackpath": "/callback",
        "ip": {
          "trust x-forwarded-for": true,
          "block": [],
          "duplicate check": false
        }
      }
    }
  }
}
```

| Field | Purpose |
|:---|:---|
| `id` | Discord application client ID |
| `secret` | Discord application client secret |
| `link` | Base URL of your Feliactyl install (no trailing slash) |
| `callbackpath` | Path Discord redirects to after login |
| `ip.block` | Array of IPs blocked from signing in |
| `ip.duplicate check` | Block multiple Discord accounts from the same IP |

### Coins & Store Pricing

```json
{
  "api": {
    "client": {
      "coins": {
        "enabled": true,
        "store": {
          "ram":     { "cost": 10, "per": 1024 },
          "disk":    { "cost": 5,  "per": 1024 },
          "cpu":     { "cost": 15, "per": 10 },
          "servers": { "cost": 20, "per": 1 }
        }
      }
    }
  }
}
```

Each resource defines `cost` coins per `per` units. E.g. `"ram": { "cost": 10, "per": 1024 }` = 10 coins buys 1024 MB RAM.

### AFK Earn Page

```json
{
  "api": {
    "arcio": {
      "enabled": true,
      "afk page": {
        "enabled": true,
        "path": "afkwspath",
        "every": 30,
        "coins": 2
      }
    }
  }
}
```

| Field | Purpose |
|:---|:---|
| `every` | Seconds between each coin award |
| `coins` | Coins awarded per cycle |
| `path` | WebSocket path — must match Nginx `location` block |

> Changing `path` requires a server restart. The Nginx config must have a matching WebSocket `location` block.

### Plans & Packages

Plans define per-user resource limits. Each plan has a key with RAM, Disk, CPU, and server slot allocations:

```json
{
  "api": {
    "client": {
      "packages": {
        "default": "free",
        "list": {
          "free":  { "ram": 2048, "disk": 5120,  "cpu": 100, "servers": 2 },
          "basic": { "ram": 4096, "disk": 10240, "cpu": 200, "servers": 4 },
          "pro":   { "ram": 8192, "disk": 20480, "cpu": 400, "servers": 8 }
        }
      }
    }
  }
}
```

Plans can be created and deleted live from **Admin → Plans** without touching `settings.json`.

### Renewals

```json
{
  "renewals": {
    "status": false,
    "cost": 10,
    "delay": 7
  }
}
```

When enabled, servers must be renewed every `delay` days at a `cost` coin fee. Servers not renewed are automatically suspended.

### Stripe Payments

```json
{
  "stripe": {
    "enabled": false,
    "key": "sk_live_your_key",
    "coins": 100
  }
}
```

`coins` is the number of coins granted per £1 spent. Use your currency equivalent.

### Security Options

```json
{
  "antivpn": { "status": false, "APIKey": "" },
  "whitelist": { "status": false, "users": [] }
}
```

- **Anti-VPN** — block logins from known VPN/proxy IPs via an external API
- **Whitelist** — restrict the entire dashboard to only listed Discord IDs

### Changing Egg IDs

Pterodactyl egg IDs vary between panel installations:
- Find egg IDs at: `https://your-panel.com/admin/nests/` — click a nest then an egg and check the URL
- Import additional eggs from [parkervcp/eggs](https://github.com/parkervcp/eggs)

Update under `api.client.eggs` in `settings.json`.

---

## 🛡️ Admin Panel

The admin panel is available at `/admin` for any user whose Pterodactyl account has `root_admin: true`. It provides complete management capabilities without needing direct server or database access.

### Dashboard (`/admin`)

- **Version status bar** — shows current vs latest GitHub release, with an update link if outdated
- **Coin management** — set any user's coin balance by Discord ID
- **Plan assignment** — change a user's plan instantly
- **Resource adjustment** — add or remove extra resource allocations per user
- **J4R server list** — add/remove Discord servers from the Join for Rewards system
- **Admin promote/demote** — toggle `root_admin` on any Pterodactyl user from the dashboard

### Users (`/admin/users`)

A searchable, paginated table of all registered users showing Discord username, ID, coin balance, current plan, and resource allocations. Supports live search by username or Discord ID.

### Plans (`/admin/plans`)

Create and delete resource plans directly from the UI:
- Set plan name, RAM, Disk, CPU, server slot limits, and coin cost
- Apply percentage-based discount codes with optional expiry dates
- Changes are live immediately — no restart needed

### Settings (`/admin/settings`)

A fully-featured tabbed settings editor:

| Tab | What you can configure |
|:---|:---|
| **General** | Name, icon, port, theme, session secret |
| **Pterodactyl** | Panel domain, API key |
| **OAuth2** | Discord credentials, IP block list, user permissions |
| **Store & Coins** | Resource pricing, store limits, server creation cost |
| **Stripe** | Enable payments, API key, coins per £1 |
| **Features** | Whitelist, Anti-VPN, renewals config, server permissions |
| **Logging** | Discord webhook URL for audit events |
| **AFK Earn** | Toggle, coins per cycle, cycle seconds, WebSocket path |

Changes write directly to `settings.json` and take effect immediately (most settings without a restart).

### Logs (`/admin/logs`)

Searchable log viewer with two tabs:
- **Action Logs** — all admin actions: coin changes, plan changes, promote/demote
- **Firewall Logs** — blocked logins, IP blocks, duplicate account detections

Logs persist to the database and survive server restarts.

---

## 🔒 Security

Feliactyl v2 ships with multiple layers of security hardening:

- **Helmet.js** — sets secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
- **Rate Limiting** — three-tier protection:
  - General routes: 500 requests / 15 min per IP
  - API routes (`/api/*`): 200 requests / min per IP
  - Auth routes (`/login`, `/callback`): 20 attempts / 15 min per IP
- **Input Sanitization** — all user inputs sanitized before processing
- **Atomic Coin Transactions** — economy operations use atomic DB writes to prevent double-spend exploits
- **Environment Variables** — sensitive secrets stored in `.env` rather than `settings.json`
- **IP Blocking** — block specific IPs from authenticating via OAuth2 config
- **Duplicate Account Detection** — optionally prevent multiple Discord accounts from the same IP
- **Anti-VPN** — block VPN/proxy registrations (requires external API key)
- **Whitelist Mode** — restrict the dashboard to a specific list of Discord IDs

---

## 🔄 Updating

### From Heliactyl v13.x → Feliactyl v2

Feliactyl v2 requires a fresh install. Your existing Keyv-compatible database can be migrated:

```bash
# 1. Back up your data
cp settings.json settings.json.bak
cp database.sqlite database.sqlite.bak

# 2. Fresh clone alongside old install
cd /var/www
git clone -b v2-features https://github.com/notcaliper/Feliactyl.git feliactyl-new
cd feliactyl-new
npm install

# 3. Copy your settings and database
cp ../feliactyl/settings.json .
cp ../feliactyl/database.sqlite .

# 4. Start
pm2 start ecosystem.config.js --env production
```

### Between Feliactyl v2 Releases

```bash
git pull
npm install
pm2 restart all
```

> Always back up `settings.json` and `database.sqlite` before pulling updates.

---

## 📦 PM2 Reference

Feliactyl v2 uses a microservices ecosystem defined in `ecosystem.config.js`:

| Command | Description |
|:---|:---|
| `pm2 start ecosystem.config.js` | Start all web servers and workers |
| `pm2 start ecosystem.config.js --env production` | Start in production mode |
| `pm2 logs feliactyl-web` | View web server logs |
| `pm2 logs feliactyl-worker` | View economy worker logs |
| `pm2 scale feliactyl-web 4` | Scale to 4 web server instances |
| `pm2 scale feliactyl-worker 3` | Scale to 3 worker processes |
| `pm2 reload feliactyl-web` | Zero-downtime rolling reload |
| `pm2 monit` | Real-time process monitoring dashboard |
| `pm2 stop all` | Stop all Feliactyl processes |
| `pm2 restart all` | Restart all processes |
| `pm2 list` | Show all running processes and status |
| `pm2 save` | Save process list for startup persistence |
| `pm2 startup` | Generate startup hook command |

### Health Monitoring Endpoints

These integrate with monitoring tools like UptimeRobot, Grafana, or any load balancer probe:

| Endpoint | Response | Purpose |
|:---|:---|:---|
| `GET /health` | JSON | Full system health status |
| `GET /health/ready` | 200 or 503 | Is the app ready for traffic? |
| `GET /health/live` | 200 | Is the process alive? |
| `GET /health/workers` | JSON | Worker queue statistics |

---

## ❓ FAQ

**Q: Can I use Feliactyl without a domain?**  
For development you can use an IP and port directly. For production you need a domain — Discord OAuth2 does not allow IP-only redirect URIs.

**Q: My AFK page isn't awarding coins. What's wrong?**  
Most common causes: (1) An adblocker is active — Feliactyl detects and blocks earning. (2) The WebSocket path in Nginx doesn't match `afk page.path` in `settings.json`. (3) `arcio.enabled` or `arcio.afk page.enabled` is `false`.

**Q: How do I give myself admin access?**  
Log in to your Pterodactyl panel admin area, find your user, and enable `Root Admin`. Then log out and back in to Feliactyl.

**Q: Can I change the theme?**  
Yes — duplicate `Public/Themes/Default`, rename it, and set `defaulttheme` in `settings.json` to the new folder name.

**Q: Can I use PostgreSQL or MySQL instead of SQLite?**  
Yes — Feliactyl uses [Keyv](https://github.com/jaredwray/keyv) as its database abstraction. Change the `database` field in `settings.json` to a PostgreSQL or MySQL connection string and install the matching Keyv adapter (`@keyv/postgres` or `@keyv/mysql`).

**Q: How do I add custom game server types (eggs)?**  
Import the egg JSON into your Pterodactyl panel (Admin → Nests → Import Egg). Note the egg ID from the URL and add it under `api.client.eggs` in `settings.json`.

**Q: The installer failed halfway. What do I do?**  
Remove the partial directory (`rm -rf /var/www/feliactyl`), fix the root cause (usually a wrong API key or unresolved DNS), and re-run the installer.

**Q: My database gets corrupted on crash. How do I prevent it?**  
Use PM2 production mode. The Queue Service persists all pending jobs to the database on graceful shutdown and recovers them on next start. Always use PM2 in production rather than running `node` directly.

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork the repository on GitHub
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit with clear, descriptive messages
4. Push and open a Pull Request against the `v2-features` branch

Keep PRs focused — one feature or fix per PR. Bug reports and feature requests go in [GitHub Issues](https://github.com/notcaliper/Feliactyl/issues) or the [Discord server](https://discord.gg/N7C2nbYpQf).

---

## 📄 License

Feliactyl is licensed under the terms in the [LICENSE](LICENSE) file. You may not remove attribution, relicense, or misrepresent the software as your own original work.

---

<div align="center">

Made with 💜 by [notcaliper](https://github.com/notcaliper) · Forked from [Heliactyl](https://github.com/Heliactyl-Project/Heliactyl)

*Legacy Heliactyl versions (pre-13.3) and Feliactyl v1 are unsupported. Please use Feliactyl v2.*

**[⭐ Star this repo](https://github.com/notcaliper/Feliactyl) if Feliactyl is useful to you!**

</div>

