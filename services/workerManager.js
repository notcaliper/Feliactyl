"use strict";

/**
 * Worker Manager - Spawns and monitors child worker processes
 * Enables horizontal scaling by running workers in separate processes
 */

const { fork } = require('child_process');
const path = require('path');
const EventEmitter = require('events');
const chalk = require('chalk');

class WorkerManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.workers = new Map();
        this.workerPath = options.workerPath || path.join(__dirname, '../workers/economyWorker.js');
        this.maxWorkers = options.maxWorkers || 2;
        this.restartDelay = options.restartDelay || 5000;
        this.maxRestarts = options.maxRestarts || 5;
        this.restartWindow = options.restartWindow || 60000; // 1 minute
        this.restarts = []; // Track restart timestamps
    }

    /**
     * Start worker processes
     */
    async start() {
        console.log(chalk.cyan(`[WorkerManager] Starting ${this.maxWorkers} worker(s)...`));
        
        for (let i = 0; i < this.maxWorkers; i++) {
            this.spawnWorker(i);
        }
        
        // Setup periodic health checks
        this.healthCheckInterval = setInterval(() => {
            this.checkWorkers();
        }, 30000);
    }

    /**
     * Spawn a single worker
     */
    spawnWorker(id) {
        const workerId = `worker-${id}`;
        
        console.log(chalk.cyan(`[WorkerManager] Spawning ${workerId}...`));
        
        const worker = fork(this.workerPath, [], {
            env: process.env,
            stdio: ['inherit', 'inherit', 'inherit', 'ipc']
        });
        
        const workerInfo = {
            process: worker,
            id: workerId,
            startTime: Date.now(),
            restarts: 0,
            messages: [],
            healthy: true
        };
        
        this.workers.set(workerId, workerInfo);
        
        // Handle messages from worker
        worker.on('message', (msg) => {
            this.handleMessage(workerId, msg);
        });
        
        // Handle worker exit
        worker.on('exit', (code, signal) => {
            this.handleExit(workerId, code, signal);
        });
        
        // Handle errors
        worker.on('error', (err) => {
            console.error(chalk.red(`[WorkerManager] ${workerId} error:`), err);
            this.emit('worker:error', workerId, err);
        });
        
        this.emit('worker:spawn', workerId);
        
        return workerInfo;
    }

    /**
     * Handle messages from workers
     */
    handleMessage(workerId, msg) {
        const worker = this.workers.get(workerId);
        if (!worker) return;
        
        if (msg.type === 'health') {
            worker.healthy = msg.healthy;
            worker.lastHealthCheck = Date.now();
        } else if (msg.type === 'stats') {
            worker.stats = msg.data;
        } else if (msg.type === 'log') {
            console.log(chalk.gray(`[${workerId}]`), msg.message);
        }
        
        this.emit('worker:message', workerId, msg);
    }

    /**
     * Handle worker process exit
     */
    handleExit(workerId, code, signal) {
        const worker = this.workers.get(workerId);
        if (!worker) return;
        
        console.log(chalk.yellow(`[WorkerManager] ${workerId} exited (code: ${code}, signal: ${signal})`));
        
        this.workers.delete(workerId);
        this.emit('worker:exit', workerId, code, signal);
        
        // Restart if not shutting down and not too many restarts
        if (!this.shuttingDown && this.shouldRestart(workerId)) {
            setTimeout(() => {
                if (!this.shuttingDown) {
                    console.log(chalk.cyan(`[WorkerManager] Restarting ${workerId}...`));
                    this.spawnWorker(parseInt(workerId.split('-')[1]));
                }
            }, this.restartDelay);
        }
    }

    /**
     * Check if we should restart a worker
     */
    shouldRestart(workerId) {
        const now = Date.now();
        
        // Clean old restart records
        this.restarts = this.restarts.filter(time => now - time < this.restartWindow);
        
        if (this.restarts.length >= this.maxRestarts) {
            console.error(chalk.red(`[WorkerManager] Too many restarts in ${this.restartWindow}ms, not restarting ${workerId}`));
            this.emit('worker:restart-limit', workerId);
            return false;
        }
        
        this.restarts.push(now);
        return true;
    }

    /**
     * Periodic health check of workers
     */
    checkWorkers() {
        const now = Date.now();
        
        for (const [workerId, worker] of this.workers) {
            // Check if worker is responsive
            if (worker.lastHealthCheck && now - worker.lastHealthCheck > 60000) {
                console.log(chalk.yellow(`[WorkerManager] ${workerId} appears unresponsive, killing...`));
                this.killWorker(workerId);
            }
        }
    }

    /**
     * Kill a specific worker
     */
    killWorker(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker) return;
        
        try {
            worker.process.kill('SIGTERM');
            
            // Force kill after timeout
            setTimeout(() => {
                if (!worker.process.killed) {
                    worker.process.kill('SIGKILL');
                }
            }, 10000);
        } catch (err) {
            console.error(chalk.red(`[WorkerManager] Error killing ${workerId}:`), err);
        }
    }

    /**
     * Get worker statistics
     */
    getStats() {
        const stats = {
            total: this.workers.size,
            healthy: 0,
            unhealthy: 0,
            workers: {}
        };
        
        for (const [workerId, worker] of this.workers) {
            const workerStats = {
                pid: worker.process.pid,
                uptime: Date.now() - worker.startTime,
                restarts: worker.restarts,
                healthy: worker.healthy,
                stats: worker.stats || {}
            };
            
            stats.workers[workerId] = workerStats;
            
            if (worker.healthy) {
                stats.healthy++;
            } else {
                stats.unhealthy++;
            }
        }
        
        return stats;
    }

    /**
     * Send message to all workers
     */
    broadcast(message) {
        for (const [workerId, worker] of this.workers) {
            try {
                worker.process.send(message);
            } catch (err) {
                console.error(chalk.red(`[WorkerManager] Error broadcasting to ${workerId}:`), err);
            }
        }
    }

    /**
     * Send message to specific worker (round-robin if workerId not specified)
     */
    send(message, workerId = null) {
        if (workerId) {
            const worker = this.workers.get(workerId);
            if (worker) {
                worker.process.send(message);
                return true;
            }
            return false;
        }
        
        // Round-robin to any healthy worker
        const healthyWorkers = Array.from(this.workers.entries())
            .filter(([id, w]) => w.healthy);
        
        if (healthyWorkers.length === 0) return false;
        
        const [id, worker] = healthyWorkers[Math.floor(Math.random() * healthyWorkers.length)];
        worker.process.send(message);
        return true;
    }

    /**
     * Graceful shutdown
     */
    async shutdown(timeout = 30000) {
        console.log(chalk.yellow('[WorkerManager] Shutting down workers...'));
        this.shuttingDown = true;
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        const startTime = Date.now();
        
        // Send shutdown signal to all workers
        for (const [workerId, worker] of this.workers) {
            try {
                worker.process.send({ type: 'shutdown' });
            } catch (err) {
                // Worker might already be dead
            }
        }
        
        // Wait for workers to exit gracefully
        while (this.workers.size > 0 && Date.now() - startTime < timeout) {
            console.log(chalk.gray(`[WorkerManager] Waiting for ${this.workers.size} worker(s)...`));
            await this.sleep(1000);
        }
        
        // Force kill any remaining workers
        for (const [workerId, worker] of this.workers) {
            if (!worker.process.killed) {
                console.log(chalk.yellow(`[WorkerManager] Force killing ${workerId}...`));
                worker.process.kill('SIGKILL');
            }
        }
        
        this.workers.clear();
        console.log(chalk.green('[WorkerManager] All workers stopped'));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = WorkerManager;
