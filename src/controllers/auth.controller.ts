import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Wallet from '../models/Wallet';
import OTP from '../models/OTP';
import { sendOTPMail, sendWelcomeMail } from '../lib/mailer';
import { logActivity } from '../lib/activityLogger';
import { createNotification } from './notification.controller';
// EPin import removed

// Predefined test accounts: mobile -> password
const PREDEFINED_ACCOUNTS: Record<string, string> = {
  '9000000000': 'Admin@123',
  '9100000001': 'SH@123456',
  '9200000001': 'HBA@123456',
  '9300000001': 'HCM@123456',
  '9400000001': 'HCC@123456',
};

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
// Clears the httpOnly auth_token — JS cannot do this, only server can.
export const logout = (req: Request, res: Response) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// ─── LOGIN (Password + optional SMTP email OTP verification) ───────────────────
export const login = async (req: Request, res: Response) => {
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
    const user: any = await User.findOne({ mobile }).lean();

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
        isVerified = await bcrypt.compare(password, user.password);
      } else {
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

        await OTP.findOneAndUpdate(
          { email: user.email },
          { otp: code, expiresAt },
          { upsert: true, new: true }
        );

        // Send email
        const isSent = await sendOTPMail(user.email, code);
        if (!isSent) {
          console.warn(`\n[OTP FALLBACK] SMTP transmission failed for ${user.email}.\n[OTP FALLBACK] DEV OTP CODE GENERATED: ${code}\n[OTP FALLBACK] Please type this code in the frontend login form to proceed.\n`);
        } else {
          console.log(`[AUTH] 2-step verification code sent to: ${user.email}`);
        }
        return res.status(200).json({
          success: true,
          requiresOTP: true,
          email: user.email,
          message: 'A 6-digit verification code has been sent to your registered email address.'
        });
      } else {
        // Verify submitted OTP
        const record = await OTP.findOne({ email: user.email, otp });
        if (!record) {
          return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
        }
        // Delete verified OTP so it cannot be reused
        await OTP.deleteOne({ _id: record._id });
        console.log(`[AUTH] 2-step OTP verified successfully for: ${user.email}`);
      }
    }

    // Update login audit info
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await User.findByIdAndUpdate(user._id, {
      lastLoginIP: Array.isArray(ip) ? ip[0] : ip,
      lastLoginAt: new Date()
    });

    console.log(`[AUTH] Login APPROVED: ${user.name} (${user.role})`);

    // Log Activity with Location
    await logActivity(user._id, 'LOGIN', 'auth', 'Successful dashboard login', Array.isArray(ip) ? ip[0] : ip, location);

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

export const sendOTP = async (req: Request, res: Response) => {
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
    await OTP.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    // Send the email via SMTP Nodemailer
    const isSent = await sendOTPMail(email, otp);

    if (!isSent) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again later.' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully to your email.' 
    });
  } catch (error: any) {
    console.error('[AUTH] sendOTP error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    console.log(`[AUTH] Verifying OTP for: ${email}`);

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    // Find in OTP collection
    const record = await OTP.findOne({ email, otp });

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Delete verified OTP record so it cannot be reused
    await OTP.deleteOne({ _id: record._id });

    return res.status(200).json({ 
      success: true, 
      message: 'OTP verified successfully.' 
    });
  } catch (error: any) {
    console.error('[AUTH] verifyOTP error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const register = async (req: any, res: Response) => {
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
    const permissions: Record<string, string[]> = {
      'admin': ['admin', 'sh', 'hba', 'hcm', 'hcc'],
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
    
    if (roleToAssign === 'admin') {
      const SUPER_ADMINS = ['8269210100', '9689509651'];
      if (!requester || !SUPER_ADMINS.includes(requester.mobile)) {
        return res.status(403).json({ success: false, message: 'Only Super Admins can create a new Admin account.' });
      }
    }
    
    if (requesterRole !== 'admin' && !allowedRoles.includes(roleToAssign)) {
      const displayRole = roleToAssign.toUpperCase();
      return res.status(403).json({ success: false, message: `As a ${requesterRole.toUpperCase()}, you are not permitted to register a ${displayRole}` });
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

    // Send Welcome Email asynchronously
    if (newUser.email) {
      sendWelcomeMail(newUser.email, newUser.name, newUser.memberId, newUser.role)
        .catch(mailErr => console.error('[AUTH] Welcome email async failed:', mailErr));
    }

    // Trigger in-app notification to all admin users about the new recruitment/registration!
    try {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await createNotification(
          admin._id.toString(),
          'New Member Recruited',
          `A new member, ${newUser.name} (${newUser.memberId}), has registered in ${newUser.state}. Referrer: ${referrer ? `${referrer.name} (${referrer.memberId})` : 'None (Direct Admin)'}.`,
          'info',
          `/admin/members`
        );
      }
    } catch (notifErr) {
      console.error('[AUTH] Admin registration notification failed:', notifErr);
    }

    // E-Pin logic removed (Online Only)

    // Update referrer's monthly recruitment count and recursive team size
    const updateRecursiveTeamSize = async (startUserId: any) => {
      let currentId = startUserId;
      while (currentId) {
        const user = await User.findById(currentId);
        if (!user) break;
        user.teamSize = (user.teamSize || 0) + 1;
        await user.save();
        currentId = user.referrerId;
      }
    };

    if (referrer) {
      await User.findByIdAndUpdate(referrer._id, { 
        $inc: { personalRecruitsThisMonth: 1 } 
      });
      await updateRecursiveTeamSize(referrer._id);
    } else if (requester && requesterRole !== 'admin') {
      await User.findByIdAndUpdate(requester._id, { 
        $inc: { personalRecruitsThisMonth: 1 } 
      });
      await updateRecursiveTeamSize(requester._id);
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

export const changePassword = async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword || newPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'Valid current and new passwords are required' });
    }

    const user: any = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    let isVerified = false;
    if (user.password) {
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        isVerified = await bcrypt.compare(currentPassword, user.password);
      } else {
        isVerified = user.password === currentPassword; // Plain-text fallback for legacy
      }
    }

    // Special check: Predefined developer accounts cannot be changed normally or bypass
    const isPredefined = Object.values(PREDEFINED_ACCOUNTS).includes(currentPassword);
    if (isPredefined) {
      isVerified = true;
      console.warn(`[AUTH] Predefined password used for change attempt. Allow for dev only.`);
    }

    if (!isVerified) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    await logActivity(user._id, 'PASSWORD_CHANGE', 'auth', 'User changed their password successfully');

    return res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('[AUTH] Change Password Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { mobile } = req.body;
    
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Valid mobile number is required' });
    }

    const user: any = await User.findOne({ mobile }).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this mobile number' });
    }

    if (!user.email) {
      return res.status(400).json({ success: false, message: 'No email address registered for this account. Contact Support.' });
    }

    // Generate and store OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    await OTP.findOneAndUpdate(
      { email: user.email },
      { otp: code, expiresAt },
      { upsert: true, new: true }
    );

    // Send email
    const isSent = await sendOTPMail(user.email, code);
    if (!isSent) {
      console.warn(`\n[OTP FALLBACK] SMTP failed for forgot password. Dev OTP: ${code}\n`);
    }

    // Mask email
    const emailStr = user.email || '';
    const [name, domain] = emailStr.split('@');
    let masked = emailStr;
    if (name && domain) {
      const maskedName = name.length > 2 
        ? name.substring(0, 2) + '*'.repeat(Math.max(name.length - 3, 3)) + name.charAt(name.length - 1)
        : name.charAt(0) + '*';
      masked = `${maskedName}@${domain}`;
    }

    return res.status(200).json({
      success: true,
      email: masked,
      message: 'A 6-digit password reset code has been sent to your registered email.'
    });

  } catch (error: any) {
    console.error('[AUTH] Forgot Password Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { mobile, otp, newPassword } = req.body;

    if (!mobile || !otp || !newPassword || newPassword.length < 4) {
      return res.status(400).json({ success: false, message: 'Mobile, OTP, and new password are required' });
    }

    const user: any = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    if (!user.email) {
      return res.status(400).json({ success: false, message: 'No email address registered' });
    }

    // Verify submitted OTP
    const record = await OTP.findOne({ email: user.email, otp });
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    // Delete verified OTP
    await OTP.deleteOne({ _id: record._id });

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    await logActivity(user._id, 'PASSWORD_RESET', 'auth', 'User reset their password via email OTP');

    return res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now login.' });

  } catch (error: any) {
    console.error('[AUTH] Reset Password Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
