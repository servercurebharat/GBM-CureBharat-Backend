"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPayoutCycle = runPayoutCycle;
exports.scheduleMaintenanceCrons = scheduleMaintenanceCrons;
const node_cron_1 = __importDefault(require("node-cron"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const User_1 = __importDefault(require("../models/User"));
const tdsCalculator_1 = require("./tdsCalculator");
/**
 * Runs on 5th of every month (T+5 from cycle end)
 * Moves provisional → final balances and handles tax deductions
 */
async function runPayoutCycle(cycleMonth) {
    console.log(`[PayoutCycle] Starting settlement for cycle: ${cycleMonth}`);
    try {
        // Get all wallets that have earnings in the provisional balance
        const wallets = await Wallet_1.default.find({ provisionalBalance: { $gt: 0 } });
        for (const wallet of wallets) {
            const provisional = wallet.provisionalBalance;
            const user = await User_1.default.findById(wallet.user);
            if (!user) {
                console.error(`[PayoutCycle] User not found for wallet ${wallet._id}`);
                continue;
            }
            // Calculate TDS based on Indian Tax Laws (approximate annual projection)
            // Assuming hasPAN is true for now, in production check user docs
            const hasPAN = user.kycStatus === 'approved';
            const tdsResult = (0, tdsCalculator_1.calculateTDS)(provisional, provisional * 12, hasPAN);
            if (tdsResult.tdsAmount > 0) {
                wallet.ledger.push({
                    amount: -tdsResult.tdsAmount,
                    type: 'tds_deduction',
                    description: `TDS @ ${tdsResult.tdsRate}% for cycle ${cycleMonth}`,
                    cycleMonth,
                    status: 'final',
                    date: new Date()
                });
            }
            const netPayout = tdsResult.netAmount;
            // Move funds to final balance
            wallet.finalBalance += netPayout;
            wallet.provisionalBalance = 0;
            // Update statuses of provisional entries in ledger for this cycle
            wallet.ledger.forEach((entry) => {
                if (entry.cycleMonth === cycleMonth && entry.status === 'provisional') {
                    entry.status = 'final';
                }
            });
            wallet.ledger.push({
                amount: 0, // Zero entry just to log completion
                type: 'direct', // Generic type for log
                description: `Cycle ${cycleMonth} settled. Net payout: ₹${netPayout}`,
                cycleMonth,
                status: 'final',
                date: new Date()
            });
            await wallet.save();
            console.log(`[PayoutCycle] Settled wallet for ${user.memberId}: Net ₹${netPayout}`);
            // 1. Create In-App Notification for User
            try {
                const { createNotification } = require('../controllers/notification.controller');
                await createNotification(user._id.toString(), 'Payout Settled! 💸', `Your commissions for cycle ${cycleMonth} have been settled. Net ₹${netPayout / 100} is now withdrawable!`, 'success', '/hcc/finance');
            }
            catch (notifErr) {
                console.error(`[PayoutCycle] Failed to send notification for user ${user.memberId}:`, notifErr);
            }
            // 2. Send Payout Settlement Email
            if (user.email) {
                try {
                    const { sendPayoutSettlementMail } = require('./mailer');
                    await sendPayoutSettlementMail(user.email, user.name, cycleMonth, provisional / 100, tdsResult.tdsAmount / 100, netPayout / 100);
                }
                catch (mailErr) {
                    console.error(`[PayoutCycle] Failed to send settlement email to ${user.email}:`, mailErr);
                }
            }
        }
        console.log(`[PayoutCycle] Completed payout for ${wallets.length} wallets.`);
    }
    catch (error) {
        console.error('[PayoutCycle] Error during payout cycle:', error);
    }
}
const rankEngine_1 = require("./rankEngine");
/**
 * Schedule crons for MLM maintenance
 */
function scheduleMaintenanceCrons() {
    // 1. Activity Audit: 1st of every month at 00:01 AM
    node_cron_1.default.schedule('1 0 1 * *', async () => {
        const now = new Date();
        const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        console.log(`[Cron] Triggering Monthly Activity Audit for ${cycleMonth}`);
        await (0, rankEngine_1.runMonthlyActivityAudit)(cycleMonth);
    });
    // 2. Payout settlement: 5th of every month at 09:00 AM
    node_cron_1.default.schedule('0 9 5 * *', async () => {
        const now = new Date();
        // Get last month in YYYY-MM format
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const cycleMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        console.log(`[Cron] Triggering payout cycle for ${cycleMonth}`);
        await runPayoutCycle(cycleMonth);
    });
}
