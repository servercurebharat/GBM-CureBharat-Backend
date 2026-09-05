import { Request, Response } from 'express';
import * as XLSX from 'xlsx-js-style';
import Config from '../models/Config';
import User from '../models/User';
import Wallet from '../models/Wallet';
import Notification from '../models/Notification';
import ActivityLog from '../models/ActivityLog';
import Sale from '../models/Sale';
import CustomerKYC from '../models/CustomerKYC';
import '../models/Plan';
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
    if (gender !== undefined) user.gender = gender === '' ? undefined : gender;
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

/**
 * PUT /api/admin/customers/:id/profile
 * Admin updates a customer's basic info and KYC
 */
export const adminUpdateCustomerProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Sale ID
    let { saleData, kycData } = req.body;

    // Parse stringified JSON if coming from FormData
    try { if (typeof saleData === 'string') saleData = JSON.parse(saleData); } catch(e) { saleData = {}; }
    try { if (typeof kycData === 'string') kycData = JSON.parse(kycData); } catch(e) { kycData = {}; }

    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Customer sale not found' });
    }

    // Update Sale fields
    if (saleData) {
      if (saleData.customerName !== undefined) sale.customerName = saleData.customerName;
      if (saleData.customerMobile !== undefined) sale.customerMobile = saleData.customerMobile;
      if (saleData.customerEmail !== undefined) sale.customerEmail = saleData.customerEmail;
      if (saleData.customerState !== undefined) sale.customerState = saleData.customerState;
      if (saleData.customerDOB !== undefined) sale.customerDOB = saleData.customerDOB;
      if (saleData.customerPAN !== undefined) sale.customerPAN = saleData.customerPAN;
      if (saleData.nomineeName !== undefined) sale.nomineeName = saleData.nomineeName;
      if (saleData.nomineeRelation !== undefined) sale.nomineeRelation = saleData.nomineeRelation;
      await sale.save();
    }

    // Update KYC fields
    if (kycData) {
      let kyc = await CustomerKYC.findOne({ saleId: id });
      if (!kyc) {
        kyc = new CustomerKYC({
          saleId: id,
          fullName:     saleData?.customerName  || sale.customerName  || '',
          mobile:       saleData?.customerMobile || sale.customerMobile || '',
          dob:          saleData?.customerDOB    || sale.customerDOB    || '',
          email:        saleData?.customerEmail  || sale.customerEmail  || '',
          gender:       'N/A',
          maritalStatus:'N/A',
          occupation:   'N/A',
          pan:          saleData?.customerPAN || sale.customerPAN || 'N/A',
          addressLine1: 'N/A',
          city:         'N/A',
          state:        saleData?.customerState || sale.customerState || 'N/A',
          pincode:      'N/A',
          familyDetails: []
        });
      }

      const mergeKyc = (key: string) => {
        if (kycData[key] !== undefined) (kyc as any)[key] = kycData[key];
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
      
      if (kycData.nomineeName !== undefined) (kyc as any).nomineeName = kycData.nomineeName;
      if (kycData.nomineeRelation !== undefined) (kyc as any).nomineeRelation = kycData.nomineeRelation;
      if (kycData.nomineeDOB !== undefined) (kyc as any).nomineeDOB = kycData.nomineeDOB;
      if (kycData.nomineeContact !== undefined) (kyc as any).nomineeContact = kycData.nomineeContact;
      
      const files = req.files as any;
      if (files?.aadhaarFront?.[0]) (kyc as any).aadhaarFrontUrl = files.aadhaarFront[0].path;
      if (files?.aadhaarBack?.[0]) (kyc as any).aadhaarBackUrl = files.aadhaarBack[0].path;
      if (files?.panCard?.[0]) (kyc as any).panUrl = files.panCard[0].path;
      if (files?.selfie?.[0]) (kyc as any).selfieUrl = files.selfie[0].path;

      await kyc.save();
    }

    await ActivityLog.create({
      userId: (req as any).user._id,
      userName: (req as any).user.name,
      userRole: 'admin',
      action: 'ADMIN_CUSTOMER_EDIT',
      category: 'system',
      details: `Admin edited profile of customer ${sale.customerName} (Policy: ${sale.policyId})`,
      ipAddress: req.ip,
    });

    // Re-fetch updated documents so the frontend can sync its state
    const updatedSale = await Sale.findById(id).populate('plan').lean();
    const updatedKyc  = await CustomerKYC.findOne({ saleId: id }).lean();

    return res.status(200).json({
      success: true,
      message: 'Customer profile updated successfully',
      data: {
        sale:    updatedSale,
        kycData: updatedKyc,
      },
    });

  } catch (error: any) {
    console.error('[Admin] adminUpdateCustomerProfile Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * GET /api/admin/customers/export
 * Export all customer details to Excel matching Livlong format
 */
export const exportCustomersXLSX = async (req: Request, res: Response) => {
  try {
    const sales = await Sale.find({}).populate('plan').sort({ createdAt: 1 }).lean();

    const headers = [
      'Unique ID/ PAN Number',
      'First Name',
      'Last Name',
      'Mobile No',
      'Date Of Birth',
      'Gender',
      'Address',
      'City',
      'State',
      'Pincode',
      'Email Id',
      'Plan Name',
      'Plan Amount w/o GST',
      'Plan Amount with GST',
      'Nominee Name',
      'Nominee Relationship',
      'Nominee Date of Birth',
      'Nominee Contact Number',
      'Member 1 Full name',
      'Relationship1',
      'Gender of Member 1',
      'DOB of Member 1',
      'Member 2 Full name',
      'Relationship2',
      'Gender of member 2',
      'DOB of Member 2',
      'Member 3 Full name',
      'Relationship3',
      'Gender of member 3',
      'DOB of Member 3',
      'Member 4 Full name',
      'Relationship4',
      'Gender of member 4',
      'DOB of Member 4',
      'Member 5 Full name',
      'Relationship5',
      'Gender of member 5',
      'DOB of Member 5',
      'Member 6 Full name',
      'Relationship6',
      'Gender of member 6',
      'DOB of Member 6',
    ];

    const sheetData: any[][] = [headers];

    const clean = (v: any): string => {
      const s = String(v ?? '').trim();
      return s === 'N/A' ? '' : s;
    };

    const splitName = (full: string): [string, string] => {
      const parts = full.trim().split(/\s+/);
      if (parts.length === 1) return [parts[0], ''];
      return [parts[0], parts.slice(1).join(' ')];
    };

    for (const sale of sales) {
      const kyc: any = await CustomerKYC.findOne({ saleId: sale._id }).lean();

      const pan     = clean(sale.customerPAN || kyc?.pan || '');
      const full    = clean(sale.customerName || kyc?.fullName || '');
      const [fName, lName] = splitName(full);
      const mobile  = clean(sale.customerMobile || kyc?.mobile || '');
      const dob     = clean(sale.customerDOB || kyc?.dob || '');
      const gender  = clean(kyc?.gender || '');
      const address = clean(kyc?.addressLine1 || '');
      const city    = clean(kyc?.city || '');
      const state   = clean(sale.customerState || kyc?.state || '');
      const pincode = clean(kyc?.pincode || '');
      const email   = clean(sale.customerEmail || kyc?.email || '');

      const planName = (sale.plan as any)?.name || 'Health Plan';
      const planPriceWithoutGst = (sale.plan as any)?.price
        ? ((sale.plan as any).price / 100).toFixed(2)
        : (sale.saleAmount ? ((sale.saleAmount / 1.18) / 100).toFixed(2) : '');
      const planPriceWithGst = sale.saleAmount
        ? (sale.saleAmount / 100).toFixed(2)
        : ((sale.plan as any)?.price ? (((sale.plan as any).price * 1.18) / 100).toFixed(2) : '');

      const family: any[] = kyc?.familyDetails || [];
      const memberCells: string[] = [];
      for (let n = 0; n < 6; n++) {
        const m = family[n];
        memberCells.push(clean(m?.name || ''));
        memberCells.push(clean(m?.relation || ''));
        memberCells.push(clean(m?.gender || ''));
        memberCells.push(clean(m?.dob || ''));
      }

      const nomineeName     = clean(kyc?.nomineeName || sale.nomineeName || '');
      const nomineeRelation = clean(kyc?.nomineeRelation || sale.nomineeRelation || '');
      const nomineeDOB      = clean(kyc?.nomineeDOB || '');
      const nomineeContact  = clean(kyc?.nomineeContact || '');

      const row = [
        pan, fName, lName, mobile, dob, gender,
        address, city, state, pincode, email,
        planName, planPriceWithoutGst, planPriceWithGst,
        nomineeName,
        nomineeRelation,
        nomineeDOB,
        nomineeContact,
        ...memberCells,
      ];
      sheetData.push(row);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Apply yellow highlighter color to header row cells
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: 'FFFF00' } // Yellow highlighter fill
          },
          font: {
            bold: true,
            color: { rgb: '000000' } // Black bold text
          },
          alignment: {
            horizontal: 'center',
            vertical: 'center'
          }
        };
      }
    }

    const colWidths = [
      { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
      { wch: 40 }, { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 30 },
      { wch: 22 }, { wch: 20 }, { wch: 20 },
      { wch: 24 }, { wch: 18 }, { wch: 14 }, { wch: 16 },
      ...Array(6).fill(null).flatMap(() => [
        { wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 14 }
      ])
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="CureBharat_Customers_Export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);

  } catch (error: any) {
    console.error('[Admin] exportCustomersXLSX Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
