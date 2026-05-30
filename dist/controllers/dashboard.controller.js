"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopLeaders = exports.getDashboardSummary = void 0;
const User_1 = __importDefault(require("../models/User"));
const Sale_1 = __importDefault(require("../models/Sale"));
const Withdrawal_1 = __importDefault(require("../models/Withdrawal"));
const mongoose_1 = __importDefault(require("mongoose"));
const getDashboardSummary = async (req, res) => {
    try {
        const userId = new mongoose_1.default.Types.ObjectId(req.user._id);
        const role = req.user.role;
        const { period, state } = req.query;
        // 1. Core Metrics
        let userQuery = {};
        let saleQuery = { status: 'active' };
        if (role !== 'admin') {
            // Find all downline for stats
            const downline = await User_1.default.aggregate([
                { $match: { _id: userId } },
                {
                    $graphLookup: {
                        from: 'users',
                        startWith: '$_id',
                        connectFromField: '_id',
                        connectToField: 'referrerId',
                        as: 'allDownline'
                    }
                }
            ]);
            const teamIds = downline[0]?.allDownline.map((u) => u._id) || [];
            teamIds.push(userId); // include self
            userQuery = { _id: { $in: teamIds } };
            saleQuery = {
                $and: [
                    { status: 'active' },
                    { $or: [{ sellerId: { $in: teamIds } }, { hcmId: { $in: teamIds } }, { hbaId: { $in: teamIds } }, { shId: { $in: teamIds } }] }
                ]
            };
        }
        // Apply Filters
        if (state && state !== 'all') {
            userQuery.state = state;
            saleQuery.$and = saleQuery.$and || [];
            saleQuery.$and.push({ customerState: state });
        }
        if (period && period !== 'all') {
            const now = new Date();
            let startDate = new Date();
            if (period === 'mtd') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
            else if (period === 'ytd') {
                startDate = new Date(now.getFullYear(), 0, 1);
            }
            saleQuery.$and = saleQuery.$and || [];
            saleQuery.$and.push({ createdAt: { $gte: startDate } });
        }
        const totalUsers = await User_1.default.countDocuments(userQuery);
        const activeUsers = await User_1.default.countDocuments({ ...userQuery, status: 'active' });
        const inactiveUsers = totalUsers - activeUsers;
        const allSales = await Sale_1.default.find(saleQuery);
        const totalRevenue = allSales.reduce((acc, s) => acc + s.saleAmount, 0);
        // Today's Sales (FTD)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaySales = allSales.filter(s => new Date(s.createdAt) >= today);
        const ftdRevenue = todaySales.reduce((acc, s) => acc + s.saleAmount, 0);
        // Current Month Sales (MTD)
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthSales = allSales.filter(s => new Date(s.createdAt) >= startOfMonth);
        const mtdRevenue = monthSales.reduce((acc, s) => acc + s.saleAmount, 0);
        // 2. Revenue Trends (Last 5 Weeks)
        const weeklyRevenue = [];
        for (let i = 4; i >= 0; i--) {
            const start = new Date();
            start.setDate(today.getDate() - (i * 7 + today.getDay()));
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            const weekSales = allSales.filter(s => {
                const d = new Date(s.createdAt);
                return d >= start && d <= end;
            });
            weeklyRevenue.push({
                label: i === 0 ? 'Current' : `WK ${5 - i}`,
                revenue: weekSales.reduce((acc, s) => acc + s.saleAmount, 0)
            });
        }
        // 3. State Contribution (Dynamic)
        const stateStats = await Sale_1.default.aggregate([
            { $match: saleQuery },
            { $group: { _id: '$customerState', revenue: { $sum: '$saleAmount' } } },
            { $sort: { revenue: -1 } },
            { $limit: 5 }
        ]);
        const stateContribution = stateStats.map(s => ({
            state: s._id || 'Unknown',
            revenue: s.revenue
        }));
        // 4. Role Distribution
        const roleDistribution = await User_1.default.aggregate([
            { $match: userQuery },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        // 5. Pending Withdrawals (Admin only)
        let pendingWithdrawals = [];
        if (role === 'admin') {
            pendingWithdrawals = await Withdrawal_1.default.find({ status: 'pending' })
                .populate('user', 'name role memberId')
                .sort({ createdAt: -1 })
                .limit(5);
        }
        return res.status(200).json({
            success: true,
            data: {
                metrics: {
                    totalUsers,
                    activeUsers,
                    inactiveUsers,
                    totalRevenue,
                    ftdRevenue,
                    mtdRevenue
                },
                revenueTrends: weeklyRevenue,
                stateContribution,
                roleDistribution: roleDistribution.map(r => ({ role: r._id, count: r.count })),
                pendingWithdrawals
            }
        });
    }
    catch (error) {
        console.error('[Dashboard] Summary Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getDashboardSummary = getDashboardSummary;
const getTopLeaders = async (req, res) => {
    try {
        const userId = new mongoose_1.default.Types.ObjectId(req.user._id);
        const role = req.user.role;
        const { role: filterRole } = req.query;
        let filterRoleNormalized = filterRole ? filterRole.toLowerCase() : undefined;
        if (filterRoleNormalized === 'hcb') {
            filterRoleNormalized = 'hba';
        }
        let targetRole = '';
        let query = {};
        switch (role) {
            case 'admin':
                targetRole = filterRoleNormalized ? filterRoleNormalized : 'sh';
                query = { role: targetRole };
                break;
            case 'sh':
                targetRole = filterRoleNormalized ? filterRoleNormalized : 'hba';
                query = { role: targetRole, referrerId: userId };
                break;
            case 'hba':
            case 'hcb':
                targetRole = filterRoleNormalized ? filterRoleNormalized : 'hcm';
                query = { role: targetRole, referrerId: userId };
                break;
            case 'hcm':
                targetRole = filterRoleNormalized ? filterRoleNormalized : 'hcc';
                query = { role: targetRole, referrerId: userId };
                break;
            case 'hcc':
                targetRole = 'hcc';
                const me = await User_1.default.findById(userId);
                query = { role: 'hcc', referrerId: me?.referrerId, _id: { $ne: userId } };
                break;
        }
        const leaders = await User_1.default.find(query).limit(10).lean();
        const enrichedLeaders = await Promise.all(leaders.map(async (m) => {
            // Directs count
            let nextRole = '';
            if (m.role === 'sh')
                nextRole = 'hba';
            else if (m.role === 'hba')
                nextRole = 'hcm';
            else if (m.role === 'hcm')
                nextRole = 'hcc';
            const directCount = nextRole ? await User_1.default.countDocuments({ referrerId: m._id, role: nextRole }) : 0;
            // Team Sales
            const sales = await Sale_1.default.find({
                $and: [
                    { status: 'active' },
                    { $or: [{ sellerId: m._id }, { hcmId: m._id }, { hbaId: m._id }, { shId: m._id }] }
                ]
            });
            const teamSalesValue = sales.reduce((acc, s) => acc + s.saleAmount, 0);
            return {
                _id: m._id,
                name: m.name,
                memberId: m.memberId,
                state: m.state,
                role: m.role,
                directCount,
                teamSalesValue,
                overrideValue: Math.round(teamSalesValue * 0.02),
                totalIncome: Math.round(teamSalesValue * 0.02) // Real calculation
            };
        }));
        // Sort by total income
        enrichedLeaders.sort((a, b) => b.totalIncome - a.totalIncome);
        return res.status(200).json({
            success: true,
            data: enrichedLeaders
        });
    }
    catch (error) {
        console.error('[Dashboard] Top Leaders Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getTopLeaders = getTopLeaders;
