import { Response } from 'express';
import Sale from '../models/Sale';
import User from '../models/User';
import Plan from '../models/Plan';
import EPin from '../models/EPin';
import { processCommission, getCurrentCycleMonth } from '../lib/commission';

export const createSale = async (req: any, res: Response) => {
  try {
    const { customerName, customerMobile, planId, ePinCode } = req.body;

    // 1. Verify HCC role
    if (req.user.role !== 'hcc') {
      return res.status(403).json({ success: false, message: 'Only HCC can record sales' });
    }

    // 2. Fetch Plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive plan' });
    }

    // 3. E-Pin Validation (if provided)
    let epin = null;
    if (ePinCode) {
      epin = await EPin.findOne({ pinCode: ePinCode, status: 'unused' });
      if (!epin) {
        return res.status(400).json({ success: false, message: 'E-Pin invalid or already used' });
      }
      if (epin.value < plan.price) {
        return res.status(400).json({ success: false, message: 'E-Pin value insufficient for this plan' });
      }
    }

    // 4. Generate unique Policy ID
    const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 5. Create Sale Record
    const newSale = new Sale({
      policyId,
      hccId: req.user._id,
      plan: planId,
      customerName,
      customerMobile,
      saleAmount: plan.price,
      businessVolume: plan.businessVolume,
      cycleMonth: getCurrentCycleMonth(),
      status: 'active'
    });

    await newSale.save();

    // 6. Mark E-Pin as used
    if (epin) {
      epin.status = 'used';
      epin.usedBy = req.user._id;
      epin.usedDate = new Date();
      await epin.save();
    }

    // 7. Trigger Commission Processing (Async)
    processCommission(newSale._id.toString()).catch(err => {
      console.error(`[Commission Error] Sale ${newSale._id}:`, err);
    });

    return res.status(201).json({ 
      success: true, 
      message: 'Sale recorded successfully. Commission processing started.',
      data: { policyId, amount: plan.price }
    });

  } catch (error: any) {
    console.error('[Sale] createSale Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getMySales = async (req: any, res: Response) => {
  try {
    const { role, _id } = req.user;
    const { page = 1, limit = 10 } = req.query;

    let query: any = {};

    // Filter based on role
    if (role === 'hcc') {
      query.hccId = _id;
    } else if (role === 'admin' || role === 'sh') {
      // Admin sees everything
    } else {
      // HCM/HBA logic: see sales of downline
    }

    const sales = await Sale.find(query)
      .populate('plan', 'name price')
      .populate('hccId', 'name memberId')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean() as any;

    const total = await Sale.countDocuments(query);

    return res.status(200).json({ 
      success: true, 
      data: sales,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error: any) {
    console.error('[Sale] getMySales Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
