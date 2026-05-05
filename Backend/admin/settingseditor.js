const fs = require("fs");

module.exports.load = async function (app, db) {

  app.get("/admin/settings", async (req, res) => {
    const indexjs = require("../../index.js");
    let theme = indexjs.get(req);
    if (!req.session.pterodactyl) return res.redirect("/?error=noauth");

    let cacheaccount = await fetch(
      `${JSON.parse(fs.readFileSync("./settings.json").toString()).pterodactyl.domain}/api/application/users/${await db.get("users-" + req.session.userinfo.id)}?include=servers`,
      { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${JSON.parse(fs.readFileSync("./settings.json").toString()).pterodactyl.key}` }, method: "GET" }
    );
    if (await cacheaccount.statusText === "Not Found") return res.send("User not found.");
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());
    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true) return res.redirect("/?error=notadmin");

    const settings = JSON.parse(fs.readFileSync("./settings.json").toString());
    res.render = undefined;
    const ejs = require("ejs");
    ejs.renderFile(
      `./Public/Themes/${theme.name}/Admin/Settings.ejs`,
      { ...(await indexjs.renderData(req, db, theme)), currentsettings: settings },
      null,
      (err, str) => {
        if (err) {
          console.error(err);
          return res.send("Failed to load settings page.");
        }
        res.send(str);
      }
    );
  });

  app.post("/admin/settings/save", async (req, res) => {
    const settings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (!req.session.pterodactyl) return res.json({ success: false, error: "Not logged in." });

    let cacheaccount = await fetch(
      `${settings.pterodactyl.domain}/api/application/users/${await db.get("users-" + req.session.userinfo.id)}?include=servers`,
      { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.pterodactyl.key}` }, method: "GET" }
    );
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());
    if (cacheaccountinfo.attributes.root_admin !== true) return res.json({ success: false, error: "Unauthorized." });

    const body = req.body;
    if (!body) return res.json({ success: false, error: "No data received." });

    try {
      // Patch only allowed top-level keys (never overwrite eggs/locations which are complex)
      const allowed = ["name", "icon", "defaulttheme", "website", "storelimits", "stripe", "linkvertise", "whitelist", "servercreation", "renewals", "logging", "antivpn"];
      for (const key of allowed) {
        if (body[key] !== undefined) settings[key] = body[key];
      }
      // Patch nested api settings selectively
      if (body.api) {
        if (body.api.client) {
          if (body.api.client.api) settings.api.client.api = { ...settings.api.client.api, ...body.api.client.api };
          if (body.api.client.passwordgenerator) settings.api.client.passwordgenerator = { ...settings.api.client.passwordgenerator, ...body.api.client.passwordgenerator };
          if (body.api.client.allow) settings.api.client.allow = { ...settings.api.client.allow, ...body.api.client.allow };
          if (body.api.client.oauth2) settings.api.client.oauth2 = { ...settings.api.client.oauth2, ...body.api.client.oauth2 };
          if (body.api.client.coins) settings.api.client.coins = { ...settings.api.client.coins, ...body.api.client.coins };
          if (body.api.client.packages && body.api.client.packages.list) settings.api.client.packages.list = body.api.client.packages.list;
          if (body.api.client.antivpn) settings.api.client.antivpn = { ...settings.api.client.antivpn, ...body.api.client.antivpn };
        }
        if (body.api.arcio) settings.api.arcio = { ...settings.api.arcio, ...body.api.arcio };
      }
      if (body.pterodactyl) settings.pterodactyl = { ...settings.pterodactyl, ...body.pterodactyl };

      fs.writeFileSync("./settings.json", JSON.stringify(settings, null, 2));
      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.json({ success: false, error: e.message });
    }
  });

  // Page render route
  app.get("/admin/users", async (req, res) => {
    const indexjs = require("../../index.js");
    let theme = indexjs.get(req);
    if (!req.session.pterodactyl) return res.redirect("/login");
    let cacheaccount = await fetch(
      `${JSON.parse(fs.readFileSync("./settings.json").toString()).pterodactyl.domain}/api/application/users/${await db.get("users-" + req.session.userinfo.id)}?include=servers`,
      { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${JSON.parse(fs.readFileSync("./settings.json").toString()).pterodactyl.key}` }, method: "GET" }
    );
    if (await cacheaccount.statusText === "Not Found") return res.send("User not found.");
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());
    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true) return res.redirect("/?error=notadmin");
    const ejs = require("ejs");
    ejs.renderFile(
      `./Public/Themes/${theme.name}/Admin/Users.ejs`,
      { ...(await indexjs.renderData(req, db, theme)) },
      null,
      (err, str) => {
        if (err) { console.error(err); return res.send("Failed to load users page."); }
        res.send(str);
      }
    );
  });

  // API data route
  app.get("/admin/usersdata", async (req, res) => {
    const settings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (!req.session.pterodactyl) return res.json({ error: "Not logged in." });
    let cacheaccount = await fetch(
      `${settings.pterodactyl.domain}/api/application/users/${await db.get("users-" + req.session.userinfo.id)}?include=servers`,
      { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.pterodactyl.key}` }, method: "GET" }
    );
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());
    if (cacheaccountinfo.attributes.root_admin !== true) return res.json({ error: "Unauthorized." });
    try {
      let page = 1, allUsers = [];
      while (true) {
        const r = await fetch(`${settings.pterodactyl.domain}/api/application/users?per_page=100&page=${page}`, {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.pterodactyl.key}` }
        });
        const data = JSON.parse(await r.text());
        if (!data.data) break;
        allUsers = allUsers.concat(data.data);
        if (!data.meta || !data.meta.pagination || page >= data.meta.pagination.total_pages) break;
        page++;
      }
      const users = await Promise.all(allUsers.map(async (u) => {
        const attr = u.attributes;
        // Primary: ptero-<pteroID> -> discordID (set on every login)
        let discordId = await db.get("ptero-" + attr.id) || null;
        const coins = discordId ? (await db.get("coins-" + discordId) || 0) : 0;
        const pkg = discordId ? (await db.get("package-" + discordId) || settings.api.client.packages.default) : settings.api.client.packages.default;
        const extra = discordId ? (await db.get("extra-" + discordId) || { ram: 0, disk: 0, cpu: 0, servers: 0 }) : { ram: 0, disk: 0, cpu: 0, servers: 0 };
        const userinfo = discordId ? (await db.get("userinfo-" + discordId) || null) : null;
        const basePlan = settings.api.client.packages.list[pkg] || settings.api.client.packages.list[settings.api.client.packages.default] || { ram: 0, disk: 0, cpu: 0, servers: 0 };
        const total = {
          ram: (basePlan.ram || 0) + (extra.ram || 0),
          disk: (basePlan.disk || 0) + (extra.disk || 0),
          cpu: (basePlan.cpu || 0) + (extra.cpu || 0),
          servers: (basePlan.servers || 0) + (extra.servers || 0)
        };
        return { id: attr.id, username: attr.username, email: attr.email, discordId, discordUsername: userinfo ? userinfo.username : null, coins, plan: pkg, extra: total, admin: attr.root_admin };
      }));
      res.json({ success: true, users });
    } catch (e) {
      res.json({ error: e.message });
    }
  });

  app.post("/admin/j4r/add", async (req, res) => {
    const settings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (!req.session.pterodactyl) return res.redirect("/login");
    let cacheaccount = await fetch(
      `${settings.pterodactyl.domain}/api/application/users/${await db.get("users-" + req.session.userinfo.id)}?include=servers`,
      { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.pterodactyl.key}` }, method: "GET" }
    );
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());
    if (cacheaccountinfo.attributes.root_admin !== true) return res.redirect("/admin?err=UNAUTHORIZED");

    const { name, invite, id, coins } = req.body;
    if (!name || !invite || !id || !coins) return res.redirect("/admin?err=MISSINGFIELDS");

    settings.api.client.j4r.ads.push({ name, invite, id, coins: parseInt(coins) });
    fs.writeFileSync("./settings.json", JSON.stringify(settings, null, 2));
    return res.redirect("/admin?err=none");
  });

  app.post("/admin/j4r/remove", async (req, res) => {
    const settings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (!req.session.pterodactyl) return res.redirect("/login");
    let cacheaccount = await fetch(
      `${settings.pterodactyl.domain}/api/application/users/${await db.get("users-" + req.session.userinfo.id)}?include=servers`,
      { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.pterodactyl.key}` }, method: "GET" }
    );
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());
    if (cacheaccountinfo.attributes.root_admin !== true) return res.redirect("/admin?err=UNAUTHORIZED");

    const { id } = req.body;
    if (!id) return res.redirect("/admin?err=MISSINGID");

    settings.api.client.j4r.ads = settings.api.client.j4r.ads.filter(a => a.id !== id);
    fs.writeFileSync("./settings.json", JSON.stringify(settings, null, 2));
    return res.redirect("/admin?err=none");
  });

  app.get("/admin/logs", async (req, res) => {
    const indexjs = require("../../index.js");
    let theme = indexjs.get(req);
    if (!req.session.pterodactyl) return res.redirect("/?error=noauth");
    let cacheaccount = await fetch(
      `${JSON.parse(fs.readFileSync("./settings.json").toString()).pterodactyl.domain}/api/application/users/${await db.get("users-" + req.session.userinfo.id)}?include=servers`,
      { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${JSON.parse(fs.readFileSync("./settings.json").toString()).pterodactyl.key}` }, method: "GET" }
    );
    if (cacheaccount.statusText === "Not Found") return res.send("User not found.");
    let cacheaccountinfo;
    try { cacheaccountinfo = JSON.parse(await cacheaccount.text()); } catch(e) { return res.send("Error loading page."); }
    if (!cacheaccountinfo.attributes || cacheaccountinfo.attributes.root_admin !== true) return res.redirect("/?error=notadmin");
    const ejs = require("ejs");
    ejs.renderFile(
      `./Public/Themes/${theme.name}/Admin/Logs.ejs`,
      { ...(await indexjs.renderData(req, db, theme)) },
      null,
      (err, str) => {
        if (err) { console.error(err); return res.send("Failed to load logs page."); }
        res.send(str);
      }
    );
  });

  app.get("/admin/logsdata", async (req, res) => {
    const settings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (!req.session.pterodactyl) return res.json({ error: "Not logged in." });
    let cacheaccount = await fetch(
      `${settings.pterodactyl.domain}/api/application/users/${await db.get("users-" + req.session.userinfo.id)}?include=servers`,
      { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.pterodactyl.key}` }, method: "GET" }
    );
    let cacheaccountinfo;
    try { cacheaccountinfo = JSON.parse(await cacheaccount.text()); } catch(e) { return res.json({ error: "Unauthorized." }); }
    if (!cacheaccountinfo.attributes || cacheaccountinfo.attributes.root_admin !== true) return res.json({ error: "Unauthorized." });
    const actionLogs   = await db.get("action-logs")   || [];
    const firewallLogs = await db.get("firewall-logs") || [];
    res.json({ success: true, actionLogs, firewallLogs });
  });

  app.post("/admin/setadmin", async (req, res) => {
    const settings = JSON.parse(fs.readFileSync("./settings.json").toString());
    if (!req.session.pterodactyl) return res.json({ success: false, error: "Not logged in." });

    try {
      const selfId = await db.get("users-" + req.session.userinfo.id);
      if (!selfId) return res.json({ success: false, error: "Session user not found." });

      const cacheaccount = await fetch(
        `${settings.pterodactyl.domain}/api/application/users/${selfId}?include=servers`,
        { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.pterodactyl.key}` }, method: "GET" }
      );
      const cacheText = await cacheaccount.text();
      if (!cacheaccount.ok) return res.json({ success: false, error: "Could not verify requester." });
      const cacheaccountinfo = JSON.parse(cacheText);
      if (!cacheaccountinfo.attributes || cacheaccountinfo.attributes.root_admin !== true)
        return res.json({ success: false, error: "Unauthorized." });

      const { pteroId, admin } = req.body;
      if (!pteroId) return res.json({ success: false, error: "Missing pteroId." });

      const userRes = await fetch(
        `${settings.pterodactyl.domain}/api/application/users/${pteroId}`,
        { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.pterodactyl.key}` }, method: "GET" }
      );
      if (!userRes.ok) return res.json({ success: false, error: "Target user not found." });
      const userData = JSON.parse(await userRes.text());
      if (!userData.attributes) return res.json({ success: false, error: "Target user not found." });

      const u = userData.attributes;
      const patchRes = await fetch(
        `${settings.pterodactyl.domain}/api/application/users/${pteroId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.pterodactyl.key}` },
          body: JSON.stringify({
            username: u.username,
            email: u.email,
            first_name: u.first_name,
            last_name: u.last_name,
            root_admin: admin === true || admin === "true"
          })
        }
      );
      if (!patchRes.ok) {
        const errText = await patchRes.text();
        return res.json({ success: false, error: "Pterodactyl patch failed: " + patchRes.status });
      }
      const patchData = JSON.parse(await patchRes.text());
      if (!patchData.attributes) return res.json({ success: false, error: "Pterodactyl patch returned no data." });
      return res.json({ success: true });
    } catch (e) {
      return res.json({ success: false, error: e.message });
    }
  });

  app.get("/admin/plans", async (req, res) => {
    const indexjs = require("../../index.js");
    let theme = indexjs.get(req);
    if (!req.session.pterodactyl) return res.redirect("/?error=noauth");

    let cacheaccount = await fetch(
      `${JSON.parse(fs.readFileSync("./settings.json").toString()).pterodactyl.domain}/api/application/users/${await db.get("users-" + req.session.userinfo.id)}?include=servers`,
      { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${JSON.parse(fs.readFileSync("./settings.json").toString()).pterodactyl.key}` }, method: "GET" }
    );
    if (await cacheaccount.statusText === "Not Found") return res.send("User not found.");
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());
    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true) return res.redirect("/?error=notadmin");

    res.render = undefined;
    const ejs = require("ejs");
    ejs.renderFile(
      `./Public/Themes/${theme.name}/Admin/Plans.ejs`,
      { ...(await indexjs.renderData(req, db, theme)) },
      null,
      (err, str) => {
        if (err) { console.error(err); return res.send("Failed to load plans page."); }
        res.send(str);
      }
    );
  });

};
