"use strict";

/**
 * Queue Service - Central job queue for background processing
 * Decouples web requests from heavy operations
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class QueueService extends EventEmitter {
    constructor(db, options = {}) {
        super();
        this.db = db;
        this.queues = new Map(); // queueName -> jobs[]
        this.processors = new Map(); // queueName -> processor function
        this.running = new Map(); // queueName -> boolean
        this.stats = new Map(); // queueName -> { processed, failed, active }
        this.options = {
            maxConcurrent: options.maxConcurrent || 3,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 5000,
            ...options
        };
        this.shuttingDown = false;
    }

    /**
     * Create or get a queue
     */
    queue(name) {
        if (!this.queues.has(name)) {
            this.queues.set(name, []);
            this.running.set(name, false);
            this.stats.set(name, { processed: 0, failed: 0, active: 0 });
        }
        return {
            add: (data, options = {}) => this.addJob(name, data, options),
            process: (processor) => this.registerProcessor(name, processor),
            getStats: () => this.getStats(name),
            pause: () => this.pause(name),
            resume: () => this.resume(name)
        };
    }

    /**
     * Add a job to a queue
     */
    async addJob(queueName, data, options = {}) {
        if (this.shuttingDown) {
            throw new Error('Queue service is shutting down');
        }

        const job = {
            id: options.id || crypto.randomUUID(),
            queue: queueName,
            data,
            attempts: 0,
            maxAttempts: options.attempts || this.options.retryAttempts,
            delay: options.delay || 0,
            priority: options.priority || 0,
            createdAt: Date.now(),
            processedAt: null,
            error: null
        };

        // Persist to database for durability
        await this.persistJob(job);

        // Add to memory queue
        if (!this.queues.has(queueName)) {
            this.queue(queueName);
        }
        
        const queue = this.queues.get(queueName);
        queue.push(job);
        
        // Sort by priority
        queue.sort((a, b) => b.priority - a.priority);

        this.emit('job:added', job);
        
        // Start processing if not already running
        this.startProcessing(queueName);
        
        return job;
    }

    /**
     * Register a processor for a queue
     */
    registerProcessor(queueName, processor) {
        this.processors.set(queueName, processor);
        this.startProcessing(queueName);
        return this;
    }

    /**
     * Persist job to database for durability
     */
    async persistJob(job) {
        try {
            await this.db.set(`job-${job.id}`, job);
            await this.db.set(`job-queue-${job.queue}-${job.id}`, job.id);
        } catch (err) {
            console.error('[QueueService] Failed to persist job:', err);
        }
    }

    /**
     * Remove job from persistence
     */
    async removeJob(job) {
        try {
            await this.db.delete(`job-${job.id}`);
            await this.db.delete(`job-queue-${job.queue}-${job.id}`);
        } catch (err) {
            console.error('[QueueService] Failed to remove job:', err);
        }
    }

    /**
     * Start processing a queue
     */
    async startProcessing(queueName) {
        if (this.running.get(queueName)) return;
        if (!this.processors.has(queueName)) return;
        if (this.shuttingDown) return;

        this.running.set(queueName, true);
        
        const processor = this.processors.get(queueName);
        const queue = this.queues.get(queueName) || [];

        while (queue.length > 0 && !this.shuttingDown) {
            const activeJobs = Array.from(this.stats.values()).reduce((sum, s) => sum + s.active, 0);
            if (activeJobs >= this.options.maxConcurrent) {
                await this.sleep(100);
                continue;
            }

            const job = queue.shift();
            if (!job) continue;

            // Check delay
            if (job.delay > 0 && Date.now() < job.createdAt + job.delay) {
                queue.unshift(job);
                await this.sleep(1000);
                continue;
            }

            this.processJob(job, processor).catch(console.error);
        }

        this.running.set(queueName, false);
    }

    /**
     * Process a single job
     */
    async processJob(job, processor) {
        const stats = this.stats.get(job.queue);
        stats.active++;
        job.attempts++;
        job.processedAt = Date.now();

        this.emit('job:started', job);

        try {
            await processor(job.data, job);
            
            stats.processed++;
            stats.active--;
            
            await this.removeJob(job);
            
            this.emit('job:completed', job);
        } catch (error) {
            stats.active--;
            job.error = error.message;

            if (job.attempts < job.maxAttempts) {
                // Retry with exponential backoff
                job.delay = this.options.retryDelay * Math.pow(2, job.attempts - 1);
                
                const queue = this.queues.get(job.queue);
                queue.push(job);
                
                this.emit('job:retry', job, error);
            } else {
                stats.failed++;
                
                // Move to dead letter queue
                await this.moveToDeadLetter(job, error);
                
                this.emit('job:failed', job, error);
            }
        }
    }

    /**
     * Move failed job to dead letter queue
     */
    async moveToDeadLetter(job, error) {
        const deadJob = {
            ...job,
            failedAt: Date.now(),
            finalError: error.message
        };
        
        try {
            await this.db.set(`dead-job-${job.id}`, deadJob);
            await this.db.delete(`job-${job.id}`);
        } catch (err) {
            console.error('[QueueService] Failed to move to dead letter:', err);
        }
    }

    /**
     * Get queue statistics
     */
    getStats(queueName) {
        if (queueName) {
            return {
                ...this.stats.get(queueName),
                pending: this.queues.get(queueName)?.length || 0
            };
        }
        
        const allStats = {};
        for (const [name] of this.queues) {
            allStats[name] = this.getStats(name);
        }
        return allStats;
    }

    /**
     * Pause a queue
     */
    pause(queueName) {
        this.running.set(queueName, false);
    }

    /**
     * Resume a queue
     */
    resume(queueName) {
        this.startProcessing(queueName);
    }

    /**
     * Graceful shutdown
     */
    async shutdown(timeout = 30000) {
        console.log('[QueueService] Starting graceful shutdown...');
        this.shuttingDown = true;
        
        const startTime = Date.now();
        
        // Wait for active jobs to complete
        while (Date.now() - startTime < timeout) {
            const activeJobs = Array.from(this.stats.values()).reduce((sum, s) => sum + s.active, 0);
            if (activeJobs === 0) break;
            
            console.log(`[QueueService] Waiting for ${activeJobs} active jobs...`);
            await this.sleep(1000);
        }
        
        // Persist pending jobs
        for (const [queueName, queue] of this.queues) {
            for (const job of queue) {
                await this.persistJob(job);
            }
            console.log(`[QueueService] Persisted ${queue.length} pending jobs from ${queueName}`);
        }
        
        console.log('[QueueService] Shutdown complete');
    }

    /**
     * Recover jobs from database after restart
     */
    async recover() {
        console.log('[QueueService] Recovering jobs from database...');
        
        try {
            // Get all job keys
            const allKeys = await this.db.get('job-keys') || [];
            let recovered = 0;
            
            for (const key of allKeys) {
                if (key.startsWith('job-') && !key.startsWith('job-queue-')) {
                    const job = await this.db.get(key);
                    if (job && !job.processedAt) {
                        const queue = this.queue(job.queue);
                        this.queues.get(job.queue).push(job);
                        recovered++;
                    }
                }
            }
            
            console.log(`[QueueService] Recovered ${recovered} jobs`);
            
            // Start processing recovered jobs
            for (const [queueName] of this.queues) {
                this.startProcessing(queueName);
            }
        } catch (err) {
            console.error('[QueueService] Recovery failed:', err);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = QueueService;
