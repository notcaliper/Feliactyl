"use strict";

/**
 * Environment variable loader for Feliactyl
 * Loads secrets from .env file and provides secure configuration access
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Try to load dotenv
try {
    require('dotenv').config();
} catch (err) {
    // dotenv not installed, continue without it
}

/**
 * Get environment variable with fallback
 * @param {string} key - Environment variable name
 * @param {string} fallback - Fallback value
 * @returns {string} Value or fallback
 */
function env(key, fallback = null) {
    const value = process.env[key];
    if (value === undefined || value === '') {
        return fallback;
    }
    return value;
}

/**
 * Get required environment variable - throws if missing
 * @param {string} key - Environment variable name
 * @returns {string} Value
 * @throws {Error} If not set
 */
function envRequired(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
}

/**
 * Check if running in production
 * @returns {boolean}
 */
function isProduction() {
    return env('NODE_ENV', 'development') === 'production';
}

/**
 * Secure configuration object
 * Loads from env vars, falls back to settings.json for non-sensitive values
 */
const secureConfig = {
    // Discord
    discord: {
        botToken: env('DISCORD_BOT_TOKEN'),
        oauth2Id: env('DISCORD_OAUTH2_ID'),
        oauth2Secret: env('DISCORD_OAUTH2_SECRET')
    },
    
    // Pterodactyl
    pterodactyl: {
        key: env('PTERODACTYL_KEY')
    },
    
    // Feliactyl API
    api: {
        code: env('FELIACTYL_API_CODE')
    },
    
    // Session
    session: {
        secret: env('SESSION_SECRET')
    },
    
    // Stripe
    stripe: {
        key: env('STRIPE_KEY')
    }
};

/**
 * Apply secure config to settings object
 * @param {object} settings - Settings object from settings.json
 * @returns {object} Settings with secure values applied
 */
function applySecureConfig(settings) {
    const secured = JSON.parse(JSON.stringify(settings)); // Deep clone
    
    // Apply Discord bot token
    if (secureConfig.discord.botToken) {
        secured.api.client.bot.token = secureConfig.discord.botToken;
    }
    
    // Apply OAuth2 credentials
    if (secureConfig.discord.oauth2Id) {
        secured.api.client.oauth2.id = secureConfig.discord.oauth2Id;
    }
    if (secureConfig.discord.oauth2Secret) {
        secured.api.client.oauth2.secret = secureConfig.discord.oauth2Secret;
    }
    
    // Apply Pterodactyl key
    if (secureConfig.pterodactyl.key) {
        secured.pterodactyl.key = secureConfig.pterodactyl.key;
    }
    
    // Apply API code
    if (secureConfig.api.code) {
        secured.api.client.api.code = secureConfig.api.code;
    }
    
    // Apply session secret
    if (secureConfig.session.secret) {
        secured.website.secret = secureConfig.session.secret;
    }
    
    // Apply Stripe key
    if (secureConfig.stripe.key) {
        secured.stripe.key = secureConfig.stripe.key;
    }
    
    return secured;
}

/**
 * Check if critical secrets are using placeholder values
 * @param {object} settings - Settings object
 * @returns {string[]} Array of warnings
 */
function checkPlaceholderSecrets(settings) {
    const warnings = [];
    
    const checks = [
        { path: 'api.client.bot.token', name: 'Discord Bot Token' },
        { path: 'api.client.oauth2.secret', name: 'Discord OAuth2 Secret' },
        { path: 'pterodactyl.key', name: 'Pterodactyl API Key' },
        { path: 'website.secret', name: 'Session Secret' }
    ];
    
    for (const check of checks) {
        const value = check.path.split('.').reduce((obj, key) => obj?.[key], settings);
        if (!value || 
            value.includes('Example') || 
            value.includes('example') ||
            value.includes('YOUR_') ||
            value === 'Discord bot token' ||
            value === 'Pterodactyl Client/Admin API Key with all permissions' ||
            value === 'Example Secret' ||
            value.length < 16) {
            warnings.push(`${check.name} appears to use a placeholder or weak value`);
        }
    }
    
    return warnings;
}

/**
 * Initialize and validate environment
 * @returns {object} Environment status
 */
function init() {
    const warnings = [];
    
    // Check if .env file exists
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        warnings.push('.env file not found - using settings.json for secrets (not recommended)');
    }
    
    // Check Node environment
    if (!isProduction()) {
        warnings.push('Running in development mode - set NODE_ENV=production for production');
    }
    
    return {
        isProduction: isProduction(),
        hasEnvFile: fs.existsSync(envPath),
        warnings
    };
}

module.exports = {
    env,
    envRequired,
    isProduction,
    secureConfig,
    applySecureConfig,
    checkPlaceholderSecrets,
    init
};
