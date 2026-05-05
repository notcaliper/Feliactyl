---
sidebar_position: 7
title: Troubleshooting
description: Common errors, error codes, and how to fix them
---

# 🔧 Troubleshooting

---

## Startup Errors

### `Cannot find module '...'`
```
Error: Cannot find module './settings.json'
```
**Fix:** You haven't created `settings.json` yet.
```bash
cp example.settings.json settings.json
nano settings.json
```

---

### `SyntaxError: Unexpected token in JSON`
Your `settings.json` has invalid JSON — usually a trailing comma or missing quote.

**Fix:** Validate it:
```bash
node -e "JSON.parse(require('fs').readFileSync('./settings.json','utf8'))" && echo "Valid"
```
Use [jsonlint.com](https://jsonlint.com) to find the exact line.

---

### `Cannot read properties of undefined (reading 'includes')`
The `ip.block` array is missing from `settings.json`.

**Fix:** Add it under `api.client.oauth2`:
```json
"ip": {
  "trust x-forwarded-for": true,
  "block": [],
  "duplicate check": false
}
```

---

### `EADDRINUSE: address already in use :::8000`
Something is already running on port 8000.

**Fix:**
```bash
# Find what's using port 8000
sudo lsof -i :8000

# Kill it, or change port in settings.json
"website": { "port": 8080 }
```

---

### `Error: connect ECONNREFUSED` (Pterodactyl)
Feliactyl can't reach your Pterodactyl panel.

**Fix:**
- Check `pterodactyl.domain` in `settings.json` — must include `https://` and no trailing slash
- Verify the panel is running: `curl https://panel.example.com/api/application/users -H "Authorization: Bearer ptla_xxx"`
- Check firewall rules between servers

---

### PM2 process keeps restarting
```bash
pm2 logs feliactyl-web --lines 50
```
Common causes:
- Invalid `settings.json` (JSON syntax error)
- Wrong Pterodactyl domain or API key
- Missing `.env` file
- Port already in use

---

## Login / OAuth2 Errors

### Redirected to `/login` immediately after Discord auth
The Pterodactyl user ID stored in the database doesn't match the current session.

**Fix:** Clear the session and log in again. If it persists, the user may have been deleted from Pterodactyl. Use the admin panel to remove and re-create the account.

---

### `Invalid OAuth2 redirect_uri`
Discord is rejecting the callback URL.

**Fix:** In your [Discord Developer Portal](https://discord.com/developers/applications):
1. Go to **OAuth2 → Redirects**
2. Add exactly: `https://your-domain.com/callback`
3. Must match `api.client.oauth2.link` + `callbackpath` in `settings.json`

---

### Stuck on "Authorizing..." / blank page after Discord login
Usually a cookie/session issue when running without HTTPS.

**Fix:** Either:
- Set up SSL (see [Installation → Step 6](/docs/installation#step-6--web-server--ssl))
- Or set `NODE_ENV=development` in `.env` so session cookies don't require HTTPS

---

### `IP is blocked` error on login
Your IP is in the block list, flagged by AntiVPN, AbuseIPDB, or geo-block.

**Fix:** Add your IP to the firewall whitelist in `settings.json`:
```json
"firewall": {
  "whitelist": ["your.ip.address"]
}
```
Or disable the relevant check temporarily to test.

---

## 502 Bad Gateway

Nginx/Apache is running but can't reach Feliactyl.

**Checklist:**
1. Is Feliactyl running? → `pm2 list`
2. Is it on the right port? → check `settings.json` `website.port`
3. Does your proxy point to the right port?
   ```nginx
   proxy_pass http://localhost:8000/;  # must match
   ```
4. Check logs: `pm2 logs feliactyl-web --lines 30`

---

## AFK Earn Page Issues

### Coins not being awarded
- Check `api.arcio.enabled` and `api.arcio.afk page.enabled` are both `true`
- Check the WebSocket path matches your proxy config (`afkwspath` by default)
- Open browser DevTools → Network → WS — check the WebSocket connection status

### WebSocket connection fails (Nginx)
Make sure your Nginx config has the WebSocket upgrade block:
```nginx
location /afkwspath {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_pass http://localhost:8000/afkwspath;
}
```

### AFK page says adblocker detected
An adblocker extension is blocking the WebSocket or earn script. Disable it for your domain or whitelist the site.

---

## Server Management Error Codes

These appear as `?err=CODE` in the URL when a server action fails.

### Create Server

| Error Code | Cause | Fix |
|:---|:---|:---|
| `TOOMUCHSERVERS` | User reached server slot limit | Upgrade their plan or buy more slots |
| `LITTLESERVERNAME` | Server name too short (< 1 char) | Enter a valid name |
| `BIGSERVERNAME` | Server name too long (> 191 chars) | Shorten the name |
| `INVALIDLOCATION` | Location ID doesn't exist in config | Check `api.client.locations` in settings |
| `PREMIUMLOCATION` | Location requires a specific plan | Upgrade user plan |
| `INVALIDEGG` | Egg key doesn't exist in config | Check `api.client.eggs` in settings |
| `EXCEEDRAM` | Not enough RAM allocation | Buy more RAM or reduce amount |
| `EXCEEDDISK` | Not enough Disk allocation | Buy more disk or reduce amount |
| `EXCEEDCPU` | Not enough CPU allocation | Buy more CPU or reduce amount |
| `TOOLITTLERAM` | Below egg's minimum RAM | Increase RAM to minimum |
| `TOOLITTLEDISK` | Below egg's minimum disk | Increase disk to minimum |
| `TOOLITTLECPU` | Below egg's minimum CPU | Increase CPU to minimum |
| `TOOMUCHRAM` | Exceeds egg's maximum RAM | Reduce RAM |
| `TOOMUCHDISK` | Exceeds egg's maximum disk | Reduce disk |
| `TOOMUCHCPU` | Exceeds egg's maximum CPU | Reduce CPU |
| `TOOLITTLECOINS` | Not enough coins to pay creation cost | Earn more coins |
| `ERRORONCREATE` | Pterodactyl API returned an error | Check Pterodactyl logs and API key permissions |
| `NOTANUMBER` | RAM/CPU/Disk values weren't numbers | Refresh and try again |
| `MISSINGVARIABLE` | Form submitted incomplete | Refresh and fill all fields |

### Modify Server

| Error Code | Cause | Fix |
|:---|:---|:---|
| `MISSINGEGG` | Egg not found on this server | Server's egg may have been deleted from Pterodactyl |
| `EXCEEDRAM/DISK/CPU` | Exceeds allocation | Same as create server above |
| `ERRORONMODIFY` | Pterodactyl API error | Check Pterodactyl logs |

### Store Purchases

| Error Code | Cause | Fix |
|:---|:---|:---|
| `CANNOTAFFORD` | Not enough coins | Earn more coins first |
| `MAXRAMEXCEETED` | Hit store RAM cap | Adjust `storelimits.ram` in settings |

### Renewals

| Error Code | Cause | Fix |
|:---|:---|:---|
| `CANNOTAFFORDRENEWAL` | Not enough coins to renew | Earn coins or reduce renewal cost |

---

## Database Issues

### `database.sqlite` missing or corrupt
```bash
# Re-create (all data lost)
rm database.sqlite
pm2 restart feliactyl-web
```

For corrupt databases:
```bash
sqlite3 database.sqlite "PRAGMA integrity_check;"
```

### Switch from SQLite to PostgreSQL/MySQL
1. Update `.env`:
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/feliactyl
   ```
2. Restart Feliactyl — Keyv will auto-connect
3. Note: existing SQLite data is **not** migrated automatically

---

## Health Check Endpoints

Use these to diagnose issues without checking logs:

| Endpoint | Description |
|:---|:---|
| `GET /health` | Full status — database, webserver, workers |
| `GET /health/ready` | Returns 200 if app is fully ready |
| `GET /health/live` | Returns 200 if process is alive |
| `GET /health/workers` | Worker process stats |

```bash
curl https://your-domain.com/health | jq
```

---

## Getting Help

If none of the above resolves your issue:

1. Check `pm2 logs feliactyl-web --lines 100` for the full error
2. Search [GitHub Issues](https://github.com/notcaliper/Feliactyl/issues)
3. Join the [Discord server](https://discord.gg/N7C2nbYpQf) and ask in support
4. Open a [new issue](https://github.com/notcaliper/Feliactyl/issues/new) with your logs
