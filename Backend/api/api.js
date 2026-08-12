const indexjs = require("../../index.js");
const adminjs = require("../admin/admin.js");
const fs = require("fs");
const ejs = require("ejs");
const fetch = require('node-fetch');
const NodeCache = require("node-cache");
const Queue = require("../../Queue/Main.js");
const myCache = new NodeCache({ deleteOnExpire: true, stdTTL: 59 });
const log = require('../../functions/log.js');
const { 
    sanitizeInput, 
    isValidDiscordId, 
    validateCoins, 
    validateNumber,
    isValidAlphanumeric 
} = require('../../functions/security.js');
const { deductCoinsAtomically, addCoinsAtomically, giftCoinsAtomically, waitForJob } = require('../../functions/atomic.js');
const { getManager } = require('../../services/serviceManager.js');

module.exports.load = async function (app, db) {
  const serviceManager = getManager();
  const queueService = serviceManager.get('queue');

  app.get("/api", async (req, res) => {
    let settings = await check(req, res);
    if (!settings) {
      res.status(503).send({
        status: false,
        message: "The API is disabled. Please check your configuration.",
      });
      return;
    }
    res.send({
      status: true,
      message: "The API is enabled.",
    });
  });

  app.get("/api/userinfo", async (req, res) => {
    let settings = await check(req, res);
    if (!settings) return;

    // Validate ID parameter
    if (!req.query.id) {
        return res.status(400).json({ status: "error", message: "missing id parameter" });
    }
    
    // Validate Discord ID format
    if (!isValidDiscordId(req.query.id)) {
        return res.status(400).json({ status: "error", message: "invalid discord id format" });
    }

    const userExists = await db.get("users-" + req.query.id);
    if (!userExists) {
        return res.status(404).json({ status: "error", message: "user not found" });
    }

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());

    if (newsettings.api.client.oauth2.link.slice(-1) == "/")
      newsettings.api.client.oauth2.link = newsettings.api.client.oauth2.link.slice(0, -1);

    if (newsettings.api.client.oauth2.callbackpath.slice(0, 1) !== "/")
      newsettings.api.client.oauth2.callbackpath = "/" + newsettings.api.client.oauth2.callbackpath;

    if (newsettings.pterodactyl.domain.slice(-1) == "/")
      newsettings.pterodactyl.domain = newsettings.pterodactyl.domain.slice(0, -1);

    let packagename = await db.get("package-" + req.query.id);
    let package = newsettings.api.client.packages.list[packagename ? packagename : newsettings.api.client.packages.default];
    if (!package) package = {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0
    };
    package["name"] = packagename;

    let pterodactylid = await db.get("users-" + req.query.id);
    let userinforeq = await fetch(
      newsettings.pterodactyl.domain + "/api/application/users/" + pterodactylid + "?include=servers",
      {
        method: "get",
        headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${newsettings.pterodactyl.key}` }
      }
    );
    if (await userinforeq.statusText == "Not Found") {
      console.log("Warning: An error occured while fetching user info from the Panel");
      console.log("- Discord ID: " + req.query.id);
      console.log("- Pterodactyl Panel ID: " + pterodactylid);
      return res.send({ status: "could not find user on panel" });
    }
    let userinfo = await userinforeq.json();

    res.send({
      status: "success",
      package: package,
      extra: await db.get("extra-" + req.query.id) ? await db.get("extra-" + req.query.id) : {
        ram: 0,
        disk: 0,
        cpu: 0,
        servers: 0
      },
      userinfo: userinfo,
      coins: newsettings.api.client.coins.enabled == true ? (await db.get("coins-" + req.query.id) ? await db.get("coins-" + req.query.id) : 0) : null
    });
  });

  app.post("/api/setcoins", async (req, res) => {
    let settings = await check(req, res);
    if (!settings) return;
    
    // Validate request body structure
    if (typeof req.body !== "object" || req.body === null) {
        return res.status(400).json({ status: "error", message: "body must be an object" });
    }
    if (Array.isArray(req.body)) {
        return res.status(400).json({ status: "error", message: "body cannot be an array" });
    }
    
    // Validate and sanitize Discord ID
    let id = req.body.id;
    if (typeof id !== "string") {
        return res.status(400).json({ status: "error", message: "id must be a string" });
    }
    if (!isValidDiscordId(id)) {
        return res.status(400).json({ status: "error", message: "invalid discord id format" });
    }
    
    // Verify user exists
    const userExists = await db.get("users-" + id);
    if (!userExists) {
        return res.status(404).json({ status: "error", message: "user not found" });
    }
    
    // Validate coins amount
    let coins = req.body.coins;
    const coinValidation = validateCoins(coins);
    if (!coinValidation.valid) {
        return res.status(400).json({ status: "error", message: coinValidation.error });
    }
    
    // Apply change
    if (coinValidation.value === 0) {
        await db.delete("coins-" + id);
    } else {
        await db.set("coins-" + id, coinValidation.value);
    }
    
    // Audit log
    log('api_setcoins', `API set coins for user ${id} to ${coinValidation.value}`);
    
    res.json({ status: "success", id: id, coins: coinValidation.value });
  });

  app.post("/api/updateCoins", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");
    
    const userId = req.session.userinfo.id;
    
    // Check cache first
    let cached = myCache.get(`coins_${userId}`);
    if (cached === true) {
        let current = await db.get(`coins-${userId}`);
        return res.send({ coins: current || 0 });
    }
    
    myCache.set(`coins_${userId}`, true, 59);
    
    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    const coinsToAdd = newsettings.api.arcio["afk page"].coins || 2;
    
    // Use atomic operation
    const result = await addCoinsAtomically(db, userId, coinsToAdd, 'api_afk_claim');
    
    if (!result.success) {
        return res.status(400).send({ status: "error", message: result.error });
    }
    
    res.send({ coins: result.new });
  });

  app.post("/api/createcoupon", async (req, res) => {
    let settings = await check(req, res);
    if (!settings) return;

    // Validate request body
    if (typeof req.body !== "object" || req.body === null) {
        return res.status(400).json({ status: "error", message: "body must be an object" });
    }
    if (Array.isArray(req.body)) {
        return res.status(400).json({ status: "error", message: "body cannot be an array" });
    }

    // Generate or validate coupon code
    let code = req.body.code;
    if (typeof code === "string") {
        code = code.slice(0, 50); // Limit length
        if (!isValidAlphanumeric(code, 50)) {
            return res.status(400).json({ status: "error", message: "code contains invalid characters (alphanumeric only)" });
        }
    } else {
        code = Math.random().toString(36).substring(2, 15);
    }

    // Validate numeric values
    const coinValidation = validateNumber(req.body.coins || 0, 0, 999999999);
    const ramValidation = validateNumber(req.body.ram || 0, 0, 999999999);
    const diskValidation = validateNumber(req.body.disk || 0, 0, 999999999);
    const cpuValidation = validateNumber(req.body.cpu || 0, 0, 999999999);
    const serversValidation = validateNumber(req.body.servers || 0, 0, 999999999);

    if (!coinValidation.valid) return res.status(400).json({ status: "error", message: `coins: ${coinValidation.error}` });
    if (!ramValidation.valid) return res.status(400).json({ status: "error", message: `ram: ${ramValidation.error}` });
    if (!diskValidation.valid) return res.status(400).json({ status: "error", message: `disk: ${diskValidation.error}` });
    if (!cpuValidation.valid) return res.status(400).json({ status: "error", message: `cpu: ${cpuValidation.error}` });
    if (!serversValidation.valid) return res.status(400).json({ status: "error", message: `servers: ${serversValidation.error}` });

    // Must have at least one value
    if (coinValidation.value === 0 && ramValidation.value === 0 && diskValidation.value === 0 && 
        cpuValidation.value === 0 && serversValidation.value === 0) {
        return res.status(400).json({ status: "error", message: "coupon must have at least one non-zero value" });
    }

    await db.set("coupon-" + code, {
      coins: coinValidation.value,
      ram: ramValidation.value,
      disk: diskValidation.value,
      cpu: cpuValidation.value,
      servers: serversValidation.value
    });
    
    log('api_createcoupon', `API created coupon: ${code}`);

    return res.json({ status: "success", code: code });
  });

  app.post("/api/revokecoupon", async (req, res) => {
    let settings = await check(req, res);
    if (!settings) return;

    // Validate request
    if (typeof req.body !== "object" || req.body === null) {
        return res.status(400).json({ status: "error", message: "body must be an object" });
    }
    if (Array.isArray(req.body)) {
        return res.status(400).json({ status: "error", message: "body cannot be an array" });
    }

    let code = req.body.code;
    if (typeof code !== "string" || code.length === 0) {
        return res.status(400).json({ status: "error", message: "missing code" });
    }

    if (!isValidAlphanumeric(code, 50)) {
        return res.status(400).json({ status: "error", message: "invalid code format" });
    }

    const couponExists = await db.get("coupon-" + code);
    if (!couponExists) {
        return res.status(404).json({ status: "error", message: "coupon not found" });
    }

    await db.delete("coupon-" + code);
    log('api_revokecoupon', `API revoked coupon: ${code}`);

    res.json({ status: "success", code: code });
  });


  app.post("/api/setplan", async (req, res) => {
    let settings = await check(req, res);
    if (!settings) return;

    // Validate request
    if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ status: "error", message: "missing body" });
    }

    // Validate Discord ID
    if (typeof req.body.id !== "string") {
        return res.status(400).json({ status: "error", message: "missing id" });
    }
    if (!isValidDiscordId(req.body.id)) {
        return res.status(400).json({ status: "error", message: "invalid discord id format" });
    }

    // Verify user exists
    const userExists = await db.get("users-" + req.body.id);
    if (!userExists) {
        return res.status(404).json({ status: "error", message: "user not found" });
    }

    // Handle plan removal
    if (typeof req.body.package !== "string" || req.body.package.trim() === "") {
        await db.delete("package-" + req.body.id);
        adminjs.suspend(req.body.id);
        log('api_setplan', `API removed plan for user ${req.body.id}`);
        return res.json({ status: "success", action: "removed" });
    }
    
    // Validate package exists
    const packageName = sanitizeInput(req.body.package.trim());
    if (!settings.api.client.packages.list[packageName]) {
        return res.status(400).json({ status: "error", message: "invalid package" });
    }
    
    await db.set("package-" + req.body.id, packageName);
    adminjs.suspend(req.body.id);
    log('api_setplan', `API set plan for user ${req.body.id} to ${packageName}`);
    
    return res.json({ status: "success", id: req.body.id, package: packageName });
  });

  app.post("/api/setresources", async (req, res) => {
    let settings = await check(req, res);
    if (!settings) return;

    // Validate request
    if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ status: "error", message: "missing body" });
    }

    // Validate Discord ID
    if (typeof req.body.id !== "string") {
        return res.status(400).json({ status: "error", message: "missing id" });
    }
    if (!isValidDiscordId(req.body.id)) {
        return res.status(400).json({ status: "error", message: "invalid discord id format" });
    }

    // Verify user exists
    const userExists = await db.get("users-" + req.body.id);
    if (!userExists) {
        return res.status(404).json({ status: "error", message: "user not found" });
    }

    // Must have at least one resource specified
    const hasRam = typeof req.body.ram === "number";
    const hasDisk = typeof req.body.disk === "number";
    const hasCpu = typeof req.body.cpu === "number";
    const hasServers = typeof req.body.servers === "number";
    
    if (!hasRam && !hasDisk && !hasCpu && !hasServers) {
        return res.status(400).json({ status: "error", message: "at least one resource (ram/disk/cpu/servers) must be specified" });
    }

    // Get current extras
    let currentextra = await db.get("extra-" + req.body.id);
    let extra = typeof currentextra === "object" ? currentextra : { ram: 0, disk: 0, cpu: 0, servers: 0 };

    // Validate and update each resource
    if (hasRam) {
        const validation = validateNumber(req.body.ram, 0, 999999999);
        if (!validation.valid) return res.status(400).json({ status: "error", message: `ram: ${validation.error}` });
        extra.ram = validation.value;
    }

    if (hasDisk) {
        const validation = validateNumber(req.body.disk, 0, 999999999);
        if (!validation.valid) return res.status(400).json({ status: "error", message: `disk: ${validation.error}` });
        extra.disk = validation.value;
    }

    if (hasCpu) {
        const validation = validateNumber(req.body.cpu, 0, 999999999);
        if (!validation.valid) return res.status(400).json({ status: "error", message: `cpu: ${validation.error}` });
        extra.cpu = validation.value;
    }

    if (hasServers) {
        const validation = validateNumber(req.body.servers, 0, 999999999);
        if (!validation.valid) return res.status(400).json({ status: "error", message: `servers: ${validation.error}` });
        extra.servers = validation.value;
    }

    // Save or delete if all zeros
    if (extra.ram === 0 && extra.disk === 0 && extra.cpu === 0 && extra.servers === 0) {
        await db.delete("extra-" + req.body.id);
    } else {
        await db.set("extra-" + req.body.id, extra);
    }

    adminjs.suspend(req.body.id);
    log('api_setresources', `API set resources for user ${req.body.id}`);
    
    return res.json({ status: "success", id: req.body.id, resources: extra });
  });

  app.post("/giftcoins", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect(`/`);

    const coins = parseInt(req.body.coins);
    if (!coins || !req.body.id) return res.redirect(`/gift?err=MISSINGFIELDS`);
    if (req.body.id === req.session.userinfo.id) return res.redirect(`/gift?err=CANNOTGIFTYOURSELF`);
    if (coins < 1) return res.redirect(`/gift?err=TOOLOWCOINS`);
    if (coins > 999999999) return res.redirect(`/gift?err=TOOMANYCOINS`);
    
    // Validate recipient ID format
    if (!isValidDiscordId(req.body.id)) return res.redirect(`/gift?err=INVALIDID`);

    // Use atomic gift operation (or Queue if queue service is available)
    let result;
    if (queueService) {
        const job = await queueService.queue('coins.gift').add({
            fromUserId: req.session.userinfo.id,
            toUserId: req.body.id,
            amount: coins
        });
        
        result = await waitForJob(db, job.id);
    } else {
        result = await giftCoinsAtomically(db, req.session.userinfo.id, req.body.id, coins);
    }
    
    if (!result.success) {
        if (result.error === 'Insufficient coins') return res.redirect(`/gift?err=CANTAFFORD`);
        if (result.error === 'Receiver not found') return res.redirect(`/gift?err=USERDOESNTEXIST`);
        return res.redirect(`/gift?err=UNKNOWN`);
    }

    log('gifted coins', `${req.session.userinfo.username}#${req.session.userinfo.discriminator} sent ${coins} Coins to the user with the ID \`${req.body.id}\`.`);
    return res.redirect(`/gift?success=true`);
  });

  app.post("/giftres", async (req, res) => {
    if (!req.session.pterodactyl) return res.send("Not logged in.");
    if (req.body.ram && req.body.ram.includes("-")) return res.send("Invalid number.");
    if (req.body.ram && req.body.ram.includes("+")) return res.send("Invalid number.");
    let theme = indexjs.get(req);
    if (!settings.api.client.allow.giftressources) return res.redirect(theme.settings.redirect.giftresources);

    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    let failredirect = theme.settings.redirect.failedgiftresources ? theme.settings.redirect.failedgiftresources : "/";
    let successredirect = theme.settings.redirect.giftresources ? theme.settings.redirect.giftresources : "/";
    let usr1 = await db.get("extra-" + req.session.userinfo.id)
    let usr2 = await db.get("extra-" + req.body.id)
    let usr3 = await db.get("users-" + req.body.id)
    if (!req.body.id) return res.redirect(`${failredirect}?err=MISSINGID`);
    if (!usr3) return res.redirect(`${failredirect}?err=INVALIDID`);
    if (req.body.ram || req.body.disk || req.body.cpu || req.body.servers) {
      let ramstring = req.body.ram;
      let diskstring = req.body.disk;
      let cpustring = req.body.cpu;
      let serversstring = req.body.servers;

      let extra1;
      if (typeof usr1 == "object") {
        extra1 = usr1;
      } else {
        extra1 = {
          ram: 0,
          disk: 0,
          cpu: 0,
          servers: 0
        }
      }

      let extra2;
      if (typeof usr2 == "object") {
        extra2 = usr2;
      } else {
        extra2 = {
          ram: 0,
          disk: 0,
          cpu: 0,
          servers: 0
        }
      }
      if (ramstring) {
        let ram = parseFloat(ramstring);
        if (ram < 100 || ram > 999999999999999) {
          return res.redirect(`${failredirect}?err=RAMSIZE`);
        }
        if (ramstring > extra1.ram) {
          return res.redirect(`${failredirect}?err=TOMUCHRAM`);
        }
        extra1.ram = extra1.ram - ram
        extra2.ram = extra2.ram + ram
      }

      if (diskstring) {
        let disk = parseFloat(diskstring);
        if (disk < 100 || disk > 999999999999999) {
          return res.redirect(`${failredirect}?err=DISKSIZE`);
        }
        if (diskstring > extra1.disk) {
          return res.redirect(`${failredirect}?err=TOMUCHDISK`);
        }
        extra1.disk = extra1.disk - disk
        extra2.disk = extra2.disk + disk
      }

      if (cpustring) {
        let cpu = parseFloat(cpustring);
        if (cpu < 10 || cpu > 999999999999999) {
          return res.redirect(`${failredirect}?err=CPUSIZE`);
        }
        if (cpustring > extra1.cpu) {
          return res.redirect(`${failredirect}?err=TOMUCHCPU`);
        }
        extra1.cpu = extra1.cpu - cpu
        extra2.cpu = extra2.cpu + cpu
      }

      if (serversstring) {
        let servers = parseFloat(serversstring);
        if (servers < 1 || servers > 999999999999999) {
          return res.redirect(`${failredirect}?err=SERVERSIZE`);
        }
        if (serversstring > extra1.servers) {
          return res.redirect(`${failredirect}?err=TOMUCHSERVERS`);
        }
        extra1.servers = extra1.servers - servers
        extra2.servers = extra2.servers + servers
      }

      db.set("extra-" + req.session.userinfo.id, extra1)
      db.set("extra-" + req.body.id, extra2)

      return res.redirect(`${successredirect}?err=none`);
    }
  });

  async function check(req, res) {
    // Load settings with secure config applied
    let fileSettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    const { applySecureConfig } = require('../../functions/envLoader.js');
    let settings = applySecureConfig(fileSettings);
    
    if (settings.api.client.api.enabled !== true) {
        res.status(503).json({
            status: "error",
            message: "API is disabled"
        });
        return null;
    }
    
    // Check authorization header
    let auth = req.headers['authorization'];
    if (!auth) {
        log('api_auth_fail', `API request denied: missing authorization header from ${req.ip}`);
        res.status(401).json({
            status: "error",
            message: "authorization required"
        });
        return null;
    }
    
    // Validate Bearer token format
    const expectedAuth = "Bearer " + settings.api.client.api.code;
    if (auth !== expectedAuth) {
        log('api_auth_fail', `API request denied: invalid authorization from ${req.ip}`);
        res.status(403).json({
            status: "error",
            message: "invalid authorization"
        });
        return null;
    }
    
    // Valid auth - log success for audit trail
    log('api_auth_success', `API request authorized from ${req.ip} to ${req.path}`);
    return settings;
  }
};
