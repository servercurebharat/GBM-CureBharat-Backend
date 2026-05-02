"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateKYCStatus = exports.getPendingKYC = exports.updateCommissionConfig = exports.getCommissionConfig = void 0;
const Config_1 = __importDefault(require("../models/Config"));
const User_1 = __importDefault(require("../models/User"));
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
