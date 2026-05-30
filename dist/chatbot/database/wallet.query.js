"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWalletHistory = exports.getWalletBalance = void 0;
const Wallet_1 = __importDefault(require("../../models/Wallet"));
const getWalletBalance = async (userId) => {
    try {
        const wallet = await Wallet_1.default.findOne({ userId }).lean();
        if (!wallet) {
            return { finalBalance: 0, provisionalBalance: 0, totalEarned: 0 };
        }
        return {
            finalBalance: wallet.finalBalance || 0,
            provisionalBalance: wallet.provisionalBalance || 0,
            totalEarned: wallet.totalEarned || 0
        };
    }
    catch (error) {
        console.error('[Chatbot DB] getWalletBalance Error:', error);
        return { finalBalance: 0, provisionalBalance: 0, totalEarned: 0 };
    }
};
exports.getWalletBalance = getWalletBalance;
const getWalletHistory = async (userId) => {
    try {
        const wallet = await Wallet_1.default.findOne({ userId }).lean();
        if (!wallet || !wallet.ledger)
            return [];
        // Return last 5 transactions
        return wallet.ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }
    catch (error) {
        console.error('[Chatbot DB] getWalletHistory Error:', error);
        return [];
    }
};
exports.getWalletHistory = getWalletHistory;
