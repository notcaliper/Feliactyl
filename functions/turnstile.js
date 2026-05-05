"use strict";

/**
 * Cloudflare Turnstile CAPTCHA Verification
 * Prevents bot abuse on login, register, and AFK pages
 */

const fetch = require('node-fetch');

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY;
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify Turnstile token with Cloudflare
 * @param {string} token - The token from the client
 * @param {string} ip - Client IP address
 * @returns {Promise<boolean>} - Whether verification passed
 */
async function verifyTurnstile(token, ip) {
    if (!TURNSTILE_SECRET) {
        console.warn('[Turnstile] Secret key not configured, skipping verification');
        return true;
    }

    if (!token) {
        return false;
    }

    try {
        const response = await fetch(VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                secret: TURNSTILE_SECRET,
                response: token,
                remoteip: ip
            })
        });

        const data = await response.json();
        
        if (data.success) {
            return true;
        }

        console.log('[Turnstile] Verification failed:', data['error-codes']);
        return false;
    } catch (error) {
        console.error('[Turnstile] Verification error:', error);
        return false;
    }
}

/**
 * Express middleware for Turnstile verification
 */
function turnstileMiddleware() {
    return async (req, res, next) => {
        const token = req.body['cf-turnstile-response'] || req.query['cf-turnstile-response'];
        
        if (!TURNSTILE_SECRET) {
            return next();
        }

        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
        
        const isValid = await verifyTurnstile(token, ip);
        
        if (isValid) {
            req.turnstileVerified = true;
            return next();
        }

        return res.status(403).json({
            status: 'error',
            message: 'CAPTCHA verification failed. Please try again.'
        });
    };
}

/**
 * Get Turnstile site key for client-side rendering
 * @returns {string|null}
 */
function getSiteKey() {
    return TURNSTILE_SITE_KEY;
}

/**
 * Check if Turnstile is configured
 * @returns {boolean}
 */
function isConfigured() {
    return !!(TURNSTILE_SECRET && TURNSTILE_SITE_KEY);
}

module.exports = {
    verifyTurnstile,
    turnstileMiddleware,
    getSiteKey,
    isConfigured
};
