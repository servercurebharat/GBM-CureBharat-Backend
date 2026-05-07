"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMTDAnalytics = exports.getFTDAnalytics = void 0;
const Sale_1 = __importDefault(require("../models/Sale"));
const User_1 = __importDefault(require("../models/User"));
const getFTDAnalytics = async (req, res) => {
    try {
        const { date } = req.query; // YYYY-MM-DD
        if (!date)
            return res.status(400).json({ success: false, message: 'Date is required' });
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        const matchQuery = {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'active'
        };
        // 1. Overall Metrics
        const metrics = await Sale_1.default.aggregate([
            { $match: matchQuery },
            { $group: {
                    _id: null,
                    totalRevenue: { $sum: '$saleAmount' },
                    totalSales: { $sum: 1 }
                } }
        ]);
        // 2. Hourly Velocity (0 to 23 hours)
        const hourlyVelocity = await Sale_1.default.aggregate([
            { $match: matchQuery },
            { $group: {
                    _id: { $hour: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
                    sales: { $sum: 1 },
                    revenue: { $sum: '$saleAmount' }
                } },
            { $sort: { '_id': 1 } }
        ]);
        // Normalize hourly data to ensure all 24 hours exist
        const normalizedHourly = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            sales: 0,
            revenue: 0
        }));
        hourlyVelocity.forEach(h => {
            // Depending on the version of mongo and daylight savings, hour might be outside bounds if poorly formatted
            if (h._id >= 0 && h._id < 24) {
                normalizedHourly[h._id].sales = h.sales;
                normalizedHourly[h._id].revenue = h.revenue;
            }
        });
        // 3. Top Performers (by HCC)
        const topPerformers = await Sale_1.default.aggregate([
            { $match: matchQuery },
            { $group: {
                    _id: '$hccId',
                    sales: { $sum: 1 },
                    revenue: { $sum: '$saleAmount' }
                } },
            { $sort: { revenue: -1 } },
            { $limit: 10 },
            { $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                } },
            { $unwind: '$user' },
            { $project: {
                    _id: 1,
                    sales: 1,
                    revenue: 1,
                    name: '$user.name',
                    memberId: '$user.memberId'
                } }
        ]);
        return res.status(200).json({
            success: true,
            data: {
                metrics: metrics[0] || { totalRevenue: 0, totalSales: 0 },
                hourlyVelocity: normalizedHourly,
                topPerformers
            }
        });
    }
    catch (error) {
        console.error('[Analytics] FTD Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getFTDAnalytics = getFTDAnalytics;
const getMTDAnalytics = async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM
        if (!month)
            return res.status(400).json({ success: false, message: 'Month is required' });
        const matchQuery = {
            cycleMonth: month,
            status: 'active'
        };
        // 1. Overall Metrics
        const metrics = await Sale_1.default.aggregate([
            { $match: matchQuery },
            { $group: {
                    _id: null,
                    totalRevenue: { $sum: '$saleAmount' },
                    totalSales: { $sum: 1 }
                } }
        ]);
        // 2. State Breakdown
        const stateBreakdown = await Sale_1.default.aggregate([
            { $match: matchQuery },
            { $lookup: {
                    from: 'users',
                    localField: 'hccId',
                    foreignField: '_id',
                    as: 'seller'
                } },
            { $unwind: '$seller' },
            { $group: {
                    _id: '$seller.state',
                    revenue: { $sum: '$saleAmount' },
                    sales: { $sum: 1 }
                } },
            { $sort: { revenue: -1 } }
        ]);
        // 3. New Members (Users created this month)
        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr);
        const monthNum = parseInt(monthStr) - 1; // 0-indexed
        const startOfMonth = new Date(year, monthNum, 1);
        const endOfMonth = new Date(year, monthNum + 1, 0, 23, 59, 59, 999);
        const newMembersCount = await User_1.default.countDocuments({
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });
        return res.status(200).json({
            success: true,
            data: {
                metrics: metrics[0] || { totalRevenue: 0, totalSales: 0 },
                stateBreakdown,
                newMembersCount
            }
        });
    }
    catch (error) {
        console.error('[Analytics] MTD Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getMTDAnalytics = getMTDAnalytics;
