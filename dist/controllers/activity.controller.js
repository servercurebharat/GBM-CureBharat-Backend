"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivityLogs = void 0;
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
const getActivityLogs = async (req, res) => {
    try {
        const { role, category, search, page = 1, limit = 50 } = req.query;
        const query = {};
        if (role && role !== 'All') {
            query.userRole = role.toString().toLowerCase();
        }
        if (category && category !== 'All') {
            query.category = category.toString().toLowerCase();
        }
        if (search) {
            query.$or = [
                { userName: { $regex: search.toString(), $options: 'i' } },
                { action: { $regex: search.toString(), $options: 'i' } },
                { details: { $regex: search.toString(), $options: 'i' } }
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [logs, total] = await Promise.all([
            ActivityLog_1.default.find(query)
                .populate('userId', 'totalTimeSpent')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            ActivityLog_1.default.countDocuments(query)
        ]);
        res.json({
            success: true,
            data: logs,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getActivityLogs = getActivityLogs;
