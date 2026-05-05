"use strict";

/**
 * Feliactyl Firewall
 * AntiVPN, AntiAlt, AntiProxy detection
 * IP blacklisting, geo-blocking, abuse detection
 */

const fetch = require('node-fetch');

// In-memory caches to reduce API calls
const vpnCache = new Map();    // ip -> { result, expires }
const abuseCache = new Map();  // ip -> { score, expires }
const altCache = new Map();    // ip -> discordId

const VPN_CACHE_TTL = 48 * 60 * 60 * 1000;   // 48 hours
const ABUSE_CACHE_TTL = 24 * 60 * 60 * 1000;  // 24 hours

/**
 * Get client IP respecting proxies
 */
function getClientIP(req) {
    const settings = JSON.parse(require('fs').readFileSync('./settings.json'));
    const trustProxy = settings.api?.client?.oauth2?.ip?.['trust x-forwarded-for'] === true;
    
    let ip = trustProxy
        ? (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress)
        : req.socket.remoteAddress;
    
    return (ip || '::1').replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1');
}

/**
 * Check if IP is a VPN/proxy using proxycheck.io
 */
async function checkVPN(ip, apiKey) {
    if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return { isVPN: false, type: 'local' };
    }

    // Check cache
    const cached = vpnCache.get(ip);
    if (cached && cached.expires > Date.now()) {
        return cached.result;
    }

    if (!apiKey || apiKey === 'Proxycheck APIKey') {
        return { isVPN: false, type: 'unchecked' };
    }

    try {
        const response = await fetch(
            `https://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1&asn=1&risk=1`,
            { timeout: 5000 }
        );
        
        if (!response.ok) return { isVPN: false, type: 'api_error' };
        
        const data = await response.json();
        
        if (data.status !== 'ok' || !data[ip]) {
            return { isVPN: false, type: 'no_data' };
        }

        const ipData = data[ip];
        const result = {
            isVPN: ipData.proxy === 'yes',
            isProxy: ipData.type?.toLowerCase().includes('proxy'),
            isTor: ipData.type?.toLowerCase().includes('tor'),
            type: ipData.type || 'unknown',
            country: ipData.country,
            isp: ipData.provider,
            risk: ipData.risk || 0
        };

        vpnCache.set(ip, { result, expires: Date.now() + VPN_CACHE_TTL });
        return result;
    } catch (err) {
        console.warn('[Firewall] VPN check failed for', ip, ':', err.message);
        return { isVPN: false, type: 'error' };
    }
}

/**
 * Check AbuseIPDB for malicious IPs
 */
async function checkAbuseIPDB(ip, apiKey) {
    if (!apiKey || ip === '127.0.0.1') return { score: 0 };

    const cached = abuseCache.get(ip);
    if (cached && cached.expires > Date.now()) {
        return cached;
    }

    try {
        const response = await fetch(
            `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=30`,
            {
                headers: {
                    'Key': apiKey,
                    'Accept': 'application/json'
                },
                timeout: 5000
            }
        );

        if (!response.ok) return { score: 0 };

        const data = await response.json();
        const result = {
            score: data.data?.abuseConfidenceScore || 0,
            totalReports: data.data?.totalReports || 0,
            isWhitelisted: data.data?.isWhitelisted || false,
            countryCode: data.data?.countryCode
        };

        abuseCache.set(ip, { ...result, expires: Date.now() + ABUSE_CACHE_TTL });
        return result;
    } catch (err) {
        return { score: 0 };
    }
}

/**
 * Anti-Alt detection — same IP, different Discord accounts
 */
async function checkAltAccount(db, ip, userId) {
    if (ip === '127.0.0.1') return { isAlt: false };

    const existingUserId = await db.get(`firewall-ip-${ip}`);
    
    if (!existingUserId) {
        await db.set(`firewall-ip-${ip}`, userId);
        return { isAlt: false };
    }
    
    if (existingUserId === userId) {
        return { isAlt: false };
    }

    // Different user on same IP — potential alt
    return {
        isAlt: true,
        existingUserId: existingUserId,
        currentUserId: userId
    };
}

/**
 * Check if IP is in manual blacklist
 */
async function isBlacklisted(db, ip) {
    const blacklist = await db.get('firewall-blacklist') || [];
    return blacklist.includes(ip);
}

/**
 * Check if IP is in whitelist
 */
async function isWhitelisted(db, ip) {
    const settings = JSON.parse(require('fs').readFileSync('./settings.json'));
    
    // Check static whitelist in settings
    const staticWhitelist = settings.firewall?.whitelist || 
                            settings.antivpn?.whitelistedIPs || [];
    if (staticWhitelist.includes(ip)) return true;
    
    // Check dynamic db whitelist
    const dbWhitelist = await db.get('firewall-whitelist') || [];
    return dbWhitelist.includes(ip);
}

/**
 * Check if user is banned
 */
async function isUserBanned(db, userId) {
    const banned = await db.get(`firewall-banned-user-${userId}`);
    if (!banned) return { banned: false };
    
    // Check if ban has expired
    if (banned.expires && banned.expires < Date.now()) {
        await db.delete(`firewall-banned-user-${userId}`);
        return { banned: false };
    }
    
    return {
        banned: true,
        reason: banned.reason || 'Banned by administrator',
        expires: banned.expires || null,
        bannedBy: banned.bannedBy || 'system'
    };
}

/**
 * Log a firewall event
 */
async function logFirewallEvent(db, type, ip, userId, details) {
    const event = {
        type,
        ip,
        userId: userId || null,
        details,
        timestamp: Date.now()
    };
    
    const logs = await db.get('firewall-logs') || [];
    logs.unshift(event);
    
    // Keep last 500 events
    if (logs.length > 500) logs.splice(500);
    
    await db.set('firewall-logs', logs);
    console.log(`[Firewall] ${type} - IP: ${ip}${userId ? ` User: ${userId}` : ''} - ${JSON.stringify(details)}`);
}

/**
 * Main firewall check — run all checks
 */
async function runFirewallCheck(db, req, userId = null) {
    const settings = JSON.parse(require('fs').readFileSync('./settings.json'));
    const fw = settings.firewall || {};
    const ip = getClientIP(req);

    // Always check manual blacklist first
    if (await isBlacklisted(db, ip)) {
        await logFirewallEvent(db, 'BLACKLISTED_IP', ip, userId, { reason: 'Manual blacklist' });
        return { blocked: true, reason: 'Your IP address has been blocked.' };
    }

    // If whitelisted, skip all checks
    if (await isWhitelisted(db, ip)) {
        return { blocked: false, whitelisted: true };
    }

    // Check user ban
    if (userId) {
        const banCheck = await isUserBanned(db, userId);
        if (banCheck.banned) {
            await logFirewallEvent(db, 'BANNED_USER', ip, userId, { reason: banCheck.reason });
            return {
                blocked: true,
                reason: `Your account has been banned. Reason: ${banCheck.reason}`
            };
        }
    }

    // Anti-Alt detection
    if (fw.antiAlt?.enabled && userId) {
        const altCheck = await checkAltAccount(db, ip, userId);
        if (altCheck.isAlt) {
            const action = fw.antiAlt.action || 'warn';
            await logFirewallEvent(db, 'ALT_DETECTED', ip, userId, { existingUser: altCheck.existingUserId });
            
            if (action === 'block') {
                return { blocked: true, reason: 'Multiple accounts detected from your IP address.' };
            }
        }
    }

    // VPN / Proxy check
    if (fw.antiVPN?.enabled || settings.antivpn?.status) {
        const apiKey = fw.antiVPN?.apiKey || settings.antivpn?.APIKey;
        const vpnResult = await checkVPN(ip, apiKey);
        
        if (vpnResult.isVPN || vpnResult.isProxy) {
            const action = fw.antiVPN?.action || 'block';
            await logFirewallEvent(db, 'VPN_DETECTED', ip, userId, vpnResult);
            
            if (action === 'block') {
                return { blocked: true, reason: 'VPN/Proxy connections are not allowed.' };
            }
        }

        // Tor exit node
        if (vpnResult.isTor && fw.antiVPN?.blockTor !== false) {
            await logFirewallEvent(db, 'TOR_DETECTED', ip, userId, vpnResult);
            return { blocked: true, reason: 'Tor connections are not allowed.' };
        }
    }

    // AbuseIPDB check
    if (fw.abuseIPDB?.enabled) {
        const abuseResult = await checkAbuseIPDB(ip, fw.abuseIPDB.apiKey);
        const threshold = fw.abuseIPDB.threshold || 75;
        
        if (abuseResult.score >= threshold) {
            await logFirewallEvent(db, 'ABUSE_DETECTED', ip, userId, abuseResult);
            return { blocked: true, reason: 'Access denied due to suspicious activity.' };
        }
    }

    // Geo-blocking
    if (fw.geoBlock?.enabled && fw.geoBlock?.blockedCountries?.length > 0) {
        const apiKey = fw.antiVPN?.apiKey || settings.antivpn?.APIKey;
        const vpnResult = await checkVPN(ip, apiKey); // Reuses cached result
        
        if (vpnResult.country && fw.geoBlock.blockedCountries.includes(vpnResult.country)) {
            await logFirewallEvent(db, 'GEO_BLOCKED', ip, userId, { country: vpnResult.country });
            return { blocked: true, reason: 'Access from your region is not available.' };
        }
    }

    return { blocked: false };
}

/**
 * Express middleware factory
 */
function firewallMiddleware(db, options = {}) {
    return async (req, res, next) => {
        try {
            const result = await runFirewallCheck(db, req, req.session?.userinfo?.id);
            
            if (result.blocked) {
                if (options.json || req.path.startsWith('/api/')) {
                    return res.status(403).json({
                        status: 'blocked',
                        message: result.reason
                    });
                }
                return res.status(403).send(`
                    <html>
                    <head><title>Access Denied</title></head>
                    <body style="font-family:sans-serif;background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
                        <div style="text-align:center;padding:2rem;background:#16213e;border-radius:12px;max-width:400px;">
                            <div style="font-size:3rem;margin-bottom:1rem;">🛡️</div>
                            <h1>Access Denied</h1>
                            <p style="color:#a0a0a0;margin-top:1rem;">${result.reason}</p>
                            <p style="color:#666;font-size:0.875rem;margin-top:1rem;">If you believe this is a mistake, please contact support.</p>
                        </div>
                    </body>
                    </html>
                `);
            }
            
            req.firewallResult = result;
            next();
        } catch (err) {
            console.error('[Firewall] Middleware error:', err);
            next(); // Fail open — don't block on errors
        }
    };
}

/**
 * Admin operations
 */
const admin = {
    async banUser(db, userId, reason, expiresInMs, bannedBy) {
        await db.set(`firewall-banned-user-${userId}`, {
            reason: reason || 'No reason provided',
            expires: expiresInMs ? Date.now() + expiresInMs : null,
            bannedBy: bannedBy || 'admin',
            bannedAt: Date.now()
        });
    },

    async unbanUser(db, userId) {
        await db.delete(`firewall-banned-user-${userId}`);
    },

    async blacklistIP(db, ip) {
        const list = await db.get('firewall-blacklist') || [];
        if (!list.includes(ip)) {
            list.push(ip);
            await db.set('firewall-blacklist', list);
        }
    },

    async unblacklistIP(db, ip) {
        const list = await db.get('firewall-blacklist') || [];
        await db.set('firewall-blacklist', list.filter(i => i !== ip));
    },

    async whitelistIP(db, ip) {
        const list = await db.get('firewall-whitelist') || [];
        if (!list.includes(ip)) {
            list.push(ip);
            await db.set('firewall-whitelist', list);
        }
    },

    async removeWhitelistIP(db, ip) {
        const list = await db.get('firewall-whitelist') || [];
        await db.set('firewall-whitelist', list.filter(i => i !== ip));
    },

    async getLogs(db, limit = 50) {
        const logs = await db.get('firewall-logs') || [];
        return logs.slice(0, limit);
    },

    async getBlacklist(db) {
        return await db.get('firewall-blacklist') || [];
    },

    async getWhitelist(db) {
        return await db.get('firewall-whitelist') || [];
    },

    clearVPNCache() {
        vpnCache.clear();
        abuseCache.clear();
    }
};

module.exports = {
    runFirewallCheck,
    firewallMiddleware,
    checkVPN,
    checkAltAccount,
    checkAbuseIPDB,
    isBlacklisted,
    isWhitelisted,
    isUserBanned,
    logFirewallEvent,
    getClientIP,
    admin
};
