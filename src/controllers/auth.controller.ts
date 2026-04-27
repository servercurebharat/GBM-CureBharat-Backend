import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Wallet from '../models/Wallet';
import EPin from '../models/EPin';

// In-memory OTP store (replace with Redis in production)
const otpStore: Map<string, { otp: string; expiresAt: number }> = new Map();

export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { mobile } = req.body;

    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Invalid Indian mobile number' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in otpStore with 5 min expiry
    otpStore.set(mobile, { otp, expiresAt: Date.now() + 300000 });

    console.log(`[AUTH] OTP for ${mobile}: ${otp}`);

    // TODO: Integrate SMS gateway here
    
    // In development, return OTP (remove in production)
    return res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully', 
      otp: process.env.NODE_ENV === 'development' ? otp : undefined 
    });
  } catch (error: any) {
    console.error('[AUTH] sendOTP Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { mobile, otp } = req.body;

    const stored = otpStore.get(mobile);
    if (!stored || stored.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found' });
    }

    if (stored.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP verified, clear it
    otpStore.delete(mobile);

    const user: any = await User.findOne({ mobile }).lean();
    if (!user) {
      return res.status(200).json({ 
        success: true, 
        message: 'Mobile verified, please register', 
        registered: false 
      });
    }

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
      sameSite: 'strict',
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
  } catch (error: any) {
    console.error('[AUTH] verifyOTP Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, mobile, email, referrerId, ePinCode, state } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ success: false, message: 'Name and mobile are required' });
    }

    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Mobile already registered' });
    }

    // Validate Referrer
    let referrer = null;
    if (referrerId) {
      referrer = await User.findOne({ memberId: referrerId });
      if (!referrer) {
        return res.status(400).json({ success: false, message: 'Referrer not found' });
      }
    }

    // Validate E-Pin if provided
    let epin = null;
    if (ePinCode) {
      epin = await EPin.findOne({ pinCode: ePinCode, status: 'unused' });
      if (!epin) {
        return res.status(400).json({ success: false, message: 'Invalid or used E-Pin' });
      }
    }

    // Generate unique memberId (CB-HCC-XXXX)
    const lastUser = await User.findOne({ role: 'hcc' }).sort({ createdAt: -1 });
    let nextNum = 1001;
    if (lastUser && lastUser.memberId) {
      const match = lastUser.memberId.match(/\d+$/);
      if (match) nextNum = parseInt(match[0]) + 1;
    }
    const memberId = `CB-HCC-${nextNum}`;

    // Create User
    const newUser = new User({
      name,
      mobile,
      email,
      memberId,
      referrerId: referrer ? referrer._id : undefined,
      state,
      role: 'hcc',
      rank: 'HCC',
      status: 'active',
      kycStatus: 'not_submitted'
    });

    await newUser.save();

    // Create Wallet
    await Wallet.create({ user: newUser._id });

    // Mark E-Pin as used
    if (epin) {
      epin.status = 'used';
      epin.usedBy = newUser._id as any;
      epin.usedDate = new Date();
      await epin.save();
    }

    // Update referrer's team size
    if (referrer) {
      referrer.teamSize += 1;
      await referrer.save();
    }

    return res.status(201).json({ 
      success: true, 
      message: 'Registration successful',
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

    return res.status(200).json({ success: true, user });
  } catch (error: any) {
    console.error('[AUTH] getMe Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
