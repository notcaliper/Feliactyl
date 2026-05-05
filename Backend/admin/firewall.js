"use strict";

/**
 * Firewall Admin API
 * Manage IP blacklists, whitelists, user bans
 */

const settings = require("../../settings.json");
const fetch = require('node-fetch');
const { admin: fwAdmin, runFirewallCheck, checkVPN } = require('../../functions/firewall.js');
const log = require('../../functions/log.js');

module.exports.load = async function (app, db) {

    /**
     * Verify admin helper
     */
    async function isAdmin(req) {
        if (!req.session.pterodactyl) return false;
        const res = await fetch(
            settings.pterodactyl.domain + "/api/application/users/" +
            (await db.get("users-" + req.session.userinfo.id)) + "?include=servers",
            {
                method: "get",
                headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
            }
        );
        if (res.statusText === "Not Found") return false;
        const info = JSON.parse(await res.text());
        req.session.pterodactyl = info.attributes;
        return info.attributes.root_admin === true;
    }

    /**
     * GET /api/admin/firewall/logs
     */
    app.get("/api/admin/firewall/logs", async (req, res) => {
        if (!await isAdmin(req)) return res.status(403).json({ status: "error", message: "forbidden" });
        const limit = parseInt(req.query.limit) || 50;
        const logs = await fwAdmin.getLogs(db, limit);
        res.json({ status: "success", logs });
    });

    /**
     * GET /api/admin/firewall/blacklist
     */
    app.get("/api/admin/firewall/blacklist", async (req, res) => {
        if (!await isAdmin(req)) return res.status(403).json({ status: "error", message: "forbidden" });
        const list = await fwAdmin.getBlacklist(db);
        res.json({ status: "success", blacklist: list });
    });

    /**
     * POST /api/admin/firewall/blacklist
     * Body: { ip }
     */
    app.post("/api/admin/firewall/blacklist", async (req, res) => {
        if (!await isAdmin(req)) return res.status(403).json({ status: "error", message: "forbidden" });
        const { ip } = req.body;
        if (!ip) return res.status(400).json({ status: "error", message: "ip required" });
        await fwAdmin.blacklistIP(db, ip);
        log('firewall blacklist', `Admin ${req.session.userinfo.username} blacklisted IP: ${ip}`);
        res.json({ status: "success", message: `IP ${ip} blacklisted` });
    });

    /**
     * DELETE /api/admin/firewall/blacklist
     * Body: { ip }
     */
    app.delete("/api/admin/firewall/blacklist", async (req, res) => {
        if (!await isAdmin(req)) return res.status(403).json({ status: "error", message: "forbidden" });
        const { ip } = req.body;
        if (!ip) return res.status(400).json({ status: "error", message: "ip required" });
        await fwAdmin.unblacklistIP(db, ip);
        log('firewall unblacklist', `Admin ${req.session.userinfo.username} removed IP from blacklist: ${ip}`);
        res.json({ status: "success", message: `IP ${ip} removed from blacklist` });
    });

    /**
     * GET /api/admin/firewall/whitelist
     */
    app.get("/api/admin/firewall/whitelist", async (req, res) => {
        if (!await isAdmin(req)) return res.status(403).json({ status: "error", message: "forbidden" });
        const list = await fwAdmin.getWhitelist(db);
        res.json({ status: "success", whitelist: list });
    });

    /**
     * POST /api/admin/firewall/whitelist
     * Body: { ip }
     */
    app.post("/api/admin/firewall/whitelist", async (req, res) => {
        if (!await isAdmin(req)) return res.status(403).json({ status: "error", message: "forbidden" });
        const { ip } = req.body;
        if (!ip) return res.status(400).json({ status: "error", message: "ip required" });
        await fwAdmin.whitelistIP(db, ip);
        log('firewall whitelist', `Admin ${req.session.userinfo.username} whitelisted IP: ${ip}`);
        res.json({ status: "success", message: `IP ${ip} whitelisted` });
    });

    /**
     * DELETE /api/admin/firewall/whitelist
     * Body: { ip }
     */
    app.delete("/api/admin/firewall/whitelist", async (req, res) => {
        if (!await isAdmin(req)) return res.status(403).json({ status: "error", message: "forbidden" });
        const { ip } = req.body;
        if (!ip) return res.status(400).json({ status: "error", message: "ip required" });
        await fwAdmin.removeWhitelistIP(db, ip);
        log('firewall whitelist remove', `Admin ${req.session.userinfo.username} removed IP from whitelist: ${ip}`);
        res.json({ status: "success", message: `IP ${ip} removed from whitelist` });
    });

    /**
     * POST /api/admin/firewall/ban
     * Body: { userId, reason, duration } (duration in hours, 0 = permanent)
     */
    app.post("/api/admin/firewall/ban", async (req, res) => {
        if (!await isAdmin(req)) return res.status(403).json({ status: "error", message: "forbidden" });
        const { userId, reason, duration } = req.body;
        if (!userId) return res.status(400).json({ status: "error", message: "userId required" });
        
        const durationMs = duration > 0 ? duration * 60 * 60 * 1000 : null;
        await fwAdmin.banUser(db, userId, reason, durationMs, req.session.userinfo.username);
        
        const durationStr = duration > 0 ? `for ${duration}h` : 'permanently';
        log('firewall ban', `Admin ${req.session.userinfo.username} banned user ${userId} ${durationStr}: ${reason}`);
        res.json({ status: "success", message: `User ${userId} banned ${durationStr}` });
    });

    /**
     * POST /api/admin/firewall/unban
     * Body: { userId }
     */
    app.post("/api/admin/firewall/unban", async (req, res) => {
        if (!await isAdmin(req)) return res.status(403).json({ status: "error", message: "forbidden" });
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ status: "error", message: "userId required" });
        
        await fwAdmin.unbanUser(db, userId);
        log('firewall unban', `Admin ${req.session.userinfo.username} unbanned user ${userId}`);
        res.json({ status: "success", message: `User ${userId} unbanned` });
    });

    /**
     * POST /api/admin/firewall/check
     * Body: { ip } — manually check an IP
     */
    app.post("/api/admin/firewall/check", async (req, res) => {
        if (!await isAdmin(req)) return res.status(403).json({ status: "error", message: "forbidden" });
        const { ip } = req.body;
        if (!ip) return res.status(400).json({ status: "error", message: "ip required" });
        
        const fw = JSON.parse(require('fs').readFileSync('./settings.json')).firewall || {};
        const apiKey = fw.antiVPN?.apiKey || fw.antivpn?.APIKey;
        
        const result = await checkVPN(ip, apiKey);
        res.json({ status: "success", ip, ...result });
    });

    /**
     * POST /api/admin/firewall/cache/clear
     */
    app.post("/api/admin/firewall/cache/clear", async (req, res) => {
        if (!await isAdmin(req)) return res.status(403).json({ status: "error", message: "forbidden" });
        fwAdmin.clearVPNCache();
        log('firewall cache clear', `Admin ${req.session.userinfo.username} cleared firewall cache`);
        res.json({ status: "success", message: "Firewall cache cleared" });
    });

    /**
     * GET /api/admin/firewall/stats
     */
    app.get("/api/admin/firewall/stats", async (req, res) => {
        if (!await isAdmin(req)) return res.status(403).json({ status: "error", message: "forbidden" });
        
        const logs = await fwAdmin.getLogs(db, 500);
        const blacklist = await fwAdmin.getBlacklist(db);
        const whitelist = await fwAdmin.getWhitelist(db);
        
        const stats = {
            totalBlocked: logs.filter(l => ['BLACKLISTED_IP', 'VPN_DETECTED', 'TOR_DETECTED', 'ALT_DETECTED', 'ABUSE_DETECTED', 'GEO_BLOCKED', 'BANNED_USER'].includes(l.type)).length,
            vpnBlocks: logs.filter(l => l.type === 'VPN_DETECTED').length,
            altBlocks: logs.filter(l => l.type === 'ALT_DETECTED').length,
            torBlocks: logs.filter(l => l.type === 'TOR_DETECTED').length,
            geoBlocks: logs.filter(l => l.type === 'GEO_BLOCKED').length,
            ipBlacklist: blacklist.length,
            ipWhitelist: whitelist.length,
            recentEvents: logs.slice(0, 10)
        };
        
        res.json({ status: "success", stats });
    });
};
