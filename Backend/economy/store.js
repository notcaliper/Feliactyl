const indexjs = require("../../index.js");
const adminjs = require("../admin/admin.js");
const settings = require("../../settings.json");
const fs = require("fs");
const ejs = require("ejs");
const log = require('../../functions/log.js');
const { purchaseResourceAtomically, purchasePlanAtomically, withIdempotency, generateTransactionId, waitForJob } = require('../../functions/atomic.js');
const { getManager } = require('../../services/serviceManager.js');

module.exports.load = async function (app, db) {
  let maxram = null;
  let maxcpu = null;
  let maxservers = null;
  let maxdisk = null;
  
  const serviceManager = getManager();
  const queueService = serviceManager.get('queue');

  app.post("/buyram", async (req, res) => {
    let newsettings = await enabledCheck(req, res);
    if (!newsettings) return;
    
    let amount = req.body.amount;
    if (!amount) return res.send("missing amount");
    
    amount = parseFloat(amount);
    if (isNaN(amount)) return res.send("amount is not a number");
    if (amount < 1 || amount > 10) return res.send("amount must be 1-10");
    
    let theme = indexjs.get(req);
    let failedcallback = theme.settings.redirect.failedpurchaseram ? theme.settings.redirect.failedpurchaseram : "/";
    
    // Check store limits first (before atomic operation)
    let ramcap = await db.get("ram-" + req.session.userinfo.id) || 0;
    if (ramcap + amount > settings.storelimits.ram) {
        return res.redirect(failedcallback + "?err=MAXRAMEXCEETED");
    }
    
    let per = newsettings.api.client.coins.store.ram.per * amount;
    let cost = newsettings.api.client.coins.store.ram.cost * amount;
    
    // Generate transaction ID for idempotency
    const txId = req.body.transactionId || generateTransactionId();
    
    // Execute atomic purchase via Queue if queue service is available, otherwise synchronously
    const result = await withIdempotency(db, txId, async () => {
        if (queueService) {
            const job = await queueService.queue('store.purchase').add({
                userId: req.session.userinfo.id,
                resourceType: 'ram',
                amount: amount,
                coinCost: cost,
                resourceValue: per
            }, { id: txId });
            
            const waitResult = await waitForJob(db, job.id);
            if (!waitResult.success) {
                return { success: false, error: waitResult.error };
            }
            return { success: true };
        } else {
            return await purchaseResourceAtomically(db, req.session.userinfo.id, {
                coinCost: cost,
                resourceType: 'ram',
                amount: amount,
                resourceValue: per
            });
        }
    });
    
    if (result.cached) {
        // Duplicate request - already processed
        return res.redirect((theme.settings.redirect.purchaseram || "/") + "?err=none");
    }
    
    if (!result.result.success) {
        return res.redirect(failedcallback + "?err=CANNOTAFFORD");
    }
    
    // Apply suspension check
    adminjs.suspend(req.session.userinfo.id);
    
    log(`Resources Purchased`, `${req.session.userinfo.username}#${req.session.userinfo.discriminator} bought ${per}MB ram from the store for \`${cost}\` coins.`);
    
    res.redirect((theme.settings.redirect.purchaseram || "/") + "?err=none");
  });

  app.post("/buydisk", async (req, res) => {
    let newsettings = await enabledCheck(req, res);
    if (!newsettings) return;
    
    let amount = req.body.amount;
    if (!amount) return res.send("missing amount");
    
    amount = parseFloat(amount);
    if (isNaN(amount)) return res.send("amount is not a number");
    if (amount < 1 || amount > 10) return res.send("amount must be 1-10");
    
    let theme = indexjs.get(req);
    let failedcallback = theme.settings.redirect.failedpurchasedisk ? theme.settings.redirect.failedpurchasedisk : "/";
    
    let diskcap = await db.get("disk-" + req.session.userinfo.id) || 0;
    if (diskcap + amount > settings.storelimits.disk) {
        return res.redirect(failedcallback + "?err=MAXDISKEXCEETED");
    }
    
    let per = newsettings.api.client.coins.store.disk.per * amount;
    let cost = newsettings.api.client.coins.store.disk.cost * amount;
    
    const txId = req.body.transactionId || generateTransactionId();
    
    const result = await withIdempotency(db, txId, async () => {
        if (queueService) {
            const job = await queueService.queue('store.purchase').add({
                userId: req.session.userinfo.id,
                resourceType: 'disk',
                amount: amount,
                coinCost: cost,
                resourceValue: per
            }, { id: txId });
            
            const waitResult = await waitForJob(db, job.id);
            if (!waitResult.success) {
                return { success: false, error: waitResult.error };
            }
            return { success: true };
        } else {
            return await purchaseResourceAtomically(db, req.session.userinfo.id, {
                coinCost: cost,
                resourceType: 'disk',
                amount: amount,
                resourceValue: per
            });
        }
    });
    
    if (result.cached) {
        return res.redirect((theme.settings.redirect.purchasedisk || "/") + "?err=none");
    }
    
    if (!result.result.success) {
        return res.redirect(failedcallback + "?err=CANNOTAFFORD");
    }
    
    adminjs.suspend(req.session.userinfo.id);
    
    log(`Resources Purchased`, `${req.session.userinfo.username}#${req.session.userinfo.discriminator} bought ${per}MB disk from the store for \`${cost}\` coins.`);
    
    res.redirect((theme.settings.redirect.purchasedisk || "/") + "?err=none");
  });

  app.post("/buycpu", async (req, res) => {
    let newsettings = await enabledCheck(req, res);
    if (!newsettings) return;
    
    let amount = req.body.amount;
    if (!amount) return res.send("missing amount");
    
    amount = parseFloat(amount);
    if (isNaN(amount)) return res.send("amount is not a number");
    if (amount < 1 || amount > 10) return res.send("amount must be 1-10");
    
    let theme = indexjs.get(req);
    let failedcallback = theme.settings.redirect.failedpurchasecpu ? theme.settings.redirect.failedpurchasecpu : "/";
    
    let cpucap = await db.get("cpu-" + req.session.userinfo.id) || 0;
    if (cpucap + amount > settings.storelimits.cpu) {
        return res.redirect(failedcallback + "?err=MAXCPUEXCEETED");
    }
    
    let per = newsettings.api.client.coins.store.cpu.per * amount;
    let cost = newsettings.api.client.coins.store.cpu.cost * amount;
    
    const txId = req.body.transactionId || generateTransactionId();
    
    const result = await withIdempotency(db, txId, async () => {
        if (queueService) {
            const job = await queueService.queue('store.purchase').add({
                userId: req.session.userinfo.id,
                resourceType: 'cpu',
                amount: amount,
                coinCost: cost,
                resourceValue: per
            }, { id: txId });
            
            const waitResult = await waitForJob(db, job.id);
            if (!waitResult.success) {
                return { success: false, error: waitResult.error };
            }
            return { success: true };
        } else {
            return await purchaseResourceAtomically(db, req.session.userinfo.id, {
                coinCost: cost,
                resourceType: 'cpu',
                amount: amount,
                resourceValue: per
            });
        }
    });
    
    if (result.cached) {
        return res.redirect((theme.settings.redirect.purchasecpu || "/") + "?err=none");
    }
    
    if (!result.result.success) {
        return res.redirect(failedcallback + "?err=CANNOTAFFORD");
    }
    
    adminjs.suspend(req.session.userinfo.id);
    
    log(`Resources Purchased`, `${req.session.userinfo.username}#${req.session.userinfo.discriminator} bought ${per}% CPU from the store for \`${cost}\` coins.`);
    
    res.redirect((theme.settings.redirect.purchasecpu || "/") + "?err=none");
  });

  app.post("/buyservers", async (req, res) => {
    let newsettings = await enabledCheck(req, res);
    if (!newsettings) return;
    
    let amount = req.body.amount;
    if (!amount) return res.send("missing amount");
    
    amount = parseFloat(amount);
    if (isNaN(amount)) return res.send("amount is not a number");
    if (amount < 1 || amount > 10) return res.send("amount must be 1-10");
    
    let theme = indexjs.get(req);
    let failedcallback = theme.settings.redirect.failedpurchaseservers ? theme.settings.redirect.failedpurchaseservers : "/";
    
    let serverscap = await db.get("servers-" + req.session.userinfo.id) || 0;
    if (serverscap + amount > settings.storelimits.servers) {
        return res.redirect(failedcallback + "?err=MAXSERVERSEXCEETED");
    }
    
    let per = newsettings.api.client.coins.store.servers.per * amount;
    let cost = newsettings.api.client.coins.store.servers.cost * amount;
    
    const txId = req.body.transactionId || generateTransactionId();
    
    const result = await withIdempotency(db, txId, async () => {
        if (queueService) {
            const job = await queueService.queue('store.purchase').add({
                userId: req.session.userinfo.id,
                resourceType: 'servers',
                amount: amount,
                coinCost: cost,
                resourceValue: per
            }, { id: txId });
            
            const waitResult = await waitForJob(db, job.id);
            if (!waitResult.success) {
                return { success: false, error: waitResult.error };
            }
            return { success: true };
        } else {
            return await purchaseResourceAtomically(db, req.session.userinfo.id, {
                coinCost: cost,
                resourceType: 'servers',
                amount: amount,
                resourceValue: per
            });
        }
    });
    
    if (result.cached) {
        return res.redirect((theme.settings.redirect.purchaseservers || "/") + "?err=none");
    }
    
    if (!result.result.success) {
        return res.redirect(failedcallback + "?err=CANNOTAFFORD");
    }
    
    adminjs.suspend(req.session.userinfo.id);
    
    log(`Resources Purchased`, `${req.session.userinfo.username}#${req.session.userinfo.discriminator} bought ${per} Slots from the store for \`${cost}\` coins.`);
    
    res.redirect((theme.settings.redirect.purchaseservers || "/") + "?err=none");
  });

  app.post("/buyplan", async (req, res) => {
    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (!req.session.userinfo || !req.session.pterodactyl) return res.redirect("/login");
    let theme = indexjs.get(req);
    let failredirect = "/store?err=";
    
    const planName = req.body.plan;
    if (!planName) return res.redirect(failredirect + "MISSINGPLAN");
    
    const planList = newsettings.api.client.packages.list;
    if (!planList[planName]) return res.redirect(failredirect + "INVALIDPLAN");
    
    const currentPlan = await db.get("package-" + req.session.userinfo.id) || newsettings.api.client.packages.default;
    if (currentPlan === planName) return res.redirect(failredirect + "ALREADYONPLAN");
    
    let planCost = planList[planName].cost || 0;
    const discounts = newsettings.api.client.packages.discounts || {};
    const disc = discounts[planName];
    if (disc) {
        const expired = disc.expiresAt && disc.expiresAt < Date.now();
        if (!expired) planCost = Math.round(planCost * (1 - disc.pct / 100));
    }
    
    const txId = req.body.transactionId || generateTransactionId();
    
    const result = await withIdempotency(db, txId, async () => {
        if (queueService) {
            const job = await queueService.queue('plan.purchase').add({
                userId: req.session.userinfo.id,
                planName: planName,
                planCost: planCost
            }, { id: txId });
            
            const waitResult = await waitForJob(db, job.id);
            if (!waitResult.success) {
                return { success: false, error: waitResult.error };
            }
            return { success: true };
        } else {
            return await purchasePlanAtomically(db, req.session.userinfo.id, planName, planCost);
        }
    });
    
    if (result.cached) {
        return res.redirect("/store?err=none");
    }
    
    if (!result.result.success) {
        return res.redirect(failredirect + "NOTENOUGHCOINS");
    }
    
    adminjs.suspend(req.session.userinfo.id);
    log("plan purchase", `${req.session.userinfo.username} upgraded to plan \`${planName}\` for \`${planCost}\` coins.`);
    res.redirect("/store?err=none");
  });

  async function enabledCheck(req, res) {
    let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (newsettings.api.client.coins.store.enabled == true) return newsettings;
    let theme = indexjs.get(req);
    ejs.renderFile(
      `./Public/Themes/${theme.name}/${theme.settings.notfound}`,
      await indexjs.renderData(req, db, theme),

      null,
      function (err, str) {
        delete req.session.newaccount;
        if (err) {
          console.log(`Warning: An error occured while loading route ${req._parsedUrl.pathname}:`);
          console.log(err);
          return res.send("Failed to load page. The error has been logged to the console.");
        };
        res.status(200);
        res.send(str);
      });
    return null;
  }
}
