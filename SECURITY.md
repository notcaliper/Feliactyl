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
