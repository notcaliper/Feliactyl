<div align="center">

<img src="assets/default/img/banner.svg" alt="Feliactyl Banner" width="800" />

<br>

[![Version](https://img.shields.io/badge/v2.2.0-α855f7?style=for-the-badge&labelColor=1a1a2e)](https://github.com/notcaliper/Feliactyl/releases)
[![License](https://img.shields.io/badge/MIT-🄯-ec4899?style=for-the-badge&labelColor=1a1a2e)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-≥20-339933?style=for-the-badge&logo=node.js&logoColor=white&labelColor=1a1a2e)](https://nodejs.org)
[![Stars](https://img.shields.io/github/stars/notcaliper/Feliactyl?color=f59e0b&style=for-the-badge&logo=github&labelColor=1a1a2e)](https://github.com/notcaliper/Feliactyl/stargazers)

<br>

[![Demo](https://img.shields.io/badge/🔗_Live_Demo-22c55e?style=for-the-badge&logo=rocket&logoColor=white&labelColor=0d3b1a)](https://feliactyl.notcaliper.dev/)
[![Docs](https://img.shields.io/badge/�_Documentation-3b82f6?style=for-the-badge&logo=book&logoColor=white&labelColor=0c2461)](https://feliactyl.netlify.app/)
[![Discord](https://img.shields.io/badge/�_Discord_Support-5865F2?style=for-the-badge&logo=discord&logoColor=white&labelColor=1a1b3c)](https://discord.gg/N7C2nbYpQf)

<br>

**🎮 Modern Game Server Management | 💰 Virtual Economy | 🛡️ Enterprise Security**

<br>

[🚀 Installation](#-installation) • [✨ Features](#-features) • [⚙️ Configuration](#-configuration) • [🛡️ Admin Panel](#-admin-panel) • [🔌 API](#-api) • [🤝 Contributing](#-contributing)

<br>

<img src="https://cdn.discordapp.com/attachments/926829995870011392/1501332081219862538/image.png" alt="Feliactyl Dashboard Preview" width="700" style="border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">

<br>

</div>

---

<div align="center">

## 🎯 What is Feliactyl?

</div>

<p align="center">
  <strong>The next-generation dashboard for Pterodactyl game hosting</strong><br>
  Self-service server management with a powerful virtual economy
</p>

Feliactyl transforms your Pterodactyl panel into a **complete hosting business platform**. Users can create servers, earn coins through activities, purchase resources, upgrade plans, and manage their infrastructure — all through a stunning dark-themed interface. No Pterodactyl admin access required.

> 🔥 **Complete rewrite** of Heliactyl 13.3 | 🎨 **Modern UI** | ⚡ **Microservices Architecture** | 🔐 **Enterprise-grade Security**

### 🏗️ Architecture

Feliactyl v2 employs a **microservices architecture** designed for scalability:

- **Web Servers** — Handle HTTP requests, sessions, OAuth2, and page rendering
- **Economy Workers** — Process coin transactions atomically in the background
- **Queue Service** — Persists pending jobs and recovers them on startup
- **Health Monitoring** — Built-in `/health` endpoints for uptime monitoring

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Web Srv 1  │     │  Web Srv 2  │     │  Web Srv N  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       └──────────┬────────┘───────────────────┘
                  │ Job Queue
       ┌──────────┼────────┐
       ▼          ▼        ▼
┌─────────────┐ ┌────────┐ ┌─────────────┐
│Economy Wkr 1│ │Worker 2│ │Economy Wkr N│
└──────┬──────┘ └───┬────┘ └──────┬──────┘
       └────────────┼────────────┘
                    ▼
             ┌─────────────┐
             │  Database   │
             └─────────────┘
```

---

<div align="center">

## ✨ Feature Showcase

</div>

<table>
<tr>
<td width="50%" valign="top">

### 🖥️ Core Platform
| Feature | Description |
|---------|-------------|
| 🎮 **Server Management** | Create, edit, delete game servers |
| 🔄 **Renewal System** | Automated coin-based renewals |
| 🎟️ **Coupons** | Redeemable codes for coins/resources |
| 🔐 **Discord OAuth2** | One-click secure login |
| 📡 **REST API** | Full external integration support |

### 💰 Economy System
| Feature | Description |
|---------|-------------|
| 🪙 **Virtual Currency** | Multi-method coin earning |
| 💳 **Stripe Payments** | Real money → coins |
| ⏱️ **AFK Earning** | Passive income while active |
| 🔗 **Linkvertise** | Monetized link visits |
| 🎁 **J4R** | Discord server rewards |
| � **Coin Gifting** | User-to-user transfers |

</td>
<td width="50%" valign="top">

### 🛒 Store & Plans
| Feature | Description |
|---------|-------------|
| 📦 **Plan System** | Tiered resource packages |
| 💾 **Resource Store** | Individual resource purchases |
| 🏷️ **Discount Codes** | % off with expiry dates |
| 🎨 **Smart Presets** | 25/50/75/100% quick-fill |

### 🛡️ Admin Suite
| Feature | Description |
|---------|-------------|
| 👥 **User Manager** | Full user control panel |
| 📋 **Plan Editor** | Live plan creation/management |
| ⚙️ **Settings UI** | Web-based configuration |
| 🎮 **J4R Manager** | Reward server management |
| 📊 **Audit Logs** | Complete action history |
| � **Security** | IP/VPN/whitelist controls |

### 🎨 Interface
| Feature | Description |
|---------|-------------|
| 🌙 **Dark Theme** | Glassy modern design |
| 🖼️ **Discord Sync** | Live avatars & usernames |
| 🚨 **Smart Alerts** | Contextual notifications |
| 📱 **Responsive** | All device support |

</td>
</tr>
</table>

---

<div align="center">

## 🚀 Quick Start

### One-Command Installation

</div>

```bash
bash <(curl -s https://raw.githubusercontent.com/notcaliper/Feliactyl/v2-features/install.sh)
```

<div align="center">

**⚡ Automated Setup** • **🔒 SSL Included** • **📦 Production Ready**

</div>

<details>
<summary><b>🖥️ System Requirements</b></summary>

| Requirement | Details |
|-------------|---------|
| **OS** | Ubuntu 20.04+ / Debian 11+ |
| **Domain** | Valid domain with DNS pointing to server |
| **Pterodactyl** | Working panel with Application API access |
| **Discord App** | OAuth2 enabled application |

</details>

<details>
<summary><b>📊 What Gets Installed</b></summary>

- ✅ Node.js 20 LTS + PM2 process manager
- ✅ Web server (Nginx/Apache/Caddy) with reverse proxy
- ✅ SSL certificate via Let's Encrypt
- ✅ Feliactyl with all dependencies
- ✅ Auto-generated configuration
- ✅ Systemd/PM2 startup service

</details>

### Scaling After Install

```bash
# Check health status
curl https://your-domain.com/health

# Scale web servers
pm2 scale feliactyl-web 4

# Scale economy workers
pm2 scale feliactyl-worker 3

# Monitor processes
pm2 monit
```

---

## 📖 Manual Installation

<details>
<summary>Expand for step-by-step manual installation</summary>

<br>

### 1. System Dependencies

```bash
sudo apt update -y && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx git curl

# Install Node.js 20
curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Download Feliactyl

```bash
cd /var/www
git clone -b v2-features https://github.com/notcaliper/Feliactyl.git feliactyl
cd feliactyl
npm install
```

### 3. Configuration

```bash
cp example.settings.json settings.json
nano settings.json
```

Key fields to configure:

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Dashboard name | `"My Dashboard"` |
| `pterodactyl.domain` | Panel URL | `"https://panel.example.com"` |
| `pterodactyl.key` | Application API key | `"ptla_xxxxx"` |
| `api.client.oauth2.id` | Discord client ID | `"123456789"` |
| `api.client.oauth2.secret` | Discord client secret | `"abc123..."` |
| `api.client.oauth2.link` | Dashboard domain | `"https://dash.example.com"` |
| `website.port` | HTTP port | `8000` |
| `website.secret` | Session secret | Random string |

### 4. Environment Variables (Optional)

```bash
cp .env.example .env
nano .env
```

```env
PTERODACTYL_KEY=ptla_your_key
DISCORD_CLIENT_SECRET=your_secret
SESSION_SECRET=random_string
STRIPE_KEY=sk_live_your_key
```

### 5. Web Server Configuration

```bash
sudo certbot certonly --nginx -d your.domain.com
```

Nginx configuration (`/etc/nginx/sites-enabled/feliactyl.conf`):

```nginx
server {
    listen 80;
    server_name your.domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your.domain.com;

    ssl_certificate /etc/letsencrypt/live/your.domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your.domain.com/privkey.pem;

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

### 6. Start with PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

</details>

---

<div align="center">

## ⚙️ Tech Stack & Configuration

</div>

### 🛠️ Built With

<p align="center">
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/EJS-B4CA65?style=for-the-badge&logo=ejs&logoColor=black" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white" />
</p>

### 🗄️ Database Concurrency & Scaling (SQLite WAL Mode)

To support multiple scaled web instances and background economy workers running concurrently under PM2 without lock collisions (`SQLITE_BUSY`), Feliactyl automatically configures the SQLite connection:
- **WAL Mode (Write-Ahead Logging)**: Enabled on startup (`PRAGMA journal_mode=WAL;`). This allows concurrent database reads without locking and improves write efficiency.
- **Connection Busy Timeout**: Configured with a `30,000ms` (30 seconds) timeout so simultaneous write operations wait for active locks to clear instead of failing immediately.

### ⚡ Persistent Queue Service & Workers

Heavy operations (such as server creation, package upgrades, resource purchases, and coin gifting) are processed using a persistent queue architecture to keep the HTTP request thread responsive and prevent race conditions:
- **Inter-Process Communication (IPC)**: Main web processes dispatch tasks to the SQLite-backed queue database and notify workers over IPC.
- **Background Worker Processing**: Spawned economy worker processes (`economyWorker.js`) pick up tasks asynchronously, perform validation/billing transactions, and update status.
- **Auto-Recovery**: If a worker process exits or restarts, the `QueueService` automatically recovers any unprocessed tasks from the database using its internal `job-keys` index on startup.

---

## 📋 Configuration Reference

Most settings can be edited live from **Admin → Settings** without restarting. Below are key configuration sections:

### Core Settings (`settings.json`)

```json
{
  "name": "My Dashboard",
  "icon": "https://example.com/icon.png",
  "defaulttheme": "Default",
  "website": {
    "port": 8000,
    "secret": "your-session-secret"
  },
  "pterodactyl": {
    "domain": "https://panel.example.com",
    "key": "ptla_yourkeyhere"
  }
}
```

### Economy Configuration

```json
{
  "api": {
    "client": {
      "coins": {
        "enabled": true,
        "store": {
          "ram": { "cost": 10, "per": 1024 },
          "disk": { "cost": 5, "per": 1024 },
          "cpu": { "cost": 15, "per": 10 },
          "servers": { "cost": 20, "per": 1 }
        }
      }
    }
  }
}
```

### Plans & Packages

```json
{
  "api": {
    "client": {
      "packages": {
        "default": "free",
        "list": {
          "free": { "ram": 2048, "disk": 5120, "cpu": 100, "servers": 2 },
          "basic": { "ram": 4096, "disk": 10240, "cpu": 200, "servers": 4 },
          "pro": { "ram": 8192, "disk": 20480, "cpu": 400, "servers": 8 }
        }
      }
    }
  }
}
```

### Additional Features

| Feature | Configuration |
|---------|---------------|
| **AFK Earning** | `api.arcio.afk page` — configure interval and coins per cycle |
| **Renewals** | `renewals` — enable/disable and set cost/delay |
| **Stripe** | `stripe` — payment processing settings |
| **Security** | `antivpn`, `whitelist` — access control options |

---

<div align="center">

## 🛡️ Admin Control Center

</div>

<p align="center">
  <code>https://your-domain.com/admin</code><br>
  <sub><i>Requires Pterodactyl <code>root_admin</code> status</i></sub>
</p>

<div align="center">

| 🔍 Dashboard | 👥 User Manager | 📋 Plan Editor |
|:---:|:---:|:---:|
| Version check • Coin mgmt • Plan assignment • Resource adjustment • J4R • Admin promotion | Searchable directory • Discord sync • Coin balances • Resource allocations | Create plans • Edit pricing • Discount codes • Resource limits |

| ⚙️ Settings UI | 📊 Audit Logs |
|:---:|:---:|
| 7 category tabs • Live config • No restart needed | Action history • Firewall logs • Search & filter |

</div>

---

<div align="center">

## 🔒 Security Stack

</div>

<p align="center">
  <img src="https://img.shields.io/badge/Helmet.js-Secure_Headers-52B0A5?style=flat-square&logo=helmet.js" />
  <img src="https://img.shields.io/badge/Rate_Limiting-3_Tier_Protection-E74C3C?style=flat-square" />
  <img src="https://img.shields.io/badge/XSS_Protection-Input_Sanitization-9B59B6?style=flat-square" />
  <img src="https://img.shields.io/badge/Atomic_Transactions-No_Double_Spend-27AE60?style=flat-square" />
</p>

| Layer | Protection |
|-------|------------|
| **🛡️ Headers** | Helmet.js CSP, HSTS, X-Frame-Options |
| **⏱️ Rate Limiting** | General: 500/15min • API: 200/min • Auth: 20/15min |
| **🔐 Authentication** | Discord OAuth2 + IP controls + Anti-VPN + Whitelist mode |
| **💰 Transactions** | Atomic database writes prevent double-spend |
| **📝 Input** | XSS sanitization on all user inputs |
| **🔑 Secrets** | Environment variable storage (.env support) |

---

<div align="center">

## 🔄 Maintenance

</div>

### ⬆️ Update Feliactyl

```bash
git pull && npm install && pm2 restart all
```

> ⚠️ Backup `settings.json` and `database.sqlite` first!

### 🚀 Migrate from Heliactyl v13.x

```bash
# Run from your OLD feliactyl directory

# 1. Backup with timestamp
export BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
cp settings.json "settings.json.$BACKUP_DATE.bak"
cp database.sqlite "database.sqlite.$BACKUP_DATE.bak"

# 2. Clone Feliactyl v2 to new directory
cd /var/www
git clone -b v2-features https://github.com/notcaliper/Feliactyl.git feliactyl-v2
cd feliactyl-v2 && npm install

# 3. Copy backed up files from old install
cp /var/www/feliactyl/settings.json .
cp /var/www/feliactyl/database.sqlite .

# 4. Start
pm2 start ecosystem.config.js --env production
```

---

<div align="center">

## 📦 PM2 Command Reference

</div>

### 🚀 Process Management

```bash
# Start services
pm2 start ecosystem.config.js --env production

# Scale horizontally
pm2 scale feliactyl-web 4      # 4 web instances
pm2 scale feliactyl-worker 3     # 3 economy workers

# Monitoring
pm2 logs feliactyl-web          # Web logs
pm2 monit                       # Real-time dashboard
pm2 reload feliactyl-web        # Zero-downtime reload

# Persistence
pm2 save && pm2 startup        # Enable auto-start on boot
```

### 🔍 Health Endpoints

```
GET /health         → Full system health (JSON)
GET /health/ready   → Ready probe (200/503)
GET /health/live    → Liveness probe (200)
GET /health/workers → Queue statistics (JSON)
```

---

<div align="center">

## ❓ Frequently Asked Questions

</div>

<details>
<summary><b>🌐 Can I use Feliactyl without a domain?</b></summary>

**Development:** Yes, use `IP:port` directly  
**Production:** Domain required (Discord OAuth2 requires valid redirect URIs)

</details>

<details>
<summary><b>⏱️ AFK page not awarding coins?</b></summary>

Checklist:
1. ✅ Disable adblocker (detected = blocked)
2. ✅ WebSocket path in Nginx matches `settings.json`
3. ✅ `api.arcio.afk page.enabled` is `true`

</details>

<details>
<summary><b>👑 How do I become admin?</b></summary>

1. Open your Pterodactyl panel admin area
2. Find your user → Enable `Root Admin`
3. Log out and back in to Feliactyl

</details>

<details>
<summary><b>🗄️ Can I use PostgreSQL/MySQL?</b></summary>

Yes! Feliactyl uses [Keyv](https://github.com/jaredwray/keyv):

```bash
npm install @keyv/postgres  # or @keyv/mysql
```

Update `database` in `settings.json` with your connection string.

</details>

<details>
<summary><b>🥚 How do I add custom eggs?</b></summary>

1. Pterodactyl Admin → Nests → Import Egg (JSON)
2. Click the egg → Copy ID from URL
3. Add to `api.client.eggs` in `settings.json`

</details>

<details>
<summary><b>💾 Database corruption issues?</b></summary>

Always use **PM2 in production**. The Queue Service:
- Persists pending jobs on graceful shutdown
- Recovers queue on startup
- Prevents transaction loss

</details>

---

<div align="center">

## 🔌 REST API

</div>

<p align="center">
  <sub>Authentication: Session cookie or API key</sub>
</p>

### Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/user` | User | Current user profile |
| `GET` | `/api/user/servers` | User | List user's servers |
| `POST` | `/api/user/coins` | Admin | Modify user coins |
| `GET` | `/api/health` | Public | System health status |
| `GET` | `/api/store/packages` | User | Available plans |
| `POST` | `/api/store/purchase` | User | Buy resources |

📚 **[Full API Documentation →](https://feliactyl.netlify.app/)**

---

<div align="center">

## 🤝 Contributing

</div>

```bash
# 1. Fork & clone your fork
git clone https://github.com/notcaliper/Feliactyl.git

# 2. Create feature branch
git checkout -b feat/amazing-feature

# 3. Make changes & commit
git commit -m "feat: add amazing feature"

# 4. Push & open PR
git push origin feat/amazing-feature
```

<p align="center">
  Target branch: <code>v2-features</code><br>
  <a href="https://github.com/notcaliper/Feliactyl/issues">🐛 Report Bug</a> • 
  <a href="https://github.com/notcaliper/Feliactyl/issues">💡 Request Feature</a> • 
  <a href="https://discord.gg/N7C2nbYpQf">💬 Discord Support</a>
</p>

---

<div align="center">

## 📄 License

<img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" />

**Feliactyl** is open-source software licensed under the MIT License.  
Please maintain attribution when using or modifying.

---

<p align="center">
  <strong>Made with 💜 by <a href="https://github.com/notcaliper">notcaliper</a></strong><br>
  <sub>Forked from <a href="https://github.com/Heliactyl-Project/Heliactyl">Heliactyl</a></sub>
</p>

<p align="center">
  <a href="https://github.com/notcaliper/Feliactyl">
    <img src="https://img.shields.io/badge/⭐_Star_this_repo-f59e0b?style=for-the-badge&logo=github" />
  </a>
</p>

</div>
