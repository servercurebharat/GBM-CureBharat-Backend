"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.getMe = exports.register = exports.verifyOTP = exports.sendOTP = exports.login = exports.logout = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const OTP_1 = __importDefault(require("../models/OTP"));
const mailer_1 = require("../lib/mailer");
const activityLogger_1 = require("../lib/activityLogger");
const notification_controller_1 = require("./notification.controller");
// EPin import removed
// Predefined test accounts: mobile -> password
const PREDEFINED_ACCOUNTS = {
    '9000000000': 'Admin@123',
    '9100000001': 'SH@123456',
    '9200000001': 'HBA@123456',
    '9300000001': 'HCM@123456',
    '9400000001': 'HCC@123456',
};
// ─── LOGOUT ──────────────────────────────────────────────────────────────────
// Clears the httpOnly auth_token — JS cannot do this, only server can.
const logout = (req, res) => {
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
    });
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
};
exports.logout = logout;
// ─── LOGIN (Password + optional SMTP email OTP verification) ───────────────────
const login = async (req, res) => {
    try {
        const { mobile, password, location, otp } = req.body;
        console.log(`[AUTH] Login attempt for ${mobile} | Has Location: ${!!location} | Has OTP: ${!!otp}`);
        if (!mobile || !password) {
            return res.status(400).json({ success: false, message: 'Mobile and password are required' });
        }
        if (!/^[6-9]\d{9}$/.test(mobile)) {
            return res.status(400).json({ success: false, message: 'Invalid Indian mobile number' });
        }
        console.log(`[AUTH] Login attempt: ${mobile}`);
        let isVerified = false;
        const user = await User_1.default.findOne({ mobile }).lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found. Please register first.' });
        }
        // 1. Check predefined test accounts
        const predefinedPassword = PREDEFINED_ACCOUNTS[mobile];
        if (predefinedPassword && predefinedPassword === password) {
            isVerified = true;
            console.log(`[AUTH] Predefined account matched for ${mobile}`);
        }
        // 2. Check DB password (supports bcrypt with plain-text fallback)
        if (!isVerified && user.password) {
            if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
                isVerified = await bcryptjs_1.default.compare(password, user.password);
            }
            else {
                isVerified = user.password === password;
            }
            if (isVerified) {
                console.log(`[AUTH] DB password matched for ${mobile}`);
            }
        }
        if (!isVerified) {
            console.log(`[AUTH] Login DENIED for ${mobile}`);
            return res.status(401).json({ success: false, message: 'Invalid mobile number or password' });
        }
        if (user.status === 'blocked') {
            return res.status(403).json({ success: false, message: 'Your account has been blocked. Contact support.' });
        }
        // 3. OTP verification flow (only for users with email, bypassing predefined developer accounts)
        const isPredefined = !!predefinedPassword;
        if (!isPredefined && user.email) {
            if (!otp) {
                // Generate and store OTP
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry
                await OTP_1.default.findOneAndUpdate({ email: user.email }, { otp: code, expiresAt }, { upsert: true, new: true });
                // Send email
                const isSent = await (0, mailer_1.sendOTPMail)(user.email, code);
                if (!isSent) {
                    console.warn(`\n[OTP FALLBACK] SMTP transmission failed for ${user.email}.\n[OTP FALLBACK] DEV OTP CODE GENERATED: ${code}\n[OTP FALLBACK] Please type this code in the frontend login form to proceed.\n`);
                }
                else {
                    console.log(`[AUTH] 2-step verification code sent to: ${user.email}`);
                }
                return res.status(200).json({
                    success: true,
                    requiresOTP: true,
                    email: user.email,
                    message: 'A 6-digit verification code has been sent to your registered email address.'
                });
            }
            else {
                // Verify submitted OTP
                const record = await OTP_1.default.findOne({ email: user.email, otp });
                if (!record) {
                    return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
                }
                // Delete verified OTP so it cannot be reused
                await OTP_1.default.deleteOne({ _id: record._id });
                console.log(`[AUTH] 2-step OTP verified successfully for: ${user.email}`);
            }
        }
        // Update login audit info
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await User_1.default.findByIdAndUpdate(user._id, {
            lastLoginIP: Array.isArray(ip) ? ip[0] : ip,
            lastLoginAt: new Date()
        });
        console.log(`[AUTH] Login APPROVED: ${user.name} (${user.role})`);
        // Log Activity with Location
        await (0, activityLogger_1.logActivity)(user._id, 'LOGIN', 'auth', 'Successful dashboard login', Array.isArray(ip) ? ip[0] : ip, location);
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ userId: user._id, role: user.role, rank: user.rank }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        // Set httpOnly cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        return res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                mobile: user.mobile,
                role: user.role,
                rank: user.rank,
                memberId: user.memberId,
                status: user.status,
                kycStatus: user.kycStatus,
            }
        });
    }
    catch (error) {
        console.error('[AUTH] login Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.login = login;
const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`[AUTH] Requested OTP for: ${email}`);
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email address is required' });
        }
        // Generate a secure 6-digit random code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
        // Store in Mongoose database
        await OTP_1.default.findOneAndUpdate({ email }, { otp, expiresAt }, { upsert: true, new: true });
        // Send the email via SMTP Nodemailer
        const isSent = await (0, mailer_1.sendOTPMail)(email, otp);
        if (!isSent) {
            return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again later.' });
        }
        return res.status(200).json({
            success: true,
            message: 'OTP sent successfully to your email.'
        });
    }
    catch (error) {
        console.error('[AUTH] sendOTP error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.sendOTP = sendOTP;
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        console.log(`[AUTH] Verifying OTP for: ${email}`);
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }
        // Find in OTP collection
        const record = await OTP_1.default.findOne({ email, otp });
        if (!record) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }
        // Delete verified OTP record so it cannot be reused
        await OTP_1.default.deleteOne({ _id: record._id });
        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully.'
        });
    }
    catch (error) {
        console.error('[AUTH] verifyOTP error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.verifyOTP = verifyOTP;
const register = async (req, res) => {
    try {
        const { name, mobile, email, referrerId, state, password, role: targetRole } = req.body;
        const requester = req.user; // From authMiddleware if present
        if (!name || !mobile) {
            return res.status(400).json({ success: false, message: 'Name and mobile are required' });
        }
        let requesterRole = requester?.role?.toLowerCase() || 'public';
        // Normalize hcb -> hba for database compatibility
        if (requesterRole === 'hcb') {
            requesterRole = 'hba';
        }
        // Define Allowed Target Roles
        const permissions = {
            'admin': ['sh', 'hba', 'hcm', 'hcc'],
            'sh': ['hba', 'hcm', 'hcc'],
            'hba': ['hcm', 'hcc'],
            'hcm': ['hcc'],
            'hcc': ['hcc'],
            'public': ['hcc']
        };
        const allowedRoles = permissions[requesterRole] || ['hcc'];
        // If requester is admin, they can set any role, otherwise check permissions
        let roleToAssign = targetRole?.toLowerCase() || 'hcc';
        // Normalize hcb -> hba for database compatibility
        if (roleToAssign === 'hcb') {
            roleToAssign = 'hba';
        }
        if (requesterRole !== 'admin' && !allowedRoles.includes(roleToAssign)) {
            const displayRole = roleToAssign.toUpperCase();
            return res.status(403).json({ success: false, message: `As a ${requesterRole.toUpperCase()}, you are not permitted to register a ${displayRole}` });
        }
        const existingUser = await User_1.default.findOne({ mobile });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Mobile already registered' });
        }
        // Validate Referrer
        let referrer = null;
        const normalizedReferrerId = referrerId?.trim().toUpperCase();
        if (normalizedReferrerId) {
            referrer = await User_1.default.findOne({ memberId: normalizedReferrerId });
            if (!referrer) {
                return res.status(400).json({ success: false, message: `Referrer ID "${normalizedReferrerId}" not found` });
            }
        }
        // Generate unique memberId based on role
        const lastUserOfRole = await User_1.default.findOne({ role: roleToAssign }).sort({ createdAt: -1 });
        let nextNum = 1001;
        if (lastUserOfRole && lastUserOfRole.memberId) {
            const match = lastUserOfRole.memberId.match(/\d+$/);
            if (match)
                nextNum = parseInt(match[0]) + 1;
        }
        const memberId = `CB-${roleToAssign.toUpperCase()}-${nextNum}`;
        // Create User
        const newUser = new User_1.default({
            name,
            mobile,
            email,
            password: password || '123456',
            memberId,
            referrerId: referrer ? referrer._id : (requesterRole !== 'admin' ? requester?._id : undefined),
            state,
            role: roleToAssign,
            rank: roleToAssign.toUpperCase(),
            status: 'active',
            kycStatus: 'not_submitted'
        });
        await newUser.save();
        await Wallet_1.default.create({ user: newUser._id });
        // Send Welcome Email asynchronously
        if (newUser.email) {
            (0, mailer_1.sendWelcomeMail)(newUser.email, newUser.name, newUser.memberId, newUser.role)
                .catch(mailErr => console.error('[AUTH] Welcome email async failed:', mailErr));
        }
        // Trigger in-app notification to all admin users about the new recruitment/registration!
        try {
            const admins = await User_1.default.find({ role: 'admin' });
            for (const admin of admins) {
                await (0, notification_controller_1.createNotification)(admin._id.toString(), 'New Member Recruited', `A new member, ${newUser.name} (${newUser.memberId}), has registered in ${newUser.state}. Referrer: ${referrer ? `${referrer.name} (${referrer.memberId})` : 'None (Direct Admin)'}.`, 'info', `/admin/members`);
            }
        }
        catch (notifErr) {
            console.error('[AUTH] Admin registration notification failed:', notifErr);
        }
        // E-Pin logic removed (Online Only)
        // Update referrer's monthly recruitment count and recursive team size
        const updateRecursiveTeamSize = async (startUserId) => {
            let currentId = startUserId;
            while (currentId) {
                const user = await User_1.default.findById(currentId);
                if (!user)
                    break;
                user.teamSize = (user.teamSize || 0) + 1;
                await user.save();
                currentId = user.referrerId;
            }
        };
        if (referrer) {
            await User_1.default.findByIdAndUpdate(referrer._id, {
                $inc: { personalRecruitsThisMonth: 1 }
            });
            await updateRecursiveTeamSize(referrer._id);
        }
        else if (requester && requesterRole !== 'admin') {
            await User_1.default.findByIdAndUpdate(requester._id, {
                $inc: { personalRecruitsThisMonth: 1 }
            });
            await updateRecursiveTeamSize(requester._id);
        }
        return res.status(201).json({
            success: true,
            message: `${roleToAssign.toUpperCase()} registered successfully`,
            user: { memberId: newUser.memberId, name: newUser.name }
        });
    }
    catch (error) {
        console.error('[AUTH] register Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.register = register;
const getMe = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user._id)
            .populate('referrerId', 'name memberId rank')
            .lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        console.error('[AUTH] getMe Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getMe = getMe;
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user._id;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Old and new passwords are required' });
        }
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Verify old password (check both DB and Predefined Accounts for consistency)
        const predefinedPassword = PREDEFINED_ACCOUNTS[user.mobile];
        const isValid = (user.password === oldPassword) || (predefinedPassword && predefinedPassword === oldPassword);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Incorrect old password' });
        }
        // Update password
        user.password = newPassword;
        await user.save();
        console.log(`[AUTH] Password changed for user: ${user.memberId}`);
        return res.status(200).json({ success: true, message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('[AUTH] changePassword Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.changePassword = changePassword;
