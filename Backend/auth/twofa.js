"use strict";

/**
 * 2FA/TOTP Authentication Routes
 * Handles setup, verification, and backup codes
 */

const settings = require("../../settings.json");
const indexjs = require("../../index.js");
const fetch = require('node-fetch');
const {
    generateSecret,
    verifyToken,
    generateBackupCodes,
    verifyBackupCode
} = require('../../functions/totp.js');
const log = require('../../functions/log.js');

module.exports.load = async function (app, db) {

    /**
     * Check if 2FA is enabled for user
     */
    app.get("/api/2fa/status", async (req, res) => {
        if (!req.session.userinfo) {
            return res.status(401).json({ status: "error", message: "not logged in" });
        }

        const enabled = await db.get(`2fa-enabled-${req.session.userinfo.id}`);
        const secretExists = await db.get(`2fa-secret-${req.session.userinfo.id}`);

        res.json({
            status: "success",
            enabled: !!enabled,
            configured: !!secretExists
        });
    });

    /**
     * Start 2FA setup - generate secret and QR code
     */
    app.post("/api/2fa/setup", async (req, res) => {
        if (!req.session.userinfo) {
            return res.status(401).json({ status: "error", message: "not logged in" });
        }

        const userId = req.session.userinfo.id;

        // Check if already enabled
        const alreadyEnabled = await db.get(`2fa-enabled-${userId}`);
        if (alreadyEnabled) {
            return res.status(400).json({
                status: "error",
                message: "2FA is already enabled. Disable it first to reconfigure."
            });
        }

        try {
            // Generate new secret
            const { secret, qrCode, otpauthUrl } = await generateSecret(userId);

            // Store temporarily (not enabled until verified)
            await db.set(`2fa-temp-secret-${userId}`, secret);

            // Generate backup codes
            const backupCodes = generateBackupCodes();
            await db.set(`2fa-temp-backup-${userId}`, backupCodes);

            res.json({
                status: "success",
                secret: secret,
                qrCode: qrCode,
                manualEntry: secret.replace(/(.{4})/g, '$1 ').trim(),
                backupCodes: backupCodes
            });

        } catch (error) {
            console.error('[2FA Setup Error]', error);
            res.status(500).json({
                status: "error",
                message: "Failed to generate 2FA setup"
            });
        }
    });

    /**
     * Verify and enable 2FA
     */
    app.post("/api/2fa/verify-setup", async (req, res) => {
        if (!req.session.userinfo) {
            return res.status(401).json({ status: "error", message: "not logged in" });
        }

        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ status: "error", message: "token required" });
        }

        const userId = req.session.userinfo.id;
        const tempSecret = await db.get(`2fa-temp-secret-${userId}`);

        if (!tempSecret) {
            return res.status(400).json({
                status: "error",
                message: "No 2FA setup in progress. Start setup first."
            });
        }

        // Verify the token
        const isValid = verifyToken(tempSecret, token);

        if (!isValid) {
            return res.status(400).json({
                status: "error",
                message: "Invalid verification code. Please try again."
            });
        }

        // Enable 2FA
        await db.set(`2fa-secret-${userId}`, tempSecret);
        await db.set(`2fa-enabled-${userId}`, true);
        await db.set(`2fa-backup-${userId}`, await db.get(`2fa-temp-backup-${userId}`));
        await db.set(`2fa-used-backup-${userId}`, []);

        // Clear temp data
        await db.delete(`2fa-temp-secret-${userId}`);
        await db.delete(`2fa-temp-backup-${userId}`);

        log('2fa enabled', `${req.session.userinfo.username}#${req.session.userinfo.discriminator} enabled 2FA`);

        res.json({
            status: "success",
            message: "2FA has been enabled successfully"
        });
    });

    /**
     * Verify 2FA token during login
     */
    app.post("/api/2fa/verify", async (req, res) => {
        const { token, backupCode } = req.body;

        // Get pending user from session
        const pendingUserId = req.session.pending2faUser;
        if (!pendingUserId) {
            return res.status(400).json({
                status: "error",
                message: "No 2FA verification pending"
            });
        }

        const secret = await db.get(`2fa-secret-${pendingUserId}`);
        const enabled = await db.get(`2fa-enabled-${pendingUserId}`);

        if (!enabled || !secret) {
            return res.status(400).json({
                status: "error",
                message: "2FA not enabled for this account"
            });
        }

        let isValid = false;
        let usedBackup = false;

        // Try TOTP token first
        if (token) {
            isValid = verifyToken(secret, token);
        }

        // Try backup code if TOTP failed or not provided
        if (!isValid && backupCode) {
            const backupCodes = await db.get(`2fa-backup-${pendingUserId}`) || [];
            const usedBackupCodes = await db.get(`2fa-used-backup-${pendingUserId}`) || [];

            const result = verifyBackupCode(backupCodes, usedBackupCodes, backupCode);
            
            if (result.valid) {
                isValid = true;
                usedBackup = true;
                // Mark backup code as used
                usedBackupCodes.push(result.code);
                await db.set(`2fa-used-backup-${pendingUserId}`, usedBackupCodes);
            }
        }

        if (!isValid) {
            return res.status(400).json({
                status: "error",
                message: "Invalid code. Please try again."
            });
        }

        // Get user info
        const userInfo = await db.get(`userinfo-${pendingUserId}`);

        // Complete login — restore full session state
        req.session.userinfo = userInfo;
        // req.session.pterodactyl is already set from the pending state (oauth2.js line 357)
        delete req.session.pending2faUser;

        const userName = await db.get(`username-${pendingUserId}`);
        log('login with 2fa', `${userName} logged in with ${usedBackup ? 'backup code' : '2FA'}`);

        // Save session before responding so the cookie is persisted for the redirect
        req.session.save((err) => {
            if (err) {
                console.error('[2FA] Session save error:', err);
                return res.status(500).json({ status: "error", message: "Session error, please try again." });
            }
            res.json({
                status: "success",
                message: "2FA verified successfully",
                usedBackup: usedBackup,
                redirect: "/dashboard"
            });
        });
    });

    /**
     * Disable 2FA (requires verification)
     */
    app.post("/api/2fa/disable", async (req, res) => {
        if (!req.session.userinfo) {
            return res.status(401).json({ status: "error", message: "not logged in" });
        }

        const { token, backupCode } = req.body;
        const userId = req.session.userinfo.id;

        const enabled = await db.get(`2fa-enabled-${userId}`);
        if (!enabled) {
            return res.status(400).json({
                status: "error",
                message: "2FA is not enabled"
            });
        }

        if (!token && !backupCode) {
            return res.status(400).json({
                status: "error",
                message: "Authenticator code or backup code required"
            });
        }

        // Accept TOTP token or backup code
        const secret = await db.get(`2fa-secret-${userId}`);
        let isValid = false;
        if (token) {
            isValid = verifyToken(secret, token.toString().replace(/\s/g, ''));
        } else if (backupCode) {
            const backupResult = await verifyBackupCode(db, userId, backupCode.toString().trim());
            isValid = backupResult.valid;
        }

        if (!isValid) {
            return res.status(400).json({
                status: "error",
                message: token ? "Invalid authenticator code" : "Invalid backup code"
            });
        }

        // Disable 2FA
        await db.delete(`2fa-enabled-${userId}`);
        await db.delete(`2fa-secret-${userId}`);
        await db.delete(`2fa-backup-${userId}`);
        await db.delete(`2fa-used-backup-${userId}`);

        log('2fa disabled', `${req.session.userinfo.username}#${req.session.userinfo.discriminator} disabled 2FA`);

        res.json({
            status: "success",
            message: "2FA has been disabled"
        });
    });

    /**
     * Regenerate backup codes
     */
    app.post("/api/2fa/regenerate-backup", async (req, res) => {
        if (!req.session.userinfo) {
            return res.status(401).json({ status: "error", message: "not logged in" });
        }

        const { token } = req.body;
        const userId = req.session.userinfo.id;

        const enabled = await db.get(`2fa-enabled-${userId}`);
        if (!enabled) {
            return res.status(400).json({
                status: "error",
                message: "2FA is not enabled"
            });
        }

        // Verify TOTP token
        const secret = await db.get(`2fa-secret-${userId}`);
        const isValid = token && verifyToken(secret, token);

        if (!isValid) {
            return res.status(400).json({
                status: "error",
                message: "Invalid verification code"
            });
        }

        // Generate new backup codes
        const newBackupCodes = generateBackupCodes();
        await db.set(`2fa-backup-${userId}`, newBackupCodes);
        await db.set(`2fa-used-backup-${userId}`, []);

        log('2fa backup regenerated', `${req.session.userinfo.username}#${req.session.userinfo.discriminator} regenerated backup codes`);

        res.json({
            status: "success",
            backupCodes: newBackupCodes
        });
    });

    /**
     * Get 2FA status for admin panel
     */
    app.get("/api/admin/2fa/:userId", async (req, res) => {
        if (!req.session.pterodactyl) {
            return res.status(401).json({ status: "error", message: "not logged in" });
        }

        // Check admin
        const cacheaccount = await fetch(
            settings.pterodactyl.domain + "/api/application/users/" + (await db.get("users-" + req.session.userinfo.id)) + "?include=servers",
            {
                method: "get",
                headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
            }
        );
        
        if (cacheaccount.statusText === "Not Found") {
            return res.status(404).json({ status: "error", message: "user not found" });
        }
        
        const cacheaccountinfo = JSON.parse(await cacheaccount.text());
        if (cacheaccountinfo.attributes.root_admin !== true) {
            return res.status(403).json({ status: "error", message: "forbidden" });
        }

        const userId = req.params.userId;
        const enabled = await db.get(`2fa-enabled-${userId}`);
        const created = await db.get(`users-${userId}`);

        res.json({
            status: "success",
            userId: userId,
            has2fa: !!enabled,
            accountCreated: created
        });
    });
};
