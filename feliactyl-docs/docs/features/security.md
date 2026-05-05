---
sidebar_position: 2
title: Security
description: OAuth2, 2FA, firewall, Anti-VPN, rate limiting and more
---

# 🛡️ Security

Feliactyl includes multiple layers of security out of the box.

---

## Discord OAuth2

All authentication goes through **Discord OAuth2** — there are no passwords to manage or leak.

### Flow
1. User clicks **"Login with Discord"**
2. Redirected to Discord's consent screen
3. Discord redirects back to `/callback` with an authorization code
4. Feliactyl exchanges it for user info (ID, username, avatar, email)
5. A Pterodactyl account is created or linked automatically
6. Session is established with `httpOnly`, `secure` cookies

### IP Security
```json
"oauth2": {
  "ip": {
    "trust x-forwarded-for": true,
    "block": ["1.2.3.4"],
    "duplicate check": false
  }
}
```

| Option | Description |
|:---|:---|
| `trust x-forwarded-for` | Set `true` if behind Nginx/Cloudflare |
| `block` | Array of blocked IP addresses — denied at login |
| `duplicate check` | Prevent multiple Discord accounts from same IP |

---

## Two-Factor Authentication (2FA)

Users can enable TOTP-based 2FA on their account from `/settings`.

### Setup
1. User visits **Settings → Security → Enable 2FA**
2. A QR code is generated (compatible with Google Authenticator, Authy, etc.)
3. User scans and enters the 6-digit code to confirm
4. On future logins, 2FA code is required after OAuth2

### Technical Details
- Uses **TOTP** (Time-based One-Time Password) per RFC 6238
- Secret stored encrypted in database
- Backup codes generated on setup
- Recovery via admin panel if locked out

---

## Firewall

The Feliactyl Firewall runs on every login attempt and can block based on multiple signals.

### AntiVPN

Detects and blocks VPN, proxy, and Tor exit nodes using [proxycheck.io](https://proxycheck.io/).

```json
"firewall": {
  "antiVPN": {
    "enabled": true,
    "action": "block",
    "blockTor": true,
    "apiKey": "your_proxycheck_api_key"
  }
}
```

| Action | Behaviour |
|:---|:---|
| `block` | Deny login entirely |
| `warn` | Allow login but log the event |

### AntiAlt

Detects alternate accounts from the same IP address.

```json
"antiAlt": {
  "enabled": true,
  "action": "block"
}
```

If a new user signs up from an IP already used by an existing account, the login is blocked (or warned).

### AbuseIPDB

Cross-references login IPs against the [AbuseIPDB](https://abuseipdb.com/) threat database.

```json
"abuseIPDB": {
  "enabled": true,
  "apiKey": "your_abuseipdb_key",
  "threshold": 75
}
```

IPs with an abuse confidence score **≥ threshold** (0–100) are blocked.

### Geo-Blocking

Block entire countries by ISO country code.

```json
"geoBlock": {
  "enabled": true,
  "blockedCountries": ["CN", "RU", "KP"]
}
```

Uses [proxycheck.io](https://proxycheck.io/) for country detection.

### Firewall Whitelist

IPs in the whitelist bypass **all** firewall checks:

```json
"firewall": {
  "whitelist": ["127.0.0.1", "your.trusted.ip"]
}
```

### Admin Firewall API

Admins can manage the IP blacklist/whitelist at runtime without restarting:

| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/admin/firewall/logs` | GET | View firewall event log |
| `/api/admin/firewall/blacklist` | GET | List blacklisted IPs |
| `/api/admin/firewall/blacklist` | POST `{ ip }` | Add IP to blacklist |
| `/api/admin/firewall/blacklist` | DELETE `{ ip }` | Remove IP from blacklist |
| `/api/admin/firewall/whitelist` | GET | List whitelisted IPs |
| `/api/admin/firewall/whitelist` | POST `{ ip }` | Add IP to whitelist |

---

## Rate Limiting

Three rate limit tiers applied via `express-rate-limit`:

| Tier | Limit | Window |
|:---|:---|:---|
| **General** | 500 requests | 15 minutes |
| **API** (`/api/*`) | 200 requests | 1 minute |
| **Auth** (`/login`, `/callback`) | 20 attempts | 15 minutes |

Custom per-route delays (cooldowns) are also configurable in `settings.json`:

```json
"ratelimits": {
  "/callback": 2,
  "/create": 1,
  "/delete": 1,
  "/modify": 1,
  "/buyram": 1
}
```

Values are in seconds — a request to that route will be delayed by this many seconds before the next one is allowed.

---

## Security Headers

Applied globally via [Helmet.js](https://helmetjs.github.io/):

| Header | Value |
|:---|:---|
| `Content-Security-Policy` | Strict — only allows self, Cloudflare Turnstile, Google Fonts |
| `HSTS` | `max-age=31536000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |

---

## Cloudflare Turnstile (CAPTCHA)

Protect login from bots using Cloudflare Turnstile — a privacy-friendly alternative to reCAPTCHA.

```env
TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
```

Get keys from [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile).

---

## Whitelist Mode

Restrict the entire dashboard to a specific list of Discord user IDs:

```json
"whitelist": {
  "status": true,
  "users": ["123456789012345678", "987654321098765432"]
}
```

Anyone not in the list will be denied access, even with a valid Discord account.

---

## Session Security

- Sessions use `httpOnly` and `secure` cookies (secure only in production)
- Session secret loaded from `SESSION_SECRET` env variable
- Sessions expire after **24 hours**
- Session is invalidated on logout and on Pterodactyl ID mismatch
