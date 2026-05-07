"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.getAllUsers = exports.updateKYC = exports.getUserStats = exports.getAdminTree = exports.getDownline = void 0;
const User_1 = __importDefault(require("../models/User"));
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
        const users = await User_1.default.find({}).lean();
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
        const { aadhaarNumber, panNumber, bankName, accountNumber, ifscCode } = req.body;
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
            // Force Mongoose to recognize the nested update
            user.markModified('kycDocuments');
        }
        await user.save();
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
        const { page = 1, limit = 20, search, role } = req.query;
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
        const users = await User_1.default.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
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
        const user = await User_1.default.findById(id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        console.error('[User] getUserById Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getUserById = getUserById;
