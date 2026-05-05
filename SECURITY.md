# Security Policy

## Table of Contents

- [Supported Versions](#supported-versions)
- [Reporting a Vulnerability](#reporting-a-vulnerability)
- [Response Timeline](#response-timeline)
- [Severity Guidelines](#severity-guidelines)
- [Responsible Disclosure](#responsible-disclosure)
- [Security Features](#security-features)
- [Quick Security Checklist](#quick-security-checklist)
- [Atomic Operations & Race Condition Prevention](#atomic-operations--race-condition-prevention)

---

## Supported Versions

| Version | Supported | Notes |
|:--------|:----------|:------|
| 2.2.x (`v2-features`) | ✅ Active | Current release — receives all security updates |
| 2.0.x – 2.1.x | ⚠️ Limited | Critical fixes only — upgrade to 2.2.0 recommended |
| 1.x | ❌ Unsupported | No longer maintained |
| < 1.0 (Heliactyl) | ❌ Unsupported | No longer maintained here |

---

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately via one of the following:

- 📧 **Email:** [akshaymanbhaw27@gmail.com](mailto:akshaymanbhaw27@gmail.com)  
  Subject: `Security Vulnerability — Feliactyl [brief description]`
- 🔒 **GitHub Private Advisory:** [Report here](https://github.com/notcaliper/Feliactyl/security/advisories/new)

### What to include

Please provide as much detail as possible:

- **Description** of the vulnerability
- **Steps to reproduce** (proof of concept if available)
- **Potential impact** (data exposure, auth bypass, RCE, etc.)
- **Affected version(s)**
- **Suggested fix** (optional but appreciated)

---

## Response Timeline

| Stage | Timeframe |
|:------|:----------|
| Initial acknowledgement | Within **48 hours** |
| Severity assessment | Within **5 days** |
| Fix development | Depends on complexity |
| Coordinated disclosure | Agreed with reporter |

---

## Severity Guidelines

| Severity | Examples |
|:---------|:---------|
| 🔴 Critical | RCE, auth bypass, full data exposure |
| 🟠 High | Privilege escalation, sensitive data leak |
| 🟡 Medium | CSRF, reflected XSS, partial info disclosure |
| 🟢 Low | Minor info leak, non-exploitable misconfiguration |

---

## Responsible Disclosure

We kindly ask that you:

- Give us reasonable time to fix the issue before public disclosure
- Not exploit the vulnerability beyond what is needed to demonstrate it
- Not access or modify other users' data during testing

We will credit you in the security advisory unless you wish to remain anonymous.

---

*Thank you for helping keep Feliactyl and its users safe. 💜*

**Project:** [github.com/notcaliper/Feliactyl](https://github.com/notcaliper/Feliactyl)  
**Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Security Features

### Environment Variables (.env)

Secrets should be stored in `.env` rather than committed to version control via `settings.json`:

```bash
cp .env.example .env
nano .env
```

**Required variables:**

| Variable | Purpose |
|:---|:---|
| `DISCORD_OAUTH2_ID` | Discord application client ID |
| `DISCORD_OAUTH2_SECRET` | Discord application client secret |
| `PTERODACTYL_KEY` | Pterodactyl Application API key |
| `FELIACTYL_API_CODE` | Internal REST API authentication token |
| `SESSION_SECRET` | Express session signing secret (min 32 chars) |
| `STRIPE_KEY` | Stripe secret key (if payments enabled) |

Feliactyl loads `.env` at startup via `functions/envLoader.js` and overlays values on top of `settings.json`. The `.env` file is listed in `.gitignore` and must never be committed.

### Input Validation

All user-supplied inputs are validated via `functions/security.js` before processing:

| Check | Details |
|:---|:---|
| **Discord ID format** | Must be 17–20 digit numeric string |
| **Numeric ranges** | Coins/resources within safe bounds (0–999,999,999) |
| **Alphanumeric codes** | Coupon codes: `a-z A-Z 0-9 _ -` only |
| **Server names** | Length-limited, sanitized for XSS |
| **XSS sanitization** | All string inputs stripped of script-injectable content |

### Rate Limiting

Three-tier rate limiting is applied globally via `express-rate-limit`:

| Endpoint Type | Limit | Applied to |
|:--------------|:------|:-----------|
| General | 500 requests / 15 min | All routes |
| API | 200 requests / min | `/api/*` |
| Auth | 20 requests / 15 min | `/login`, `/submitlogin`, `/callback` |

Exceeding limits returns `429 Too Many Requests` with JSON: `{ "status": "error", "message": "Too many requests, please try again later." }`

### Security Headers (Helmet)

Helmet.js is configured on every response:

- **Content Security Policy (CSP)** — restricts script/style/image sources
- **HTTP Strict Transport Security (HSTS)** — `max-age: 31536000`, `includeSubDomains`, `preload`
- **X-Frame-Options** — prevents clickjacking
- **X-Content-Type-Options** — prevents MIME sniffing
- **Referrer-Policy** — controls referrer header leakage
- **Secure session cookies** — `httpOnly`, `sameSite: strict`, `secure` in production

### IP-Based Access Controls

Configurable in `settings.json` under `api.client.oauth2.ip`:

| Control | Config key | Effect |
|:---|:---|:---|
| **IP Block list** | `ip.block` | Array of IPs barred from signing in |
| **Duplicate account check** | `ip.duplicate check` | Blocks a second Discord account from the same IP |
| **X-Forwarded-For trust** | `ip.trust x-forwarded-for` | Enable when behind a reverse proxy (Nginx/Cloudflare) |

### Anti-VPN

When `antivpn.status: true` is set in `settings.json`, login attempts from known VPN/proxy IPs are blocked using an external API. Requires a valid `antivpn.APIKey`.

### Whitelist Mode

When `whitelist.status: true`, the entire dashboard is restricted to Discord IDs listed in `whitelist.users`. All other users are denied access at the OAuth2 callback stage.

### API Authentication

All REST API endpoints require a bearer token:

```http
Authorization: Bearer YOUR_FELIACTYL_API_CODE
```

Failed authentication attempts (missing or invalid token) return `403 Forbidden` and are logged with the requester's IP for audit.

### Audit Logging

Security and admin events are persisted to the database and viewable at `Admin → Logs`:

**Action Log** events:
- Admin coin adjustments (set / add / remove)
- Plan changes per user
- Resource allocation changes
- Admin promote / demote
- Coupon creation and revocation

**Firewall Log** events:
- IP block denials
- Duplicate account detections
- Anti-VPN rejections
- OAuth2 callback errors

Logs survive server restarts and support live search in the admin UI.

---

## Quick Security Checklist

**Setup**
- [ ] Copy `.env.example` to `.env` and fill in all secrets
- [ ] Generate a strong random `SESSION_SECRET` (min 32 chars)
- [ ] Set `NODE_ENV=production` in production
- [ ] Confirm `.env` and `settings.json` are in `.gitignore` and not committed

**Pterodactyl API Key**
- [ ] API key is an Application key (prefix `ptla_`), not a Client key
- [ ] Key has only the permissions Feliactyl needs (Users, Servers — Read & Write)
- [ ] Key is stored in `.env` as `PTERODACTYL_KEY`, not hardcoded

**Discord OAuth2**
- [ ] Redirect URI in Discord Developer Portal matches your domain exactly
- [ ] `ip.trust x-forwarded-for` is `true` only if you are behind a proxy (Nginx/Cloudflare)
- [ ] `ip.duplicate check` enabled if you want to prevent alt accounts

**Network**
- [ ] Dashboard runs behind Nginx/Caddy with SSL — never expose raw Node.js port
- [ ] Firewall blocks direct access to port `8000` from the internet (`ufw deny 8000`)
- [ ] HSTS is configured on your reverse proxy
- [ ] SSL certificate auto-renews (`certbot renew` via cron)

**Ongoing**
- [ ] Keep Node.js and npm packages updated (`npm audit`)
- [ ] Rotate `PTERODACTYL_KEY` and `SESSION_SECRET` periodically
- [ ] Review Admin → Logs regularly for suspicious activity
- [ ] Monitor `/health` endpoint via an uptime tool (UptimeRobot, Grafana)

---

## Atomic Operations & Race Condition Prevention

Feliactyl uses a user-level locking system to prevent race conditions in coin transactions:

### The Problem

Without atomic operations, these scenarios can cause issues:
- User clicks "buy RAM" twice quickly → Double spend, negative balance
- AFK rewards trigger twice → Duplicate coins
- Multiple concurrent requests → Broken economy

### The Solution

**User-Level Locks** (`functions/atomic.js`):

```javascript
// Acquire exclusive lock for user
await withUserLock(userId, async () => {
    // Read current balance
    // Modify balance
    // Save - guaranteed no other request modified it during this time
});
```

### Protected Operations

| Operation | Lock Type | Idempotent |
|:----------|:----------|:-----------|
| Store purchases (RAM/Disk/CPU/Servers) | User lock | ✅ Yes (transactionId) |
| Plan purchases | User lock | ✅ Yes (transactionId) |
| Coin gifting | Dual-user lock | ❌ No |
| AFK rewards | User lock + time check | ✅ Yes (time-based) |
| Admin set/add coins | User lock | ❌ No |
| API coin operations | User lock | ✅ Yes (where applicable) |

### Idempotency

Transaction IDs prevent double-processing:

```javascript
// Frontend generates transactionId
const txId = generateTransactionId();

// Backend caches result for 24 hours
const result = await withIdempotency(db, txId, async () => {
    return await purchaseResourceAtomically(db, userId, purchase);
});

// Duplicate requests return cached result without re-processing
if (result.cached) {
    return res.json({ status: "already_processed" });
}
```

### API Changes

Use `transactionId` in request body for idempotent operations:

```bash
POST /buyram
{
  "amount": 5,
  "transactionId": "uuid-generated-frontend"
}
```

If the same `transactionId` is sent twice, the second request returns the first result without re-processing.
