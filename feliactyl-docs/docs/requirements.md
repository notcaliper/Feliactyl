---
sidebar_position: 3
title: System Requirements
description: Hardware, software, and service requirements for running Feliactyl
---

# 🖥️ System Requirements

---

## Minimum Hardware

| Resource | Minimum | Recommended |
|:---|:---|:---|
| **CPU** | 1 vCore | 2+ vCores |
| **RAM** | 512 MB | 1 GB+ |
| **Disk** | 2 GB | 5 GB+ |
| **Network** | 100 Mbps | 1 Gbps |

:::info
These are requirements for Feliactyl only — separate from your Pterodactyl panel and game servers.
:::

---

## Operating System

| OS | Supported |
|:---|:---|
| Ubuntu 20.04 LTS | ✅ Recommended |
| Ubuntu 22.04 LTS | ✅ Recommended |
| Ubuntu 24.04 LTS | ✅ |
| Debian 11 | ✅ |
| Debian 12 | ✅ |
| CentOS / RHEL | ⚠️ Not tested |
| Windows Server | ❌ Not supported |

---

## Software Requirements

| Software | Version | Notes |
|:---|:---|:---|
| **Node.js** | 20.x LTS | Required — older versions unsupported |
| **npm** | 9.x+ | Bundled with Node.js |
| **PM2** | Latest | Production process manager |
| **Git** | 2.x+ | For cloning and updates |

### Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should print v20.x.x
```

### Install PM2

```bash
npm install -g pm2
```

---

## Web Server (pick one)

| Server | Notes |
|:---|:---|
| **Nginx** | Recommended |
| **Apache2** | Supported |
| **Caddy** | Supported — auto HTTPS |

Required for SSL termination and WebSocket proxying. See the [Installation guide](/docs/installation#step-6--web-server--ssl) for config examples.

---

## External Services

### Required

| Service | Purpose |
|:---|:---|
| **Pterodactyl Panel** | Server management backend |
| **Discord Application** | OAuth2 login — [discord.com/developers](https://discord.com/developers/applications) |

### Optional

| Service | Purpose | Where to sign up |
|:---|:---|:---|
| **Stripe** | Real-money coin purchases | [stripe.com](https://stripe.com) |
| **Linkvertise** | Ad-based coin earning | [linkvertise.com](https://linkvertise.com) |
| **Proxycheck.io** | Anti-VPN + geo-blocking | [proxycheck.io](https://proxycheck.io) |
| **AbuseIPDB** | IP threat intelligence | [abuseipdb.com](https://abuseipdb.com) |
| **Cloudflare Turnstile** | CAPTCHA protection | [dash.cloudflare.com](https://dash.cloudflare.com) |

---

## Pterodactyl Requirements

| Requirement | Details |
|:---|:---|
| **Version** | Pterodactyl v1.x or Pelican |
| **API Key type** | Application API key |
| **Permissions** | Read & Write on **Users** and **Servers** |

Create the key at: **Panel Admin → Application API → Create New**

:::warning
Feliactyl requires a Pterodactyl **Application API** key — not a client API key. The key must have both read and write permissions on Users and Servers.
:::

---

## Node.js Dependencies

All installed automatically via `npm install`. Key packages:

| Package | Version | Purpose |
|:---|:---|:---|
| `express` | ^4.18 | Web framework |
| `express-ws` | ^5.0 | WebSocket support (AFK earn) |
| `keyv` + `@keyv/sqlite` | ^4.5 / ^3.6 | Database abstraction |
| `express-session` | ^1.17 | Session management |
| `express-rate-limit` | ^7.5 | Rate limiting |
| `helmet` | ^7.2 | Security headers |
| `ejs` | ^3.1 | Templating engine |
| `speakeasy` | ^2.0 | 2FA / TOTP |
| `stripe` | ^14.5 | Stripe payments |
| `node-fetch` | ^2.7 | HTTP requests to Pterodactyl API |
| `dotenv` | ^16.6 | `.env` loading |
| `chalk` | ^4.1 | Console output |
| `xss` | ^1.0 | XSS sanitization |

---

## Ports

| Port | Protocol | Purpose |
|:---|:---|:---|
| `80` | TCP | HTTP (redirect to HTTPS) |
| `443` | TCP | HTTPS |
| `8000` | TCP | Feliactyl app (internal only) |

Port `8000` should **not** be publicly exposed — traffic should route through your web server proxy.

---

## PM2 Process Overview

| Process | Mode | Instances | Memory Limit |
|:---|:---|:---|:---|
| `feliactyl-web` | Cluster | 2 (dev) / 4 (prod) | 512 MB each |
| `feliactyl-worker` | Fork | 2 (dev) / 3 (prod) | 256 MB each |

Configure instance counts via environment variables:
```env
WEB_INSTANCES=4
WORKER_INSTANCES=3
```
