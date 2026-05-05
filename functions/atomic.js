"use strict";

/**
 * Atomic Operations & User-Level Locking System for Feliactyl
 * Prevents race conditions in coin transactions and resource purchases
 */

const crypto = require('crypto');

// In-memory user locks (Map<userId, Promise>)
const userLocks = new Map();

/**
 * Acquire a lock for a specific user
 * @param {string} userId - Discord user ID
 * @returns {Promise<Function>} - Resolve to release lock
 */
async function acquireUserLock(userId) {
    // Wait for any existing lock
    while (userLocks.has(userId)) {
        try {
            await userLocks.get(userId);
        } catch (err) {
            // Previous lock failed, continue
        }
    }
    
    // Create new lock
    let release;
    const lockPromise = new Promise((resolve, reject) => {
        release = () => {
            userLocks.delete(userId);
            resolve();
        };
    });
    
    userLocks.set(userId, lockPromise);
    return release;
}

/**
 * Execute a function atomically for a specific user
 * @param {string} userId - Discord user ID
 * @param {Function} operation - Async function to execute
 * @returns {Promise<any>} - Result of operation
 */
async function withUserLock(userId, operation) {
    const release = await acquireUserLock(userId);
    
    try {
        const result = await operation();
        return result;
    } finally {
        release();
    }
}

/**
 * Atomic coin transaction - deduct coins from user
 * @param {object} db - Keyv database instance
 * @param {string} userId - Discord user ID
 * @param {number} amount - Amount to deduct (positive number)
 * @param {string} reason - Reason for transaction (for audit log)
 * @returns {Promise<object>} - Transaction result
 */
async function deductCoinsAtomically(db, userId, amount, reason = 'deduction') {
    if (typeof amount !== 'number' || amount <= 0) {
        return { success: false, error: 'Invalid amount' };
    }
    
    return await withUserLock(userId, async () => {
        const currentCoins = await db.get(`coins-${userId}`) || 0;
        
        if (currentCoins < amount) {
            return { 
                success: false, 
                error: 'Insufficient coins',
                current: currentCoins,
                required: amount
            };
        }
        
        const newBalance = currentCoins - amount;
        
        if (newBalance === 0) {
            await db.delete(`coins-${userId}`);
        } else {
            await db.set(`coins-${userId}`, newBalance);
        }
        
        return {
            success: true,
            previous: currentCoins,
            new: newBalance,
            deducted: amount,
            reason
        };
    });
}

/**
 * Atomic coin transaction - add coins to user
 * @param {object} db - Keyv database instance
 * @param {string} userId - Discord user ID
 * @param {number} amount - Amount to add (positive number)
 * @param {string} reason - Reason for transaction (for audit log)
 * @returns {Promise<object>} - Transaction result
 */
async function addCoinsAtomically(db, userId, amount, reason = 'addition') {
    if (typeof amount !== 'number' || amount <= 0) {
        return { success: false, error: 'Invalid amount' };
    }
    
    return await withUserLock(userId, async () => {
        const currentCoins = await db.get(`coins-${userId}`) || 0;
        const newBalance = currentCoins + amount;
        
        // Sanity check - prevent overflow
        if (newBalance > 999999999999) {
            return { success: false, error: 'Balance would exceed maximum' };
        }
        
        await db.set(`coins-${userId}`, newBalance);
        
        return {
            success: true,
            previous: currentCoins,
            new: newBalance,
            added: amount,
            reason
        };
    });
}

/**
 * Atomic resource purchase transaction
 * @param {object} db - Keyv database instance
 * @param {string} userId - Discord user ID
 * @param {object} purchase - Purchase details
 * @param {number} purchase.coinCost - Coins to deduct
 * @param {string} purchase.resourceType - 'ram', 'disk', 'cpu', 'servers'
 * @param {number} purchase.amount - Amount of resource to add
 * @param {number} purchase.resourceValue - Actual resource value to add (e.g., MB, %)
 * @returns {Promise<object>} - Transaction result
 */
async function purchaseResourceAtomically(db, userId, purchase) {
    const { coinCost, resourceType, amount, resourceValue } = purchase;
    
    return await withUserLock(userId, async () => {
        // Check coins
        const currentCoins = await db.get(`coins-${userId}`) || 0;
        if (currentCoins < coinCost) {
            return { success: false, error: 'Insufficient coins' };
        }
        
        // Get current resource cap
        const capKey = `${resourceType}-${userId}`;
        const currentCap = await db.get(capKey) || 0;
        const newCap = currentCap + amount;
        
        // Get current extra resources
        let extra = await db.get(`extra-${userId}`);
        extra = typeof extra === 'object' ? extra : { ram: 0, disk: 0, cpu: 0, servers: 0 };
        
        // Update the specific resource
        const resourceField = resourceType === 'servers' ? 'servers' : 
                              resourceType === 'ram' ? 'ram' :
                              resourceType === 'disk' ? 'disk' : 'cpu';
        extra[resourceField] = (extra[resourceField] || 0) + resourceValue;
        
        // Deduct coins
        const newCoins = currentCoins - coinCost;
        if (newCoins === 0) {
            await db.delete(`coins-${userId}`);
        } else {
            await db.set(`coins-${userId}`, newCoins);
        }
        
        // Save cap
        await db.set(capKey, newCap);
        
        // Save extras
        if (extra.ram === 0 && extra.disk === 0 && extra.cpu === 0 && extra.servers === 0) {
            await db.delete(`extra-${userId}`);
        } else {
            await db.set(`extra-${userId}`, extra);
        }
        
        return {
            success: true,
            coins: { previous: currentCoins, new: newCoins, spent: coinCost },
            cap: { type: resourceType, previous: currentCap, new: newCap },
            resources: extra
        };
    });
}

/**
 * Atomic plan purchase transaction
 * @param {object} db - Keyv database instance
 * @param {string} userId - Discord user ID
 * @param {string} planName - Plan to purchase
 * @param {number} planCost - Cost in coins
 * @returns {Promise<object>} - Transaction result
 */
async function purchasePlanAtomically(db, userId, planName, planCost) {
    return await withUserLock(userId, async () => {
        const currentCoins = await db.get(`coins-${userId}`) || 0;
        
        if (currentCoins < planCost) {
            return { success: false, error: 'Insufficient coins' };
        }
        
        const newCoins = currentCoins - planCost;
        
        if (newCoins === 0) {
            await db.delete(`coins-${userId}`);
        } else {
            await db.set(`coins-${userId}`, newCoins);
        }
        
        await db.set(`package-${userId}`, planName);
        
        return {
            success: true,
            coins: { previous: currentCoins, new: newCoins, spent: planCost },
            plan: planName
        };
    });
}

/**
 * Atomic gift coins transaction (between two users)
 * @param {object} db - Keyv database instance
 * @param {string} fromUserId - Sender Discord ID
 * @param {string} toUserId - Receiver Discord ID
 * @param {number} amount - Amount to gift
 * @returns {Promise<object>} - Transaction result
 */
async function giftCoinsAtomically(db, fromUserId, toUserId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
        return { success: false, error: 'Invalid amount' };
    }
    
    // Lock both users (always in consistent order to prevent deadlock)
    const [first, second] = fromUserId < toUserId ? [fromUserId, toUserId] : [toUserId, fromUserId];
    
    const releaseFirst = await acquireUserLock(first);
    let releaseSecond;
    
    try {
        releaseSecond = await acquireUserLock(second);
        
        try {
            // Verify sender has enough
            const senderCoins = await db.get(`coins-${fromUserId}`) || 0;
            if (senderCoins < amount) {
                return { success: false, error: 'Insufficient coins' };
            }
            
            // Verify receiver exists
            const receiverExists = await db.get(`users-${toUserId}`);
            if (!receiverExists) {
                return { success: false, error: 'Receiver not found' };
            }
            
            const receiverCoins = await db.get(`coins-${toUserId}`) || 0;
            
            // Perform transfer
            const senderNew = senderCoins - amount;
            const receiverNew = receiverCoins + amount;
            
            // Update sender
            if (senderNew === 0) {
                await db.delete(`coins-${fromUserId}`);
            } else {
                await db.set(`coins-${fromUserId}`, senderNew);
            }
            
            // Update receiver
            await db.set(`coins-${toUserId}`, receiverNew);
            
            return {
                success: true,
                amount,
                sender: { id: fromUserId, previous: senderCoins, new: senderNew },
                receiver: { id: toUserId, previous: receiverCoins, new: receiverNew }
            };
        } finally {
            releaseSecond();
        }
    } finally {
        releaseFirst();
    }
}

/**
 * Generate unique transaction ID for idempotency
 * @returns {string} Transaction ID
 */
function generateTransactionId() {
    return crypto.randomUUID ? crypto.randomUUID() : 
           `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Idempotent operation wrapper - prevents double-processing
 * @param {object} db - Keyv database instance
 * @param {string} transactionId - Unique transaction ID
 * @param {Function} operation - Operation to execute
 * @returns {Promise<object>} - Operation result
 */
async function withIdempotency(db, transactionId, operation) {
    const key = `tx-${transactionId}`;
    
    // Check if already processed
    const existing = await db.get(key);
    if (existing) {
        return { success: true, cached: true, result: existing };
    }
    
    // Execute operation
    const result = await operation();
    
    // Store result for 24 hours
    await db.set(key, result, 24 * 60 * 60 * 1000);
    
    return { success: true, cached: false, result };
}

module.exports = {
    withUserLock,
    deductCoinsAtomically,
    addCoinsAtomically,
    purchaseResourceAtomically,
    purchasePlanAtomically,
    giftCoinsAtomically,
    generateTransactionId,
    withIdempotency,
    acquireUserLock
};
