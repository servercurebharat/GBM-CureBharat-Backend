"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTransactions = exports.getAllProvisional = exports.triggerPayoutCycle = exports.getMyWithdrawals = exports.requestWithdrawal = exports.getMyWallet = void 0;
const Wallet_1 = __importDefault(require("../models/Wallet"));
const User_1 = __importDefault(require("../models/User"));
const Withdrawal_1 = __importDefault(require("../models/Withdrawal"));
const Sale_1 = __importDefault(require("../models/Sale"));
const payoutCycle_1 = require("../lib/payoutCycle");
const crypto_1 = __importDefault(require("crypto"));
const getMyWallet = async (req, res) => {
    try {
        const wallet = await Wallet_1.default.findOne({ user: req.user._id })
            .populate('ledger.sourceUserId', 'name memberId')
            .lean();
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found' });
        }
        // Sort ledger by date descending
        const sortedLedger = wallet.ledger.sort((a, b) => b.date - a.date);
        // Calculate breakdown
        const breakdown = {
            direct: 0,
            override: 0,
            leadership: 0
        };
        wallet.ledger.forEach((entry) => {
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
        const pendingWithdrawals = await Withdrawal_1.default.find({ user: req.user._id, status: { $in: ['pending', 'processing'] } });
        const successfulWithdrawals = await Withdrawal_1.default.find({ user: req.user._id, status: 'success' });
        // Fetch Total Sales Value
        const sales = await Sale_1.default.find({ sellerId: req.user._id });
        const totalSalesValue = sales.reduce((acc, sale) => acc + sale.saleAmount, 0);
        // Calculate TDS
        const withdrawalRecords = await Withdrawal_1.default.find({ user: req.user._id });
        const totalTDS = withdrawalRecords.reduce((acc, w) => acc + (w.tdsAmount || 0), 0);
        const pendingCount = pendingWithdrawals.length;
        const pendingValue = pendingWithdrawals.reduce((acc, w) => acc + w.grossAmount, 0);
        const successfulCount = successfulWithdrawals.length;
        const successfulValue = successfulWithdrawals.reduce((acc, w) => acc + w.grossAmount, 0);
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
        if (!wallet || wallet.finalBalance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient final balance' });
        }
        // 1. Calculate TDS and Net
        const tdsAmount = Math.round(amount * 0.05); // 5% TDS
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
        // Find all wallets with provisional balance > 0
        const wallets = await Wallet_1.default.find({ provisionalBalance: { $gt: 0 } })
            .populate({
            path: 'user',
            select: 'name memberId role rank kycDocuments.panNumber kycStatus'
        });
        // Calculate summary
        let totalProvisional = 0;
        wallets.forEach((w) => {
            totalProvisional += w.provisionalBalance;
        });
        const estimatedTDS = Math.round(totalProvisional * 0.05); // 5% flat for simplicity in summary
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
