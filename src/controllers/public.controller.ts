import { Request, Response } from 'express';
import { Cashfree, CFEnvironment, CreateOrderRequest } from 'cashfree-pg';
import crypto from 'crypto';
import User from '../models/User';
import Plan from '../models/Plan';
import Sale from '../models/Sale';
import CustomerKYC from '../models/CustomerKYC';
import Wallet from '../models/Wallet';
import OTP from '../models/OTP';
import { processCommission, getCurrentCycleMonth } from '../lib/commission';
import { sendOTPMail, sendEmail } from '../lib/mailer';

// ─────────────────────────────────────────────
// Initialize Cashfree SDK (singleton)
// ─────────────────────────────────────────────
const cfEnv =
  process.env.CASHFREE_ENV === 'PROD'
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;

const cashfree = new Cashfree(
  cfEnv,
  process.env.CASHFREE_APP_ID,
  process.env.CASHFREE_SECRET_KEY
);

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
          name:     seller.name,
          memberId: seller.memberId,
          role:     seller.role,
          rank:     seller.rank,
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
// Creates a Cashfree order before payment
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { planId, refCode, customerName, customerMobile, customerEmail } = req.body;

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
    const gstAmount   = Math.round((plan.price * (plan.gstPercent || 18)) / 100);
    const totalPaise  = plan.price + gstAmount;
    const totalRupees = parseFloat((totalPaise / 100).toFixed(2));

    const orderId = `CB_SALE_${Date.now()}_${seller.memberId.replace('-', '')}`;

    let backendUrl = (process.env.BACKEND_URL || 'http://localhost:4000').trim();
    if (!backendUrl.startsWith('http')) backendUrl = `https://${backendUrl}`;

    let returnUrl = process.env.CASHFREE_RETURN_URL || 'http://localhost:3000/buy/success';
    const orderRequest: CreateOrderRequest = {
      order_id:       orderId,
      order_amount:   totalRupees,
      order_currency: 'INR',
      customer_details: {
        customer_id:    seller._id.toString(),           // seller is the "account holder"
        customer_name:  customerName  || seller.name,
        customer_email: customerEmail || seller.email || `${seller.memberId}@curebharat.com`,
        customer_phone: customerMobile || (seller as any).mobile || '9999999999',
      },
      order_meta: {
        return_url: `${returnUrl}?order_id={order_id}&ref=${refCode}&plan=${planId}`,
        notify_url: `${backendUrl}/api/public/webhook`,
      },
      order_tags: {
        planId:   planId.toString(),
        refCode:  refCode.toUpperCase(),
        planName: plan.name,
      },
    };

    const response  = await cashfree.PGCreateOrder(orderRequest);
    const orderData = response.data;

    console.log(`[Public] Cashfree order created: ${orderId} for plan ${plan.name}, seller ${seller.memberId}`);

    return res.status(200).json({
      success: true,
      data: {
        orderId,
        paymentSessionId: orderData.payment_session_id,
        cfOrderId:        orderData.cf_order_id,
        amount:           totalRupees,
        amountPaise:      totalPaise,
        currency:         'INR',
        planName:         plan.name,
        planPrice:        plan.price,
        gstAmount,
      },
    });
  } catch (error: any) {
    const cfErr = error?.response?.data;
    console.error('[Public] createOrder Error:', cfErr || error.message);
    return res.status(500).json({
      success: false,
      message: cfErr?.message || 'Failed to create payment order',
      error:   error.message,
    });
  }
};

// ─── POST /api/public/verify-payment ─────────────────────────────────────────
// Verifies Cashfree order status, creates sale, triggers commission
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      orderId,           // Cashfree orderId (CB_SALE_...)
      refCode,
      planId,
      customerName,
      customerMobile,
      customerEmail,
      customerState,
      customerDOB,
      customerPAN,
      nomineeName,
      nomineeRelation,
      enrollmentType = 'customer',   // 'customer' or 'distributor'
      sourceType = 'public_link',
    } = req.body;

    if (!orderId || !refCode || !planId) {
      return res.status(400).json({ success: false, message: 'orderId, refCode and planId are required' });
    }

    // ── Idempotency Check 1: same Cashfree orderId ─────────────────────────
    const existingSaleByOrder = await Sale.findOne({ cashfreeOrderId: orderId });
    if (existingSaleByOrder) {
      console.log(`[Public] Duplicate orderId ignored: ${orderId}`);
      return res.status(200).json({ success: true, data: { policyId: existingSaleByOrder.policyId } });
    }

    // ── Idempotency Check 2: same mobile + plan in last 5 minutes ─────────
    // Guards against React StrictMode double-calls that create two different orderIds
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingSaleByMobile = await Sale.findOne({
      customerMobile,
      plan: planId,
      createdAt: { $gte: fiveMinutesAgo },
    });
    if (existingSaleByMobile) {
      console.log(`[Public] Duplicate mobile+plan sale ignored for ${customerMobile}`);
      return res.status(200).json({ success: true, data: { policyId: existingSaleByMobile.policyId } });
    }

    // ── Verify Payment Status with Cashfree ───────────────────────────────
    let orderStatus = 'PAID'; // Default to PAID in dev/test simulation mode
    let cfPaymentId = `cf_sim_${Date.now()}`;

    if (!req.body.isTest) {
      try {
        const cfResponse = await cashfree.PGFetchOrder(orderId);
        orderStatus = cfResponse.data.order_status || 'FAILED';
        // Try to fetch payment ID from order payments
        cfPaymentId = (cfResponse.data as any)?.payments?.[0]?.cf_payment_id || cfPaymentId;
      } catch (cfErr: any) {
        console.error('[Public] Cashfree verify error:', cfErr?.response?.data || cfErr.message);
        return res.status(400).json({ success: false, message: 'Could not verify payment with Cashfree' });
      }
    }

    if (orderStatus !== 'PAID') {
      return res.status(400).json({ success: false, message: `Payment not completed. Status: ${orderStatus}` });
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

    const gstAmount  = Math.round((plan.price * (plan.gstPercent || 18)) / 100);
    const totalPaise = plan.price + gstAmount;

    // ── Create Sale ────────────────────────────────────────────────────────
    const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSale = new Sale({
      policyId,
      sellerId:          seller._id,
      sellerMemberId:    seller.memberId,
      plan:              planId,
      customerName,
      customerMobile,
      customerEmail,
      customerState,
      customerDOB,
      customerPAN:       customerPAN ? customerPAN.toUpperCase() : undefined,
      nomineeName,
      nomineeRelation,
      enrollmentType,
      saleAmount:        totalPaise,
      businessVolume:    plan.businessVolume,
      cycleMonth:        getCurrentCycleMonth(),
      status:            'active',
      sourceType,
      paymentMethod:     'cashfree',
      cashfreeOrderId:   orderId,
      cashfreePaymentId: cfPaymentId,
    });

    await newSale.save();

    console.log(`[Public] Sale created: ${policyId} | Seller: ${seller.memberId} | Plan: ${plan.name}`);

    // ── Create User Account (only for Distributors, with race-condition protection) ──
    let newUserAccount: any = null;
    let createdNewUser = false;

    if (enrollmentType === 'distributor') {
      newUserAccount = await User.findOne({ mobile: customerMobile });

      if (!newUserAccount) {
        console.log(`[Public] Creating new HCC account for distributor ${customerMobile}`);

        const lastHCC = await User.findOne({ role: 'hcc' }).sort({ createdAt: -1 });
        let nextNum = 1001;
        if (lastHCC && lastHCC.memberId) {
          const match = lastHCC.memberId.match(/\d+$/);
          if (match) nextNum = parseInt(match[0]) + 1;
        }
        const newMemberId = `CB-HCC-${nextNum}`;

        try {
          const toCreate = new User({
            name:       customerName,
            mobile:     customerMobile,
            email:      customerEmail,
            state:      customerState || 'Maharashtra',
            password:   '123456',
            memberId:   newMemberId,
            referrerId: seller._id,
            role:       'hcc',
            rank:       'HCC',
            status:     'active',
            kycStatus:  'not_submitted',
          });
          await toCreate.save();
          newUserAccount = toCreate;
          await Wallet.create({ user: newUserAccount._id });
          createdNewUser = true;

          await User.findByIdAndUpdate(seller._id, { $inc: { personalRecruitsThisMonth: 1 } });

          // Update recursive team size up the hierarchy
          let currentRefId = seller._id;
          while (currentRefId) {
            const refUser = await User.findById(currentRefId);
            if (!refUser) break;
            refUser.teamSize = (refUser.teamSize || 0) + 1;
            await refUser.save();
            currentRefId = refUser.referrerId;
          }
          console.log(`[Public] HCC account created: ${newMemberId} for ${customerName}`);

        } catch (createErr: any) {
          if (createErr.code === 11000) {
            console.warn(`[Public] Race condition on user creation for ${customerMobile} — fetching existing user`);
            newUserAccount = await User.findOne({ mobile: customerMobile });
            createdNewUser = false;
          } else {
            throw createErr;
          }
        }
      }
    } else {
      console.log(`[Public] Customer-only enrollment for ${customerMobile} — no account created`);
    }

    // ── Send "Payment Successful & Complete Profile" Email ──
    if (customerEmail) {
      let emailHtml = '';
      
      if (enrollmentType === 'distributor') {
        const loginUrl = 'https://gbm.curebharat.com/login';
        emailHtml = `
          <h3>Welcome to the CureBharat Family!</h3>
          <p>Dear ${customerName},</p>
          <p>Your payment of ₹${plan.price} for <strong>${plan.name}</strong> was completely successful. (Policy ID: ${policyId})</p>
          <p>Your Distributor Account has been successfully created!</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Member ID / Login:</strong> ${newUserAccount?.memberId || customerMobile}</p>
            <p style="margin: 5px 0 0 0;"><strong>Password:</strong> 123456</p>
          </div>
          <p>Please log in to your dashboard to complete your KYC and generate your Policy Document.</p>
          <div style="margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #49D2B5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Dashboard</a>
          </div>
          <p>If you have any questions, feel free to reply to this email.</p>
        `;
      } else {
        const kycLink = `https://gbm.curebharat.com/customer-kyc/${newSale._id}`;
        
        emailHtml = `
          <h3>Thank you for choosing CureBharat!</h3>
          <p>Dear ${customerName},</p>
          <p>Your payment of ₹${plan.price} for <strong>${plan.name}</strong> was completely successful. (Policy ID: ${policyId})</p>
          <p>To generate your official Policy Document and Health Cards, we just need a few basic details (DOB, Address, Nominee, etc).</p>
          <div style="margin: 30px 0;">
            <a href="${kycLink}" style="background-color: #49D2B5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Complete Profile Now</a>
          </div>
          <p>If you have any questions, feel free to reply to this email.</p>
        `;
      }

      // Non-blocking email send
      sendEmail(customerEmail, 'Action Required: Complete Your CureBharat Policy Profile', emailHtml)
        .catch(err => console.error('[Public] Failed to send customer KYC email:', err));
    }

    // ── Trigger Commission (async) ─────────────────────────────────────────
    processCommission(newSale._id.toString()).catch((err) => {
      console.error(`[Commission Error] Sale ${newSale._id}:`, err);
    });

    return res.status(200).json({
      success: true,
      data: {
        policyId,
        planName:   plan.name,
        amount:     plan.price,
        sellerName: seller.name,
        newUser:    createdNewUser ? {
          memberId: newUserAccount!.memberId,
          password: '123456',
          message:  'Account created! You can now login with your mobile and password.',
        } : null,
      },
    });
  } catch (error: any) {
    console.error('[Public] verifyPayment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─── POST /api/public/webhook ─────────────────────────────────────────────────
// Cashfree server-to-server webhook for missed payment confirmations
export const razorpayWebhook = async (req: Request, res: Response) => {
  try {
    const signature = (req.headers['x-webhook-signature'] as string) || '';
    const timestamp = (req.headers['x-webhook-timestamp'] as string) || '';
    const rawBody   = JSON.stringify(req.body);

    // Verify Cashfree webhook signature
    if (signature && timestamp) {
      try {
        cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
      } catch {
        console.warn('[PublicWebhook] Invalid signature');
        return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event     = req.body;
    const eventType = event?.type as string;

    console.log(`[PublicWebhook] Event received: ${eventType}`);

    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId   = event?.data?.order?.order_id as string;
      const cfPayId   = event?.data?.payment?.cf_payment_id as string;

      // Only process if no sale yet (webhook may arrive before verify-payment call)
      const existing = await Sale.findOne({ cashfreeOrderId: orderId });
      if (!existing && orderId) {
        console.log(`[PublicWebhook] Sale not yet created for ${orderId} — will be handled on verify`);
        // The verify-payment endpoint handles sale creation; this is just a backup log
      }

      // Mark payment as confirmed if sale exists but commission not yet processed
      if (existing && !existing.commissionProcessed) {
        existing.cashfreePaymentId = cfPayId;
        await existing.save();
        processCommission(existing._id.toString()).catch(console.error);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[PublicWebhook] Error:', error.message);
    return res.status(500).json({ success: false });
  }
};

// ─── GET /api/public/check-mobile/:mobile ────────────────────────────────────
// Checks if a mobile number is already registered in the system
export const checkMobile = async (req: Request, res: Response) => {
  try {
    const { mobile } = req.params;
    if (!mobile || mobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number' });
    }

    let user = await User.findOne({ mobile }).select('name memberId role').lean() as any;
    
    // Find all active sales for this mobile to determine the highest plan price they own
    const userSales = await Sale.find({ customerMobile: mobile, status: 'active' }).populate('plan').lean() as any[];
    let highestPlanPrice = 0;
    if (userSales && userSales.length > 0) {
      for (const sale of userSales) {
        if (sale.plan && sale.plan.price > highestPlanPrice) {
          highestPlanPrice = sale.plan.price;
        }
      }
    }

    if (user || highestPlanPrice > 0) {
      return res.status(200).json({
        success: true,
        data: {
          exists: !!user,
          name: user ? user.name : (userSales[0]?.customerName || ''),
          memberId: user ? user.memberId : undefined,
          role: user ? user.role : 'customer',
          highestPlanPrice,
        },
      });
    }

    return res.status(200).json({ success: true, data: { exists: false, highestPlanPrice: 0 } });
  } catch (error: any) {
    console.error('[Public] checkMobile Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/public/send-otp ───────────────────────────────────────────────
// Sends a 6-digit OTP to an email for enrollment verification
export const sendEmailOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email is required' });
    }

    // Rate limit: max 3 OTPs per email in 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentCount = await OTP.countDocuments({ email, createdAt: { $gte: fifteenMinutesAgo } });
    if (recentCount >= 3) {
      return res.status(429).json({ success: false, message: 'Too many OTP requests. Please wait 15 minutes.' });
    }

    // Delete any existing OTP for this email before creating new one
    await OTP.deleteMany({ email });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await OTP.create({ email, otp, expiresAt });

    const sent = await sendOTPMail(email, otp);
    if (!sent) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please check your email address.' });
    }

    console.log(`[Public] Email OTP sent to ${email}`);
    return res.status(200).json({ success: true, message: `OTP sent to ${email}` });
  } catch (error: any) {
    console.error('[Public] sendEmailOTP Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/public/verify-otp ─────────────────────────────────────────────
// Verifies the OTP entered by user
export const verifyEmailOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const record = await OTP.findOne({ email, otp });
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please try again.' });
    }

    if (record.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // OTP is valid — delete it so it can't be reused
    await OTP.deleteOne({ _id: record._id });

    console.log(`[Public] Email OTP verified for ${email}`);
    return res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error: any) {
    console.error('[Public] verifyEmailOTP Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /api/public/kyc/:saleId ──────────────────────────────────────────────
export const getKycSale = async (req: Request, res: Response) => {
  try {
    const sale = await Sale.findById(req.params.saleId).populate('plan');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    
    // Check if KYC already exists
    const kyc = await CustomerKYC.findOne({ saleId: sale._id });
    
    return res.status(200).json({
      success: true,
      data: {
        sale,
        kycSubmitted: !!kyc,
        kycData: kyc
      }
    });
  } catch (error: any) {
    console.error('[Public] getKycSale Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /api/public/kyc/policy/:policyId ───────────────────────────────────
// This endpoint is for the CRM to easily fetch KYC data using just the policy ID
export const getKycByPolicyId = async (req: Request, res: Response) => {
  try {
    const sale = await Sale.findOne({ policyId: req.params.policyId }).populate('plan');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale/Policy not found' });
    
    const kyc = await CustomerKYC.findOne({ saleId: sale._id });
    if (!kyc) return res.status(404).json({ success: false, message: 'KYC not submitted yet' });
    
    return res.status(200).json({
      success: true,
      data: {
        policyId: sale.policyId,
        customerName: sale.customerName,
        customerMobile: sale.customerMobile,
        planName: (sale.plan as any).name,
        kycData: kyc
      }
    });
  } catch (error: any) {
    console.error('[Public] getKycByPolicyId Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/public/kyc/:saleId ─────────────────────────────────────────────
export const submitKyc = async (req: Request, res: Response) => {
  try {
    const saleId = req.params.saleId;
    const existingKyc = await CustomerKYC.findOne({ saleId });
    if (existingKyc) {
      return res.status(400).json({ success: false, message: 'KYC profile already submitted for this policy.' });
    }

    const kyc = new CustomerKYC({
      saleId,
      ...req.body
    });
    
    await kyc.save();

    return res.status(200).json({
      success: true,
      message: 'Profile submitted successfully. Your policy document will be generated shortly.',
    });
  } catch (error: any) {
    console.error('[Public] submitKyc Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
