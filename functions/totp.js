"use strict";

/**
 * 2FA/TOTP Authentication System
 * Uses speakeasy for TOTP generation and verification
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * Generate a new 2FA secret for a user
 * @param {string} userId - Discord user ID
 * @returns {Object} - Secret and QR code URL
 */
async function generateSecret(userId) {
    const secret = speakeasy.generateSecret({
        name: `Feliactyl:${userId}`,
        length: 32
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        otpauthUrl: secret.otpauth_url
    };
}

/**
 * Verify a TOTP token against a secret
 * @param {string} secret - Base32 encoded secret
 * @param {string} token - 6-digit token from user
 * @returns {boolean}
 */
function verifyToken(secret, token) {
    if (!secret || !token) return false;
    
    // Remove any whitespace
    token = token.replace(/\s/g, '');
    
    return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 1 step before/after for time drift
    });
}

/**
 * Generate backup codes for 2FA recovery
 * @returns {string[]} - Array of 8 backup codes
 */
function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 8; i++) {
        // Generate 10-character alphanumeric codes
        const code = Math.random().toString(36).substring(2, 12).toUpperCase();
        codes.push(code);
    }
    return codes;
}

/**
 * Verify a backup code
 * @param {string[]} backupCodes - Stored backup codes
 * @param {string[]} usedBackupCodes - Already used codes
 * @param {string} inputCode - Code to verify
 * @returns {Object} - { valid: boolean, code: string|null }
 */
function verifyBackupCode(backupCodes, usedBackupCodes, inputCode) {
    if (!backupCodes || !inputCode) return { valid: false, code: null };
    
    const normalizedInput = inputCode.toUpperCase().replace(/\s/g, '');
    
    // Check if code exists and hasn't been used
    if (backupCodes.includes(normalizedInput) && !usedBackupCodes?.includes(normalizedInput)) {
        return { valid: true, code: normalizedInput };
    }
    
    return { valid: false, code: null };
}

/**
 * Generate a temporary token for 2FA verification flow
 * @param {string} userId - User ID
 * @returns {string} - Temporary session token
 */
function generateTempToken(userId) {
    return speakeasy.totp({
        secret: userId + Date.now(),
        encoding: 'ascii',
        step: 300 // 5 minute validity
    });
}

module.exports = {
    generateSecret,
    verifyToken,
    generateBackupCodes,
    verifyBackupCode,
    generateTempToken
};
