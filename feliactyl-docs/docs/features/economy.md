---
sidebar_position: 1
title: Coin Economy
description: AFK earning, Linkvertise, gifting, referrals, and Stripe purchases
---

# 🪙 Coin Economy

Feliactyl has a full virtual coin economy that lets users earn, spend, and transfer coins to purchase server resources.

---

## AFK Earn Page

Users earn coins passively by keeping the `/earn` page open. It uses a **WebSocket connection** to deliver coins at a set interval — no polling, no page refreshes.

### How it works
1. User visits `/earn`
2. Browser opens a WebSocket to `/afkwspath`
3. Server sends a coin payout every `every` seconds
4. Coins are added **atomically** to prevent race conditions

### Configuration (`settings.json`)
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
| `every` | Seconds between each payout |
| `coins` | Coins awarded per payout |

:::info
The AFK path must match your Nginx/proxy WebSocket config. Default is `afkwspath`.
:::

:::tip
Configurable live from **Admin → Settings → AFK** without restarting.
:::

### Anti-abuse
- Browser tab visibility is tracked — hidden tabs stop earning
- Adblocker detection blocks earning if an adblocker is detected
- Session tokens are rotated to prevent replay attacks

---

## Linkvertise

Users earn coins by visiting a Linkvertise-shortened URL. After completing the link, coins are credited automatically.

### Flow
1. User clicks **"Earn via Linkvertise"** on `/linkvertise`
2. Redirected to a Linkvertise URL (your publisher account)
3. After completion, Linkvertise redirects back with a token
4. Server verifies the token and credits coins

### Configuration
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
| `userid` | Your Linkvertise publisher ID |
| `coins` | Coins per completed link |
| `dailyLimit` | Max completions per user per day |
| `cooldown` | Seconds between completions |
| `minTimeToComplete` | Minimum time (seconds) to spend on link |
| `timeToExpire` | Token expiry time in seconds |

---

## Referral System

Each user gets a unique **8-character referral code** derived from their Discord ID. When someone signs up using a referral link, both users are rewarded.

### How it works
1. User visits `/referrals` to see their code and link
2. They share `https://your-domain.com/register?ref=ABCD1234`
3. New user signs up via Discord OAuth2 with that `?ref=` parameter
4. New user gets coins immediately on signup
5. Referrer gets coins when the referred user makes their **first coin purchase** (configurable)

### Rewards
Configured via environment variables:
```env
REFERRAL_REWARD_COINS=100    # Coins per successful referral (default: 100)
REFERRAL_MIN_PURCHASE=0      # Min purchase amount to trigger referrer reward (default: 0)
```

### Stats
Users can view on `/referrals`:
- Their referral code and shareable link
- Total referrals made
- Pending vs paid rewards

---

## Coin Gifting

Users can send coins to other users from `/gift`.

### Rules
- Must have sufficient balance
- Recipient identified by Discord user ID
- Atomic transfer — deducted and credited in a single operation
- Logged to the audit log if logging is enabled

### Toggle
```json
"allow": {
  "giftressources": false
}
```
Set to `true` to enable gifting.

---

## Stripe Payments

Users can buy coins with real money via Stripe Checkout.

### Flow
1. User visits `/buy` (or `/buycoins`)
2. Selects a coin package
3. Redirected to Stripe Checkout
4. On success, coins credited automatically via webhook

### Configuration
```json
"stripe": {
  "enabled": true,
  "key": "sk_live_xxxxxxxxxx",
  "coins": 100
}
```

`coins` = coins per **$1 USD** spent.

:::warning
Store your Stripe key in `.env` as `STRIPE_KEY=sk_live_...` — never hardcode it in `settings.json`.
:::

---

## Atomic Transactions

All coin operations use **atomic transactions** to prevent:
- **Double-spend** — buying the same resource twice
- **Race conditions** — two requests processing simultaneously
- **Negative balances** — coin deduction only if balance is sufficient

Each purchase generates a unique **transaction ID**. Duplicate requests with the same ID are safely ignored (idempotency).

---

## Coupon Codes

Admins can create coupon codes from the Admin Panel that grant coins when redeemed at `/redeem`.

| Field | Description |
|:---|:---|
| Code | Alphanumeric redemption code |
| Coins | Amount granted on redemption |
| Uses | Max number of times it can be redeemed (or unlimited) |

Redeemed coupons are tracked per-user to prevent re-use.
