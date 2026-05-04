# Security Policy

## Supported Versions

| Version | Supported | Notes |
|:--------|:----------|:------|
| 2.x (`v2-features`) | ✅ Active | Current release — receives all security updates |
| 1.0.x | ⚠️ Limited | Critical fixes only — upgrade to v2 recommended |
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

---

## Security Features

### Environment Variables (.env)

Secrets are now loaded from environment variables instead of plain JSON:

```bash
# Copy the example file
cp .env.example .env

# Edit with your actual secrets
nano .env
```

**Required variables:**
- `DISCORD_BOT_TOKEN` - Discord bot authentication
- `DISCORD_OAUTH2_ID` / `DISCORD_OAUTH2_SECRET` - OAuth2 credentials
- `PTERODACTYL_KEY` - Panel API key
- `FELIACTYL_API_CODE` - Internal API authentication
- `SESSION_SECRET` - Session encryption (min 32 chars)

### Input Validation

All API endpoints now validate:
- **Discord ID format** - Must be 17-20 digit numeric string
- **Numeric ranges** - Coins/resources within safe bounds (0-999,999,999)
- **Alphanumeric codes** - Coupon codes only allow a-z, A-Z, 0-9, _, -
- **XSS sanitization** - All string inputs sanitized

### Rate Limiting

| Endpoint Type | Limit |
|:--------------|:------|
| General | 100 requests / 15 minutes |
| API | 30 requests / minute |
| Auth (login/callback) | 10 requests / 15 minutes |

### Security Headers (Helmet)

- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- Secure session cookies (in production)

### API Authentication

All API endpoints require:
```
Authorization: Bearer YOUR_API_CODE
```

Failed attempts are logged with IP for audit trail.

### Audit Logging

Security events logged:
- API authentication attempts (success/fail)
- Coin balance changes via API
- Plan/resource modifications
- Coupon creation/revocation

---

## Quick Security Checklist

- [ ] Copy `.env.example` to `.env`
- [ ] Generate strong random values for all secrets
- [ ] Set `NODE_ENV=production` in production
- [ ] Keep `.env` out of version control (already in .gitignore)
- [ ] Rotate API keys periodically
- [ ] Review logs regularly for suspicious activity

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
