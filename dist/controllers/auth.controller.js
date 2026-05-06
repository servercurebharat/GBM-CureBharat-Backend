"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.register = exports.verifyOTP = exports.sendOTP = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const EPin_1 = __importDefault(require("../models/EPin"));
// In-memory OTP store (replace with Redis in production)
const otpStore = new Map();
const PREDEFINED_ACCOUNTS = {
    '9000000000': 'Admin@123',
    '9100000001': 'SH@123456',
    '9200000001': 'HBA@123456',
    '9300000001': 'HCM@123456',
    '9400000001': 'HCC@123456',
};
const sendOTP = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
            return res.status(400).json({ success: false, message: 'Invalid Indian mobile number' });
        }
        // Check for predefined test accounts
        if (PREDEFINED_ACCOUNTS[mobile]) {
            return res.status(200).json({
                success: true,
                message: 'Test Account Detected: Use your predefined password',
                otp: '******'
            });
        }
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Store in otpStore with 5 min expiry
        otpStore.set(mobile, { otp, expiresAt: Date.now() + 300000 });
        console.log(`[AUTH] OTP for ${mobile}: ${otp}`);
        // In development, return OTP (remove in production)
        return res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });
    }
    catch (error) {
        console.error('[AUTH] sendOTP Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.sendOTP = sendOTP;
const verifyOTP = async (req, res) => {
    try {
        const { mobile, otp } = req.body;
        console.log(`[DEBUG] Attempting Login: Mobile="${mobile}", ReceivedValue="${otp}"`);
        let isVerified = false;
        let user = await User_1.default.findOne({ mobile }).lean();
        // 1. Check for predefined test accounts first
        const expectedPassword = PREDEFINED_ACCOUNTS[mobile];
        if (expectedPassword) {
            console.log(`[DEBUG] Test account detected. Expected Password: "${expectedPassword}"`);
            if (expectedPassword === otp) {
                console.log(`[DEBUG] Password MATCH!`);
                isVerified = true;
            }
        }
        // 2. Check user's set password in DB (for regular members)
        if (!isVerified && user && user.password && user.password === otp) {
            console.log(`[DEBUG] Database Password MATCH for ${mobile}`);
            isVerified = true;
        }
        // 3. Check the normal OTP store
        if (!isVerified) {
            const stored = otpStore.get(mobile);
            if (stored && stored.expiresAt > Date.now() && stored.otp === otp) {
                console.log(`[DEBUG] Valid OTP found in store for ${mobile}`);
                isVerified = true;
                otpStore.delete(mobile);
            }
        }
        // 4. Universal Test OTP Bypass (Development Only)
        if (!isVerified && process.env.NODE_ENV !== 'production' && otp === '123456') {
            console.log(`[DEBUG] Universal Test OTP Bypass (123456) used for ${mobile}`);
            isVerified = true;
        }
        if (!isVerified) {
            console.log(`[DEBUG] Login DENIED.`);
            return res.status(400).json({
                success: false,
                message: expectedPassword || (user && user.password) ? 'Invalid Password' : 'Invalid or expired OTP'
            });
        }
        if (!user) {
            console.log(`[DEBUG] User verified but NOT found in DB. Returning registered:false`);
            return res.status(200).json({
                success: true,
                message: 'Mobile verified, please register',
                registered: false
            });
        }
        console.log(`[DEBUG] Login APPROVED for ${user.name} (${user.role})`);
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ userId: user._id, role: user.role, rank: user.rank }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        // Set httpOnly cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        return res.status(200).json({
            success: true,
            registered: true,
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                rank: user.rank,
                memberId: user.memberId
            }
        });
    }
    catch (error) {
        console.error('[AUTH] verifyOTP Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.verifyOTP = verifyOTP;
const register = async (req, res) => {
    try {
        const { name, mobile, email, referrerId, ePinCode, state, password, role: targetRole } = req.body;
        const requester = req.user; // From authMiddleware if present
        if (!name || !mobile) {
            return res.status(400).json({ success: false, message: 'Name and mobile are required' });
        }
        const requesterRole = requester?.role?.toLowerCase() || 'public';
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
        if (requesterRole !== 'admin' && !allowedRoles.includes(roleToAssign)) {
            return res.status(403).json({ success: false, message: `As a ${requesterRole.toUpperCase()}, you are not permitted to register a ${roleToAssign.toUpperCase()}` });
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
        // Mark E-Pin as used if provided
        if (ePinCode) {
            const epin = await EPin_1.default.findOne({ pinCode: ePinCode.trim().toUpperCase(), status: 'unused' });
            if (epin) {
                epin.status = 'used';
                epin.usedBy = newUser._id;
                epin.usedDate = new Date();
                await epin.save();
            }
        }
        // Update referrer's team size and monthly recruitment count
        if (referrer) {
            await User_1.default.findByIdAndUpdate(referrer._id, {
                $inc: { teamSize: 1, personalRecruitsThisMonth: 1 }
            });
        }
        else if (requester && requesterRole !== 'admin') {
            await User_1.default.findByIdAndUpdate(requester._id, {
                $inc: { teamSize: 1, personalRecruitsThisMonth: 1 }
            });
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
        return res.status(200).json({ success: true, user });
    }
    catch (error) {
        console.error('[AUTH] getMe Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getMe = getMe;
