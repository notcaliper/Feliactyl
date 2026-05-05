"use strict";

/**
 * Referral System Routes
 * Handles referral codes, stats, and rewards
 */

const settings = require("../../settings.json");
const indexjs = require("../../index.js");
const fetch = require('node-fetch');
const ejs = require("ejs");
const {
    getOrCreateReferralCode,
    processReferral,
    checkFirstPurchaseReward,
    getReferralStats,
    getReferralLink,
    REFERRAL_REWARD
} = require('../../functions/referrals.js');
const log = require('../../functions/log.js');

module.exports.load = async function (app, db) {

    /**
     * Get user's referral code and stats
     */
    app.get("/referrals", async (req, res) => {
        if (!req.session.pterodactyl) return res.redirect("/login");

        let theme = indexjs.get(req);
        let failedcallback = theme.settings.redirect.failedreferrals || "/";

        let newsettings = JSON.parse(require("fs").readFileSync("./settings.json").toString());

        if (newsettings.api.client.oauth2.link.slice(-1) == "/")
            newsettings.api.client.oauth2.link = newsettings.api.client.oauth2.link.slice(0, -1);

        if (newsettings.pterodactyl.domain.slice(-1) == "/")
            newsettings.pterodactyl.domain = newsettings.pterodactyl.domain.slice(0, -1);

        const userId = req.session.userinfo.id;

        // Get or create referral code
        const code = await getOrCreateReferralCode(db, userId);
        const stats = await getReferralStats(db, userId);
        const referralLink = await getReferralLink(db, userId, newsettings.api.client.oauth2.link);

        // Render page
        ejs.renderFile(
            `./Public/Themes/${theme.name}/${theme.settings.pages.referrals || theme.settings.pages.notfound}`,
            await indexjs.renderData(req, db, theme, {
                referralCode: code,
                referralLink: referralLink,
                referralStats: stats
            }),
            null,
            function (err, str) {
                if (err) {
                    console.log(`[Referrals] Error rendering page:`, err);
                    return res.redirect(failedcallback + "?err=RENDER_ERROR");
                }
                res.send(str);
            }
        );
    });

    /**
     * API: Get referral stats
     */
    app.get("/api/referrals/stats", async (req, res) => {
        if (!req.session.userinfo) {
            return res.status(401).json({ status: "error", message: "not logged in" });
        }

        const stats = await getReferralStats(db, req.session.userinfo.id);
        
        res.json({
            status: "success",
            ...stats
        });
    });

    /**
     * API: Generate new referral code (if user wants to reset)
     */
    app.post("/api/referrals/reset", async (req, res) => {
        if (!req.session.userinfo) {
            return res.status(401).json({ status: "error", message: "not logged in" });
        }

        // Warning: This invalidates old referrals!
        // For now, just return the existing code
        const code = await getOrCreateReferralCode(db, req.session.userinfo.id);
        
        res.json({
            status: "success",
            code: code,
            message: "Your referral code is permanent and cannot be changed."
        });
    });

    /**
     * Admin: Get all referrals for a user
     */
    app.get("/api/admin/referrals/:userId", async (req, res) => {
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
        const stats = await getReferralStats(db, userId);

        res.json({
            status: "success",
            userId: userId,
            ...stats
        });
    });

    /**
     * Admin: Manually credit referral reward
     */
    app.post("/api/admin/referrals/reward", async (req, res) => {
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

        const { referrerId, amount } = req.body;
        
        if (!referrerId || !amount) {
            return res.status(400).json({ status: "error", message: "missing referrerId or amount" });
        }

        const { addCoinsAtomically } = require('../../functions/atomic.js');
        await addCoinsAtomically(db, referrerId, parseInt(amount), 'manual_referral_reward');

        log('manual referral reward', `Admin ${req.session.userinfo.username} gave ${amount} coins to ${referrerId} for referrals`);

        res.json({
            status: "success",
            message: `Credited ${amount} coins to user ${referrerId}`
        });
    });

    // Hook into purchase to check for referral rewards
    const originalCheck = global.checkFirstPurchaseReward;
    global.checkFirstPurchaseReward = async (db, userId) => {
        const result = await checkFirstPurchaseReward(db, userId);
        if (result) {
            log('referral reward processed', `User ${userId} first purchase - referrer ${result.referrerId} earned ${result.reward} coins`);
        }
        return result;
    };
};
