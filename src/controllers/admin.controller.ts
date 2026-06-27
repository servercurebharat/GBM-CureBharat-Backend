import { Request, Response } from 'express';
import Config from '../models/Config';
import User from '../models/User';
import Wallet from '../models/Wallet';
import Notification from '../models/Notification';
import ActivityLog from '../models/ActivityLog';
import Sale from '../models/Sale';
import { createNotification } from './notification.controller';
import { sendKYCStatusMail, sendBankStatusMail, sendEmail } from '../lib/mailer';

/**
 * GET /api/admin/commission-config
 * Fetch all system configuration parameters
 */
export const getCommissionConfig = async (req: Request, res: Response) => {
  try {
    const configs = await Config.find();
    const configMap = configs.reduce((acc, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as any);
    
    res.json({ success: true, data: configMap });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/admin/commission-config
 * Update system configuration parameters (Admin Only)
 */
export const updateCommissionConfig = async (req: Request, res: Response) => {
  try {
    const updates = req.body; // Expecting { key: value }
    const adminId = (req as any).user.id;

    for (const [key, value] of Object.entries(updates)) {
      await Config.findOneAndUpdate(
        { key },
        { 
          value, 
          updatedBy: adminId, 
          updatedAt: new Date() 
        },
        { upsert: true }
      );
    }

    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/kyc/pending
 * Fetch all users with pending KYC status
 */
export const getPendingKYC = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ kycStatus: 'pending' })
      .select('name mobile email memberId state kycDocuments kycStatus joiningDate')
      .sort({ joiningDate: 1 });
      
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/admin/kyc/:id/status
 * Approve or reject a member's KYC
 */
export const updateKYCStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { kycStatus: status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Trigger in-app notification to the user
    try {
      await createNotification(
        user._id.toString(),
        `KYC Verification ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        status === 'approved'
          ? 'Congratulations! Your identity documents have been approved. You now have full dashboard access.'
          : 'Your identity documents were rejected. Please check your uploaded proofs and re-submit.',
        status === 'approved' ? 'success' : 'error',
        '/hcc/profile'
      );
    } catch (notifErr) {
      console.error('[Admin KYC Status Notif] Failed to create in-app notification:', notifErr);
    }

    // Trigger email notification to the user
    if (user.email) {
      try {
        await sendKYCStatusMail(user.email, user.name, user.memberId, status as any);
      } catch (mailErr) {
        console.error('[Admin KYC Status Mail] Failed to send email:', mailErr);
      }
    }

    res.json({ 
      success: true, 
      message: `KYC ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      user 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
/**
 * GET /api/admin/bank-updates/pending
 * Fetch all users with pending bank detail verification
 */
export const getPendingBankUpdates = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ 'bankDetails.verificationStatus': 'pending' })
      .select('name mobile email memberId bankDetails kycStatus')
      .sort({ updatedAt: -1 });
      
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyBankDetails = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'verified' or 'rejected'

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findById(id);
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
    } else {
      if (user.bankDetails) {
        user.bankDetails.verificationStatus = 'rejected';
        user.markModified('bankDetails');
      }
    }

    await user.save();
    
    // Log
    await ActivityLog.create({
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
      await createNotification(
        user._id.toString(),
        `Bank Account ${status === 'verified' ? 'Verified' : 'Rejected'}`,
        status === 'verified'
          ? 'Your bank account verification was successful. You can now request payouts.'
          : 'Your bank account details were rejected. Please verify your bank info and re-upload valid proof.',
        status === 'verified' ? 'success' : 'error',
        '/hcc/profile'
      );
    } catch (notifErr) {
      console.error('[Admin Bank Status Notif] Failed to create in-app notification:', notifErr);
    }

    // Trigger email notification to the user
    if (user.email) {
      try {
        await sendBankStatusMail(user.email, user.name, user.memberId, status as any);
      } catch (mailErr) {
        console.error('[Admin Bank Status Mail] Failed to send email:', mailErr);
      }
    }

    res.json({ success: true, message: `Bank details ${status} successfully` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/admin/manual-adjustment
 * Apply manual credit or debit to a member's wallet
 */
export const createManualAdjustment = async (req: Request, res: Response) => {
  try {
    const { memberId, amount, type, reason } = req.body;
    const adminId = (req as any).user.id;

    if (!memberId || !amount || !type || !reason) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid adjustment type' });
    }

    // Find user by memberId
    const user = await User.findOne({ memberId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Find wallet
    const wallet = await Wallet.findOne({ user: user._id });
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/admin/users/:id/status
 * Change user status (active, inactive, blocked)
 */
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'blocked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(id, { status }, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: `Status updated to ${status}`, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/admin/users/:id/reset-password
 * Reset user password to default (123456)
 */
export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.password = '123456';
    await user.save();
    res.json({ success: true, message: `Password reset successfully to 123456` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/admin/announcements
 * Send broadcast messages/offers to selected or all users
 */
export const sendAnnouncement = async (req: Request, res: Response) => {
  try {
    const { userIds, title, message, type, sendToAll } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    let targetUserIds: string[] = [];

    if (sendToAll) {
      const allUsers = await User.find({ status: 'active' }).select('_id');
      targetUserIds = allUsers.map(u => u._id.toString());
    } else {
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

    await Notification.insertMany(notifications);

    // Mock Email sending (placeholder for future implementation)
    console.log(`[Announcement] Sending "${title}" to ${targetUserIds.length} users via Email (Mocked)`);

    res.json({ 
      success: true, 
      message: `Announcement sent successfully to ${targetUserIds.length} users` 
    });
  } catch (error: any) {
    console.error('[Admin] sendAnnouncement error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/admin/sales/:id/send-kyc-link
 * Send an email to the customer with a link to complete their KYC profile
 */
export const sendKycLink = async (req: Request, res: Response) => {
  try {
    const saleId = req.params.id;
    const sale = await Sale.findById(saleId).populate('plan');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    
    if (!sale.customerEmail) return res.status(400).json({ success: false, message: 'Customer has no email address on file' });

    let frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').trim();
    if (!frontendUrl.startsWith('http')) frontendUrl = `https://${frontendUrl}`;
    const kycLink = `${frontendUrl}/customer-kyc/${sale._id}`;
    const planName = (sale.plan as any)?.name || 'Wellness Plan';

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

    await sendEmail(sale.customerEmail, 'Action Required: Complete Your CureBharat Policy Profile', emailHtml);
    return res.status(200).json({ success: true, message: 'KYC link sent successfully' });

  } catch (error: any) {
    console.error('Error sending KYC link:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * POST /api/admin/custom-commission
 * Set custom commission rate for an individual member
 */
export const setCustomCommission = async (req: Request, res: Response) => {
  try {
    const { memberId, customCommissionRate } = req.body;
    
    if (!memberId) {
      return res.status(400).json({ success: false, message: 'Member ID is required' });
    }

    const user = await User.findOne({ memberId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Set or unset the custom rate
    if (customCommissionRate === '' || customCommissionRate === null || customCommissionRate === undefined) {
      user.customCommissionRate = undefined;
    } else {
      user.customCommissionRate = parseFloat(customCommissionRate);
    }

    await user.save();

    res.json({
      success: true,
      message: `Commission override for ${user.memberId} updated successfully.`,
      data: { memberId: user.memberId, customCommissionRate: user.customCommissionRate }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/custom-commission
 * Get list of all users with custom commission rates
 */
export const getCustomCommissions = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ 
      customCommissionRate: { $exists: true, $ne: null } 
    }).select('name memberId role rank customCommissionRate state');

    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/admin/users/:id/profile
 * Admin can fully edit any member's profile details
 * (no OTP or bank verification restrictions)
 */
export const adminUpdateMemberProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let {
      name, email, mobile, gender, dob, state,
      occupation, maritalStatus, alternateMobile,
      address, bankDetails, nomineeDetails, kycDocuments,
      profileImage
    } = req.body;

    // If using FormData, nested objects might come as strings
    try { if (typeof address === 'string') address = JSON.parse(address); } catch(e) { address = {}; }
    try { if (typeof bankDetails === 'string') bankDetails = JSON.parse(bankDetails); } catch(e) { bankDetails = {}; }
    try { if (typeof nomineeDetails === 'string') nomineeDetails = JSON.parse(nomineeDetails); } catch(e) { nomineeDetails = {}; }
    try { if (typeof kycDocuments === 'string') kycDocuments = JSON.parse(kycDocuments); } catch(e) { kycDocuments = {}; }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Handle File Uploads
    const files = req.files as any;
    const getUrl = (fieldname: string) => files?.[fieldname]?.[0]?.path;

    const af = getUrl('aadhaarFront');
    const ab = getUrl('aadhaarBack');
    const pc = getUrl('panCard');
    const bp = getUrl('bankProof');
    const sf = getUrl('selfie');
    const pi = getUrl('profileImage');

    // Personal info
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;
    if (gender !== undefined) user.gender = gender;
    if (dob !== undefined) user.dob = dob ? new Date(dob) : undefined;
    if (state !== undefined) user.state = state;
    if (occupation !== undefined) user.occupation = occupation;
    if (maritalStatus !== undefined) user.maritalStatus = maritalStatus;
    if (alternateMobile !== undefined) user.alternateMobile = alternateMobile;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (pi) user.profileImage = pi;

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
      if (af) user.kycDocuments.aadhaarFrontUrl = af;
      if (ab) user.kycDocuments.aadhaarBackUrl = ab;
      if (pc) user.kycDocuments.panUrl = pc;
      if (bp) user.kycDocuments.bankProofUrl = bp;
      if (sf) user.kycDocuments.selfieUrl = sf;
    }

    await user.save();

    // Activity log
    await ActivityLog.create({
      userId: (req as any).user._id,
      userName: (req as any).user.name,
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
  } catch (error: any) {
    console.error('[Admin] adminUpdateMemberProfile Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Delete a user permanently
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Also delete their wallet to keep database clean
    await Wallet.deleteOne({ user: id });
    await User.deleteOne({ _id: id });

    res.json({ success: true, message: 'User deleted permanently' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
