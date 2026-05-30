"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEPinCount = void 0;
const EPin_1 = __importDefault(require("../../models/EPin"));
const getEPinCount = async (userId) => {
    try {
        const activeCount = await EPin_1.default.countDocuments({ currentOwnerId: userId, status: 'active' });
        const usedCount = await EPin_1.default.countDocuments({ currentOwnerId: userId, status: 'used' });
        return { activeCount, usedCount };
    }
    catch (error) {
        console.error('[Chatbot DB] getEPinCount Error:', error);
        return { activeCount: 0, usedCount: 0 };
    }
};
exports.getEPinCount = getEPinCount;
