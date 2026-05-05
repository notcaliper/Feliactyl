"use strict";

/**
 * Referral System
 * Users can invite others and earn coins when they sign up
 */

const crypto = require('crypto');

const REFERRAL_REWARD = parseInt(process.env.REFERRAL_REWARD_COINS) || 100;
const MIN_PURCHASE = parseInt(process.env.REFERRAL_MIN_PURCHASE) || 0;

/**
 * Generate a unique referral code for a user
 * @param {string} userId - Discord user ID
 * @returns {string} - 8-character referral code
 */
function generateReferralCode(userId) {
    // Create a hash and take first 8 characters
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    return hash.substring(0, 8).toUpperCase();
}

/**
 * Get referral code for a user (create if doesn't exist)
 * @param {Object} db - Database instance
 * @param {string} userId - Discord user ID
 * @returns {Promise<string>} - Referral code
 */
async function getOrCreateReferralCode(db, userId) {
    const existing = await db.get(`referral-code-${userId}`);
    if (existing) return existing;

    const code = generateReferralCode(userId);
    await db.set(`referral-code-${userId}`, code);
    await db.set(`referral-owner-${code}`, userId);
    return code;
}

/**
 * Process a referral when a new user signs up
 * @param {Object} db - Database instance
 * @param {string} newUserId - New user's Discord ID
 * @param {string} referralCode - Referral code used
 * @returns {Promise<Object>} - Result of referral processing
 */
async function processReferral(db, newUserId, referralCode) {
    if (!referralCode) {
        return { success: false, reason: 'no_code' };
    }

    const referrerId = await db.get(`referral-owner-${referralCode}`);
    
    if (!referrerId) {
        return { success: false, reason: 'invalid_code' };
    }

    // Can't refer yourself
    if (referrerId === newUserId) {
        return { success: false, reason: 'self_referral' };
    }

    // Check if user was already referred
    const existingReferral = await db.get(`referred-by-${newUserId}`);
    if (existingReferral) {
        return { success: false, reason: 'already_referred' };
    }

    // Store referral relationship
    await db.set(`referred-by-${newUserId}`, referrerId);
    await db.set(`referral-time-${newUserId}`, Date.now());

    // Add to referrer's referral list
    const referrerList = await db.get(`referrals-${referrerId}`) || [];
    referrerList.push({
        userId: newUserId,
        date: Date.now(),
        rewarded: MIN_PURCHASE === 0 // Instant reward if no purchase required
    });
    await db.set(`referrals-${referrerId}`, referrerList);

    // If no minimum purchase required, give reward immediately
    if (MIN_PURCHASE === 0) {
        const { addCoinsAtomically } = require('./atomic.js');
        await addCoinsAtomically(db, referrerId, REFERRAL_REWARD, 'referral_bonus');
        
        return {
            success: true,
            referrerId,
            reward: REFERRAL_REWARD,
            instant: true
        };
    }

    return {
        success: true,
        referrerId,
        reward: REFERRAL_REWARD,
        instant: false,
        pending: true,
        minPurchase: MIN_PURCHASE
    };
}

/**
 * Check if a user has made their first purchase (for referral rewards)
 * @param {Object} db - Database instance
 * @param {string} userId - User who made purchase
 * @returns {Promise<Object>} - Reward info if applicable
 */
async function checkFirstPurchaseReward(db, userId) {
    const referrerId = await db.get(`referred-by-${userId}`);
    if (!referrerId) return null;

    const referrals = await db.get(`referrals-${referrerId}`) || [];
    const referral = referrals.find(r => r.userId === userId);
    
    if (!referral || referral.rewarded) return null;

    // Mark as rewarded
    referral.rewarded = true;
    await db.set(`referrals-${referrerId}`, referrals);

    // Give reward
    const { addCoinsAtomically } = require('./atomic.js');
    await addCoinsAtomically(db, referrerId, REFERRAL_REWARD, 'referral_first_purchase');

    return {
        referrerId,
        reward: REFERRAL_REWARD
    };
}

/**
 * Get referral statistics for a user
 * @param {Object} db - Database instance
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object>} - Referral stats
 */
async function getReferralStats(db, userId) {
    const code = await db.get(`referral-code-${userId}`);
    const referrals = await db.get(`referrals-${userId}`) || [];
    
    const total = referrals.length;
    const rewarded = referrals.filter(r => r.rewarded).length;
    const pending = total - rewarded;
    const totalEarned = rewarded * REFERRAL_REWARD;

    return {
        code,
        total,
        rewarded,
        pending,
        totalEarned,
        rewardPerReferral: REFERRAL_REWARD,
        referrals: referrals.map(r => ({
            userId: r.userId,
            date: r.date,
            rewarded: r.rewarded
        }))
    };
}

/**
 * Get referral link for a user
 * @param {Object} db - Database instance
 * @param {string} userId - Discord user ID
 * @param {string} baseUrl - Site base URL
 * @returns {Promise<string>} - Full referral URL
 */
async function getReferralLink(db, userId, baseUrl) {
    const code = await getOrCreateReferralCode(db, userId);
    return `${baseUrl}/register?ref=${code}`;
}

module.exports = {
    generateReferralCode,
    getOrCreateReferralCode,
    processReferral,
    checkFirstPurchaseReward,
    getReferralStats,
    getReferralLink,
    REFERRAL_REWARD,
    MIN_PURCHASE
};
