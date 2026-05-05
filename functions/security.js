"use strict";

/**
 * Security utilities for Feliactyl
 * Provides input sanitization, validation, and security helpers
 */

const xss = require('xss');
const crypto = require('crypto');

// XSS Sanitization options
const xssOptions = {
    whiteList: {
        b: [],
        i: [],
        em: [],
        strong: [],
        code: [],
        pre: []
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - Raw user input
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return xss(input, xssOptions);
}

/**
 * Sanitize an object's string values recursively
 * @param {object} obj - Object to sanitize
 * @returns {object} Sanitized object
 */
function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeInput(value);
        } else if (typeof value === 'object') {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

/**
 * Validate Discord ID format
 * @param {string} id - Discord ID to validate
 * @returns {boolean} Is valid
 */
function isValidDiscordId(id) {
    if (typeof id !== 'string') return false;
    return /^\d{17,20}$/.test(id);
}

/**
 * Validate alphanumeric string (for coupon codes, etc)
 * @param {string} str - String to validate
 * @param {number} maxLength - Maximum length
 * @returns {boolean} Is valid
 */
function isValidAlphanumeric(str, maxLength = 200) {
    if (typeof str !== 'string') return false;
    if (str.length > maxLength) return false;
    return /^[a-zA-Z0-9_-]+$/.test(str);
}

/**
 * Validate server name
 * @param {string} name - Server name
 * @returns {object} Validation result
 */
function validateServerName(name) {
    if (typeof name !== 'string') {
        return { valid: false, error: 'Name must be a string' };
    }
    
    const sanitized = sanitizeInput(name.trim());
    
    if (sanitized.length < 1) {
        return { valid: false, error: 'Name too short' };
    }
    if (sanitized.length > 191) {
        return { valid: false, error: 'Name too long (max 191 chars)' };
    }
    
    // Block dangerous characters
    if (/[<>\"'&]/.test(sanitized)) {
        return { valid: false, error: 'Name contains invalid characters' };
    }
    
    return { valid: true, value: sanitized };
}

/**
 * Validate numeric range
 * @param {number} value - Value to check
 * @param {number} min - Minimum allowed
 * @param {number} max - Maximum allowed
 * @returns {object} Validation result
 */
function validateNumber(value, min = 0, max = 999999999) {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
        return { valid: false, error: 'Not a valid number' };
    }
    if (num < min) {
        return { valid: false, error: `Value below minimum (${min})` };
    }
    if (num > max) {
        return { valid: false, error: `Value exceeds maximum (${max})` };
    }
    
    return { valid: true, value: num };
}

/**
 * Validate coin amount
 * @param {number} coins - Coin amount
 * @returns {object} Validation result
 */
function validateCoins(coins) {
    return validateNumber(coins, 0, 999999999999);
}

/**
 * Generate secure random token
 * @param {number} length - Token length
 * @returns {string} Secure random token
 */
function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data (one-way)
 * @param {string} data - Data to hash
 * @returns {string} SHA-256 hash
 */
function hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Encrypt sensitive data (two-way, requires key)
 * @param {string} text - Text to encrypt
 * @param {string} key - Encryption key
 * @returns {string} Encrypted text
 */
function encrypt(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text
 * @param {string} key - Encryption key
 * @returns {string} Decrypted text
 */
function decrypt(encryptedText, key) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

/**
 * Rate limiter helper - creates rate limit config
 * @param {number} windowMs - Time window in ms
 * @param {number} maxRequests - Max requests per window
 * @returns {object} Rate limit configuration
 */
function createRateLimit(windowMs = 60000, maxRequests = 10) {
    return {
        windowMs,
        max: maxRequests,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                status: 'error',
                message: 'Too many requests, please try again later.'
            });
        }
    };
}

module.exports = {
    sanitizeInput,
    sanitizeObject,
    isValidDiscordId,
    isValidAlphanumeric,
    validateServerName,
    validateNumber,
    validateCoins,
    generateSecureToken,
    hashData,
    encrypt,
    decrypt,
    createRateLimit
};
