"use strict";

/**
 * Service Manager - Orchestrates multiple services in the main process
 * Provides unified initialization, health monitoring, and graceful shutdown
 */

const EventEmitter = require('events');
const chalk = require('chalk');

class ServiceManager extends EventEmitter {
    constructor() {
        super();
        this.services = new Map();
        this.db = null;
        this.shuttingDown = false;
    }

    /**
     * Register a service
     */
    register(name, service) {
        this.services.set(name, {
            instance: service,
            started: false,
            critical: false
        });
        
        // Listen for service events
        if (service.on) {
            service.on('error', (err) => {
                console.error(chalk.red(`[Service:${name}] Error:`), err);
                this.emit('service:error', name, err);
            });
        }
        
        return this;
    }

    /**
     * Mark service as critical (shutdown if it fails)
     */
    markCritical(name) {
        const service = this.services.get(name);
        if (service) {
            service.critical = true;
        }
        return this;
    }

    /**
     * Initialize all services
     */
    async initialize(db) {
        this.db = db;
        
        console.log(chalk.cyan('[ServiceManager] Initializing services...'));
        
        for (const [name, service] of this.services) {
            try {
                if (service.instance.initialize) {
                    await service.instance.initialize(db);
                }
                console.log(chalk.green(`[ServiceManager] ${name} initialized`));
            } catch (err) {
                console.error(chalk.red(`[ServiceManager] Failed to initialize ${name}:`), err);
                if (service.critical) {
                    throw err;
                }
            }
        }
    }

    /**
     * Start all services
     */
    async start() {
        console.log(chalk.cyan('[ServiceManager] Starting services...'));
        
        for (const [name, service] of this.services) {
            try {
                if (service.instance.start) {
                    await service.instance.start();
                }
                service.started = true;
                console.log(chalk.green(`[ServiceManager] ${name} started`));
            } catch (err) {
                console.error(chalk.red(`[ServiceManager] Failed to start ${name}:`), err);
                if (service.critical) {
                    throw err;
                }
            }
        }
        
        this.emit('ready');
    }

    /**
     * Get a service instance
     */
    get(name) {
        const service = this.services.get(name);
        return service ? service.instance : null;
    }

    /**
     * Check if all services are healthy
     */
    async healthCheck() {
        const results = {};
        
        for (const [name, service] of this.services) {
            if (service.instance.healthCheck) {
                try {
                    results[name] = await service.instance.healthCheck();
                } catch (err) {
                    results[name] = { healthy: false, error: err.message };
                }
            } else {
                results[name] = { healthy: service.started };
            }
        }
        
        return results;
    }

    /**
     * Graceful shutdown
     */
    async shutdown(timeout = 30000) {
        if (this.shuttingDown) return;
        this.shuttingDown = true;
        
        console.log(chalk.yellow('[ServiceManager] Starting graceful shutdown...'));
        
        const startTime = Date.now();
        const shutdownOrder = Array.from(this.services.entries())
            .sort((a, b) => (b[1].critical ? 1 : 0) - (a[1].critical ? 1 : 0));
        
        for (const [name, service] of shutdownOrder) {
            if (service.started && service.instance.shutdown) {
                try {
                    const remainingTime = timeout - (Date.now() - startTime);
                    await service.instance.shutdown(Math.max(remainingTime, 1000));
                    console.log(chalk.green(`[ServiceManager] ${name} stopped`));
                } catch (err) {
                    console.error(chalk.red(`[ServiceManager] Error stopping ${name}:`), err);
                }
            }
        }
        
        console.log(chalk.green('[ServiceManager] Shutdown complete'));
        this.emit('shutdown');
    }
}

// Singleton instance
let manager = null;

module.exports = {
    ServiceManager,
    getManager: () => {
        if (!manager) {
            manager = new ServiceManager();
        }
        return manager;
    },
    resetManager: () => {
        manager = null;
    }
};
