"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBankUpdateOTP = exports.requestBankUpdateOTP = exports.trackHeartbeat = exports.updateProfile = exports.getUserById = exports.getAllUsers = exports.updateKYC = exports.getUserStats = exports.getAdminTree = exports.getDownline = void 0;
const User_1 = __importDefault(require("../models/User"));
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
const mailer_1 = require("../lib/mailer");
const notification_controller_1 = require("./notification.controller");
const OTP_1 = __importDefault(require("../models/OTP"));
const getDownline = async (req, res) => {
    try {
        const { id } = req.params;
        const users = await User_1.default.find({}).lean();
        const buildTree = (parentId) => {
            return users
                .filter((u) => String(u.referrerId) === String(parentId))
                .map((u) => ({
                ...u,
                children: buildTree(u._id)
            }));
        };
        const rootUser = users.find((u) => String(u._id) === String(id));
        if (!rootUser)
            return res.status(404).json({ success: false, message: 'User not found' });
        const tree = {
            ...rootUser,
            children: buildTree(id)
        };
        return res.status(200).json({ success: true, data: tree });
    }
    catch (error) {
        console.error('[User] getDownline Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getDownline = getDownline;
const getAdminTree = async (req, res) => {
    try {
        const users = await User_1.default.aggregate([
            {
                $lookup: {
                    from: 'wallets',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'wallet'
                }
            },
            {
                $lookup: {
                    from: 'sales',
                    localField: '_id',
                    foreignField: 'sellerId',
                    as: 'salesList'
                }
            },
            {
                $addFields: {
                    totalIncome: { $ifNull: [{ $arrayElemAt: ['$wallet.totalEarned', 0] }, 0] },
                    totalSalesAmount: { $sum: '$salesList.saleAmount' }
                }
            },
            {
                $project: {
                    wallet: 0,
                    salesList: 0,
                    password: 0
                }
            }
        ]);
        const buildTree = (parentId) => {
            return users
                .filter((u) => String(u.referrerId) === String(parentId))
                .map((u) => ({
                ...u,
                children: buildTree(u._id)
            }));
        };
        // Find roots (users with no referrer or whose referrer doesn't exist)
        const roots = users
            .filter((u) => !u.referrerId || !users.find(parent => String(parent._id) === String(u.referrerId)))
            .map((u) => ({
            ...u,
            children: buildTree(u._id)
        }));
        return res.status(200).json({ success: true, data: roots });
    }
    catch (error) {
        console.error('[User] getAdminTree Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getAdminTree = getAdminTree;
const getUserStats = async (req, res) => {
    try {
        const totalUsers = await User_1.default.countDocuments();
        const activeUsers = await User_1.default.countDocuments({ status: 'active' });
        const inactiveUsers = await User_1.default.countDocuments({ status: 'inactive' });
        const pendingKycUsers = await User_1.default.countDocuments({ kycStatus: 'pending' });
        const roles = await User_1.default.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        const roleDistribution = roles.reduce((acc, curr) => {
            if (curr._id) {
                acc[curr._id] = curr.count;
            }
            return acc;
        }, { hcc: 0, hcm: 0, hba: 0, sh: 0, admin: 0 });
        return res.status(200).json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                inactiveUsers,
                pendingKycUsers,
                roleDistribution
            }
        });
    }
    catch (error) {
        console.error('[User] getUserStats Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getUserStats = getUserStats;
const updateKYC = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[KYC] Updating user: ${id}`);
        console.log('[KYC] Body:', req.body);
        console.log('[KYC] Files keys:', Object.keys(req.files || {}));
        const { aadhaarNumber, panNumber, bankName, accountNumber, ifscCode, maritalStatus, occupation, alternateMobile, addressLine1, addressLine2, city, state, zipCode, familyDetails, healthDetails, nomineeDetails, gender, dob } = req.body;
        // Security: Only user themselves or admin can update
        if (req.user._id.toString() !== id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized access' });
        }
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Handle File Uploads from Cloudinary (via multer)
        const files = req.files;
        const getUrl = (fieldname) => {
            const path = files?.[fieldname]?.[0]?.path;
            console.log(`[KYC] Extracted URL for ${fieldname}:`, path);
            return path;
        };
        // Update logic
        if (req.user.role === 'admin' && req.body.kycStatus) {
            user.kycStatus = req.body.kycStatus;
        }
        else {
            user.kycStatus = 'pending';
            // Ensure sub-object exists
            if (!user.kycDocuments)
                user.kycDocuments = {};
            // Update text fields
            if (aadhaarNumber)
                user.kycDocuments.aadhaarNumber = aadhaarNumber;
            if (panNumber)
                user.kycDocuments.panNumber = panNumber;
            if (bankName)
                user.kycDocuments.bankName = bankName;
            if (accountNumber)
                user.kycDocuments.accountNumber = accountNumber;
            if (ifscCode)
                user.kycDocuments.ifscCode = ifscCode;
            // Update URL fields individually
            const af = getUrl('aadhaarFront');
            const ab = getUrl('aadhaarBack');
            const pc = getUrl('panCard');
            const bp = getUrl('bankProof');
            const sf = getUrl('selfie');
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
            if (maritalStatus)
                user.maritalStatus = maritalStatus;
            if (occupation)
                user.occupation = occupation;
            if (alternateMobile)
                user.alternateMobile = alternateMobile;
            if (gender)
                user.gender = gender;
            if (dob)
                user.dob = new Date(dob);
            if (addressLine1 || addressLine2 || city || state || zipCode) {
                user.address = {
                    ...user.address,
                    ...(addressLine1 && { addressLine1 }),
                    ...(addressLine2 && { addressLine2 }),
                    ...(city && { city }),
                    ...(state && { state }),
                    ...(zipCode && { zipCode }),
                };
            }
            if (familyDetails) {
                try {
                    user.familyDetails = typeof familyDetails === 'string' ? JSON.parse(familyDetails) : familyDetails;
                }
                catch { }
            }
            if (healthDetails) {
                try {
                    user.healthDetails = typeof healthDetails === 'string' ? JSON.parse(healthDetails) : healthDetails;
                }
                catch { }
            }
            if (nomineeDetails) {
                try {
                    user.nomineeDetails = typeof nomineeDetails === 'string' ? JSON.parse(nomineeDetails) : nomineeDetails;
                }
                catch { }
            }
            // Force Mongoose to recognize the nested update
            user.markModified('kycDocuments');
            user.markModified('address');
            user.markModified('familyDetails');
            user.markModified('healthDetails');
            user.markModified('nomineeDetails');
        }
        await user.save();
        // Trigger Admin Email Alert if the user is submitting their KYC documents (status = 'pending')
        if (user.kycStatus === 'pending') {
            try {
                console.log(`[KYC] Triggering admin email & in-app alerts for user submission: ${user.name}`);
                const admins = await User_1.default.find({ role: 'admin' });
                if (admins.length > 0) {
                    for (const admin of admins) {
                        // 1. Send in-app notification to the admin
                        await (0, notification_controller_1.createNotification)(admin._id.toString(), 'Pending KYC Verification', `User ${user.name} (${user.memberId}) has submitted verification documents.`, 'warning', `/admin/kyc`);
                        // 2. Send SMTP email alert
                        if (admin.email) {
                            await (0, mailer_1.sendKYCSubmissionAlert)(admin.email, admin.name, {
                                name: user.name,
                                memberId: user.memberId,
                                mobile: user.mobile,
                                email: user.email || 'Not Provided',
                                state: user.state,
                            });
                        }
                    }
                }
                else {
                    // Fallback to Sanskar's email directly if no admins are present in database
                    await (0, mailer_1.sendKYCSubmissionAlert)('namdevsanskar2000@gmail.com', 'Sanskar Namdev', {
                        name: user.name,
                        memberId: user.memberId,
                        mobile: user.mobile,
                        email: user.email || 'Not Provided',
                        state: user.state,
                    });
                }
            }
            catch (err) {
                console.error('[KYC] Admin email/in-app notification failed:', err);
            }
        }
        return res.status(200).json({
            success: true,
            message: 'KYC profile updated with documents.',
            data: user
        });
    }
    catch (error) {
        console.error('[User] updateKYC Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.updateKYC = updateKYC;
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, state, refer, status, kycStatus, sort } = req.query;
        let query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { memberId: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) {
            query.role = role;
        }
        if (state) {
            query.state = state;
        }
        if (status) {
            query.status = status;
        }
        if (kycStatus) {
            query.kycStatus = kycStatus;
        }
        if (refer) {
            // refer could be memberId or name
            const referrer = await User_1.default.findOne({
                $or: [
                    { memberId: refer },
                    { name: { $regex: refer, $options: 'i' } }
                ]
            });
            if (referrer) {
                query.referrerId = referrer._id;
            }
        }
        // Determine sort order: 'oldest' = createdAt asc, default = createdAt desc (newest first)
        const sortOrder = sort === 'oldest' ? 1 : -1;
        const users = await User_1.default.find(query)
            .select('-password')
            .populate('referrerId', 'name memberId')
            .sort({ createdAt: sortOrder })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean();
        const total = await User_1.default.countDocuments(query);
        return res.status(200).json({
            success: true,
            data: users,
            pagination: { total, page: Number(page), limit: Number(limit) }
        });
    }
    catch (error) {
        console.error('[User] getAllUsers Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findById(id).select('-password').lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Fetch total earning from Wallet
        const Wallet = require('../models/Wallet').default;
        const wallet = await Wallet.findOne({ user: id }).select('totalEarned').lean();
        user.totalEarned = wallet ? wallet.totalEarned : 0;
        return res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        console.error('[User] getUserById Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getUserById = getUserById;
const updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, mobile, gender, dob, address, bankDetails, nomineeDetails } = req.body;
        const user = await User_1.default.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Authorization: User can update their own profile, or Admin/SH
        if (req.user.id !== id && !['admin', 'sh'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        if (name)
            user.name = name;
        if (email)
            user.email = email;
        if (mobile)
            user.mobile = mobile;
        if (gender)
            user.gender = gender;
        if (dob)
            user.dob = dob;
        if (address)
            user.address = { ...user.address, ...address };
        if (nomineeDetails)
            user.nomineeDetails = { ...user.nomineeDetails, ...nomineeDetails };
        // Bank Details Logic with Verification Requirement
        if (bankDetails) {
            const isBankChange = bankDetails.accountNumber !== user.bankDetails?.accountNumber ||
                bankDetails.ifscCode !== user.bankDetails?.ifscCode;
            if (isBankChange) {
                // If bank details change, set status to pending for admin verification
                user.bankDetails = {
                    ...bankDetails,
                    verificationStatus: 'pending'
                };
                // Log this sensitive change
                await ActivityLog_1.default.create({
                    userId: user._id,
                    userName: user.name,
                    userRole: user.role,
                    action: 'BANK_UPDATE_REQUEST',
                    category: 'financial',
                    details: `Requested bank detail update for A/C: ${bankDetails.accountNumber}`,
                    ipAddress: req.ip
                });
            }
            else {
                user.bankDetails = { ...user.bankDetails, ...bankDetails };
            }
        }
        await user.save();
        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully. Bank details may be pending verification.',
            data: user
        });
    }
    catch (error) {
        console.error('[User] updateProfile Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.updateProfile = updateProfile;
const trackHeartbeat = async (req, res) => {
    try {
        const userId = req.user._id;
        const incrementSeconds = 30; // 30s heartbeat interval
        // 1. Update cumulative user time
        await User_1.default.findByIdAndUpdate(userId, { $inc: { totalTimeSpent: incrementSeconds } });
        // 2. Find and update the latest LOGIN log for this session
        // We look for the most recent login log for this user
        const latestLoginLog = await ActivityLog_1.default.findOne({
            userId,
            action: 'LOGIN'
        }).sort({ createdAt: -1 });
        if (latestLoginLog) {
            // Only update if the login was relatively recent (e.g., within the last 24 hours)
            // to avoid updating extremely old logs if a logout failed
            const logAge = Date.now() - new Date(latestLoginLog.createdAt).getTime();
            if (logAge < 24 * 60 * 60 * 1000) {
                latestLoginLog.sessionDuration = (latestLoginLog.sessionDuration || 0) + incrementSeconds;
                await latestLoginLog.save();
            }
        }
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('[User] trackHeartbeat Error:', error);
        return res.status(500).json({ success: false, message: 'Heartbeat failed' });
    }
};
exports.trackHeartbeat = trackHeartbeat;
const requestBankUpdateOTP = async (req, res) => {
    try {
        const userId = req.user._id;
        const { bankName, accountNumber, ifscCode } = req.body;
        if (!bankName || !accountNumber || !ifscCode) {
            return res.status(400).json({ success: false, message: 'Bank details are required' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (!user.email) {
            return res.status(400).json({ success: false, message: 'No registered email found. Please set an email first.' });
        }
        // Generate a secure 6-digit OTP code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry
        // Save/update OTP entry in the database
        await OTP_1.default.findOneAndUpdate({ email: user.email }, { otp, expiresAt }, { upsert: true, new: true });
        // Send email to the user with the code
        const mailOptions = {
            from: `"CureBharat Security" <${process.env.SENDER_EMAIL || 'operations@curebharat.com'}>`,
            to: user.email,
            subject: '🛡️ CureBharat Bank Details Change Authorization Code (OTP)',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #3b82f6; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CureBharat Wellness</h2>
            <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 5px;">Security Operations Center</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 25px;" />
          
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin-bottom: 20px;">
            Dear <strong>${user.name}</strong>,
          </p>
          
          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 25px;">
            We received a request to update the bank details for your CureBharat partner account. To authorize this change, please enter the following 6-digit One-Time Password (OTP) in your profile update form:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e3a8a; background: #f8fafc; padding: 15px 30px; border-radius: 12px; display: inline-block; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);">${otp}</span>
          </div>

          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 15px; margin-bottom: 30px; color: #991b1b; font-size: 13px; line-height: 1.5;">
            ⚠️ <strong>Security Advisory:</strong> If you did not initiate this request, please contact compliance operations immediately at operations@curebharat.com and change your account password.
          </div>
          
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 30px;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin-top: 20px;">
            This is a secure automated system notification. Never share this code with anyone.<br />
            © ${new Date().getFullYear()} CureBharat Wellness Private Limited. All rights reserved.
          </p>
        </div>
      `
        };
        const nodemailer = require('nodemailer');
        const smtpPort = parseInt(process.env.SMTP_PORT || '465');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.titan.email',
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                user: process.env.EMAIL_USER || 'operations@curebharat.com',
                pass: process.env.EMAIL_PASS || '',
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        await transporter.sendMail(mailOptions);
        console.log(`[BANK_UPDATE_OTP] Sent bank change OTP code to ${user.email}`);
        res.json({ success: true, message: 'Verification code sent to your email.' });
    }
    catch (error) {
        console.error('[requestBankUpdateOTP] Error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.requestBankUpdateOTP = requestBankUpdateOTP;
const verifyBankUpdateOTP = async (req, res) => {
    try {
        const userId = req.user._id;
        const { bankName, accountNumber, ifscCode, otp } = req.body;
        if (!bankName || !accountNumber || !ifscCode || !otp) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (!user.email) {
            return res.status(400).json({ success: false, message: 'Email address not found' });
        }
        // Verify submitted OTP
        const record = await OTP_1.default.findOne({ email: user.email, otp });
        if (!record) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
        }
        // Delete verified OTP so it cannot be reused
        await OTP_1.default.deleteOne({ _id: record._id });
        // 1. Update KYC documents bank fields (so Admin can review)
        if (!user.kycDocuments) {
            user.kycDocuments = {};
        }
        user.kycDocuments.bankName = bankName;
        user.kycDocuments.accountNumber = accountNumber;
        user.kycDocuments.ifscCode = ifscCode;
        user.markModified('kycDocuments');
        // 2. Set permanent bank details and status to pending (requiring admin approval)
        if (!user.bankDetails) {
            user.bankDetails = {};
        }
        user.bankDetails.bankName = bankName;
        user.bankDetails.accountNumber = accountNumber;
        user.bankDetails.ifscCode = ifscCode;
        user.bankDetails.accountHolderName = user.name;
        user.bankDetails.verificationStatus = 'pending'; // Reset status to pending so admin sees it for approval
        user.markModified('bankDetails');
        await user.save();
        console.log(`[BANK_UPDATE_VERIFY] Successfully updated bank details and reset verificationStatus to pending for ${user.name}`);
        // Trigger in-app notification to all admin users about the bank update submission!
        try {
            const admins = await User_1.default.find({ role: 'admin' });
            for (const admin of admins) {
                await (0, notification_controller_1.createNotification)(admin._id.toString(), 'Bank Details Updated', `Partner ${user.name} (${user.memberId}) has updated their bank details. Please review and verify.`, 'info', `/admin/kyc`);
            }
        }
        catch (notifErr) {
            console.error('[Bank Update] Admin notification failed:', notifErr);
        }
        res.json({ success: true, message: 'Bank details updated successfully and submitted for admin review.' });
    }
    catch (error) {
        console.error('[verifyBankUpdateOTP] Error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.verifyBankUpdateOTP = verifyBankUpdateOTP;
