const settings = require('../settings.json')
const fetch = require('node-fetch')

/**
 * Log an action to Discord
 * @param {string} action 
 * @param {string} message 
 */
module.exports = (action, message, db) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\x1b[35m[${timestamp}]\x1b[0m \x1b[36m[${action}]\x1b[0m ${message.replace(/`/g, '').replace(/\n/g, ' | ')}`);

    if (db) {
        db.get('action-logs').then(logs => {
            logs = logs || [];
            logs.unshift({ action, message: message.replace(/`/g, ''), timestamp: Date.now() });
            if (logs.length > 200) logs.splice(200);
            db.set('action-logs', logs);
        }).catch(() => {});
    }

    if (!settings.logging.status) return
    if (!settings.logging.actions.user[action] && !settings.logging.actions.admin[action]) return

    fetch(settings.logging.webhook, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            embeds: [
                {
                    color: hexToDecimal('#191c24'),
                    title: `Event: \`${action}\``,
                    description: message,
                    author: {
                        name: 'Logging'
                    },
                    thumbnail: {
                        url: 'https://cdn.discordapp.com/attachments/881207010417315861/949595064554913812/Copy_of_H_35.png'
                    }
                }
            ]
        })
    })
    .catch(() => {})
}

function hexToDecimal(hex) {
    return parseInt(hex.replace("#", ""), 16)
}