import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Wallet from '../models/Wallet';
import EPin from '../models/EPin';

// Predefined test accounts: mobile -> password
const PREDEFINED_ACCOUNTS: Record<string, string> = {
  '9000000000': 'Admin@123',
  '9100000001': 'SH@123456',
  '9200000001': 'HBA@123456',
  '9300000001': 'HCM@123456',
  '9400000001': 'HCC@123456',
};

// ─── LOGIN (Password-only, no OTP) ───────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ success: false, message: 'Mobile and password are required' });
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Invalid Indian mobile number' });
    }

    console.log(`[AUTH] Login attempt: ${mobile}`);

    let isVerified = false;
    const user: any = await User.findOne({ mobile }).lean();

    // 1. Check predefined test accounts
    const predefinedPassword = PREDEFINED_ACCOUNTS[mobile];
    if (predefinedPassword && predefinedPassword === password) {
      isVerified = true;
      console.log(`[AUTH] Predefined account matched for ${mobile}`);
    }

    // 2. Check DB password (plain text for now — upgrade to bcrypt later)
    if (!isVerified && user && user.password && user.password === password) {
      isVerified = true;
      console.log(`[AUTH] DB password matched for ${mobile}`);
    }

    if (!isVerified) {
      console.log(`[AUTH] Login DENIED for ${mobile}`);
      return res.status(401).json({ success: false, message: 'Invalid mobile number or password' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found. Please register first.' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Your account has been blocked. Contact support.' });
    }

    console.log(`[AUTH] Login APPROVED: ${user.name} (${user.role})`);

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role, rank: user.rank },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

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
  } catch (error: any) {
    console.error('[AUTH] login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── Kept for backward compat — now just delegates to login ─────────────────
export const sendOTP = async (req: Request, res: Response) => {
  return res.status(410).json({ success: false, message: 'OTP system is deprecated. Use /auth/login instead.' });
};

export const verifyOTP = login; // alias

export const register = async (req: any, res: Response) => {
  try {
    const { name, mobile, email, referrerId, ePinCode, state, password, role: targetRole } = req.body;
    const requester = req.user; // From authMiddleware if present

    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'Name and mobile are required' });
    }

    const requesterRole = requester?.role?.toLowerCase() || 'public';

    // Define Allowed Target Roles
    const permissions: Record<string, string[]> = {
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

    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Mobile already registered' });
    }

    // Validate Referrer
    let referrer = null;
    const normalizedReferrerId = referrerId?.trim().toUpperCase();
    
    if (normalizedReferrerId) {
      referrer = await User.findOne({ memberId: normalizedReferrerId });
      if (!referrer) {
        return res.status(400).json({ success: false, message: `Referrer ID "${normalizedReferrerId}" not found` });
      }
    }

    // Generate unique memberId based on role
    const lastUserOfRole = await User.findOne({ role: roleToAssign }).sort({ createdAt: -1 });
    let nextNum = 1001;
    if (lastUserOfRole && lastUserOfRole.memberId) {
      const match = lastUserOfRole.memberId.match(/\d+$/);
      if (match) nextNum = parseInt(match[0]) + 1;
    }
    const memberId = `CB-${roleToAssign.toUpperCase()}-${nextNum}`;

    // Create User
    const newUser = new User({
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
    await Wallet.create({ user: newUser._id });

    // Mark E-Pin as used if provided
    if (ePinCode) {
      const epin = await EPin.findOne({ pinCode: ePinCode.trim().toUpperCase(), status: 'unused' });
      if (epin) {
        epin.status = 'used';
        epin.usedBy = newUser._id as any;
        epin.usedDate = new Date();
        await epin.save();
      }
    }

    // Update referrer's team size and monthly recruitment count
    if (referrer) {
      await User.findByIdAndUpdate(referrer._id, { 
        $inc: { teamSize: 1, personalRecruitsThisMonth: 1 } 
      });
    } else if (requester && requesterRole !== 'admin') {
      await User.findByIdAndUpdate(requester._id, { 
        $inc: { teamSize: 1, personalRecruitsThisMonth: 1 } 
      });
    }

    return res.status(201).json({ 
      success: true, 
      message: `${roleToAssign.toUpperCase()} registered successfully`,
      user: { memberId: newUser.memberId, name: newUser.name }
    });
  } catch (error: any) {
    console.error('[AUTH] register Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user: any = await User.findById(req.user._id)
      .populate('referrerId', 'name memberId rank')
      .lean();
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    console.error('[AUTH] getMe Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
