"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndPromote = checkAndPromote;
exports.runMonthlyActivityAudit = runMonthlyActivityAudit;
const User_1 = __importDefault(require("../models/User"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
/**
 * Auto-promotion engine.
 * Checks if user qualifies for rank upgrade after each sale.
 */
async function checkAndPromote(userId) {
    console.log(`[RankEngine] Checking promotions for user: ${userId}`);
    const user = await User_1.default.findById(userId);
    if (!user)
        return;
    // 1. HCC → HCM promotion
    if (user.rank === 'HCC') {
        // Criteria: 12 Personal Sales of ₹1999 or above (tracked via personalSalesCount)
        if (user.personalSalesCount >= 12) {
            console.log(`[RankEngine] User ${user.memberId} promoted to HCM`);
            user.rank = 'HCM';
            user.role = 'hcm';
            user.status = 'active';
            await user.save();
            await sendPromotionNotification(user, 'HCM');
            // Update teamSize counts recursively for uplines
            await updateUplineTeamSize(user.referrerId);
            return;
        }
    }
    // 2. HCM → HBA promotion
    if (user.rank === 'HCM') {
        // Criteria: 5 HCMs in direct downline AND Total Team size >= 30 (5 HCM + 25 HCC)
        const hcmDownlineCount = await User_1.default.countDocuments({
            referrerId: user._id,
            rank: 'HCM'
        });
        if (hcmDownlineCount >= 5 && user.teamSize >= 30) {
            console.log(`[RankEngine] User ${user.memberId} promoted to HBA`);
            user.rank = 'HBA';
            user.role = 'hba';
            await user.save();
            // Release breakaway held commissions
            try {
                const wallet = await Wallet_1.default.findOne({ user: user._id });
                if (wallet) {
                    let totalReleased = 0;
                    wallet.ledger.forEach((entry) => {
                        if (entry.status === 'held') {
                            entry.status = 'provisional'; // Release to provisional to go through settlement
                            totalReleased += entry.amount;
                        }
                    });
                    if (totalReleased > 0) {
                        wallet.provisionalBalance += totalReleased;
                        wallet.ledger.push({
                            amount: 0,
                            type: 'manual',
                            description: `🔓 Released ₹${totalReleased / 100} breakaway commission upon HBA promotion!`,
                            status: 'final',
                            date: new Date(),
                            cycleMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
                        });
                        await wallet.save();
                        console.log(`[RankEngine] Released ₹${totalReleased / 100} of held breakaway commissions to HBA ${user.memberId}`);
                    }
                }
            }
            catch (err) {
                console.error('[RankEngine] Error releasing held commissions:', err);
            }
            await sendPromotionNotification(user, 'HBA');
            return;
        }
    }
    // 3. HBA → SH promotion
    if (user.rank === 'HBA') {
        // Criteria: 5 HBAs in direct downline
        const hbaDownlineCount = await User_1.default.countDocuments({
            referrerId: user._id,
            rank: 'HBA'
        });
        if (hbaDownlineCount >= 5) {
            console.log(`[RankEngine] User ${user.memberId} promoted to SH`);
            user.rank = 'SH';
            user.role = 'sh';
            await user.save();
            await sendPromotionNotification(user, 'SH');
        }
        return;
    }
}
async function updateUplineTeamSize(referrerId) {
    if (!referrerId)
        return;
    const upline = await User_1.default.findById(referrerId);
    if (upline) {
        upline.teamSize += 1;
        await upline.save();
        if (upline.referrerId) {
            await updateUplineTeamSize(upline.referrerId.toString());
        }
    }
}
/**
 * MONTHLY MAINTENANCE ENGINE
 * Runs at the start of each month to check activity and reset counters.
 */
async function runMonthlyActivityAudit(cycleMonth) {
    console.log(`[RankEngine] Starting Monthly Activity Audit for: ${cycleMonth}`);
    const users = await User_1.default.find({});
    for (const user of users) {
        let isActive = false;
        // Check criteria based on rank
        if (user.rank === 'HCC') {
            // HCC: 1 Personal Sale/Month
            if (user.personalSalesThisMonth >= 1)
                isActive = true;
        }
        else if (user.rank === 'HCM') {
            // HCM: 1 Personal Sale AND 1 HCC Recruitment/Month
            if (user.personalSalesThisMonth >= 1 && user.personalRecruitsThisMonth >= 1)
                isActive = true;
        }
        else if (user.rank === 'HBA') {
            // HBA: 1 Personal Sale AND 1 HCM Recruitment/Month
            if (user.personalSalesThisMonth >= 1 && user.personalRecruitsThisMonth >= 1)
                isActive = true;
        }
        else {
            // SH/Admin: Always active for now
            isActive = true;
        }
        // Update status
        user.status = isActive ? 'active' : 'inactive';
        // Reset monthly counters
        user.personalSalesThisMonth = 0;
        user.personalRecruitsThisMonth = 0;
        await user.save();
    }
    console.log(`[RankEngine] Monthly Audit Completed.`);
}
/**
 * Sends a notification (SMS/Email) to the user about their rank promotion
 */
async function sendPromotionNotification(user, newRank) {
    console.log(`[NOTIFICATION] Congratulations ${user.name}! You have been promoted to ${newRank}! 🚀🚀🚀`);
    // Future: Integrate SMS/Email API here
    // await sendSMS(user.mobile, `Congratulations! You are now a ${newRank} at CureBharat.`);
}
