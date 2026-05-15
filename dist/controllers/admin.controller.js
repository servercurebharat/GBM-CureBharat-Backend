"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserStatus = exports.createManualAdjustment = exports.updateKYCStatus = exports.getPendingKYC = exports.updateCommissionConfig = exports.getCommissionConfig = void 0;
const Config_1 = __importDefault(require("../models/Config"));
const User_1 = __importDefault(require("../models/User"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
/**
 * GET /api/admin/commission-config
 * Fetch all system configuration parameters
 */
const getCommissionConfig = async (req, res) => {
    try {
        const configs = await Config_1.default.find();
        const configMap = configs.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        res.json({ success: true, data: configMap });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCommissionConfig = getCommissionConfig;
/**
 * PUT /api/admin/commission-config
 * Update system configuration parameters (Admin Only)
 */
const updateCommissionConfig = async (req, res) => {
    try {
        const updates = req.body; // Expecting { key: value }
        const adminId = req.user.id;
        for (const [key, value] of Object.entries(updates)) {
            await Config_1.default.findOneAndUpdate({ key }, {
                value,
                updatedBy: adminId,
                updatedAt: new Date()
            }, { upsert: true });
        }
        res.json({ success: true, message: 'Configuration updated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateCommissionConfig = updateCommissionConfig;
/**
 * GET /api/admin/kyc/pending
 * Fetch all users with pending KYC status
 */
const getPendingKYC = async (req, res) => {
    try {
        const users = await User_1.default.find({ kycStatus: 'pending' })
            .select('name mobile email memberId state kycDocuments kycStatus joiningDate')
            .sort({ joiningDate: 1 });
        res.json({ success: true, data: users });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPendingKYC = getPendingKYC;
/**
 * PUT /api/admin/kyc/:id/status
 * Approve or reject a member's KYC
 */
const updateKYCStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        const user = await User_1.default.findByIdAndUpdate(id, { kycStatus: status }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({
            success: true,
            message: `KYC ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
            user
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateKYCStatus = updateKYCStatus;
/**
 * POST /api/admin/manual-adjustment
 * Apply manual credit or debit to a member's wallet
 */
const createManualAdjustment = async (req, res) => {
    try {
        const { memberId, amount, type, reason } = req.body;
        const adminId = req.user.id;
        if (!memberId || !amount || !type || !reason) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        if (!['credit', 'debit'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid adjustment type' });
        }
        // Find user by memberId
        const user = await User_1.default.findOne({ memberId });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        // Find wallet
        const wallet = await Wallet_1.default.findOne({ user: user._id });
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found for this member' });
        }
        const amountPaise = Math.round(parseFloat(amount) * 100);
        const adjustmentValue = type === 'credit' ? amountPaise : -amountPaise;
        // Apply adjustment to final balance (manual adjustments are usually final)
        wallet.finalBalance += adjustmentValue;
        if (type === 'credit') {
            wallet.totalEarned += amountPaise;
        }
        // Record in ledger
        wallet.ledger.push({
            amount: adjustmentValue,
            type: 'manual',
            description: `Manual Adjustment: ${reason}`,
            status: 'final',
            date: new Date(),
            cycleMonth: new Date().toISOString().slice(0, 7)
        });
        await wallet.save();
        res.json({
            success: true,
            message: `Manual ${type} of ₹${amount} processed for ${user.name}`,
            data: {
                newBalance: wallet.finalBalance / 100
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createManualAdjustment = createManualAdjustment;
/**
 * PUT /api/admin/users/:id/status
 * Change user status (active, inactive, blocked)
 */
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['active', 'inactive', 'blocked'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        const user = await User_1.default.findByIdAndUpdate(id, { status }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: `Status updated to ${status}`, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateUserStatus = updateUserStatus;
