# Contributing to Feliactyl

Thank you for your interest in contributing! This document covers everything you need to know to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Branch Strategy](#branch-strategy)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Code Style](#code-style)
- [Project Structure](#project-structure)

---

## Code of Conduct

By participating in this project you agree to:

- Be respectful and constructive in all discussions
- Not harass, discriminate against, or demean other contributors
- Focus on the code and ideas, not the person

Violations can be reported to [akshaymanbhaw27@gmail.com](mailto:akshaymanbhaw27@gmail.com).

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Pterodactyl panel (for testing full functionality)
- A Discord application with OAuth2 enabled

### Local Setup

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/Feliactyl.git
cd Feliactyl

# 2. Install dependencies
npm install

# 3. Copy and configure settings
cp example.settings.json settings.json
# Edit settings.json with your test Pterodactyl and Discord credentials

# 4. (Optional) Set up .env for secrets
cp .env.example .env

# 5. Start in development mode
npm start
```

---

## How to Contribute

There are several ways to contribute:

- **Bug fixes** — fix a reported issue or one you discovered yourself
- **Features** — implement something from the issue tracker or propose your own
- **Documentation** — improve README, SECURITY.md, code comments, or this file
- **UI improvements** — enhance the EJS templates, CSS, or UX
- **Tests** — add coverage for existing or new functionality
- **Translations** — help localise the dashboard (future roadmap)

---

## Branch Strategy

| Branch | Purpose |
|:---|:---|
| `v2-features` | Main development branch — target all PRs here |
| `main` / `master` | Stable release snapshots |
| `fix/...` | Bug fix branches |
| `feat/...` | Feature branches |
| `docs/...` | Documentation-only changes |

**Always branch off `v2-features`**, not `main`.

```bash
git checkout v2-features
git pull origin v2-features
git checkout -b feat/my-feature
```

---

## Commit Guidelines

Use clear, descriptive commit messages. Follow this format:

```
<type>: <short summary>

[optional body with more detail]
```

**Types:**

| Type | When to use |
|:---|:---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no logic change) |
| `refactor` | Code restructure without behaviour change |
| `perf` | Performance improvement |
| `chore` | Dependency updates, config changes |
| `security` | Security fix or hardening |

**Examples:**
```
feat: add AFK earn settings to admin panel
fix: guard ip.block undefined error in oauth2 login
docs: expand README to cover configuration sections
security: increase rate limits for general and API routes
```

---

## Pull Request Process

1. **One PR per concern** — don't bundle unrelated changes
2. **Target `v2-features`** — never open a PR against `main` directly
3. **Fill out the PR template** — describe what changed and why
4. **Self-review first** — read your own diff before submitting
5. **Keep it small** — large PRs are harder to review; split if needed
6. **No breaking changes without discussion** — open an issue first if your change affects the API or `settings.json` schema

### PR Checklist

Before submitting, confirm:

- [ ] Code runs without errors (`npm start`)
- [ ] No console errors in the browser on affected pages
- [ ] `settings.json` schema changes are reflected in `example.settings.json`
- [ ] New routes/pages are added to the relevant `Navigation.ejs` if needed
- [ ] Sensitive values use environment variables, not hardcoded strings
- [ ] No `node_modules`, `.env`, or `settings.json` included in the commit

---

## Reporting Bugs

**Search existing issues first** to avoid duplicates.

When opening a new bug report, include:

- **Feliactyl version** (check `settings.json` → `version`)
- **Node.js version** (`node -v`)
- **OS and environment** (Ubuntu 22.04, Windows, etc.)
- **Steps to reproduce** — be specific
- **Expected vs actual behaviour**
- **Relevant logs** — paste console output or browser errors
- **Screenshots** if it's a UI issue

> For **security vulnerabilities**, do NOT open a public issue. See [SECURITY.md](SECURITY.md).

---

## Suggesting Features

Open a GitHub Issue with the label `enhancement` and include:

- **Problem it solves** — what user need or pain point does this address?
- **Proposed solution** — how would it work?
- **Alternatives considered** — other approaches you thought of
- **Scope** — is this a small addition or a large architectural change?

Features that align with Feliactyl's goals (self-service game server dashboards, coin economy, Pterodactyl integration) are most likely to be accepted.

---

## Code Style

Feliactyl uses plain JavaScript (no TypeScript). Follow the existing patterns in the codebase:

### JavaScript

- `"use strict"` at the top of all backend files
- `const` / `let` — never `var`
- `async/await` for asynchronous code — avoid raw `.then()` chains
- Descriptive variable names — avoid single-letter names outside loop counters
- Error handling — always `try/catch` around async operations that can fail
- No unused variables or imports

### EJS Templates

- Keep logic minimal in templates — move complex operations to the backend or `renderData()`
- Use existing CSS classes from `Styles.ejs` before adding new ones
- Follow the existing card/section structure used in other admin pages

### File Placement

| Type | Location |
|:---|:---|
| Backend route handlers | `Backend/<category>/` |
| EJS page templates | `Public/Themes/Default/Resources/Pages/` |
| Admin page templates | `Public/Themes/Default/Admin/` |
| Shared components | `Public/Themes/Default/Components/` |
| Utility functions | `functions/` |
| Background workers | `workers/` |
| Service orchestration | `services/` |

---

## Project Structure

```
Feliactyl/
├── Backend/                  # Route handlers
│   ├── admin/                # Admin panel routes
│   ├── auth/                 # OAuth2 login flow
│   ├── economy/              # AFK, store, gifting
│   └── ...
├── Public/
│   └── Themes/
│       └── Default/
│           ├── Admin/        # Admin page EJS templates
│           ├── Components/   # Topbar, Sidebar, Styles
│           ├── Resources/    # User-facing page templates
│           └── Routers/      # Navigation, layout wrappers
├── assets/                   # Static assets (images, icons)
├── functions/                # Utility modules (security, atomic, logging)
├── services/                 # Service manager, worker manager, health
├── workers/                  # Background economy worker
├── index.js                  # App entry point
├── settings.json             # Runtime config (gitignored)
├── example.settings.json     # Config template (committed)
└── ecosystem.config.js       # PM2 process definitions
```

---

## Questions?

- Open a [GitHub Discussion](https://github.com/notcaliper/Feliactyl/discussions) for general questions
- Join the [Discord server](https://discord.gg/N7C2nbYpQf) for real-time chat
- Tag `@notcaliper` in issues for maintainer attention

---

*Thank you for contributing to Feliactyl! 💜*
