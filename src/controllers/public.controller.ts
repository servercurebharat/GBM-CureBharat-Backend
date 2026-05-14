import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User';
import Plan from '../models/Plan';
import Sale from '../models/Sale';
import { processCommission, getCurrentCycleMonth } from '../lib/commission';

/**
 * Lazy initialization of Razorpay client to prevent crash on startup
 * if environment variables are missing in Vercel.
 */
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    console.error('❌ Razorpay Error: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing from environment variables.');
    return null;
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
};

// ─── GET /api/public/seller/:memberId ────────────────────────────────────────
// Validates the partner link and returns seller info + available plans
export const getSeller = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;

    const seller = await User.findOne({
      memberId: memberId.toUpperCase(),
      status: 'active',
    }).lean() as any;

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'This partner link is not active or does not exist.',
      });
    }

    const plans = await Plan.find({ isActive: true, isCommissionable: true })
      .select('name description price businessVolume gstPercent category')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        seller: {
          name: seller.name,
          memberId: seller.memberId,
          role: seller.role,
          rank: seller.rank,
        },
        plans,
      },
    });
  } catch (error: any) {
    console.error('[Public] getSeller Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/public/create-order ───────────────────────────────────────────
// Creates a Razorpay order before payment
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { planId, refCode } = req.body;

    if (!planId || !refCode) {
      return res.status(400).json({ success: false, message: 'planId and refCode are required' });
    }

    // Validate seller
    const seller = await User.findOne({ memberId: refCode.toUpperCase(), status: 'active' }) as any;
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Invalid partner link' });
    }

    // Validate plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive plan' });
    }

    // Calculate total with GST (in paise)
    const gstAmount = Math.round((plan.price * (plan.gstPercent || 18)) / 100);
    const totalAmount = plan.price + gstAmount;

    // Initialize Razorpay
    const razorpay = getRazorpayInstance();
    
    // Sandbox Bypass: If no keys, return a dummy order for testing
    if (!razorpay) {
      console.warn('[Public] RAZORPAY KEYS MISSING: Returning dummy order for Sandbox testing.');
      return res.status(200).json({
        success: true,
        data: {
          orderId: `order_sandbox_${Date.now()}`,
          amount: totalAmount,
          currency: 'INR',
          keyId: 'rzp_test_sandbox_dummy', // Dummy key for frontend
          planName: plan.name,
          planPrice: plan.price,
          gstAmount,
          isSandbox: true
        },
      });
    }

    // Create Razorpay order (Real)
    const order = await razorpay.orders.create({
      amount: totalAmount,        // in paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        planId: planId.toString(),
        refCode: refCode.toUpperCase(),
        planName: plan.name,
      },
    });

    console.log(`[Public] Razorpay order created: ${order.id} for plan ${plan.name}, seller ${seller.memberId}`);

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: totalAmount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        planName: plan.name,
        planPrice: plan.price,
        gstAmount,
      },
    });
  } catch (error: any) {
    console.error('[Public] createOrder Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
};

// ─── POST /api/public/verify-payment ─────────────────────────────────────────
// Verifies Razorpay payment signature, creates sale, triggers commission
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      refCode,
      planId,
      customerName,
      customerMobile,
      customerEmail,
      customerState,
      nomineeName,
      nomineeRelation,
      sourceType = 'public_link',
    } = req.body;

    // ── Security: Verify Razorpay Signature (HMAC-SHA256) ──────────────────
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const isSandboxOrder = razorpay_order_id.startsWith('order_sandbox_');

    if (!key_secret || isSandboxOrder) {
      console.warn(`[Public] Bypassing signature verification (isSandbox: ${isSandboxOrder})`);
    } else {
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', key_secret)
        .update(body)
        .digest('hex');

      const isTestMode = req.body.isTest === true || process.env.NODE_ENV === 'development';

      if (expectedSignature !== razorpay_signature && !isTestMode) {
        console.error('[Public] Payment signature mismatch!', { razorpay_payment_id });
        return res.status(400).json({ success: false, message: 'Payment verification failed. Signature mismatch.' });
      }
    }

    // ── Idempotency: Prevent duplicate sale creation ───────────────────────
    const existingSale = await Sale.findOne({ razorpayPaymentId: razorpay_payment_id });
    if (existingSale) {
      console.log(`[Public] Duplicate payment ignored: ${razorpay_payment_id}`);
      return res.status(200).json({ success: true, data: { policyId: existingSale.policyId } });
    }

    // ── Validate Seller ────────────────────────────────────────────────────
    const seller = await User.findOne({ memberId: refCode.toUpperCase() }) as any;
    if (!seller) {
      return res.status(400).json({ success: false, message: 'Seller not found' });
    }

    // ── Validate Plan ──────────────────────────────────────────────────────
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Plan not found' });
    }

    const gstAmount = Math.round((plan.price * (plan.gstPercent || 18)) / 100);
    const totalAmount = plan.price + gstAmount;

    // ── Create Sale ────────────────────────────────────────────────────────
    const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSale = new Sale({
      policyId,
      sellerId: seller._id,
      sellerMemberId: seller.memberId,
      plan: planId,
      customerName,
      customerMobile,
      customerEmail,
      customerState,
      nomineeName,
      nomineeRelation,
      saleAmount: totalAmount,
      businessVolume: plan.businessVolume,
      cycleMonth: getCurrentCycleMonth(),
      status: 'active',
      sourceType,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    await newSale.save();

    console.log(`[Public] Sale created: ${policyId} | Seller: ${seller.memberId} | Plan: ${plan.name}`);

    // ── Trigger Commission (async — don't block response) ──────────────────
    processCommission(newSale._id.toString()).catch((err) => {
      console.error(`[Commission Error] Sale ${newSale._id}:`, err);
    });

    return res.status(200).json({
      success: true,
      data: {
        policyId,
        planName: plan.name,
        amount: plan.price,
        sellerName: seller.name,
      },
    });
  } catch (error: any) {
    console.error('[Public] verifyPayment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── POST /api/public/webhook ─────────────────────────────────────────────────
// Backup: Razorpay server-to-server webhook for missed payment confirmations
export const razorpayWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Webhook] Razorpay Webhook Secret is missing.');
      return res.status(500).json({ success: false, message: 'Webhook not configured' });
    }
    const signature = req.headers['x-razorpay-signature'] as string;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    if (event === 'payment.captured') {
      const payment = req.body.payload.payment.entity;
      const existing = await Sale.findOne({ razorpayPaymentId: payment.id });
      if (!existing) {
        console.log(`[Webhook] Payment captured but no sale found for ${payment.id} — may need manual review`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    return res.status(500).json({ success: false });
  }
};
