const settings = require("../../settings.json");
const indexjs = require("../../index.js");
const ejs = require("ejs");
const chalk = require("chalk");
const { addCoinsAtomically } = require('../../functions/atomic.js');

let currentlyonpage = {};
let lastAwardTime = {}; // Track last award time per user for rate limiting

module.exports.load = async function (app, db) {
  app.get("/arcioerror", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");
    let theme = indexjs.get(req);
    res.redirect(theme.settings.redirect.arcioerror + (req.query.err ? ("?arcioerr=" + req.query.err) : ""));
  });

  app.ws("/" + settings.api.arcio["afk page"].path, async (ws, req) => {
    if (!req.session.arcsessiontoken) return ws.close();

    let token = req.headers["sec-websocket-protocol"];

    if (!token) return ws.close();
    if (typeof token !== "string") return ws.close();

    // Disabled Token Checking for now as it fails. Gonna look into it later.
    // if (token !== req.session.arcsessiontoken) return ws.close();

    let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
    if (newsettings.api.arcio.enabled !== true) return ws.close();
    if (newsettings.api.arcio["afk page"].enabled !== true) return ws.close();
    if (currentlyonpage[req.session.userinfo.id]) return ws.close();

    const userId = req.session.userinfo.id;
    currentlyonpage[userId] = true;
    lastAwardTime[userId] = 0;

    const intervalMs = newsettings.api.arcio["afk page"].every * 1000;
    const coinsPerInterval = newsettings.api.arcio["afk page"].coins;
    const maxBalance = 999999999999;

    let coinloop = setInterval(async () => {
        // Rate limit check - ensure minimum time between awards
        const now = Date.now();
        if (now - lastAwardTime[userId] < intervalMs * 0.9) {
            return; // Too soon, possible clock sync issue
        }
        
        // Atomic coin addition
        const result = await addCoinsAtomically(db, userId, coinsPerInterval, 'afk_reward');
        
        if (!result.success) {
            // Max balance reached or other error
            ws.close();
            return;
        }
        
        // Check if balance exceeded maximum
        if (result.new > maxBalance) {
            ws.close();
            return;
        }
        
        lastAwardTime[userId] = now;
    }, intervalMs);

    ws.onclose = async () => {
        clearInterval(coinloop);
        delete currentlyonpage[userId];
        delete lastAwardTime[userId];
    };
  });
};

