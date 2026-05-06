"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyPins = exports.transferEPin = exports.generateEPins = void 0;
const EPin_1 = __importDefault(require("../models/EPin"));
const Plan_1 = __importDefault(require("../models/Plan"));
const User_1 = __importDefault(require("../models/User"));
const generateEPins = async (req, res) => {
    try {
        const { planId, quantity, assignToUserId } = req.body;
        if (!planId || !quantity) {
            return res.status(400).json({ success: false, message: 'Plan ID and quantity are required' });
        }
        const plan = await Plan_1.default.findById(planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }
        let targetUserId = req.user._id;
        if (assignToUserId) {
            const targetUser = await User_1.default.findOne({ memberId: assignToUserId });
            if (!targetUser) {
                return res.status(404).json({ success: false, message: `Member ${assignToUserId} not found` });
            }
            targetUserId = targetUser._id;
        }
        const pins = [];
        const gstAmount = Math.round((plan.price * (plan.gstPercent || 18)) / 100);
        const totalValue = plan.price + gstAmount;
        for (let i = 0; i < quantity; i++) {
            const pinCode = `CB-PIN-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
            pins.push({
                pinCode,
                value: totalValue,
                plan: planId,
                generatedBy: req.user._id,
                currentOwnerId: targetUserId,
                status: 'unused'
            });
        }
        await EPin_1.default.insertMany(pins);
        return res.status(201).json({
            success: true,
            message: `${quantity} E-Pins generated successfully`,
            data: pins.map(p => p.pinCode)
        });
    }
    catch (error) {
        console.error('[EPin] generateEPins Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.generateEPins = generateEPins;
const transferEPin = async (req, res) => {
    try {
        const { pinCode, toMemberId } = req.body;
        const pin = await EPin_1.default.findOne({ pinCode, status: 'unused', currentOwnerId: req.user._id });
        if (!pin) {
            return res.status(400).json({ success: false, message: 'Pin not found or not owned by you' });
        }
        const targetUser = await User_1.default.findOne({ memberId: toMemberId });
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'Target user not found' });
        }
        pin.transferHistory.push({
            from: req.user._id,
            to: targetUser._id,
            date: new Date()
        });
        pin.currentOwnerId = targetUser._id;
        await pin.save();
        return res.status(200).json({
            success: true,
            message: `E-Pin ${pinCode} transferred to ${targetUser.name} (${toMemberId})`
        });
    }
    catch (error) {
        console.error('[EPin] transferEPin Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.transferEPin = transferEPin;
const getMyPins = async (req, res) => {
    try {
        const unused = await EPin_1.default.find({ currentOwnerId: req.user._id, status: 'unused' }).populate('plan', 'name price').lean();
        const used = await EPin_1.default.find({ currentOwnerId: req.user._id, status: 'used' }).populate('plan', 'name price').limit(20).lean();
        return res.status(200).json({
            success: true,
            data: {
                unused,
                used,
                totalUnused: unused.length
            }
        });
    }
    catch (error) {
        console.error('[EPin] getMyPins Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getMyPins = getMyPins;
