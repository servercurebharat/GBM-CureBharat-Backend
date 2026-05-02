"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMonthlyActivityCheck = runMonthlyActivityCheck;
exports.scheduleActivityCheck = scheduleActivityCheck;
const node_cron_1 = __importDefault(require("node-cron"));
const User_1 = __importDefault(require("../models/User"));
/**
 * Runs on 1st of every month at 00:01
 * Marks users inactive if they had 0 sales last month
 * Resets monthly sales counter for new cycle
 */
async function runMonthlyActivityCheck() {
    console.log('[ActivityCheck] Starting monthly audit...');
    try {
        const users = await User_1.default.find({ role: { $ne: 'admin' } });
        for (const user of users) {
            const salesLastMonth = user.personalSalesThisMonth;
            if (salesLastMonth < 1) {
                user.status = 'inactive';
                console.log(`[ActivityCheck] ${user.memberId} marked inactive (0 sales)`);
            }
            else {
                user.status = 'active';
                console.log(`[ActivityCheck] ${user.memberId} is active (${salesLastMonth} sales)`);
            }
            // Reset monthly sales counter for the new cycle
            user.personalSalesThisMonth = 0;
            await user.save();
        }
        console.log('[ActivityCheck] Monthly activity audit completed successfully.');
    }
    catch (error) {
        console.error('[ActivityCheck] Error during monthly audit:', error);
    }
}
/**
 * Schedule cron: 1st of every month at 00:01
 */
function scheduleActivityCheck() {
    node_cron_1.default.schedule('1 0 1 * *', async () => {
        console.log('[Cron] Triggering monthly activity check...');
        await runMonthlyActivityCheck();
    });
}
