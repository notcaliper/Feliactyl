#!/usr/bin/env node
"use strict";

/**
 * Economy Worker - Background processor for coin operations
 * Runs as separate process to handle:
 * - Store purchases
 * - Plan purchases
 * - Coin transfers
 * - AFK reward processing
 */

const path = require('path');

// Load environment first
require('../functions/envLoader.js').init();

const Keyv = require("keyv");
const chalk = require("chalk");
const QueueService = require('../services/queueService.js');
const HealthService = require('../services/healthService.js');
const { purchaseResourceAtomically, purchasePlanAtomically, giftCoinsAtomically, addCoinsAtomically } = require('../functions/atomic.js');

// Load settings
const fs = require('fs');
let settings;
try {
    settings = JSON.parse(fs.readFileSync("./settings.json"));
} catch (err) {
    console.error(chalk.red('[Worker] Failed to load settings:', err.message));
    process.exit(1);
}

// Database connection
const db = new Keyv(settings.database);
db.on('error', err => {
    console.error(chalk.red('[Worker] Database error:'), err);
});

// Initialize services
const queue = new QueueService(db, {
    maxConcurrent: 5,
    retryAttempts: 3
});

const health = new HealthService({
    checkInterval: 30000
});

// Register health checks
health.register('database', async () => {
    await db.get('health-check');
    return true;
}, { weight: 2 });

health.register('queue', () => {
    const stats = queue.getStats();
    const failed = Object.values(stats).reduce((sum, s) => sum + s.failed, 0);
    return failed < 10; // Healthy if less than 10 failed jobs
}, { weight: 1 });

// Register queue processors
function setupProcessors() {
    // Store purchase processor
    queue.queue('store.purchase').process(async (data, job) => {
        const { userId, resourceType, amount, coinCost, resourceValue } = data;
        
        console.log(chalk.cyan(`[Worker] Processing store purchase: ${resourceType} x${amount} for ${userId}`));
        
        const result = await purchaseResourceAtomically(db, userId, {
            coinCost,
            resourceType,
            amount,
            resourceValue
        });
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        console.log(chalk.green(`[Worker] Store purchase completed: ${userId} bought ${resourceType}`));
        return result;
    });

    // Plan purchase processor
    queue.queue('plan.purchase').process(async (data, job) => {
        const { userId, planName, planCost } = data;
        
        console.log(chalk.cyan(`[Worker] Processing plan purchase: ${planName} for ${userId}`));
        
        const result = await purchasePlanAtomically(db, userId, planName, planCost);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        console.log(chalk.green(`[Worker] Plan purchase completed: ${userId} upgraded to ${planName}`));
        return result;
    });

    // Coin gift processor
    queue.queue('coins.gift').process(async (data, job) => {
        const { fromUserId, toUserId, amount } = data;
        
        console.log(chalk.cyan(`[Worker] Processing coin gift: ${amount} from ${fromUserId} to ${toUserId}`));
        
        const result = await giftCoinsAtomically(db, fromUserId, toUserId, amount);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        console.log(chalk.green(`[Worker] Coin gift completed: ${amount} coins transferred`));
        return result;
    });

    // Admin coin adjustment processor
    queue.queue('coins.adjust').process(async (data, job) => {
        const { userId, amount, operation, adminId } = data;
        
        console.log(chalk.cyan(`[Worker] Processing coin ${operation}: ${amount} for ${userId} by admin ${adminId}`));
        
        let result;
        if (operation === 'add') {
            result = await addCoinsAtomically(db, userId, amount, 'admin_add');
        } else if (operation === 'deduct') {
            result = await deductCoinsAtomically(db, userId, amount, 'admin_deduct');
        } else if (operation === 'set') {
            // Direct set operation
            await db.set(`coins-${userId}`, amount);
            result = { success: true, new: amount };
        }
        
        if (!result || !result.success) {
            throw new Error(result?.error || 'Operation failed');
        }
        
        console.log(chalk.green(`[Worker] Coin adjustment completed: ${operation} ${amount}`));
        return result;
    });

    // AFK reward processor (batch processing)
    queue.queue('afk.reward').process(async (data, job) => {
        const { userId, coins, timestamp } = data;
        
        // Add time-based deduplication check
        const lastReward = await db.get(`afk-last-${userId}`);
        if (lastReward && (timestamp - lastReward) < 25000) { // 25 second minimum
            console.log(chalk.yellow(`[Worker] AFK reward deduplicated for ${userId}`));
            return { deduplicated: true };
        }
        
        const result = await addCoinsAtomically(db, userId, coins, 'afk_reward');
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        await db.set(`afk-last-${userId}`, timestamp);
        
        return result;
    });

    console.log(chalk.green('[Worker] Queue processors registered'));
}

// Graceful shutdown
async function shutdown() {
    console.log(chalk.yellow('[Worker] Received shutdown signal, cleaning up...'));
    
    health.stop();
    
    await queue.shutdown(30000);
    
    console.log(chalk.green('[Worker] Shutdown complete'));
    process.exit(0);
}

// Error handling
process.on('uncaughtException', (err) => {
    console.error(chalk.red('[Worker] Uncaught exception:'), err);
    shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('[Worker] Unhandled rejection at:'), promise, 'reason:', reason);
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start worker
async function start() {
    console.log(chalk.white("┌─────────────────────────────────────┐"));
    console.log(chalk.white("│") + chalk.cyan("    Feliactyl Economy Worker        ") + chalk.white("│"));
    console.log(chalk.white("│") + chalk.gray("    Background Job Processor          ") + chalk.white("│"));
    console.log(chalk.white("└─────────────────────────────────────┘"));
    
    // Setup processors
    setupProcessors();
    
    // Recover any pending jobs from database
    await queue.recover();
    
    // Start health monitoring
    health.start();
    
    // Log status
    console.log(chalk.green('[Worker] Started successfully'));
    console.log(chalk.gray('[Worker] Waiting for jobs...'));
    
    // Keep process alive
    setInterval(() => {
        const stats = queue.getStats();
        const totalPending = Object.values(stats).reduce((sum, s) => sum + (s.pending || 0), 0);
        const totalActive = Object.values(stats).reduce((sum, s) => sum + s.active, 0);
        
        if (totalPending > 0 || totalActive > 0) {
            console.log(chalk.gray(`[Worker] Status: ${totalActive} active, ${totalPending} pending jobs`));
        }
    }, 60000);
}

start().catch(err => {
    console.error(chalk.red('[Worker] Failed to start:'), err);
    process.exit(1);
});
