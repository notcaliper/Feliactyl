---
sidebar_position: 5
title: Configuration
description: Full reference for settings.json and .env
---

# ⚙️ Configuration Reference

All configuration lives in two files:

| File | Purpose |
|:---|:---|
| `settings.json` | Main application config — features, store, eggs, plans |
| `.env` | Secrets — API keys, tokens, session secret |

:::tip
Copy `example.settings.json` to `settings.json` to get started. You can also edit everything from the **Admin → Settings** page in the web UI.
:::

---

## settings.json

### Top-Level

| Key | Type | Description |
|:---|:---|:---|
| `version` | string | App version — do not change manually |
| `name` | string | Your dashboard's display name |
| `icon` | string | URL to your dashboard icon/logo |
| `defaulttheme` | string | Active theme — `"Feliactyl"` or `"Legacy"` |
| `database` | string | Database connection string |

**Database options:**
```json
"database": "sqlite://database.sqlite"
"database": "postgresql://user:pass@localhost:5432/feliactyl"
"database": "mysql://user:pass@localhost:3306/feliactyl"
```

:::info SQLite Performance & Concurrency
If you are using SQLite in a scaled multi-process environment (with multiple web server threads and background workers):
1. Feliactyl automatically initializes SQLite with a `30,000ms` (30 seconds) connection timeout (`busyTimeout`) to avoid transaction conflicts.
2. WAL (Write-Ahead Logging) mode is programmatically enabled (`PRAGMA journal_mode=WAL;`) on start, allowing concurrent database reads and highly efficient sequential writes.
:::

---

### `pterodactyl`

Connects Feliactyl to your Pterodactyl panel.

```json
"pterodactyl": {
  "domain": "https://panel.example.com",
  "key": "ptla_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

| Key | Description |
|:---|:---|
| `domain` | Full URL to your panel (no trailing slash) |
| `key` | Application API key with **Read & Write** on Users and Servers |

:::info
Create your API key at: Panel Admin → **Application API** → Create New
:::

---

### `website`

```json
"website": {
  "port": 8000,
  "secret": "your-long-random-session-secret"
}
```

| Key | Description |
|:---|:---|
| `port` | Port to listen on (default `8000`) |
| `secret` | Express session secret — use a long random string |

---

### `storelimits`

Maximum resources a single user can purchase via the store (in addition to their plan allocation).

```json
"storelimits": {
  "ram": "8192",
  "disk": "5120",
  "cpu": "10240",
  "servers": "4"
}
```

| Key | Unit | Description |
|:---|:---|:---|
| `ram` | MB | Max extra RAM purchasable |
| `disk` | MB | Max extra disk purchasable |
| `cpu` | % | Max extra CPU purchasable |
| `servers` | count | Max extra server slots purchasable |

---

### `stripe`

Real-money coin purchases via Stripe.

```json
"stripe": {
  "enabled": true,
  "key": "sk_live_xxxxxxxxxxxxxxxxxx",
  "coins": 100
}
```

| Key | Description |
|:---|:---|
| `enabled` | Enable/disable Stripe payments |
| `key` | Stripe secret API key |
| `coins` | Coins granted per **$1** spent |

:::warning
If `enabled` is `true` and `key` is invalid, Feliactyl will crash on payment attempts. Use `.env` to store this: `STRIPE_KEY=sk_live_...`
:::

---

### `linkvertise`

Earn coins by visiting Linkvertise links.

```json
"linkvertise": {
  "enabled": true,
  "userid": "123456",
  "coins": 5,
  "dailyLimit": 10,
  "cooldown": 60,
  "minTimeToComplete": 10,
  "timeToExpire": 600
}
```

| Key | Description |
|:---|:---|
| `userid` | Your Linkvertise publisher user ID |
| `coins` | Coins earned per completed link |
| `dailyLimit` | Max completions per user per day |
| `cooldown` | Seconds between completions |
| `minTimeToComplete` | Minimum seconds to spend on link |
| `timeToExpire` | Seconds before a link token expires |

---

### `api.client.oauth2`

Discord OAuth2 login configuration.

```json
"oauth2": {
  "id": "your_discord_client_id",
  "secret": "your_discord_client_secret",
  "link": "https://dash.example.com",
  "callbackpath": "/callback",
  "prompt": true,
  "ip": {
    "trust x-forwarded-for": true,
    "block": [],
    "duplicate check": false
  }
}
```

| Key | Description |
|:---|:---|
| `id` | Discord application client ID |
| `secret` | Discord application client secret |
| `link` | Your Feliactyl domain (no trailing slash) |
| `callbackpath` | OAuth2 redirect path — must match Discord app settings |
| `prompt` | Show Discord consent screen every login |
| `ip.trust x-forwarded-for` | Set `true` if behind Nginx/Cloudflare proxy |
| `ip.block` | Array of blocked IP addresses |
| `ip.duplicate check` | Prevent multiple accounts from same IP |

:::info Discord App Setup
1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. New Application → OAuth2 → Redirects
3. Add: `https://your-domain.com/callback`
:::

---

### `api.client.packages`

Resource plans assigned to users.

```json
"packages": {
  "default": "default",
  "list": {
    "default": {
      "ram": 1024,
      "disk": 1024,
      "cpu": 100,
      "servers": 1
    },
    "pro": {
      "ram": 4096,
      "disk": 10240,
      "cpu": 300,
      "servers": 5
    }
  }
}
```

| Key | Description |
|:---|:---|
| `default` | Plan name assigned to new users |
| `list` | Map of plan names to resource allocations |
| `list.[name].ram` | RAM in MB |
| `list.[name].disk` | Disk in MB |
| `list.[name].cpu` | CPU in % |
| `list.[name].servers` | Server slot count |

---

### `api.client.coins.store`

Pricing for buying resources with coins.

```json
"store": {
  "enabled": true,
  "ram":     { "cost": 100, "per": 1024 },
  "disk":    { "cost": 100, "per": 1024 },
  "cpu":     { "cost": 100, "per": 100  },
  "servers": { "cost": 100, "per": 1    }
}
```

Each resource has `cost` (coins) and `per` (amount you get). Example: `"cost": 100, "per": 1024` means 100 coins buys 1024 MB of RAM.

---

### `api.client.eggs`

Server types (game server software) users can create. Each egg maps to a Pterodactyl egg ID.

```json
"eggs": {
  "paper": {
    "display": "Minecraft Java | Paper",
    "minimum": { "ram": 1024, "disk": 1024, "cpu": 80 },
    "maximum": { "ram": null, "disk": null, "cpu": null },
    "info": {
      "egg": 3,
      "docker_image": "ghcr.io/pterodactyl/yolks:java_17",
      "startup": "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}",
      "environment": { "SERVER_JARFILE": "server.jar" },
      "feature_limits": { "databases": 4, "backups": 4 }
    }
  }
}
```

| Key | Description |
|:---|:---|
| `display` | Name shown to users in the create server UI |
| `minimum` | Minimum resource requirements to create this server |
| `maximum` | Max allowed resources (`null` = unlimited) |
| `info.egg` | Pterodactyl egg ID (find in Panel → Nests) |
| `info.docker_image` | Docker image for the server |
| `info.startup` | Startup command |
| `info.environment` | Default environment variables |
| `info.feature_limits` | Database/backup slot counts |

---

### `api.client.locations`

Server locations shown in the create server UI.

```json
"locations": {
  "1": {
    "name": "US East",
    "banner": "/assets/default/img/banners/default.png",
    "package": null
  }
}
```

| Key | Description |
|:---|:---|
| `1` | Pterodactyl location ID |
| `name` | Display name |
| `banner` | Path to location banner image |
| `package` | Restrict location to a specific plan (`null` = all plans) |

---

### `api.arcio` — AFK Earn Page

```json
"arcio": {
  "enabled": true,
  "afk page": {
    "enabled": true,
    "path": "afkwspath",
    "every": 30,
    "coins": 2
  }
}
```

| Key | Description |
|:---|:---|
| `enabled` | Enable the AFK earn system |
| `afk page.enabled` | Enable the AFK page WebSocket endpoint |
| `afk page.path` | WebSocket path (must match Nginx/proxy config) |
| `afk page.every` | Seconds between coin payouts |
| `afk page.coins` | Coins per payout interval |

:::info
Configurable from the **Admin → Settings → AFK** tab without restarting.
:::

---

### `whitelist`

Restrict dashboard access to specific Discord user IDs.

```json
"whitelist": {
  "status": false,
  "users": ["123456789012345678"]
}
```

---

### `renewals`

Require users to spend coins to keep servers active.

```json
"renewals": {
  "status": false,
  "cost": 0,
  "delay": 14,
  "Tinmezone": "Europe/London"
}
```

| Key | Description |
|:---|:---|
| `status` | Enable renewals |
| `cost` | Coins required to renew |
| `delay` | Days between renewals |
| `Tinmezone` | Timezone for renewal processing |

---

### `logging`

Send action logs to a Discord webhook.

```json
"logging": {
  "status": false,
  "webhook": "https://discord.com/api/webhooks/...",
  "actions": {
    "user": { "signup": true, "created server": true, "gifted coins": true },
    "admin": { "set coins": true, "create coupon": true }
  }
}
```

---

### `firewall`

Advanced IP security controls.

```json
"firewall": {
  "antiVPN": {
    "enabled": false,
    "action": "block",
    "blockTor": true,
    "apiKey": "proxycheck.io API key"
  },
  "antiAlt": {
    "enabled": false,
    "action": "block"
  },
  "abuseIPDB": {
    "enabled": false,
    "apiKey": "abuseipdb.com API key",
    "threshold": 75
  },
  "geoBlock": {
    "enabled": false,
    "blockedCountries": ["CN", "RU", "KP"]
  },
  "whitelist": ["127.0.0.1"]
}
```

| Key | Description |
|:---|:---|
| `antiVPN.action` | `"block"` = deny login, `"warn"` = allow but log |
| `antiAlt` | Detect and block alternate accounts from same IP |
| `abuseIPDB.threshold` | Block IPs with abuse score ≥ this (0–100) |
| `geoBlock.blockedCountries` | ISO 3166-1 alpha-2 country codes |
| `whitelist` | IPs that bypass all firewall checks |

:::info API Keys needed
- AntiVPN: [proxycheck.io](https://proxycheck.io/)
- AbuseIPDB: [abuseipdb.com](https://abuseipdb.com/)
:::

---

### `workers`

Background economy worker processes that process transactions asynchronously using the persistent `QueueService`.

```json
"workers": {
  "enabled": true,
  "count": 2,
  "maxConcurrent": 5,
  "retryAttempts": 3
}
```

| Key | Description |
|:---|:---|
| `enabled` | Enable background workers |
| `count` | Number of worker processes to spawn |
| `maxConcurrent` | Max concurrent jobs per worker |
| `retryAttempts` | Retry failed economy jobs this many times |

:::info Operations processed by Workers
When background workers are enabled, the following heavy actions are automatically queued via the SQLite-backed database queue and processed asynchronously to keep the main web processes responsive and prevent race conditions:
- **Store Purchases**: Resource purchases (RAM, Disk, CPU, Slots) in `store.js`
- **Plan Upgrades**: Upgrading to a premium package in `store.js`
- **Coin Gifting**: User-to-user coin transfers in `api.js`
- **AFK Earning**: Periodic WebSocket-based AFK coin claims in `arcio.js` (processed asynchronously in a fire-and-forget manner)
- **Server Creation**: Communicating with Pterodactyl panel API and billing in `servers.js`

If background workers are disabled, these operations automatically fall back to synchronous in-thread execution on the web server process.
:::

---

### `servercreation`

```json
"servercreation": {
  "cost": 0
}
```

Coin cost to create a new server. `0` = free.

---

### `api.client.allow`

Feature toggles.

```json
"allow": {
  "newusers": true,
  "regen": true,
  "server": {
    "create": true,
    "modify": true,
    "delete": true
  },
  "giftressources": false,
  "overresourcessuspend": false
}
```

| Key | Description |
|:---|:---|
| `newusers` | Allow new users to sign up |
| `regen` | Allow users to regenerate their Pterodactyl password |
| `server.create/modify/delete` | Allow server management actions |
| `giftressources` | Allow users to gift resources to others |
| `overresourcessuspend` | Suspend servers if user exceeds plan limits |

---

## .env Reference

Store secrets here instead of `settings.json`. Generated automatically by the installer.

```env
# Required
PTERODACTYL_KEY=ptla_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DISCORD_OAUTH2_ID=your_discord_client_id
DISCORD_OAUTH2_SECRET=your_discord_client_secret
SESSION_SECRET=a_very_long_random_string_min_32_chars
FELIACTYL_API_CODE=your_internal_api_code

# Optional
STRIPE_KEY=sk_live_xxxxxxxxxx
TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
NODE_ENV=production
# PORT=8000
```

Generate secure secrets:
```bash
openssl rand -hex 32
```

Values in `.env` **override** the corresponding values in `settings.json` at startup.
