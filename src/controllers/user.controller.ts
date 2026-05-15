import { Request, Response } from 'express';
import User from '../models/User';

export const getDownline = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const users = await User.find({}).lean();
    
    const buildTree = (parentId: any): any => {
      return users
        .filter((u: any) => String(u.referrerId) === String(parentId))
        .map((u: any) => ({
          ...u,
          children: buildTree(u._id)
        }));
    };

    const rootUser = users.find((u: any) => String(u._id) === String(id));
    if (!rootUser) return res.status(404).json({ success: false, message: 'User not found' });

    const tree = {
      ...rootUser,
      children: buildTree(id)
    };

    return res.status(200).json({ success: true, data: tree });
  } catch (error: any) {
    console.error('[User] getDownline Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getAdminTree = async (req: any, res: Response) => {
  try {
    const users = await User.find({}).lean();
    
    const buildTree = (parentId: any): any => {
      return users
        .filter((u: any) => String(u.referrerId) === String(parentId))
        .map((u: any) => ({
          ...u,
          children: buildTree(u._id)
        }));
    };

    // Find roots (users with no referrer or whose referrer doesn't exist)
    const roots = users
      .filter((u: any) => !u.referrerId || !users.find(parent => String(parent._id) === String(u.referrerId)))
      .map((u: any) => ({
        ...u,
        children: buildTree(u._id)
      }));

    return res.status(200).json({ success: true, data: roots });
  } catch (error: any) {
    console.error('[User] getAdminTree Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getUserStats = async (req: any, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const inactiveUsers = await User.countDocuments({ status: 'inactive' });
    const pendingKycUsers = await User.countDocuments({ kycStatus: 'pending' });

    const roles = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const roleDistribution = roles.reduce((acc: any, curr: any) => {
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
  } catch (error: any) {
    console.error('[User] getUserStats Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


export const updateKYC = async (req: any, res: Response) => {
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

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Handle File Uploads from Cloudinary (via multer)
    const files = req.files as any;
    const getUrl = (fieldname: string) => {
      const path = files?.[fieldname]?.[0]?.path;
      console.log(`[KYC] Extracted URL for ${fieldname}:`, path);
      return path;
    };

    // Update logic
    if (req.user.role === 'admin' && req.body.kycStatus) {
      user.kycStatus = req.body.kycStatus;
    } else {
      user.kycStatus = 'pending';
      
      // Ensure sub-object exists
      if (!user.kycDocuments) user.kycDocuments = {};

      // Update text fields
      if (aadhaarNumber) user.kycDocuments.aadhaarNumber = aadhaarNumber;
      if (panNumber) user.kycDocuments.panNumber = panNumber;
      if (bankName) user.kycDocuments.bankName = bankName;
      if (accountNumber) user.kycDocuments.accountNumber = accountNumber;
      if (ifscCode) user.kycDocuments.ifscCode = ifscCode;

      // Update URL fields individually
      const af = getUrl('aadhaarFront');
      const ab = getUrl('aadhaarBack');
      const pc = getUrl('panCard');
      const bp = getUrl('bankProof');
      const sf = getUrl('selfie');

      if (af) user.kycDocuments.aadhaarFrontUrl = af;
      if (ab) user.kycDocuments.aadhaarBackUrl = ab;
      if (pc) user.kycDocuments.panUrl = pc;
      if (bp) user.kycDocuments.bankProofUrl = bp;
      if (sf) user.kycDocuments.selfieUrl = sf;

      // Force Mongoose to recognize the nested update
      user.markModified('kycDocuments');
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'KYC profile updated with documents.',
      data: user
    });

  } catch (error: any) {
    console.error('[User] updateKYC Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getAllUsers = async (req: any, res: Response) => {
  try {
    const { page = 1, limit = 20, search, role, state, refer } = req.query;

    let query: any = {};
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

    if (refer) {
      // refer could be memberId or name
      const referrer = await User.findOne({ 
        $or: [
          { memberId: refer },
          { name: { $regex: refer, $options: 'i' } }
        ]
      });
      if (referrer) {
        query.referrerId = referrer._id;
      }
    }

    const users = await User.find(query)
      .select('-password')
      .populate('referrerId', 'name memberId')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean() as any;

    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error: any) {
    console.error('[User] getAllUsers Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getUserById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    console.error('[User] getUserById Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, mobile } = req.body;

    // Security: Only allow updating specific fields
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (mobile) updateData.mobile = mobile;

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error: any) {
    console.error('[User] updateProfile Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
