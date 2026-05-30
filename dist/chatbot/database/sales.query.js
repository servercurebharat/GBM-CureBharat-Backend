"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestSale = exports.getSalesCount = void 0;
const Sale_1 = __importDefault(require("../../models/Sale"));
const getSalesCount = async (userId, role) => {
    try {
        let query = {};
        if (role === 'hcc')
            query.hccId = userId;
        else if (role === 'hcm')
            query.hcmId = userId;
        else if (role === 'hba')
            query.hbaId = userId;
        else if (role === 'sh')
            query.shId = userId;
        else
            query.hccId = userId; // fallback
        const count = await Sale_1.default.countDocuments(query);
        return count;
    }
    catch (error) {
        console.error('[Chatbot DB] getSalesCount Error:', error);
        return 0;
    }
};
exports.getSalesCount = getSalesCount;
const getLatestSale = async (userId, role) => {
    try {
        let query = {};
        if (role === 'hcc')
            query.hccId = userId;
        else if (role === 'hcm')
            query.hcmId = userId;
        else if (role === 'hba')
            query.hbaId = userId;
        else if (role === 'sh')
            query.shId = userId;
        else
            query.hccId = userId; // fallback
        const sale = await Sale_1.default.findOne(query).sort({ createdAt: -1 }).lean();
        return sale;
    }
    catch (error) {
        console.error('[Chatbot DB] getLatestSale Error:', error);
        return null;
    }
};
exports.getLatestSale = getLatestSale;
