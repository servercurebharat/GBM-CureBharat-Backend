"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unfreezeWallet = exports.updateWithdrawalStatus = exports.getAllWithdrawalRequests = exports.getAllTransactions = exports.getAllProvisional = exports.triggerPayoutCycle = exports.getMyWithdrawals = exports.requestWithdrawal = exports.getMyWallet = void 0;
const Wallet_1 = __importDefault(require("../models/Wallet"));
const User_1 = __importDefault(require("../models/User"));
const Withdrawal_1 = __importDefault(require("../models/Withdrawal"));
const Sale_1 = __importDefault(require("../models/Sale"));
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
const payoutCycle_1 = require("../lib/payoutCycle");
const crypto_1 = __importDefault(require("crypto"));
const notification_controller_1 = require("./notification.controller");
const getMyWallet = async (req, res) => {
    try {
        const wallet = await Wallet_1.default.findOne({ user: req.user._id })
            .populate('ledger.sourceUserId', 'name memberId')
            .lean();
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found' });
        }
        // Sort ledger by date descending
        const sortedLedger = (wallet.ledger || []).sort((a, b) => b.date - a.date);
        // Calculate breakdown
        const breakdown = {
            direct: 0,
            override: 0,
            leadership: 0
        };
        (wallet.ledger || []).forEach((entry) => {
            if (entry.status === 'provisional' || entry.status === 'final') {
                if (entry.type === 'direct')
                    breakdown.direct += entry.amount;
                if (entry.type === 'override')
                    breakdown.override += entry.amount;
                if (entry.type === 'leadership')
                    breakdown.leadership += entry.amount;
            }
        });
        // Fetch Withdrawal Stats
        const withdrawalStats = await Withdrawal_1.default.aggregate([
            { $match: { user: req.user._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$grossAmount' },
                    totalTDS: { $sum: { $ifNull: ['$tdsAmount', 0] } }
                }
            }
        ]);
        let pendingCount = 0;
        let pendingValue = 0;
        let successfulCount = 0;
        let successfulValue = 0;
        let totalTDS = 0;
        withdrawalStats.forEach(stat => {
            totalTDS += stat.totalTDS;
            if (stat._id === 'pending' || stat._id === 'processing') {
                pendingCount += stat.count;
                pendingValue += stat.totalValue;
            }
            else if (stat._id === 'success') {
                successfulCount += stat.count;
                successfulValue += stat.totalValue;
            }
        });
        // Fetch Total Sales Value
        const salesAgg = await Sale_1.default.aggregate([
            { $match: { sellerId: req.user._id } },
            { $group: { _id: null, total: { $sum: '$saleAmount' } } }
        ]);
        const totalSalesValue = salesAgg[0]?.total || 0;
        return res.status(200).json({
            success: true,
            data: {
                provisionalBalance: wallet.provisionalBalance,
                finalBalance: wallet.finalBalance,
                totalEarned: wallet.totalEarned,
                totalWithdrawn: wallet.totalWithdrawn,
                totalSalesValue,
                pendingPayouts: { count: pendingCount, value: pendingValue },
                successfulPayouts: { count: successfulCount, value: successfulValue },
                totalTDS,
                earningsBreakdown: breakdown,
                ledger: sortedLedger.slice(0, 50)
            }
        });
    }
    catch (error) {
        console.error('[Wallet] getMyWallet Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getMyWallet = getMyWallet;
const requestWithdrawal = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user || user.kycStatus !== 'approved') {
            return res.status(403).json({ success: false, message: 'KYC must be approved for withdrawals' });
        }
        const wallet = await Wallet_1.default.findOne({ user: req.user._id });
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found' });
        }
        if (wallet.frozen) {
            return res.status(403).json({ success: false, message: 'Your wallet has been frozen. Please contact support.' });
        }
        if (wallet.finalBalance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient final balance' });
        }
        // 1. Calculate TDS and Net
        const tdsAmount = Math.round(amount * 0.02); // 2% TDS
        const netAmount = amount - tdsAmount;
        // 2. Generate Request ID
        const requestId = `PAY-${crypto_1.default.randomBytes(3).toString('hex').toUpperCase()}`;
        // 3. Create Withdrawal Record
        const withdrawal = new Withdrawal_1.default({
            requestId,
            user: req.user._id,
            grossAmount: amount,
            tdsAmount,
            netAmount,
            status: 'pending',
            requestedAt: new Date()
        });
        await withdrawal.save();
        // 4. Deduct from balance
        wallet.finalBalance -= amount;
        wallet.totalWithdrawn += amount;
        // 5. Add ledger entry
        wallet.ledger.push({
            amount: -amount,
            type: 'withdrawal',
            description: `Withdrawal request ${requestId} for ₹${amount / 100}`,
            status: 'final',
            date: new Date(),
            cycleMonth: ''
        });
        await wallet.save();
        // Trigger in-app notification to all admin users about the withdrawal request!
        try {
            const admins = await User_1.default.find({ role: 'admin' });
            for (const admin of admins) {
                await (0, notification_controller_1.createNotification)(admin._id.toString(), 'Withdrawal Requested', `Partner ${user.name} (${user.memberId}) has requested a withdrawal of ₹${(amount / 100).toFixed(2)}. Request ID: ${requestId}.`, 'warning', `/admin/payouts`);
            }
        }
        catch (notifErr) {
            console.error('[Wallet] Admin notification failed:', notifErr);
        }
        return res.status(200).json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            data: withdrawal
        });
    }
    catch (error) {
        console.error('[Wallet] requestWithdrawal Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.requestWithdrawal = requestWithdrawal;
const getMyWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal_1.default.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        return res.status(200).json({
            success: true,
            data: withdrawals
        });
    }
    catch (error) {
        console.error('[Wallet] getMyWithdrawals Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getMyWithdrawals = getMyWithdrawals;
const triggerPayoutCycle = async (req, res) => {
    try {
        const { cycleMonth } = req.body;
        if (!cycleMonth || !/^\d{4}-\d{2}$/.test(cycleMonth)) {
            return res.status(400).json({ success: false, message: 'Invalid cycle month format (YYYY-MM)' });
        }
        // Role check is handled by middleware, but extra safety:
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        // This is a manual trigger for the cron logic
        await (0, payoutCycle_1.runPayoutCycle)(cycleMonth);
        return res.status(200).json({
            success: true,
            message: `Manual payout cycle for ${cycleMonth} completed successfully`
        });
    }
    catch (error) {
        console.error('[Wallet] triggerPayoutCycle Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.triggerPayoutCycle = triggerPayoutCycle;
const getAllProvisional = async (req, res) => {
    try {
        // Admin check
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        // Find all wallets with provisional balance > 0 OR that are frozen
        const wallets = await Wallet_1.default.find({
            $or: [
                { provisionalBalance: { $gt: 0 } },
                { frozen: true }
            ]
        })
            .populate({
            path: 'user',
            select: 'name memberId role rank kycDocuments.panNumber kycStatus'
        });
        // Calculate summary
        let totalProvisional = 0;
        wallets.forEach((w) => {
            totalProvisional += w.provisionalBalance;
        });
        const estimatedTDS = Math.round(totalProvisional * 0.02); // 2% flat for simplicity in summary
        const netPayout = totalProvisional - estimatedTDS;
        return res.status(200).json({
            success: true,
            data: {
                wallets,
                summary: {
                    totalProvisional,
                    estimatedTDS,
                    netPayout,
                    walletCount: wallets.length
                }
            }
        });
    }
    catch (error) {
        console.error('[Wallet] getAllProvisional Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getAllProvisional = getAllProvisional;
const getAllTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 50, type } = req.query;
        const pipeline = [
            { $unwind: '$ledger' }
        ];
        if (type && type !== 'All') {
            pipeline.push({ $match: { 'ledger.type': type.toLowerCase() } });
        }
        pipeline.push({ $sort: { 'ledger.date': -1 } }, {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'userDetails'
            }
        }, { $unwind: '$userDetails' }, { $skip: (Number(page) - 1) * Number(limit) }, { $limit: Number(limit) }, {
            $project: {
                _id: '$ledger._id',
                amount: '$ledger.amount',
                type: '$ledger.type',
                description: '$ledger.description',
                status: '$ledger.status',
                date: '$ledger.date',
                cycleMonth: '$ledger.cycleMonth',
                user: {
                    _id: '$userDetails._id',
                    name: '$userDetails.name',
                    memberId: '$userDetails.memberId',
                    role: '$userDetails.role'
                }
            }
        });
        const transactions = await Wallet_1.default.aggregate(pipeline);
        const countPipeline = [{ $unwind: '$ledger' }];
        if (type && type !== 'All') {
            countPipeline.push({ $match: { 'ledger.type': type.toLowerCase() } });
        }
        countPipeline.push({ $count: 'total' });
        const totalCount = await Wallet_1.default.aggregate(countPipeline);
        return res.status(200).json({
            success: true,
            data: transactions,
            pagination: {
                total: totalCount[0]?.total || 0,
                page: Number(page),
                limit: Number(limit)
            }
        });
    }
    catch (error) {
        console.error('[Wallet] getAllTransactions Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getAllTransactions = getAllTransactions;
const getAllWithdrawalRequests = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { status = 'pending', page = 1, limit = 50 } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const filter = {};
        if (status && status !== 'all')
            filter.status = status;
        const withdrawals = await Withdrawal_1.default.find(filter)
            .populate('user', 'name memberId role kycStatus state')
            .sort({ requestedAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();
        const total = await Withdrawal_1.default.countDocuments(filter);
        return res.status(200).json({
            success: true,
            data: withdrawals,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum
            }
        });
    }
    catch (error) {
        console.error('[Wallet] getAllWithdrawalRequests Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getAllWithdrawalRequests = getAllWithdrawalRequests;
const updateWithdrawalStatus = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { id } = req.params;
        const { action, remarks } = req.body; // action: 'approve' | 'reject' | 'freeze'
        const withdrawal = await Withdrawal_1.default.findById(id).populate('user', 'name memberId _id');
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
        }
        if (withdrawal.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request is no longer pending' });
        }
        if (action === 'approve') {
            withdrawal.status = 'success';
            withdrawal.processedAt = new Date();
            withdrawal.remarks = remarks || 'Approved by admin';
            await withdrawal.save();
            // Notify user
            await (0, notification_controller_1.createNotification)(withdrawal.user._id.toString(), 'Payout Approved', `Your withdrawal request ${withdrawal.requestId} of ₹${(withdrawal.netAmount / 100).toFixed(2)} (after TDS) has been approved and will be disbursed shortly.`, 'success', '/finance');
        }
        else if (action === 'reject') {
            withdrawal.status = 'failed';
            withdrawal.processedAt = new Date();
            withdrawal.remarks = remarks || 'Rejected by admin';
            await withdrawal.save();
            // Refund the amount back to wallet
            const wallet = await Wallet_1.default.findOne({ user: withdrawal.user._id });
            if (wallet) {
                wallet.finalBalance += withdrawal.grossAmount;
                wallet.totalWithdrawn -= withdrawal.grossAmount;
                wallet.ledger.push({
                    amount: withdrawal.grossAmount,
                    type: 'withdrawal',
                    description: `Refund: Withdrawal ${withdrawal.requestId} rejected - ${remarks || 'Admin action'}`,
                    status: 'final',
                    date: new Date(),
                    cycleMonth: ''
                });
                await wallet.save();
            }
            await (0, notification_controller_1.createNotification)(withdrawal.user._id.toString(), 'Payout Rejected', `Your withdrawal request ${withdrawal.requestId} has been rejected. Reason: ${remarks || 'Admin decision'}. Amount has been refunded to your wallet.`, 'error', '/finance');
        }
        else if (action === 'freeze') {
            // Freeze the user's wallet
            const wallet = await Wallet_1.default.findOne({ user: withdrawal.user._id });
            if (wallet) {
                wallet.frozen = true;
                wallet.frozenReason = remarks || 'Frozen by admin pending investigation';
                await wallet.save();
            }
            withdrawal.status = 'failed';
            withdrawal.remarks = `Account frozen: ${remarks || 'Admin action'}`;
            await withdrawal.save();
            await (0, notification_controller_1.createNotification)(withdrawal.user._id.toString(), 'Account Action Required', `Your wallet has been frozen pending review. Please contact support. Request ${withdrawal.requestId} has been placed on hold.`, 'warning', '/support');
        }
        else {
            return res.status(400).json({ success: false, message: 'Invalid action. Use approve, reject, or freeze' });
        }
        return res.status(200).json({ success: true, message: `Withdrawal ${action}d successfully` });
    }
    catch (error) {
        console.error('[Wallet] updateWithdrawalStatus Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.updateWithdrawalStatus = updateWithdrawalStatus;
const unfreezeWallet = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { id } = req.params; // wallet ID
        const wallet = await Wallet_1.default.findById(id).populate('user', 'name memberId _id');
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found' });
        }
        wallet.frozen = false;
        wallet.frozenReason = '';
        await wallet.save();
        // Log action
        try {
            await ActivityLog_1.default.create({
                userId: req.user._id,
                userName: req.user.name,
                userRole: req.user.role,
                action: 'WALLET_UNFROZEN',
                category: 'wallet',
                details: `Unfrozen wallet for ${wallet.user?.name} (${wallet.user?.memberId})`,
                ipAddress: req.ip
            });
        }
        catch (logErr) {
            console.error('[Wallet] unfreezeWallet Log Error:', logErr);
        }
        // Notify user
        try {
            await (0, notification_controller_1.createNotification)(wallet.user._id.toString(), 'Account Unfrozen', `Your wallet has been unfrozen. You can now request payouts.`, 'success', '/finance');
        }
        catch (notifErr) {
            console.error('[Wallet] unfreezeWallet Notification Error:', notifErr);
        }
        return res.status(200).json({ success: true, message: 'Wallet unfrozen successfully' });
    }
    catch (error) {
        console.error('[Wallet] unfreezeWallet Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.unfreezeWallet = unfreezeWallet;
