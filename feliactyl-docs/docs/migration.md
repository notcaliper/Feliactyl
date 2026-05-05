---
sidebar_position: 6
title: Migration Guide
description: Migrate from Heliactyl or an older Feliactyl version to v2.2.0
---

# 🔄 Migration Guide

This guide covers migrating to **Feliactyl v2.2.0** from:
- Heliactyl 13.x
- Feliactyl v1.x
- Any older Feliactyl v2.x release

---

## What Changed in v2.2.0

| Area | Change |
|:---|:---|
| **Architecture** | Microservices — PM2 cluster + background workers |
| **Config** | Secrets moved to `.env`, settings restructured |
| **Database** | Still Keyv/SQLite — fully compatible, no schema change |
| **Bot** | Discord bot integration **removed** |
| **Auth** | 2FA and Turnstile CAPTCHA added |
| **Economy** | Referral system added, atomic transactions |
| **Admin** | New Logs page, Firewall, AFK settings in UI |

---

## Before You Migrate

:::warning Back up everything first
```bash
cp -r /var/www/feliactyl /var/www/feliactyl.backup.$(date +%Y%m%d)
cp /var/www/feliactyl/settings.json ~/settings.json.backup
cp /var/www/feliactyl/database.sqlite ~/database.sqlite.backup
```
:::

---

## Migrating from Heliactyl 13.x

### Step 1 — Copy your database

Feliactyl uses the same **Keyv/SQLite** database format as Heliactyl. Your user coins, resources, and pterodactyl ID mappings are all compatible.

```bash
cp /var/www/heliactyl/database.sqlite /var/www/feliactyl/database.sqlite
chown feliactyl:feliactyl /var/www/feliactyl/database.sqlite
```

### Step 2 — Migrate settings

Feliactyl's `settings.json` structure is similar to Heliactyl's but has extra fields. Start from the example:

```bash
cp /var/www/feliactyl/example.settings.json /var/www/feliactyl/settings.json
```

Then manually copy over these values from your old Heliactyl config:

| Heliactyl field | Feliactyl field |
|:---|:---|
| `pterodactyl.domain` | `pterodactyl.domain` |
| `pterodactyl.key` | `pterodactyl.key` |
| `website.port` | `website.port` |
| `website.secret` | `website.secret` |
| `oauth2.id` | `api.client.oauth2.id` |
| `oauth2.secret` | `api.client.oauth2.secret` |
| `oauth2.link` | `api.client.oauth2.link` |
| `coins.store` | `api.client.coins.store` |
| `j4r.ads` | `api.client.j4r.ads` |
| `stripe.key` | `stripe.key` |

### Step 3 — Remove the bot token

Feliactyl does **not** use a Discord bot. Remove `DISCORD_BOT_TOKEN` from any `.env` or config you copy over.

### Step 4 — Update your Discord OAuth2 redirect URI

In your [Discord Developer Portal](https://discord.com/developers/applications), update the redirect URI to your new Feliactyl domain:

```
https://your-feliactyl-domain.com/callback
```

Remove any old Heliactyl redirect URIs.

### Step 5 — Install and start

```bash
cd /var/www/feliactyl
npm install
pm2 start ecosystem.config.js --env production
```

---

## Migrating from Feliactyl v1.x

### Step 1 — Back up your database

```bash
cp /var/www/feliactyl/database.sqlite ~/database.sqlite.backup
```

### Step 2 — Pull the new version

```bash
cd /var/www/feliactyl
git fetch origin
git checkout v2-features
git pull origin v2-features
npm install
```

### Step 3 — Update settings.json

v2.x added several new top-level keys. Check `example.settings.json` and add any missing keys to your existing `settings.json`. Key additions in v2.2.0:

```json
{
  "workers": {
    "enabled": true,
    "count": 2
  },
  "api": {
    "client": {
      "oauth2": {
        "ip": {
          "block": [],
          "duplicate": false
        }
      },
      "arcio": {
        "afk page": {
          "enabled": true,
          "path": "/afkwspath",
          "every": 60,
          "coins": 1
        }
      }
    }
  }
}
```

### Step 4 — Create .env file

v2.2.0 supports loading secrets from `.env` to avoid storing them in `settings.json`:

```bash
cp .env.example .env
nano .env
```

Fill in `PTERODACTYL_KEY`, `DISCORD_OAUTH2_SECRET`, `SESSION_SECRET`, and `FELIACTYL_API_CODE`.

### Step 5 — Remove bot config

If you had a `bot` section in your `settings.json` from an older version:

```bash
# Remove the bot section manually from settings.json
# or let the app ignore unknown keys (it will)
```

Also remove `DISCORD_BOT_TOKEN` from any `.env` file.

### Step 6 — Restart with new ecosystem config

```bash
pm2 delete all
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## Migrating from Feliactyl v2.x (older release)

This is the simplest migration — just pull and restart:

```bash
cd /var/www/feliactyl

# Back up settings
cp settings.json settings.json.pre-upgrade

# Pull latest
git pull origin v2-features
npm install

# Zero-downtime reload
pm2 reload ecosystem.config.js --env production
```

Then check `example.settings.json` for any new keys added since your last version and merge them into your `settings.json`.

---

## Post-Migration Checklist

- [ ] Dashboard loads at your domain
- [ ] Discord OAuth2 login works (correct redirect URI)
- [ ] Users see their existing coin balances
- [ ] AFK earn page functions (`/earn`)
- [ ] Admin panel accessible at `/admin`
- [ ] `pm2 list` shows all processes as `online`
- [ ] `/health` endpoint returns `status: ok`
- [ ] No errors in `pm2 logs feliactyl-web`

---

## Common Issues

**`Cannot read properties of undefined (reading 'includes')` on login**

Your `settings.json` is missing the `ip.block` array. Add it:
```json
"ip": {
  "block": [],
  "duplicate": false
}
```

**`MODULE_NOT_FOUND` errors after upgrade**

Run `npm install` again — new dependencies were added.

**Users are logged out after migration**

Sessions are stored in memory and reset on restart. This is expected. Users need to log in once via Discord OAuth2 again.

**PM2 process keeps restarting**

Check logs: `pm2 logs feliactyl-web --lines 50`. Usually a missing config key or incorrect Pterodactyl API credentials.

**502 Bad Gateway**

Feliactyl is likely not running or crashed on startup. Check `pm2 list` and `pm2 logs`.
