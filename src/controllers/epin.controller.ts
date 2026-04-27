import { Response } from 'express';
import EPin from '../models/EPin';
import Plan from '../models/Plan';
import User from '../models/User';

export const generateEPins = async (req: any, res: Response) => {
  try {
    const { planId, quantity, assignToUserId } = req.body;

    if (!planId || !quantity) {
      return res.status(400).json({ success: false, message: 'Plan ID and quantity are required' });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const pins = [];
    for (let i = 0; i < quantity; i++) {
      const pinCode = `CB-PIN-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      pins.push({
        pinCode,
        value: plan.price,
        plan: planId,
        generatedBy: req.user._id,
        currentOwnerId: assignToUserId || req.user._id,
        status: 'unused'
      });
    }

    await EPin.insertMany(pins);

    return res.status(201).json({ 
      success: true, 
      message: `${quantity} E-Pins generated successfully`,
      data: pins.map(p => p.pinCode)
    });

  } catch (error: any) {
    console.error('[EPin] generateEPins Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const transferEPin = async (req: any, res: Response) => {
  try {
    const { pinCode, toMemberId } = req.body;

    const pin = await EPin.findOne({ pinCode, status: 'unused', currentOwnerId: req.user._id });
    if (!pin) {
      return res.status(400).json({ success: false, message: 'Pin not found or not owned by you' });
    }

    const targetUser = await User.findOne({ memberId: toMemberId });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    pin.transferHistory.push({
      from: req.user._id,
      to: targetUser._id as any,
      date: new Date()
    });

    pin.currentOwnerId = targetUser._id as any;
    await pin.save();

    return res.status(200).json({ 
      success: true, 
      message: `E-Pin ${pinCode} transferred to ${targetUser.name} (${toMemberId})` 
    });

  } catch (error: any) {
    console.error('[EPin] transferEPin Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getMyPins = async (req: any, res: Response) => {
  try {
    const unused = await EPin.find({ currentOwnerId: req.user._id, status: 'unused' }).populate('plan', 'name price').lean() as any;
    const used = await EPin.find({ currentOwnerId: req.user._id, status: 'used' }).populate('plan', 'name price').limit(20).lean() as any;

    return res.status(200).json({
      success: true,
      data: {
        unused,
        used,
        totalUnused: unused.length
      }
    });
  } catch (error: any) {
    console.error('[EPin] getMyPins Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
