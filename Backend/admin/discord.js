"use strict";

const fs = require('fs');
const path = require('path');
const dbHelper = require('../../bot/src/database');
const indexjs = require('../../index');

module.exports.load = async function (app, db) {
    // Make sure database helper has connected
    await dbHelper.initDatabase();

    /**
     * Get settings page
     */
    app.get("/admin/discord", async (req, res) => {
        if (!req.session.pterodactyl) return res.redirect("/login");
        if (req.session.pterodactyl.root_admin !== true) return res.redirect("/");

        const theme = indexjs.get(req);
        const panelSettings = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'settings.json'), 'utf8'));
        
        // Resolve guild ID to query config
        const guildId = req.query.guildId || panelSettings.api?.client?.bot?.joinguild?.guildid?.[0] || '';
        
        let discordConfig = null;
        if (guildId) {
            discordConfig = await dbHelper.guildConfig.get(guildId);
        }

        const renderData = await indexjs.renderData(req, db, theme);
        renderData.discordConfig = discordConfig;
        
        res.render(`../../Public/Themes/${theme.name}/Admin/Discord.ejs`, renderData);
    });

    /**
     * Save Discord configurations
     */
    app.post("/admin/discord/save", async (req, res) => {
        if (!req.session.pterodactyl) return res.redirect("/login");
        if (req.session.pterodactyl.root_admin !== true) return res.redirect("/");

        const theme = indexjs.get(req);
        const guildId = req.body.guildId;

        if (!guildId) {
            return res.status(400).send('Guild ID is required.');
        }

        try {
            // Get existing config to preserve keys if unchanged
            const existing = await dbHelper.guildConfig.get(guildId) || {};

            let apiKey = req.body.apiKey;
            if (apiKey === 'EXISTS_SECRET_KEY') {
                apiKey = existing.apiKey || '';
            }

            let clientKey = req.body.clientKey;
            if (clientKey === 'EXISTS_SECRET_KEY') {
                clientKey = existing.clientKey || '';
            }

            const updatedConfig = {
                guildId,
                panelUrl: req.body.panelUrl || '',
                apiKey,
                clientKey,
                roles: {
                    admin: req.body.roleAdmin ? [req.body.roleAdmin] : [],
                    support: req.body.roleSupport ? [req.body.roleSupport] : [],
                    moderator: req.body.roleModerator ? [req.body.roleModerator] : []
                },
                channels: {
                    welcome: req.body.channelWelcome || '',
                    leave: req.body.channelLeave || '',
                    announcements: req.body.channelAnnouncements || '',
                    logs: req.body.channelLogs || ''
                },
                ticketCategory: req.body.ticketCategory || '',
                features: {
                    tickets: req.body.featureTickets === 'on',
                    automod: req.body.featureAutomod === 'on',
                    economy: req.body.featureEconomy === 'on',
                    ai: req.body.featureAi === 'on'
                }
            };

            await dbHelper.guildConfig.set(guildId, updatedConfig);
            
            res.redirect('/admin/discord?err=SUCCESS&guildId=' + guildId);
        } catch (error) {
            console.error('[DiscordAdmin] Failed to save configurations:', error);
            res.status(500).send('Failed to save settings: ' + error.message);
        }
    });

    /**
     * Send test notification
     */
    app.post("/admin/discord/test", async (req, res) => {
        if (!req.session.pterodactyl) return res.redirect("/login");
        if (req.session.pterodactyl.root_admin !== true) return res.redirect("/");

        const guildId = req.body.guildId;
        if (!guildId) return res.status(400).send('Missing Guild ID');

        try {
            const guildSettings = await dbHelper.guildConfig.get(guildId);
            if (!guildSettings || !guildSettings.channels?.announcements) {
                return res.status(400).send('Guild configuration or announcement channel is not set.');
            }

            // Resolve bot client and send test message
            const discordBot = require('../../bot/src/index');
            const client = discordBot.client || null; 

            // Find client via dynamic cache or global references
            const targetClient = client || (global.client); // Check if exported or registered globally
            if (!targetClient) {
                return res.status(500).send('Discord bot is not currently running.');
            }

            const guildObj = targetClient.guilds.cache.get(guildId);
            if (!guildObj) {
                return res.status(404).send('Bot is not joined to this Guild ID.');
            }

            const channel = guildObj.channels.cache.get(guildSettings.channels.announcements);
            if (!channel) {
                return res.status(404).send('Announcement channel not found.');
            }

            const embedBuilder = require('../utils/embeds');
            const testEmbed = embedBuilder.success(
                '🧪 Connection Test Succeeded',
                'This is a test notification triggered from the Feliactyl Admin Dashboard! All configurations are operational.'
            );
            
            await channel.send({ embeds: [testEmbed] });
            res.redirect('/admin/discord?err=SUCCESS&guildId=' + guildId);
        } catch (error) {
            console.error('[DiscordAdmin] Test notification failed:', error);
            res.status(500).send('Failed to send test: ' + error.message);
        }
    });
};
