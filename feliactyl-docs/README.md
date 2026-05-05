# Feliactyl Docs

Documentation site for [Feliactyl](https://github.com/notcaliper/Feliactyl) — built with [Docusaurus](https://docusaurus.io/).

## Local Development

```bash
npm install
npm start
```

Opens at `http://localhost:3000/`.

## Build

```bash
npm run build
```

Outputs static files to `build/`. Deploy to any static host (GitHub Pages, Netlify, Cloudflare Pages, etc.).

## Deploy to GitHub Pages

```bash
GIT_USER=<your-github-username> npm run deploy
```

This builds the site and pushes to the `gh-pages` branch automatically.

## Structure

```
docs/
  intro.mdx              # Introduction
  requirements.md        # System requirements
  installation.mdx       # Installation guide
  configuration.md       # Configuration reference
  migration.md           # Migration guide
  troubleshooting.md     # Troubleshooting
  features/
    economy.md           # Coin economy
    security.md          # Security features
    admin.md             # Admin panel
src/
  pages/index.tsx        # Homepage
  css/custom.css         # Global styles
static/
  img/feliactyl-logo.png # Logo
```
