"use strict";

/**
 * Health Service - Monitoring and health checks for microservices architecture
 */

const EventEmitter = require('events');
const os = require('os');

class HealthService extends EventEmitter {
    constructor(options = {}) {
        super();
        this.checks = new Map();
        this.status = 'healthy'; // healthy, degraded, unhealthy
        this.startTime = Date.now();
        this.options = {
            checkInterval: options.checkInterval || 30000,
            unhealthyThreshold: options.unhealthyThreshold || 3,
            ...options
        };
        this.interval = null;
    }

    /**
     * Register a health check
     */
    register(name, checkFn, options = {}) {
        this.checks.set(name, {
            fn: checkFn,
            weight: options.weight || 1,
            timeout: options.timeout || 5000,
            lastResult: null,
            consecutiveFailures: 0
        });
        return this;
    }

    /**
     * Start health monitoring
     */
    start() {
        if (this.interval) return;
        
        this.interval = setInterval(() => {
            this.runChecks();
        }, this.options.checkInterval);
        
        // Run initial check
        this.runChecks();
    }

    /**
     * Stop health monitoring
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Run all health checks
     */
    async runChecks() {
        const results = {};
        let totalWeight = 0;
        let healthyWeight = 0;

        for (const [name, check] of this.checks) {
            try {
                const result = await this.runCheck(name, check);
                results[name] = result;
                
                totalWeight += check.weight;
                if (result.healthy) {
                    healthyWeight += check.weight;
                    check.consecutiveFailures = 0;
                } else {
                    check.consecutiveFailures++;
                }
            } catch (error) {
                results[name] = { healthy: false, error: error.message };
                check.consecutiveFailures++;
                totalWeight += check.weight;
            }
            
            check.lastResult = results[name];
        }

        // Calculate overall health percentage
        const healthPercentage = totalWeight > 0 ? (healthyWeight / totalWeight) * 100 : 100;
        
        // Determine status
        const previousStatus = this.status;
        if (healthPercentage === 100) {
            this.status = 'healthy';
        } else if (healthPercentage >= 50) {
            this.status = 'degraded';
        } else {
            this.status = 'unhealthy';
        }

        // Emit events on status change
        if (previousStatus !== this.status) {
            this.emit('statusChange', this.status, previousStatus, results);
        }

        this.emit('check', { status: this.status, percentage: healthPercentage, checks: results });
    }

    /**
     * Run a single health check
     */
    async runCheck(name, check) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Health check '${name}' timed out after ${check.timeout}ms`));
            }, check.timeout);

            Promise.resolve(check.fn())
                .then(result => {
                    clearTimeout(timeout);
                    if (typeof result === 'boolean') {
                        resolve({ healthy: result });
                    } else {
                        resolve({ healthy: true, ...result });
                    }
                })
                .catch(error => {
                    clearTimeout(timeout);
                    reject(error);
                });
        });
    }

    /**
     * Get current health status
     */
    getStatus() {
        const uptime = Date.now() - this.startTime;
        const memory = process.memoryUsage();
        
        return {
            status: this.status,
            uptime,
            uptimeFormatted: this.formatUptime(uptime),
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || 'unknown',
            nodeVersion: process.version,
            platform: os.platform(),
            memory: {
                used: memory.heapUsed,
                total: memory.heapTotal,
                external: memory.external,
                rss: memory.rss
            },
            cpu: os.loadavg(),
            checks: Array.from(this.checks.entries()).map(([name, check]) => ({
                name,
                ...check.lastResult,
                consecutiveFailures: check.consecutiveFailures
            }))
        };
    }

    /**
     * Check if service is ready to accept traffic
     */
    isReady() {
        return this.status === 'healthy' || this.status === 'degraded';
    }

    /**
     * Check if service is alive (basic check)
     */
    isAlive() {
        return true; // If we're running, we're alive
    }

    /**
     * Format uptime for human reading
     */
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
}

module.exports = HealthService;
