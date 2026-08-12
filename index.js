//
// Feliactyl 1.0.0, fork of Heliactyl 13.3
// 
//  * Copyright notcaliper
//  * Please read the "License" file
//

"use strict";

// Load environment variables first
const { init: initEnv, applySecureConfig, checkPlaceholderSecrets } = require('./functions/envLoader.js');
const envStatus = initEnv();

// Load packages.

const fs = require("fs");
const fetch = require('node-fetch');
const chalk = require("chalk");
const os = require('os');
const gradient = require('gradient-string');
const arciotext = require('./System/arciotext')
const glob = require('fast-glob');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getManager } = require('./services/serviceManager.js');
const WorkerManager = require('./services/workerManager.js');
const HealthService = require('./services/healthService.js');
global.Buffer = global.Buffer;

// Service instances
const serviceManager = getManager();
let workerManager = null;


if (typeof btoa === 'undefined') {
  global.btoa = function (str) {
    return Buffer.from(str, 'binary').toString('base64');
  };
}
if (typeof atob === 'undefined') {
  global.atob = function (b64Encoded) {
    return Buffer.from(b64Encoded, 'base64').toString('binary');
  };
}

// Load settings.

let settings = require("./settings.json");

// Apply secure configuration from environment variables
settings = applySecureConfig(settings);

// Check for placeholder secrets
const secretWarnings = checkPlaceholderSecrets(settings);
if (secretWarnings.length > 0) {
  console.log(chalk.yellow("⚠️  Security Warnings:"));
  secretWarnings.forEach(w => console.log(chalk.yellow(`   - ${w}`)));
  console.log(chalk.yellow("   Set these in your .env file for better security.\n"));
}

const defaultthemesettings = {
  index: "Authentication/Login.ejs",
  notfound: "Errors/404.ejs",
  redirect: {},
  pages: {},
  mustbeloggedin: [],
  mustbeadmin: [],
  variables: {}
};

let _versionCache = { latest: null, fetchedAt: 0 };
async function getLatestVersion() {
  const now = Date.now();
  if (_versionCache.latest && now - _versionCache.fetchedAt < 3600000) return _versionCache.latest;
  try {
    const r = await fetch('https://api.github.com/repos/notcaliper/feliactyl/releases/latest');
    const j = await r.json();
    if (j && j.tag_name) {
      _versionCache = { latest: j.tag_name.replace('v', ''), fetchedAt: now };
      return _versionCache.latest;
    }
  } catch (e) { }
  return null;
}

async function renderData(req, db, theme) {
  try {
    const settings = JSON.parse(fs.readFileSync("./settings.json").toString());
    let renderdata = {
      req: req,
      settings: settings,
      userinfo: req.session.userinfo,
      packagename: req.session.userinfo ? await db.get("package-" + req.session.userinfo.id) || settings.api.client.packages.default : null,
      extraresources: !req.session.userinfo ? null : (await db.get("extra-" + req.session.userinfo.id) || { ram: 0, disk: 0, cpu: 0, servers: 0 }),
      packages: req.session.userinfo ? (settings.api.client.packages.list[await db.get("package-" + req.session.userinfo.id) || settings.api.client.packages.default] || settings.api.client.packages.list[settings.api.client.packages.default] || { ram: 0, disk: 0, cpu: 0, servers: 0 }) : null,
      coins: settings.api.client.coins.enabled == true ? (req.session.userinfo ? (await db.get("coins-" + req.session.userinfo.id) || 0) : null) : null,
      pterodactyl: req.session.pterodactyl,
      theme: theme.name,
      extra: theme.settings.variables,
      addons: theme.settings.addons,
      db: db,
      latestVersion: await getLatestVersion()
    };

    if (settings.api.arcio.enabled == true && req.session.arcsessiontoken) {
      let arcioafktext = `
        let token = "${req.session.arcsessiontoken}";
        let everywhat = ${settings.api.arcio["afk page"].every};
        let gaincoins = ${settings.api.arcio["afk page"].coins};
        let arciopath = "${settings.api.arcio["afk page"].path.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}";
        ${arciotext}`;

      renderdata.arcioafktext = arcioafktext;
    };

    return renderdata;
  } catch (error) {
    console.error('Error rendering data:', error);
    return null;
  }
}

module.exports.renderData = renderData;

// Load database

const Keyv = require("keyv");
const dbOptions = {};

if (typeof settings.database === 'string' && settings.database.startsWith('sqlite://')) {
  dbOptions.busyTimeout = 30000; // 30 seconds busy timeout to handle lock contention
}

const db = new Keyv(settings.database, dbOptions);

db.on('error', err => {
  console.log(chalk.red("Error: Cannot load database."))
});

// Enable WAL mode on SQLite database
if (typeof settings.database === 'string' && settings.database.startsWith('sqlite://')) {
  const store = db.opts.store || db.store;
  if (store && typeof store.query === 'function') {
    store.query('PRAGMA journal_mode=WAL;')
      .then(() => console.log('[Main] SQLite database configured in WAL mode'))
      .catch(err => console.error('[Main] Failed to set SQLite WAL mode:', err));
  }
}

module.exports.db = db;


// Load ExpressJS.

const express = require("express");
const app = express();
app.set('trust proxy', 1);
require('express-ws')(app);

// Load express addons.

const ejs = require("ejs");
const session = require("express-session");
const indexjs = require("./index.js");

// Load the website.

module.exports.app = app;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://challenges.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://challenges.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://challenges.cloudflare.com"],
      frameSrc: ["https://challenges.cloudflare.com"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const { createRateLimit } = require('./functions/security.js');
const generalLimiter = rateLimit(createRateLimit(15 * 60 * 1000, 500)); // 500 requests per 15 min
const apiLimiter = rateLimit(createRateLimit(60 * 1000, 200)); // 200 requests per minute
const authLimiter = rateLimit(createRateLimit(15 * 60 * 1000, 20)); // 20 auth attempts per 15 min

app.use(generalLimiter);
app.use('/api/', apiLimiter);
app.use(['/login', '/submitlogin', '/callback'], authLimiter);

app.use(session({
  secret: settings.website.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: envStatus.isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use("/assets", express.static("./assets"));

app.use(express.json({
  inflate: true,
  limit: '500kb',
  reviver: null,
  strict: true,
  type: 'application/json',
  verify: undefined
}));

app.use(express.urlencoded({ extended: true }));

// Initialize services before starting server
async function initializeServices() {
  console.log(chalk.cyan('[Main] Initializing services...'));

  // Initialize Queue Service
  const QueueService = require('./services/queueService.js');
  const queueService = new QueueService(db, {
    maxConcurrent: 5,
    retryAttempts: 3
  });
  serviceManager.register('queue', queueService);

  // Listen for queue events to broadcast new jobs to worker threads
  queueService.on('job:added', (job) => {
    if (workerManager) {
      workerManager.broadcast({
        type: 'job:added',
        jobId: job.id,
        queueName: job.queue
      });
    }
  });

  // Initialize worker manager if enabled
  if (settings.workers?.enabled !== false) {
    workerManager = new WorkerManager({
      maxWorkers: settings.workers?.count || 2,
      restartDelay: 5000,
      maxRestarts: 5
    });

    serviceManager.register('workers', workerManager);
    serviceManager.markCritical('workers');

    await workerManager.start();
    console.log(chalk.green('[Main] Worker manager started'));
  }

  // Health service
  const healthService = new HealthService({ checkInterval: 30000 });

  // Register health checks
  healthService.register('database', async () => {
    await db.get('health-check');
    return true;
  }, { weight: 2 });

  healthService.register('webserver', () => {
    return listener && listener.listening;
  }, { weight: 1 });

  if (workerManager) {
    healthService.register('workers', () => {
      const stats = workerManager.getStats();
      return stats.healthy > 0 || stats.total === 0;
    }, { weight: 2 });
  }

  healthService.on('statusChange', (newStatus, oldStatus, results) => {
    console.log(chalk.yellow(`[Health] Status changed: ${oldStatus} → ${newStatus}`));
    if (newStatus === 'unhealthy') {
      console.error(chalk.red('[Health] Unhealthy checks:'), results);
    }
  });

  healthService.start();
  serviceManager.register('health', healthService);

  // Register Discord Bot service if configured
  if (settings.api?.client?.bot?.token || process.env.DISCORD_BOT_TOKEN) {
    try {
      const discordBot = require('./bot/src/index.js');
      const botService = {
        initialize: async (dbInstance) => {
          await discordBot.initialize(dbInstance);
        },
        start: async () => {
          await discordBot.start();
        },
        shutdown: async () => {
          await discordBot.shutdown();
        }
      };
      serviceManager.register('discord-bot', botService);
      console.log(chalk.green('[Main] Discord bot service registered'));
    } catch (err) {
      console.error(chalk.red('[Main] Failed to register Discord bot service:'), err);
    }
  }

  // Initialize all services
  await serviceManager.initialize(db);
  await serviceManager.start();

  console.log(chalk.green('[Main] All services initialized'));
}

const listener = app.listen(settings.website.port, async function () {
  console.log(chalk.white("                                                                   "));
  console.log(chalk.white("                                                                   "));
  console.log(chalk.white("                                                                   "));
  console.log(chalk.white("                                                                   "));
  console.log(chalk.white("                                                                   "));
  console.log(chalk.white("                                                                   "));
  console.log(chalk.white("                                                                   "));
  console.log(chalk.white("                                                                   "));
  console.log(gradient.retro("███████╗███████╗██╗     ██╗  █████╗  ██████╗████████╗██╗   ██╗██╗     \r\n██╔════╝██╔════╝██║     ██║ ██╔══██╗██╔════╝╚══██╔══╝╚██╗ ██╔╝██║     \r\n█████╗  █████╗  ██║     ██║ ███████║██║        ██║    ╚████╔╝ ██║     \r\n██╔══╝  ██╔══╝  ██║     ██║ ██╔══██║██║        ██║     ╚██╔╝  ██║     \r\n██║     ███████╗███████╗██║ ██║  ██║╚██████╗   ██║      ██║   ███████╗\r\n╚═╝     ╚══════╝╚══════╝╚═╝ ╚═╝  ╚═╝ ╚═════╝   ╚═╝      ╚═╝   ╚══════╝"));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 Welcome to Feliactyl 1.0!🚀");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔧 Server Specifications:");
  console.log(`   - CPU: ${os.cpus()[0].model} (${os.cpus().length} Cores)`);
  console.log(`   - RAM: ${Math.round(os.totalmem() / (1024 ** 3))}GB`);
  console.log(`   - Disk: ${Math.round(os.totalmem() / (1024 ** 3))}GB`);
  console.log(`   - OS: ${os.type()} ${os.release()}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📝 Sidenote: If you ever encounter a 502 Bad Gateway error,");
  console.log("   remember it's likely a proxy issue, not Feliactyl itself.");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Initialize services after server starts
  try {
    await initializeServices();
  } catch (err) {
    console.error(chalk.red('[Main] Service initialization failed:'), err);
    // Don't crash - web server can still function
  }

});

var cache = false;
app.use(function (req, res, next) {
  let manager = (JSON.parse(fs.readFileSync("./settings.json").toString())).api.client.ratelimits;
  if (manager[req._parsedUrl.pathname]) {
    if (cache == true) {
      setTimeout(async () => {
        let allqueries = Object.entries(req.query);
        let querystring = "";
        for (let query of allqueries) {
          querystring = querystring + "&" + query[0] + "=" + query[1];
        }
        querystring = "?" + querystring.slice(1);
        res.redirect((req._parsedUrl.pathname.slice(0, 1) == "/" ? req._parsedUrl.pathname : "/" + req._parsedUrl.pathname) + querystring);
      }, 1000);
      return;
    } else {
      cache = true;
      setTimeout(async () => {
        cache = false;
      }, 1000 * manager[req._parsedUrl.pathname]);
    }
  };
  next();
});

// Load the API files.

const router = glob.sync('./Backend/**/*.js');
for (const file of router) {
  const router = require(file);
  if (typeof router.load === 'function') router.load(app, db);
}

// Health check endpoints
app.get('/health', async (req, res) => {
  const health = serviceManager.get('health');
  if (health) {
    const status = health.getStatus();
    res.status(status.status === 'healthy' ? 200 : status.status === 'degraded' ? 200 : 503).json(status);
  } else {
    res.json({ status: 'starting', uptime: Date.now() - startTime });
  }
});

app.get('/health/ready', async (req, res) => {
  const health = serviceManager.get('health');
  if (health && health.isReady()) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

app.get('/health/live', (req, res) => {
  res.status(200).json({ alive: true });
});

app.get('/health/workers', async (req, res) => {
  if (!workerManager) {
    return res.status(404).json({ error: 'Worker manager not enabled' });
  }
  res.json(workerManager.getStats());
});

// Track start time
const startTime = Date.now();

// Graceful shutdown handlers
async function gracefulShutdown(signal) {
  console.log(chalk.yellow(`[Main] Received ${signal}, starting graceful shutdown...`));

  // Stop accepting new connections
  listener.close(async () => {
    console.log(chalk.cyan('[Main] HTTP server closed'));

    // Shutdown services
    await serviceManager.shutdown(30000);

    console.log(chalk.green('[Main] Graceful shutdown complete'));
    process.exit(0);
  });

  // Force shutdown after timeout
  setTimeout(() => {
    console.error(chalk.red('[Main] Forced shutdown - timeout exceeded'));
    process.exit(1);
  }, 35000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error(chalk.red('[Main] Uncaught exception:'), err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('[Main] Unhandled rejection at:'), promise, 'reason:', reason);
});

app.get("/credentials", (req, res) => res.redirect("/settings"));

app.all("*", async (req, res) => {
  if (req.session.pterodactyl && req.session.userinfo) {
    const dbPteroId = await db.get("users-" + req.session.userinfo.id);
    if (String(req.session.pterodactyl.id) !== String(dbPteroId)) return res.redirect("/login?prompt=none");
  }
  let theme = indexjs.get(req);
  let newsettings = JSON.parse(require("fs").readFileSync("./settings.json"));
  if (newsettings.api.arcio.enabled == true) req.session.arcsessiontoken = Math.random().toString(36).substring(2, 15);
  if (theme.settings.mustbeloggedin.includes(req._parsedUrl.pathname)) if (!req.session.userinfo || !req.session.pterodactyl) return res.redirect("/login" + (req._parsedUrl.pathname.slice(0, 1) == "/" ? "?redirect=" + req._parsedUrl.pathname.slice(1) : ""));
  if (theme.settings.mustbeadmin.includes(req._parsedUrl.pathname)) {
    ejs.renderFile(
      `./Public/Themes/${theme.name}/${theme.settings.notfound}`,
      await indexjs.renderData(req, db, theme),
      null,
      async function (err, str) {
        delete req.session.newaccount;
        delete req.session.password;
        if (!req.session.userinfo || !req.session.pterodactyl) {
          if (err) {
            console.log(chalk.red(`Warning: An error occured while loading route ${req._parsedUrl.pathname}:`));
            console.log(err);
            return res.send("Failed to load page. The error has been logged to the console.");
          };
          res.status(200);
          return res.send(str);
        };

        let cacheaccount = await fetch(
          settings.pterodactyl.domain + "/api/application/users/" + (await db.get("users-" + req.session.userinfo.id)) + "?include=servers",
          {
            method: "get",
            headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
          }
        );
        if (await cacheaccount.statusText == "Not Found") {
          if (err) {
            console.log(chalk.red(`Warning: An error occured while loading route ${req._parsedUrl.pathname}:`));
            console.log(err);
            return res.send("Failed to load page. The error has been logged to the console.");
          };
          return res.send(str);
        };
        let cacheaccountinfo = JSON.parse(await cacheaccount.text());

        req.session.pterodactyl = cacheaccountinfo.attributes;
        if (cacheaccountinfo.attributes.root_admin !== true) {
          if (err) {
            console.log(chalk.red(`Warning: An error occured while loading route ${req._parsedUrl.pathname}:`));
            console.log(err);
            return res.send("Failed to load page. The error has been logged to the console.");
          };
          return res.send(str);
        };

        ejs.renderFile(
          `./Public/Themes/${theme.name}/${theme.settings.pages[req._parsedUrl.pathname.slice(1)] ? theme.settings.pages[req._parsedUrl.pathname.slice(1)] : theme.settings.notfound}`,
          await indexjs.renderData(req, db, theme),
          null,
          function (err, str) {
            delete req.session.newaccount;
            delete req.session.password;
            if (err) {
              console.log(`Warning: An error occured while loading route ${req._parsedUrl.pathname}:`);
              console.log(err);
              return res.send("Failed to load page. The error has been logged to the console.");
            };
            res.status(200);
            res.send(str);
          });
      });
    return;
  };
  ejs.renderFile(
    `./Public/Themes/${theme.name}/${theme.settings.pages[req._parsedUrl.pathname.slice(1)] ? theme.settings.pages[req._parsedUrl.pathname.slice(1)] : theme.settings.notfound}`,
    await indexjs.renderData(req, db, theme),
    null,
    function (err, str) {
      delete req.session.newaccount;
      delete req.session.password;
      if (err) {
        console.log(chalk.red(`Warning: An error occured while loading route ${req._parsedUrl.pathname}:`));
        console.log(err);
        return res.send("Failed to load page. The error has been logged to the console.");
      };
      res.status(200);
      res.send(str);
    });
});

module.exports.get = function (req) {
  let defaulttheme = JSON.parse(fs.readFileSync("./settings.json")).defaulttheme;
  let tname = encodeURIComponent(getCookie(req, "theme"));
  let name = (
    tname ?
      fs.existsSync(`./Public/Themes/${tname}`) ?
        tname
        : defaulttheme
      : defaulttheme
  )
  return {
    settings: (
      fs.existsSync(`./Public/Themes/${name}/pages.json`) ?
        JSON.parse(fs.readFileSync(`./Public/Themes/${name}/pages.json`).toString())
        : defaultthemesettings
    ),
    name: name
  };
};

module.exports.islimited = async function () {
  return cache == true ? false : true;
}

module.exports.ratelimits = async function (length) {
  if (cache == true) return setTimeout(
    indexjs.ratelimits
    , 1
  );
  cache = true;
  setTimeout(
    async function () {
      cache = false;
    }, length * 1000
  )
}

// Get a cookie.
function getCookie(req, cname) {
  let cookies = req.headers.cookie;
  if (!cookies) return null;
  let name = cname + "=";
  let ca = cookies.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return decodeURIComponent(c.substring(name.length, c.length));
    }
  }
  return "";
}
