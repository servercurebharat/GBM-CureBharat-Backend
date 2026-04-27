import { Request, Response } from 'express';
import Config from '../models/Config';
import User from '../models/User';

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

    res.json({ 
      success: true, 
      message: `KYC ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      user 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
