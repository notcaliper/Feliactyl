---
sidebar_position: 3
title: Admin Panel
description: Managing users, plans, coupons, logs, and settings
---

# ⚙️ Admin Panel

The admin panel is accessible at `/admin` and is restricted to **Pterodactyl root admins** only — determined by `root_admin: true` on the Pterodactyl user account.

---

## Access Control

Admin status is verified on every request by checking the Pterodactyl Application API:

```
GET /api/application/users/:id
→ attributes.root_admin === true
```

No separate admin credentials needed — your Pterodactyl admin status controls access.

---

## User Management (`/admin/users`)

View and manage all registered users.

### Actions available

| Action | Description |
|:---|:---|
| **Set Coins** | Set a user's coin balance to an exact amount |
| **Add Coins** | Add coins to a user's balance |
| **Set Plan** | Change a user's resource plan |
| **Set Resources** | Manually set RAM/Disk/CPU/Servers for a user |
| **Suspend** | Suspend all servers belonging to a user |
| **Unsuspend** | Restore all suspended servers |
| **Remove Account** | Delete the user from Feliactyl (Pterodactyl account retained) |
| **View IP** | See the last login IP for a user |

### API Endpoints

| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/setcoins` | POST | Set user coins |
| `/api/addcoins` | POST | Add to user coins |
| `/api/setplan` | GET | Assign a plan |
| `/api/setresources` | POST | Set resource values |
| `/api/suspend` | GET | Suspend user |
| `/api/unsuspend` | GET | Unsuspend user |
| `/api/removeaccount` | GET | Remove user |

All admin API endpoints require the `Authorization` header with `FELIACTYL_API_CODE`.

---

## Plans Management (`/admin/plans`)

Create and manage resource plans that can be assigned to users.

### Plan fields

```json
"packages": {
  "list": {
    "starter": {
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

Plans are stored in `settings.json` and editable from the admin UI without restarting.

---

## Coupon Management (`/admin`)

Create and revoke coupon codes for coin rewards.

| Field | Description |
|:---|:---|
| **Code** | The redemption code |
| **Coins** | Coins granted on redemption |
| **Uses** | How many times it can be used (0 = unlimited) |

Redeemed coupons are tracked per-user. Users cannot redeem the same coupon twice.

---

## Settings Editor (`/admin/settings`)

A full web-based editor for `settings.json` — organized into tabs:

| Tab | Settings |
|:---|:---|
| **General** | Name, icon, theme, port, secret |
| **Pterodactyl** | Domain, API key |
| **OAuth2** | Discord client ID/secret, callback URL, IP controls |
| **Store & Coins** | Store limits, pricing per resource |
| **Stripe** | Enabled, API key, coins per dollar |
| **Features** | Whitelist, Anti-VPN, renewals, server permissions |
| **AFK** | Enable/disable, interval, coins per interval |
| **Logging** | Webhook URL, which events to log |

Changes are saved to `settings.json` immediately and most take effect without restart (except port and WebSocket path changes).

---

## Audit Logs (`/admin/logs`)

The logs page shows two tabs:

### Action Logs
Records all significant user and admin actions:

| Event | Triggered by |
|:---|:---|
| User signup | New Discord OAuth2 login |
| Server created | User creates a server |
| Server modified | User modifies resources |
| Coins gifted | User sends coins |
| Store purchase | User buys RAM/Disk/CPU |
| Admin set coins | Admin adjusts balance |
| Admin set plan | Admin changes user plan |
| Coupon created/revoked | Admin coupon actions |
| Account removed | Admin deletes user |

### Firewall Logs
Records all firewall events:
- VPN detections (blocked or warned)
- AbuseIPDB blocks
- Geo-blocks
- Alt-account detections
- Manual IP blacklist additions/removals

Logs are searchable and filterable by date. Stored in the database.

### Discord Webhook Logging

Send logs to a Discord channel in real time:

```json
"logging": {
  "status": true,
  "webhook": "https://discord.com/api/webhooks/...",
  "actions": {
    "user": {
      "signup": true,
      "created server": true,
      "gifted coins": true
    },
    "admin": {
      "set coins": true,
      "create coupon": true
    }
  }
}
```

Each event sends a formatted embed to your webhook URL.

---

## J4R — Join for Rewards (`/j4r`)

Users earn coins by joining specific Discord servers.

```json
"j4r": {
  "enabled": true,
  "ads": [
    {
      "name": "My Community",
      "invite": "https://discord.gg/example",
      "id": "123456789012345678",
      "coins": 200
    }
  ]
}
```

| Field | Description |
|:---|:---|
| `name` | Server display name |
| `invite` | Discord invite link |
| `id` | Discord server (guild) ID |
| `coins` | Coins awarded for joining |

Feliactyl checks guild membership via the Discord OAuth2 token. Users only get coins once per server. If they leave and rejoin, coins are not re-awarded.

---

## Renewals

Require users to pay coins periodically to keep their servers active.

```json
"renewals": {
  "status": true,
  "cost": 50,
  "delay": 14,
  "Tinmezone": "Europe/London"
}
```

| Key | Description |
|:---|:---|
| `cost` | Coins to renew |
| `delay` | Days between renewals |
| `Tinmezone` | Timezone for renewal processing |

Servers that aren't renewed are suspended automatically. Users are notified via the dashboard.

---

## Server Permissions

Control what server actions users are allowed to perform:

```json
"allow": {
  "newusers": true,
  "regen": true,
  "server": {
    "create": true,
    "modify": true,
    "delete": true
  },
  "overresourcessuspend": false
}
```

`overresourcessuspend: true` suspends all servers if a user's resource usage exceeds their plan limits.
