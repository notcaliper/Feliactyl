"use strict";

const log = require('../../functions/log');
const dbHelper = require('../../bot/src/database');

module.exports.load = async function (app, db) {
    // Make sure database helper has connected
    await dbHelper.initDatabase();

    /**
     * Handle multi-tenant bot account link code verification
     */
    app.get("/api/bot/link", async (req, res) => {
        // Redirect to login if session doesn't exist
        if (!req.session.pterodactyl || !req.session.userinfo) {
            const redirectPath = req.query.code ? `api/bot/link?code=${encodeURIComponent(req.query.code)}` : 'dashboard';
            return res.redirect(`/login?redirect=${redirectPath}`);
        }

        const code = req.query.code;
        if (!code) {
            return res.status(400).send('Missing verification code. Please initiate the link from Discord.');
        }

        try {
            // Find linking data from central MongoDB link code registry
            const dbKey = `bot-link-code-${code.toUpperCase()}`;
            const linkData = await dbHelper.guildConfig.get(dbKey);
            
            if (!linkData || !linkData.discordId || !linkData.guildId) {
                return res.status(400).send('Invalid or expired verification code. Please run /link again in Discord.');
            }

            const { discordId, guildId } = linkData;
            const pteroId = req.session.pterodactyl.id;
            const username = req.session.userinfo.username;
            const email = req.session.userinfo.email;

            // Link them in multi-tenant registry
            await dbHelper.userLink.createLink(guildId, discordId, pteroId, username, email);

            // Delete link code (one-time use)
            await dbHelper.guildConfig.delete(dbKey);

            log('bot_link', `Linked Discord account ${discordId} to panel account ${pteroId} on server ${guildId}`, db);

            // Render confirmation response
            res.send(`
                <html>
                <head>
                    <title>Successfully Linked!</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
                    <style>
                        body {
                            background: radial-gradient(circle at center, #1b1931 0%, #0d0b14 100%);
                            font-family: 'Outfit', sans-serif;
                            color: white;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                            margin: 0;
                        }
                        .container {
                            text-align: center;
                            padding: 3rem;
                            background: rgba(20, 16, 35, 0.6);
                            backdrop-filter: blur(16px);
                            border: 1px solid rgba(139, 92, 246, 0.2);
                            border-radius: 20px;
                            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                            max-width: 500px;
                        }
                        h1 {
                            font-size: 2.5rem;
                            margin-bottom: 1rem;
                            background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                        }
                        p {
                            color: #9ca3af;
                            font-size: 1.1rem;
                            margin-bottom: 2rem;
                        }
                        .btn {
                            display: inline-block;
                            padding: 0.8rem 2rem;
                            background: #7c3aed;
                            color: white;
                            text-decoration: none;
                            border-radius: 10px;
                            font-weight: 600;
                            transition: transform 0.2s, background-color 0.2s;
                        }
                        .btn:hover {
                            background: #6d28d9;
                            transform: translateY(-2px);
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
                        <h1>Account Linked!</h1>
                        <p>Successfully linked Discord user <strong>${username}</strong> to your hosting profile for server <strong>${guildId}</strong>.</p>
                        <a href="/settings" class="btn">Go to Dashboard</a>
                    </div>
                </body>
                </html>
            `);
        } catch (error) {
            console.error('[BotLink] Failed to link accounts:', error);
            res.status(500).send('An unexpected error occurred during account verification.');
        }
    });
};
