"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUpdateCustomerProfile = exports.deleteUser = exports.adminUpdateMemberProfile = exports.getCustomCommissions = exports.setCustomCommission = exports.sendKycLink = exports.sendAnnouncement = exports.resetUserPassword = exports.updateUserStatus = exports.createManualAdjustment = exports.verifyBankDetails = exports.getPendingBankUpdates = exports.updateKYCStatus = exports.getPendingKYC = exports.updateCommissionConfig = exports.getCommissionConfig = void 0;
const Config_1 = __importDefault(require("../models/Config"));
const User_1 = __importDefault(require("../models/User"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const Notification_1 = __importDefault(require("../models/Notification"));
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
const Sale_1 = __importDefault(require("../models/Sale"));
const CustomerKYC_1 = __importDefault(require("../models/CustomerKYC"));
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
/**
 * POST /api/admin/sales/:id/send-kyc-link
 * Send an email to the customer with a link to complete their KYC profile
 */
const sendKycLink = async (req, res) => {
    try {
        const saleId = req.params.id;
        const sale = await Sale_1.default.findById(saleId).populate('plan');
        if (!sale)
            return res.status(404).json({ success: false, message: 'Sale not found' });
        if (!sale.customerEmail)
            return res.status(400).json({ success: false, message: 'Customer has no email address on file' });
        let frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').trim();
        if (!frontendUrl.startsWith('http'))
            frontendUrl = `https://${frontendUrl}`;
        const kycLink = `${frontendUrl}/customer-kyc/${sale._id}`;
        const planName = sale.plan?.name || 'Wellness Plan';
        const emailHtml = `
      <h3>Action Required: Complete Your Profile</h3>
      <p>Dear ${sale.customerName},</p>
      <p>Your enrollment for <strong>${planName}</strong> requires profile completion. (Policy ID: ${sale.policyId})</p>
      <p>To generate your official Policy Document and Health Cards, please complete your detailed KYC profile by clicking the button below.</p>
      <div style="margin: 30px 0;">
        <a href="${kycLink}" style="background-color: #49D2B5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Complete Profile Now</a>
      </div>
      <p>If you have any questions, feel free to reply to this email.</p>
    `;
        await (0, mailer_1.sendEmail)(sale.customerEmail, 'Action Required: Complete Your CureBharat Policy Profile', emailHtml);
        return res.status(200).json({ success: true, message: 'KYC link sent successfully' });
    }
    catch (error) {
        console.error('Error sending KYC link:', error);
        return res.status(500).json({ success: false, message: 'Server Error' });
    }
};
exports.sendKycLink = sendKycLink;
/**
 * POST /api/admin/custom-commission
 * Set custom commission rate for an individual member
 */
const setCustomCommission = async (req, res) => {
    try {
        const { memberId, customCommissionRate } = req.body;
        if (!memberId) {
            return res.status(400).json({ success: false, message: 'Member ID is required' });
        }
        const user = await User_1.default.findOne({ memberId });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        // Set or unset the custom rate
        if (customCommissionRate === '' || customCommissionRate === null || customCommissionRate === undefined) {
            user.customCommissionRate = undefined;
        }
        else {
            user.customCommissionRate = parseFloat(customCommissionRate);
        }
        await user.save();
        res.json({
            success: true,
            message: `Commission override for ${user.memberId} updated successfully.`,
            data: { memberId: user.memberId, customCommissionRate: user.customCommissionRate }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.setCustomCommission = setCustomCommission;
/**
 * GET /api/admin/custom-commission
 * Get list of all users with custom commission rates
 */
const getCustomCommissions = async (req, res) => {
    try {
        const users = await User_1.default.find({
            customCommissionRate: { $exists: true, $ne: null }
        }).select('name memberId role rank customCommissionRate state');
        res.json({ success: true, data: users });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCustomCommissions = getCustomCommissions;
/**
 * PUT /api/admin/users/:id/profile
 * Admin can fully edit any member's profile details
 * (no OTP or bank verification restrictions)
 */
const adminUpdateMemberProfile = async (req, res) => {
    try {
        const { id } = req.params;
        let { name, email, mobile, gender, dob, state, occupation, maritalStatus, alternateMobile, address, bankDetails, nomineeDetails, kycDocuments, profileImage } = req.body;
        // If using FormData, nested objects might come as strings
        try {
            if (typeof address === 'string')
                address = JSON.parse(address);
        }
        catch (e) {
            address = {};
        }
        try {
            if (typeof bankDetails === 'string')
                bankDetails = JSON.parse(bankDetails);
        }
        catch (e) {
            bankDetails = {};
        }
        try {
            if (typeof nomineeDetails === 'string')
                nomineeDetails = JSON.parse(nomineeDetails);
        }
        catch (e) {
            nomineeDetails = {};
        }
        try {
            if (typeof kycDocuments === 'string')
                kycDocuments = JSON.parse(kycDocuments);
        }
        catch (e) {
            kycDocuments = {};
        }
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Handle File Uploads
        const files = req.files;
        const getUrl = (fieldname) => files?.[fieldname]?.[0]?.path;
        const af = getUrl('aadhaarFront');
        const ab = getUrl('aadhaarBack');
        const pc = getUrl('panCard');
        const bp = getUrl('bankProof');
        const sf = getUrl('selfie');
        const pi = getUrl('profileImage');
        // Personal info
        if (name !== undefined)
            user.name = name;
        if (email !== undefined)
            user.email = email;
        if (mobile !== undefined)
            user.mobile = mobile;
        if (gender !== undefined)
            user.gender = gender === '' ? undefined : gender;
        if (dob !== undefined)
            user.dob = dob ? new Date(dob) : undefined;
        if (state !== undefined)
            user.state = state;
        if (occupation !== undefined)
            user.occupation = occupation;
        if (maritalStatus !== undefined)
            user.maritalStatus = maritalStatus;
        if (alternateMobile !== undefined)
            user.alternateMobile = alternateMobile;
        if (profileImage !== undefined)
            user.profileImage = profileImage;
        if (pi)
            user.profileImage = pi;
        // Address
        if (address !== undefined) {
            user.address = { ...(user.address || {}), ...address };
        }
        // Bank details — admin bypasses OTP, sets verified directly
        if (bankDetails !== undefined) {
            user.bankDetails = {
                ...(user.bankDetails || {}),
                ...bankDetails,
                verificationStatus: 'verified',
            };
        }
        // Nominee details
        if (nomineeDetails !== undefined) {
            user.nomineeDetails = { ...(user.nomineeDetails || {}), ...nomineeDetails };
        }
        // KYC documents (numbers + document URLs)
        if (kycDocuments !== undefined || af || ab || pc || bp || sf) {
            user.kycDocuments = { ...(user.kycDocuments || {}), ...(kycDocuments || {}) };
            if (af)
                user.kycDocuments.aadhaarFrontUrl = af;
            if (ab)
                user.kycDocuments.aadhaarBackUrl = ab;
            if (pc)
                user.kycDocuments.panUrl = pc;
            if (bp)
                user.kycDocuments.bankProofUrl = bp;
            if (sf)
                user.kycDocuments.selfieUrl = sf;
        }
        await user.save();
        // Activity log
        await ActivityLog_1.default.create({
            userId: req.user._id,
            userName: req.user.name,
            userRole: 'admin',
            action: 'ADMIN_PROFILE_EDIT',
            category: 'system',
            details: `Admin edited profile of member ${user.memberId} (${user.name})`,
            ipAddress: req.ip,
        });
        return res.status(200).json({
            success: true,
            message: 'Member profile updated successfully',
            data: user,
        });
    }
    catch (error) {
        console.error('[Admin] adminUpdateMemberProfile Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.adminUpdateMemberProfile = adminUpdateMemberProfile;
/**
 * DELETE /api/admin/users/:id
 * Delete a user permanently
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Also delete their wallet to keep database clean
        await Wallet_1.default.deleteOne({ user: id });
        await User_1.default.deleteOne({ _id: id });
        res.json({ success: true, message: 'User deleted permanently' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteUser = deleteUser;
/**
 * PUT /api/admin/customers/:id/profile
 * Admin updates a customer's basic info and KYC
 */
const adminUpdateCustomerProfile = async (req, res) => {
    try {
        const { id } = req.params; // Sale ID
        let { saleData, kycData } = req.body;
        // Parse stringified JSON if coming from FormData
        try {
            if (typeof saleData === 'string')
                saleData = JSON.parse(saleData);
        }
        catch (e) {
            saleData = {};
        }
        try {
            if (typeof kycData === 'string')
                kycData = JSON.parse(kycData);
        }
        catch (e) {
            kycData = {};
        }
        const sale = await Sale_1.default.findById(id);
        if (!sale) {
            return res.status(404).json({ success: false, message: 'Customer sale not found' });
        }
        // Update Sale fields
        if (saleData) {
            if (saleData.customerName !== undefined)
                sale.customerName = saleData.customerName;
            if (saleData.customerMobile !== undefined)
                sale.customerMobile = saleData.customerMobile;
            if (saleData.customerEmail !== undefined)
                sale.customerEmail = saleData.customerEmail;
            if (saleData.customerState !== undefined)
                sale.customerState = saleData.customerState;
            if (saleData.customerDOB !== undefined)
                sale.customerDOB = saleData.customerDOB;
            if (saleData.customerPAN !== undefined)
                sale.customerPAN = saleData.customerPAN;
            if (saleData.nomineeName !== undefined)
                sale.nomineeName = saleData.nomineeName;
            if (saleData.nomineeRelation !== undefined)
                sale.nomineeRelation = saleData.nomineeRelation;
            await sale.save();
        }
        // Update KYC fields
        if (kycData) {
            let kyc = await CustomerKYC_1.default.findOne({ saleId: id });
            if (!kyc) {
                kyc = new CustomerKYC_1.default({
                    saleId: id,
                    fullName: saleData?.customerName || sale.customerName || '',
                    mobile: saleData?.customerMobile || sale.customerMobile || '',
                    dob: saleData?.customerDOB || sale.customerDOB || '',
                    email: saleData?.customerEmail || sale.customerEmail || '',
                    gender: '',
                    maritalStatus: '',
                    occupation: '',
                    pan: saleData?.customerPAN || sale.customerPAN || '',
                    addressLine1: '',
                    city: '',
                    state: saleData?.customerState || sale.customerState || '',
                    pincode: '',
                    familyDetails: []
                });
            }
            const mergeKyc = (key) => {
                if (kycData[key] !== undefined)
                    kyc[key] = kycData[key];
            };
            mergeKyc('fullName');
            mergeKyc('dob');
            mergeKyc('gender');
            mergeKyc('maritalStatus');
            mergeKyc('occupation');
            mergeKyc('pan');
            mergeKyc('mobile');
            mergeKyc('alternateMobile');
            mergeKyc('email');
            mergeKyc('addressLine1');
            mergeKyc('addressLine2');
            mergeKyc('city');
            mergeKyc('state');
            mergeKyc('pincode');
            mergeKyc('existingMedicalConditions');
            mergeKyc('currentMedications');
            mergeKyc('lifestyle');
            if (kycData.familyDetails !== undefined) {
                kyc.familyDetails = kycData.familyDetails;
            }
            if (kycData.nomineeName !== undefined)
                kyc.nomineeName = kycData.nomineeName;
            if (kycData.nomineeRelation !== undefined)
                kyc.nomineeRelation = kycData.nomineeRelation;
            if (kycData.nomineeDOB !== undefined)
                kyc.nomineeDOB = kycData.nomineeDOB;
            if (kycData.nomineeContact !== undefined)
                kyc.nomineeContact = kycData.nomineeContact;
            const files = req.files;
            if (files?.aadhaarFront?.[0])
                kyc.aadhaarFrontUrl = files.aadhaarFront[0].path;
            if (files?.aadhaarBack?.[0])
                kyc.aadhaarBackUrl = files.aadhaarBack[0].path;
            if (files?.panCard?.[0])
                kyc.panUrl = files.panCard[0].path;
            if (files?.selfie?.[0])
                kyc.selfieUrl = files.selfie[0].path;
            await kyc.save();
        }
        await ActivityLog_1.default.create({
            userId: req.user._id,
            userName: req.user.name,
            userRole: 'admin',
            action: 'ADMIN_CUSTOMER_EDIT',
            category: 'system',
            details: `Admin edited profile of customer ${sale.customerName} (Policy: ${sale.policyId})`,
            ipAddress: req.ip,
        });
        return res.status(200).json({
            success: true,
            message: 'Customer profile updated successfully'
        });
    }
    catch (error) {
        console.error('[Admin] adminUpdateCustomerProfile Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.adminUpdateCustomerProfile = adminUpdateCustomerProfile;
