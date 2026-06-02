import { Response } from 'express';
import Sale from '../models/Sale';
import User from '../models/User';
import Plan from '../models/Plan';
import EPin from '../models/EPin';
import { processCommission, getCurrentCycleMonth } from '../lib/commission';
import { createNotification } from './notification.controller';

export const createSale = async (req: any, res: Response) => {
  try {
    const { customerName, customerMobile, planId, customerState } = req.body;

    // 1. Any role can record a sale (Personal Sale)
    const seller = req.user;

    // 2. Fetch Plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive plan' });
    }

    // 3. Calculate Total Billing Amount (Price + GST)
    const gstAmount = Math.round((plan.price * (plan.gstPercent || 18)) / 100);
    const totalAmount = plan.price + gstAmount;

    // E-Pin logic removed (Online Only)

    // 5. Generate unique Policy ID
    const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 6. Create Sale Record
    const newSale = new Sale({
      policyId,
      sellerId: req.user._id,
      sellerMemberId: req.user.memberId,
      plan: planId,
      customerName,
      customerMobile,
      customerState: customerState || 'Maharashtra',
      saleAmount: totalAmount,
      businessVolume: plan.businessVolume,
      cycleMonth: getCurrentCycleMonth(),
      status: 'active',
      sourceType: 'dashboard',
      razorpayOrderId: 'INTERNAL',  // For dashboard sales, we'll implement the actual checkout later
      razorpayPaymentId: `INT_PAY_${Date.now()}`
    });

    await newSale.save();

    // E-Pin logic removed

    // 7. Trigger Commission Processing (Async)
    processCommission(newSale._id.toString()).catch(err => {
      console.error(`[Commission Error] Sale ${newSale._id}:`, err);
    });

    // Trigger in-app notification to all admin users about the new sale!
    try {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await createNotification(
          admin._id.toString(),
          'New Sale Recorded',
          `Partner ${seller.name} (${seller.memberId}) recorded a new sale: ${plan.name} for ${customerName} (₹${(totalAmount / 100).toFixed(2)}).`,
          'success',
          `/admin/sales`
        );
      }
    } catch (notifErr) {
      console.error('[Sale] Admin notification failed:', notifErr);
    }

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

    console.log(`[Sales] Fetching sales for user: ${_id}, role: ${role}`);

    console.log(`[Sales] Role: ${role}, ID: ${_id}`);
    
    let query: any = {};
    const criteria: any[] = [];

    // Filter based on role
    if (role !== 'admin') {
      criteria.push({
        $or: [
          { sellerId: _id },
          { hccId: _id },
          { hcmId: _id },
          { hbaId: _id },
          { shId: _id }
        ]
      });
    }

    // Search filter
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      criteria.push({
        $or: [
          { customerName: searchRegex },
          { customerMobile: searchRegex },
          { policyId: searchRegex }
        ]
      });
    }

    // Status filter
    if (req.query.status && req.query.status !== 'all') {
      criteria.push({ status: req.query.status });
    }

    if (req.query.sellerId) {
      criteria.push({ sellerId: req.query.sellerId });
    }

    if (criteria.length > 0) {
      query = { $and: criteria };
    }

    console.log(`[Sales] Query: ${JSON.stringify(query)}`);

    const sales = await Sale.find(query)
      .populate('plan', 'name price')
      .populate('sellerId', 'name memberId')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean() as any;

    console.log(`[Sales] Found ${sales.length} results`);

    const total = await Sale.countDocuments(query);

    // Apply Privacy: Only direct seller can see customer details
    const processedSales = sales.map((sale: any) => {
      // Map sellerId to seller for frontend compatibility
      const seller = sale.sellerId;
      
      // If current user is NOT the seller, redact customer details
      // Defensive check: if seller is missing (orphaned record), handle gracefully
      if (!seller) {
        return {
          ...sale,
          seller: null,
          customerName: 'N/A',
          customerMobile: 'N/A',
          customerEmail: 'N/A'
        };
      }

      const isSeller = seller._id?.toString() === _id.toString();
      const isAdmin = role === 'admin';

      if (isSeller || isAdmin) {
        return { ...sale, seller };
      }

      return {
        ...sale,
        seller,
        customerName: 'PROTECTED',
        customerMobile: '**********',
        customerEmail: '***',
        nomineeName: '***'
      };
    });

    return res.status(200).json({ 
      success: true, 
      data: processedSales,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error: any) {
    console.error('[Sale] getMySales Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
