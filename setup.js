// Feliactyl First-Run Setup Wizard
"use strict";

const fs = require("fs");
const readline = require("readline");
const path = require("path");
const chalk = require("chalk");
const gradient = require("gradient-string");

const SETTINGS_PATH = path.join(__dirname, "settings.json");
const SETUP_FLAG = path.join(__dirname, ".setup_complete");

function isSetupComplete() {
  return fs.existsSync(SETUP_FLAG) && fs.existsSync(SETTINGS_PATH);
}

function markSetupComplete() {
  fs.writeFileSync(SETUP_FLAG, new Date().toISOString());
}

function ask(rl, question, defaultVal) {
  return new Promise((resolve) => {
    const display = defaultVal !== undefined ? `${question} ${chalk.gray(`(${defaultVal})`)} ` : `${question} `;
    rl.question(display, (answer) => {
      resolve(answer.trim() || defaultVal || "");
    });
  });
}

function askBool(rl, question, defaultVal) {
  return new Promise((resolve) => {
    const def = defaultVal ? "Y/n" : "y/N";
    rl.question(`${question} ${chalk.gray(`[${def}]`)} `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (!a) return resolve(defaultVal);
      resolve(a === "y" || a === "yes");
    });
  });
}

function section(title) {
  console.log("\n" + chalk.cyan("─".repeat(60)));
  console.log(chalk.cyan.bold("  " + title));
  console.log(chalk.cyan("─".repeat(60)));
}

async function runSetup() {
  console.clear();
  console.log(gradient.retro("███████╗███████╗██╗     ██╗  █████╗  ██████╗████████╗██╗   ██╗██╗"));
  console.log(gradient.retro("██╔════╝██╔════╝██║     ██║ ██╔══██╗██╔════╝╚══██╔══╝╚██╗ ██╔╝██║"));
  console.log(gradient.retro("█████╗  █████╗  ██║     ██║ ███████║██║        ██║    ╚████╔╝ ██║"));
  console.log(gradient.retro("██╔══╝  ██╔══╝  ██║     ██║ ██╔══██║██║        ██║     ╚██╔╝  ██║"));
  console.log(gradient.retro("██║     ███████╗███████╗██║ ██║  ██║╚██████╗   ██║      ██║   ███████╗"));
  console.log(gradient.retro("╚═╝     ╚══════╝╚══════╝╚═╝ ╚═╝  ╚═╝ ╚═════╝   ╚═╝      ╚═╝   ╚══════╝"));
  console.log("");
  console.log(chalk.white.bold("  Welcome to the Feliactyl First-Run Setup Wizard"));
  console.log(chalk.gray("  This will guide you through configuring your dashboard."));
  console.log(chalk.gray("  Press Enter to accept the default value shown in (brackets).\n"));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // Load existing settings as defaults if file exists
  let existing = {};
  if (fs.existsSync(SETTINGS_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(SETTINGS_PATH).toString()); } catch {}
  }

  // Load example settings as base
  let base = {};
  try { base = JSON.parse(fs.readFileSync(path.join(__dirname, "example.settings.json")).toString()); } catch {}

  const cfg = JSON.parse(JSON.stringify(base)); // deep clone base

  // ── GENERAL ─────────────────────────────────────────────────────
  section("1/7  General");
  cfg.name = await ask(rl, "Dashboard name:", existing.name || "Feliactyl");
  cfg.defaulttheme = await ask(rl, "Theme folder name:", existing.defaulttheme || "Default");
  cfg.website = cfg.website || {};
  cfg.website.port = parseInt(await ask(rl, "Port to run on:", (existing.website && existing.website.port) || 8000));
  cfg.website.secret = await ask(rl, "Session secret (random string):", (existing.website && existing.website.secret) || "change_this_secret_" + Math.random().toString(36).slice(2));

  // ── PTERODACTYL ──────────────────────────────────────────────────
  section("2/7  Pterodactyl");
  cfg.pterodactyl = cfg.pterodactyl || {};
  cfg.pterodactyl.domain = await ask(rl, "Panel URL (e.g. https://panel.example.com):", (existing.pterodactyl && existing.pterodactyl.domain) || "");
  cfg.pterodactyl.key = await ask(rl, "Admin API Key:", (existing.pterodactyl && existing.pterodactyl.key) || "");

  // ── DISCORD OAUTH2 ───────────────────────────────────────────────
  section("3/7  Discord OAuth2");
  cfg.api = cfg.api || {};
  cfg.api.client = cfg.api.client || {};
  cfg.api.client.oauth2 = cfg.api.client.oauth2 || {};
  cfg.api.client.oauth2.id = await ask(rl, "Discord OAuth2 Client ID:", (existing.api && existing.api.client && existing.api.client.oauth2 && existing.api.client.oauth2.id) || "");
  cfg.api.client.oauth2.secret = await ask(rl, "Discord OAuth2 Client Secret:", (existing.api && existing.api.client && existing.api.client.oauth2 && existing.api.client.oauth2.secret) || "");
  cfg.api.client.oauth2.link = await ask(rl, "Base URL (e.g. http://yourdomain.com:8000):", (existing.api && existing.api.client && existing.api.client.oauth2 && existing.api.client.oauth2.link) || "");
  cfg.api.client.oauth2.callbackpath = await ask(rl, "Callback path:", "/callback");

  // ── STORE LIMITS ─────────────────────────────────────────────────
  section("4/7  Store Limits");
  cfg.storelimits = cfg.storelimits || {};
  cfg.storelimits.ram = await ask(rl, "Max RAM per user (MB):", (existing.storelimits && existing.storelimits.ram) || "8192");
  cfg.storelimits.disk = await ask(rl, "Max Disk per user (MB):", (existing.storelimits && existing.storelimits.disk) || "5120");
  cfg.storelimits.cpu = await ask(rl, "Max CPU per user (%):", (existing.storelimits && existing.storelimits.cpu) || "10240");
  cfg.storelimits.servers = await ask(rl, "Max Servers per user:", (existing.storelimits && existing.storelimits.servers) || "4");

  // ── STRIPE ───────────────────────────────────────────────────────
  section("5/7  Stripe Payments");
  cfg.stripe = cfg.stripe || {};
  cfg.stripe.enabled = await askBool(rl, "Enable Stripe payments?", (existing.stripe && existing.stripe.enabled) || false);
  if (cfg.stripe.enabled) {
    cfg.stripe.key = await ask(rl, "Stripe API Key:", (existing.stripe && existing.stripe.key) || "");
    cfg.stripe.coins = parseInt(await ask(rl, "Coins awarded per $1:", (existing.stripe && existing.stripe.coins) || "100"));
  }

  // ── FEATURES ─────────────────────────────────────────────────────
  section("6/7  Features");
  cfg.api.client.allow = cfg.api.client.allow || {};
  cfg.api.client.allow.newusers = await askBool(rl, "Allow new user signups?", true);
  cfg.api.client.allow.server = cfg.api.client.allow.server || {};
  cfg.api.client.allow.server.create = await askBool(rl, "Allow users to create servers?", true);
  cfg.api.client.allow.server.modify = await askBool(rl, "Allow users to modify servers?", true);
  cfg.api.client.allow.server.delete = await askBool(rl, "Allow users to delete servers?", true);
  cfg.whitelist = cfg.whitelist || {};
  cfg.whitelist.status = await askBool(rl, "Enable whitelist (only specific users)?", false);

  cfg.antivpn = cfg.antivpn || {};
  cfg.antivpn.status = await askBool(rl, "Enable anti-VPN?", false);
  if (cfg.antivpn.status) {
    cfg.antivpn.APIKey = await ask(rl, "ProxyCheck.io API Key:", "");
  }

  // ── LOGGING ──────────────────────────────────────────────────────
  section("7/7  Logging");
  cfg.logging = cfg.logging || {};
  cfg.logging.status = await askBool(rl, "Enable Discord webhook logging?", false);
  if (cfg.logging.status) {
    cfg.logging.webhook = await ask(rl, "Discord Webhook URL:", "");
  }

  rl.close();

  // Write settings
  console.log("\n" + chalk.cyan("─".repeat(60)));
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(cfg, null, 2));
  markSetupComplete();
  console.log(chalk.green.bold("\n  ✅ Setup complete! settings.json has been created."));
  console.log(chalk.gray("  You can change any setting later at /admin/settings in the dashboard.\n"));
}

module.exports = { isSetupComplete, runSetup };
