"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamMembers = exports.getSponsor = exports.getTeamSize = exports.getUserRank = exports.getKYCStatus = void 0;
const User_1 = __importDefault(require("../../models/User"));
const getKYCStatus = async (userId) => {
    try {
        const user = await User_1.default.findById(userId).select('kycStatus').lean();
        return user?.kycStatus || 'pending';
    }
    catch (error) {
        console.error('[Chatbot DB] getKYCStatus Error:', error);
        return 'unknown';
    }
};
exports.getKYCStatus = getKYCStatus;
const getUserRank = async (userId) => {
    try {
        const user = await User_1.default.findById(userId).select('rank').lean();
        return user?.rank || 'HCC';
    }
    catch (error) {
        console.error('[Chatbot DB] getUserRank Error:', error);
        return 'unknown';
    }
};
exports.getUserRank = getUserRank;
const getTeamSize = async (userId) => {
    try {
        // Assuming teamSize might be stored or we just count direct referrals
        const count = await User_1.default.countDocuments({ referrer: userId });
        return count;
    }
    catch (error) {
        console.error('[Chatbot DB] getTeamSize Error:', error);
        return 0;
    }
};
exports.getTeamSize = getTeamSize;
const getSponsor = async (userId) => {
    try {
        const user = await User_1.default.findById(userId).populate('referrer', 'name mobile rank').lean();
        if (!user || !user.referrer)
            return null;
        return user.referrer;
    }
    catch (error) {
        console.error('[Chatbot DB] getSponsor Error:', error);
        return null;
    }
};
exports.getSponsor = getSponsor;
const getTeamMembers = async (user) => {
    try {
        let query = {};
        switch (user.role?.toLowerCase()) {
            case 'admin':
                query = {
                    role: { $ne: 'admin' }
                };
                break;
            case 'sh':
                query = {
                    state: user.state,
                    role: { $in: ['hba', 'hcm', 'hcc'] }
                };
                break;
            case 'hba':
                query = {
                    role: { $in: ['hcm', 'hcc'] }
                };
                break;
            case 'hcm':
                query = {
                    role: 'hcc'
                };
                break;
            default:
                return [];
        }
        const members = await User_1.default.find(query)
            .select('name role rank state memberId')
            .lean();
        return members;
    }
    catch (error) {
        console.error('[Chatbot DB] getTeamMembers Error:', error);
        return [];
    }
};
exports.getTeamMembers = getTeamMembers;
