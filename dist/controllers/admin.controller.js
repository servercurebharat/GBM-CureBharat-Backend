"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAnnouncement = exports.resetUserPassword = exports.updateUserStatus = exports.createManualAdjustment = exports.verifyBankDetails = exports.getPendingBankUpdates = exports.updateKYCStatus = exports.getPendingKYC = exports.updateCommissionConfig = exports.getCommissionConfig = void 0;
const Config_1 = __importDefault(require("../models/Config"));
const User_1 = __importDefault(require("../models/User"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const Notification_1 = __importDefault(require("../models/Notification"));
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
const notification_controller_1 = require("./notification.controller");
const mailer_1 = require("../lib/mailer");
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
        // Trigger in-app notification to the user
        try {
            await (0, notification_controller_1.createNotification)(user._id.toString(), `KYC Verification ${status === 'approved' ? 'Approved' : 'Rejected'}`, status === 'approved'
                ? 'Congratulations! Your identity documents have been approved. You now have full dashboard access.'
                : 'Your identity documents were rejected. Please check your uploaded proofs and re-submit.', status === 'approved' ? 'success' : 'error', '/hcc/profile');
        }
        catch (notifErr) {
            console.error('[Admin KYC Status Notif] Failed to create in-app notification:', notifErr);
        }
        // Trigger email notification to the user
        if (user.email) {
            try {
                await (0, mailer_1.sendKYCStatusMail)(user.email, user.name, user.memberId, status);
            }
            catch (mailErr) {
                console.error('[Admin KYC Status Mail] Failed to send email:', mailErr);
            }
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
 * GET /api/admin/bank-updates/pending
 * Fetch all users with pending bank detail verification
 */
const getPendingBankUpdates = async (req, res) => {
    try {
        const users = await User_1.default.find({ 'bankDetails.verificationStatus': 'pending' })
            .select('name mobile email memberId bankDetails kycStatus')
            .sort({ updatedAt: -1 });
        res.json({ success: true, data: users });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPendingBankUpdates = getPendingBankUpdates;
const verifyBankDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'verified' or 'rejected'
        if (!['verified', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (status === 'verified') {
            if (!user.bankDetails) {
                user.bankDetails = {};
            }
            user.bankDetails.bankName = user.kycDocuments?.bankName || '';
            user.bankDetails.accountNumber = user.kycDocuments?.accountNumber || '';
            user.bankDetails.ifscCode = user.kycDocuments?.ifscCode || '';
            user.bankDetails.accountHolderName = user.name; // Default account holder name to user's name
            user.bankDetails.verificationStatus = 'verified';
            user.markModified('bankDetails');
        }
        else {
            if (user.bankDetails) {
                user.bankDetails.verificationStatus = 'rejected';
                user.markModified('bankDetails');
            }
        }
        await user.save();
        // Log
        await ActivityLog_1.default.create({
            userId: req.user._id,
            userName: req.user.name,
            userRole: req.user.role,
            action: status === 'verified' ? 'BANK_VERIFIED' : 'BANK_REJECTED',
            category: 'kyc',
            details: `${status === 'verified' ? 'Approved' : 'Rejected'} bank details for ${user.name} (${user.memberId})`,
            ipAddress: req.ip
        });
        // Trigger in-app notification to the user
        try {
            await (0, notification_controller_1.createNotification)(user._id.toString(), `Bank Account ${status === 'verified' ? 'Verified' : 'Rejected'}`, status === 'verified'
                ? 'Your bank account verification was successful. You can now request payouts.'
                : 'Your bank account details were rejected. Please verify your bank info and re-upload valid proof.', status === 'verified' ? 'success' : 'error', '/hcc/profile');
        }
        catch (notifErr) {
            console.error('[Admin Bank Status Notif] Failed to create in-app notification:', notifErr);
        }
        // Trigger email notification to the user
        if (user.email) {
            try {
                await (0, mailer_1.sendBankStatusMail)(user.email, user.name, user.memberId, status);
            }
            catch (mailErr) {
                console.error('[Admin Bank Status Mail] Failed to send email:', mailErr);
            }
        }
        res.json({ success: true, message: `Bank details ${status} successfully` });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.verifyBankDetails = verifyBankDetails;
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
/**
 * PUT /api/admin/users/:id/reset-password
 * Reset user password to default (123456)
 */
const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        user.password = '123456';
        await user.save();
        res.json({ success: true, message: `Password reset successfully to 123456` });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.resetUserPassword = resetUserPassword;
/**
 * POST /api/admin/announcements
 * Send broadcast messages/offers to selected or all users
 */
const sendAnnouncement = async (req, res) => {
    try {
        const { userIds, title, message, type, sendToAll } = req.body;
        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }
        let targetUserIds = [];
        if (sendToAll) {
            const allUsers = await User_1.default.find({ status: 'active' }).select('_id');
            targetUserIds = allUsers.map(u => u._id.toString());
        }
        else {
            targetUserIds = userIds || [];
        }
        if (targetUserIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No users selected for announcement' });
        }
        // Create notifications in bulk
        const notifications = targetUserIds.map(uid => ({
            userId: uid,
            title,
            message,
            type: type || 'info',
            isRead: false,
            createdAt: new Date()
        }));
        await Notification_1.default.insertMany(notifications);
        // Mock Email sending (placeholder for future implementation)
        console.log(`[Announcement] Sending "${title}" to ${targetUserIds.length} users via Email (Mocked)`);
        res.json({
            success: true,
            message: `Announcement sent successfully to ${targetUserIds.length} users`
        });
    }
    catch (error) {
        console.error('[Admin] sendAnnouncement error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.sendAnnouncement = sendAnnouncement;
