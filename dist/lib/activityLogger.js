"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = void 0;
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
const User_1 = __importDefault(require("../models/User"));
const logActivity = async (userId, action, category, details, ipAddress, location) => {
    try {
        const user = await User_1.default.findById(userId);
        if (!user)
            return;
        const log = new ActivityLog_1.default({
            userId,
            userName: user.name,
            userRole: user.role,
            action,
            category,
            details,
            ipAddress,
            location
        });
        await log.save();
        console.log(`[ACTIVITY LOG] ${user.name} (${user.role}) -> ${action} | Loc: ${location ? `${location.lat},${location.lng}` : 'NONE'}`);
    }
    catch (err) {
        console.error('Failed to log activity', err);
    }
};
exports.logActivity = logActivity;
