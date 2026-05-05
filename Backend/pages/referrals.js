"use strict";

/**
 * Referrals Page
 * Shows referral stats and link
 */

const indexjs = require("../../index.js");
const ejs = require("ejs");
const {
    getOrCreateReferralCode,
    getReferralStats,
    getReferralLink
} = require('../../functions/referrals.js');

module.exports.load = async function (app, db) {

    /**
     * Referrals page
     */
    app.get("/referrals", async (req, res) => {
        if (!req.session.userinfo && !req.session.pending2faUser) {
            return res.redirect("/login");
        }

        const userId = req.session.userinfo?.id || req.session.pending2faUser;

        let theme = indexjs.get(req);
        let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));

        if (newsettings.api.client.oauth2.link.slice(-1) == "/")
            newsettings.api.client.oauth2.link = newsettings.api.client.oauth2.link.slice(0, -1);

        const code = await getOrCreateReferralCode(db, userId);
        const stats = await getReferralStats(db, userId);
        const referralLink = await getReferralLink(db, userId, newsettings.api.client.oauth2.link);

        let pagePath = theme.settings.pages.referrals || theme.settings.pages.notfound;

        ejs.renderFile(
            `./Public/Themes/${theme.name}/${pagePath}`,
            await indexjs.renderData(req, db, theme, {
                referralCode: code,
                referralLink: referralLink,
                referralStats: stats
            }),
            null,
            function (err, str) {
                if (err) {
                    // Fallback HTML
                    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Referrals - Feliactyl</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a2e;
            min-height: 100vh;
            padding: 2rem;
            color: #fff;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            background: #16213e;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 1rem;
            text-align: center;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
        }
        .stat-card {
            background: #16213e;
            padding: 1.5rem;
            border-radius: 12px;
            text-align: center;
        }
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #e94560;
        }
        .stat-label {
            color: #a0a0a0;
            margin-top: 0.5rem;
        }
        .referral-box {
            background: #16213e;
            padding: 1.5rem;
            border-radius: 12px;
            margin-bottom: 1rem;
        }
        .referral-link {
            background: #0f3460;
            padding: 1rem;
            border-radius: 6px;
            font-family: monospace;
            word-break: break-all;
            margin: 1rem 0;
        }
        .btn {
            padding: 0.75rem 1.5rem;
            background: #e94560;
            border: none;
            border-radius: 6px;
            color: #fff;
            cursor: pointer;
        }
        .btn-secondary { background: #0f3460; }
        table {
            width: 100%;
            background: #16213e;
            border-radius: 12px;
            overflow: hidden;
        }
        th, td {
            padding: 1rem;
            text-align: left;
        }
        th {
            background: #0f3460;
        }
        .status-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.875rem;
        }
        .status-rewarded {
            background: #2ed573;
            color: #1a1a2e;
        }
        .status-pending {
            background: #ffa502;
            color: #1a1a2e;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎁 Referral Program</h1>
            <p>Invite friends and earn ${stats.rewardPerReferral} coins per referral!</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total Referrals</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.rewarded}</div>
                <div class="stat-label">Rewarded</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.pending}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalEarned}</div>
                <div class="stat-label">Coins Earned</div>
            </div>
        </div>
        
        <div class="referral-box">
            <h3>Your Referral Link</h3>
            <div class="referral-link" id="ref-link">${referralLink}</div>
            <button class="btn" onclick="copyLink()">Copy Link</button>
        </div>
        
        <div class="referral-box">
            <h3>Referral Code</h3>
            <div class="referral-link">${code}</div>
        </div>
        
        ${stats.referrals.length > 0 ? `
        <h3 style="margin-bottom: 1rem;">Your Referrals</h3>
        <table>
            <tr>
                <th>User</th>
                <th>Date</th>
                <th>Status</th>
            </tr>
            ${stats.referrals.map(r => `
            <tr>
                <td>${r.userId}</td>
                <td>${new Date(r.date).toLocaleDateString()}</td>
                <td><span class="status-badge ${r.rewarded ? 'status-rewarded' : 'status-pending'}">${r.rewarded ? 'Rewarded' : 'Pending'}</span></td>
            </tr>
            `).join('')}
        </table>
        ` : '<p style="text-align: center; color: #a0a0a0;">No referrals yet. Share your link!</p>'}
        
        <div style="margin-top: 2rem; text-align: center;">
            <a href="/dashboard" style="color: #a0a0a0;">← Back to Dashboard</a>
        </div>
    </div>
    
    <script>
        function copyLink() {
            const link = document.getElementById('ref-link').textContent;
            navigator.clipboard.writeText(link).then(() => {
                alert('Link copied to clipboard!');
            });
        }
    </script>
</body>
</html>
                    `);
                } else {
                    res.send(str);
                }
            }
        );
    });

    /**
     * Capture referral code from URL
     */
    app.get("/register", async (req, res) => {
        if (req.query.ref) {
            // Store referral code in session for after OAuth
            req.session.referralCode = req.query.ref.toUpperCase();
        }
        // Continue to normal login/register
        res.redirect("/login");
    });
};
