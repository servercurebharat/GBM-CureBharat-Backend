"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamList = exports.getTeamStats = void 0;
const User_1 = __importDefault(require("../models/User"));
const Sale_1 = __importDefault(require("../models/Sale"));
const mongoose_1 = __importDefault(require("mongoose"));
const getTeamStats = async (req, res) => {
    try {
        const userId = new mongoose_1.default.Types.ObjectId(req.user._id);
        // 1. Get all downline user IDs using graphLookup
        const downline = await User_1.default.aggregate([
            { $match: { _id: userId } },
            {
                $graphLookup: {
                    from: 'users',
                    startWith: '$_id',
                    connectFromField: '_id',
                    connectToField: 'referrerId',
                    as: 'allDownline',
                    depthField: 'level'
                }
            }
        ]);
        const team = downline[0]?.allDownline || [];
        const totalMembers = team.length;
        const activeMembers = team.filter((u) => u.status === 'active').length;
        const maxDepth = team.length > 0 ? Math.max(...team.map((u) => u.level)) + 1 : 0;
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const newJoins = team.filter((u) => new Date(u.createdAt) > oneDayAgo).length;
        const roleDistribution = {
            sh: team.filter((u) => u.role === 'sh').length,
            hba: team.filter((u) => u.role === 'hba').length,
            hcm: team.filter((u) => u.role === 'hcm').length,
            hcc: team.filter((u) => u.role === 'hcc').length,
        };
        return res.status(200).json({
            success: true,
            data: {
                totalMembers,
                activeMembers,
                maxDepth,
                newJoins,
                roleDistribution
            }
        });
    }
    catch (error) {
        console.error('[Team] getTeamStats Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getTeamStats = getTeamStats;
const getTeamList = async (req, res) => {
    try {
        const userId = new mongoose_1.default.Types.ObjectId(req.user._id);
        const { role, search, page = 1, limit = 10, parentId, state } = req.query;
        let query = {};
        if (parentId) {
            query = { referrerId: new mongoose_1.default.Types.ObjectId(parentId) };
        }
        else {
            // Always find direct downline for the current user
            query = { referrerId: userId };
            if (role)
                query.role = role;
        }
        if (state) {
            query.state = state;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { memberId: { $regex: search, $options: 'i' } }
            ];
        }
        const members = await User_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean();
        // For each member, calculate some stats (total sales in their team, etc.)
        const enrichedMembers = await Promise.all(members.map(async (m) => {
            // Simple count of their directs
            const directCount = await User_1.default.countDocuments({ referrerId: m._id });
            // Calculate team sales for this member
            const sales = await Sale_1.default.find({
                $or: [
                    { sellerId: m._id },
                    { hccId: m._id },
                    { hcmId: m._id },
                    { hbaId: m._id },
                    { shId: m._id }
                ],
                status: 'active'
            });
            const teamSalesValue = sales.reduce((acc, s) => acc + s.saleAmount, 0);
            return {
                ...m,
                directCount,
                teamSalesValue,
                overrideValue: Math.round(teamSalesValue * 0.02) // Example 2% override for display
            };
        }));
        const total = await User_1.default.countDocuments(query);
        return res.status(200).json({
            success: true,
            data: enrichedMembers,
            pagination: { total, page: Number(page), limit: Number(limit) }
        });
    }
    catch (error) {
        console.error('[Team] getTeamList Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getTeamList = getTeamList;
