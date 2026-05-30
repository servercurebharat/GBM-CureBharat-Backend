"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayWebhook = exports.verifyPayment = exports.createOrder = exports.getSeller = void 0;
const cashfree_pg_1 = require("cashfree-pg");
const User_1 = __importDefault(require("../models/User"));
const Plan_1 = __importDefault(require("../models/Plan"));
const Sale_1 = __importDefault(require("../models/Sale"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const commission_1 = require("../lib/commission");
// ─────────────────────────────────────────────
// Initialize Cashfree SDK (singleton)
// ─────────────────────────────────────────────
const cfEnv = process.env.CASHFREE_ENV === 'PROD'
    ? cashfree_pg_1.CFEnvironment.PRODUCTION
    : cashfree_pg_1.CFEnvironment.SANDBOX;
const cashfree = new cashfree_pg_1.Cashfree(cfEnv, process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY);
// ─── GET /api/public/seller/:memberId ────────────────────────────────────────
// Validates the partner link and returns seller info + available plans
const getSeller = async (req, res) => {
    try {
        const { memberId } = req.params;
        const seller = await User_1.default.findOne({
            memberId: memberId.toUpperCase(),
            status: 'active',
        }).lean();
        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'This partner link is not active or does not exist.',
            });
        }
        const plans = await Plan_1.default.find({ isActive: true, isCommissionable: true })
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
    }
    catch (error) {
        console.error('[Public] getSeller Error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getSeller = getSeller;
// ─── POST /api/public/create-order ───────────────────────────────────────────
// Creates a Cashfree order before payment
const createOrder = async (req, res) => {
    try {
        const { planId, refCode, customerName, customerMobile, customerEmail } = req.body;
        if (!planId || !refCode) {
            return res.status(400).json({ success: false, message: 'planId and refCode are required' });
        }
        // Validate seller
        const seller = await User_1.default.findOne({ memberId: refCode.toUpperCase(), status: 'active' });
        if (!seller) {
            return res.status(404).json({ success: false, message: 'Invalid partner link' });
        }
        // Validate plan
        const plan = await Plan_1.default.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(400).json({ success: false, message: 'Invalid or inactive plan' });
        }
        // Calculate total with GST (in paise)
        const gstAmount = Math.round((plan.price * (plan.gstPercent || 18)) / 100);
        const totalPaise = plan.price + gstAmount;
        const totalRupees = parseFloat((totalPaise / 100).toFixed(2));
        const orderId = `CB_SALE_${Date.now()}_${seller.memberId.replace('-', '')}`;
        const orderRequest = {
            order_id: orderId,
            order_amount: totalRupees,
            order_currency: 'INR',
            customer_details: {
                customer_id: seller._id.toString(), // seller is the "account holder"
                customer_name: customerName || seller.name,
                customer_email: customerEmail || seller.email || `${seller.memberId}@curebharat.com`,
                customer_phone: customerMobile || seller.mobile || '9999999999',
            },
            order_meta: {
                return_url: `${process.env.CASHFREE_RETURN_URL}?order_id={order_id}&ref=${refCode}&plan=${planId}`,
                notify_url: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/public/webhook`,
            },
            order_tags: {
                planId: planId.toString(),
                refCode: refCode.toUpperCase(),
                planName: plan.name,
            },
        };
        const response = await cashfree.PGCreateOrder(orderRequest);
        const orderData = response.data;
        console.log(`[Public] Cashfree order created: ${orderId} for plan ${plan.name}, seller ${seller.memberId}`);
        return res.status(200).json({
            success: true,
            data: {
                orderId,
                paymentSessionId: orderData.payment_session_id,
                cfOrderId: orderData.cf_order_id,
                amount: totalRupees,
                amountPaise: totalPaise,
                currency: 'INR',
                planName: plan.name,
                planPrice: plan.price,
                gstAmount,
            },
        });
    }
    catch (error) {
        const cfErr = error?.response?.data;
        console.error('[Public] createOrder Error:', cfErr || error.message);
        return res.status(500).json({
            success: false,
            message: cfErr?.message || 'Failed to create payment order',
            error: error.message,
        });
    }
};
exports.createOrder = createOrder;
// ─── POST /api/public/verify-payment ─────────────────────────────────────────
// Verifies Cashfree order status, creates sale, triggers commission
const verifyPayment = async (req, res) => {
    try {
        const { orderId, // Cashfree orderId (CB_SALE_...)
        refCode, planId, customerName, customerMobile, customerEmail, customerState, nomineeName, nomineeRelation, sourceType = 'public_link', } = req.body;
        if (!orderId || !refCode || !planId) {
            return res.status(400).json({ success: false, message: 'orderId, refCode and planId are required' });
        }
        // ── Idempotency Check 1: same Cashfree orderId ─────────────────────────
        const existingSaleByOrder = await Sale_1.default.findOne({ cashfreeOrderId: orderId });
        if (existingSaleByOrder) {
            console.log(`[Public] Duplicate orderId ignored: ${orderId}`);
            return res.status(200).json({ success: true, data: { policyId: existingSaleByOrder.policyId } });
        }
        // ── Idempotency Check 2: same mobile + plan in last 5 minutes ─────────
        // Guards against React StrictMode double-calls that create two different orderIds
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existingSaleByMobile = await Sale_1.default.findOne({
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
                cfPaymentId = cfResponse.data?.payments?.[0]?.cf_payment_id || cfPaymentId;
            }
            catch (cfErr) {
                console.error('[Public] Cashfree verify error:', cfErr?.response?.data || cfErr.message);
                return res.status(400).json({ success: false, message: 'Could not verify payment with Cashfree' });
            }
        }
        if (orderStatus !== 'PAID') {
            return res.status(400).json({ success: false, message: `Payment not completed. Status: ${orderStatus}` });
        }
        // ── Validate Seller ────────────────────────────────────────────────────
        const seller = await User_1.default.findOne({ memberId: refCode.toUpperCase() });
        if (!seller) {
            return res.status(400).json({ success: false, message: 'Seller not found' });
        }
        // ── Validate Plan ──────────────────────────────────────────────────────
        const plan = await Plan_1.default.findById(planId);
        if (!plan) {
            return res.status(400).json({ success: false, message: 'Plan not found' });
        }
        const gstAmount = Math.round((plan.price * (plan.gstPercent || 18)) / 100);
        const totalPaise = plan.price + gstAmount;
        // ── Create Sale ────────────────────────────────────────────────────────
        const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const newSale = new Sale_1.default({
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
            saleAmount: totalPaise,
            businessVolume: plan.businessVolume,
            cycleMonth: (0, commission_1.getCurrentCycleMonth)(),
            status: 'active',
            sourceType,
            paymentMethod: 'cashfree',
            cashfreeOrderId: orderId,
            cashfreePaymentId: cfPaymentId,
        });
        await newSale.save();
        console.log(`[Public] Sale created: ${policyId} | Seller: ${seller.memberId} | Plan: ${plan.name}`);
        // ── Create User Account (with race-condition protection) ──────────────
        let newUserAccount = await User_1.default.findOne({ mobile: customerMobile });
        let createdNewUser = false;
        if (!newUserAccount) {
            console.log(`[Public] Creating new user account for ${customerMobile}`);
            const lastHCC = await User_1.default.findOne({ role: 'hcc' }).sort({ createdAt: -1 });
            let nextNum = 1001;
            if (lastHCC && lastHCC.memberId) {
                const match = lastHCC.memberId.match(/\d+$/);
                if (match)
                    nextNum = parseInt(match[0]) + 1;
            }
            const newMemberId = `CB-HCC-${nextNum}`;
            try {
                const toCreate = new User_1.default({
                    name: customerName,
                    mobile: customerMobile,
                    email: customerEmail,
                    state: customerState || 'Maharashtra',
                    password: '123456',
                    memberId: newMemberId,
                    referrerId: seller._id,
                    role: 'hcc',
                    rank: 'HCC',
                    status: 'active',
                    kycStatus: 'not_submitted',
                });
                await toCreate.save();
                newUserAccount = toCreate;
                await Wallet_1.default.create({ user: newUserAccount._id });
                createdNewUser = true;
                await User_1.default.findByIdAndUpdate(seller._id, { $inc: { personalRecruitsThisMonth: 1 } });
                // Update recursive team size up the hierarchy
                let currentRefId = seller._id;
                while (currentRefId) {
                    const refUser = await User_1.default.findById(currentRefId);
                    if (!refUser)
                        break;
                    refUser.teamSize = (refUser.teamSize || 0) + 1;
                    await refUser.save();
                    currentRefId = refUser.referrerId;
                }
                console.log(`[Public] User account created: ${newMemberId} for ${customerName}`);
            }
            catch (createErr) {
                if (createErr.code === 11000) {
                    // Race condition: another concurrent request already created this user
                    console.warn(`[Public] Race condition on user creation for ${customerMobile} — fetching existing user`);
                    newUserAccount = await User_1.default.findOne({ mobile: customerMobile });
                    createdNewUser = false;
                }
                else {
                    throw createErr; // Re-throw unexpected errors
                }
            }
        }
        // ── Trigger Commission (async) ─────────────────────────────────────────
        (0, commission_1.processCommission)(newSale._id.toString()).catch((err) => {
            console.error(`[Commission Error] Sale ${newSale._id}:`, err);
        });
        return res.status(200).json({
            success: true,
            data: {
                policyId,
                planName: plan.name,
                amount: plan.price,
                sellerName: seller.name,
                newUser: createdNewUser ? {
                    memberId: newUserAccount.memberId,
                    password: '123456',
                    message: 'Account created! You can now login with your mobile and password.',
                } : null,
            },
        });
    }
    catch (error) {
        console.error('[Public] verifyPayment Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.verifyPayment = verifyPayment;
// ─── POST /api/public/webhook ─────────────────────────────────────────────────
// Cashfree server-to-server webhook for missed payment confirmations
const razorpayWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-webhook-signature'] || '';
        const timestamp = req.headers['x-webhook-timestamp'] || '';
        const rawBody = JSON.stringify(req.body);
        // Verify Cashfree webhook signature
        if (signature && timestamp) {
            try {
                cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
            }
            catch {
                console.warn('[PublicWebhook] Invalid signature');
                return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
            }
        }
        const event = req.body;
        const eventType = event?.type;
        console.log(`[PublicWebhook] Event received: ${eventType}`);
        if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
            const orderId = event?.data?.order?.order_id;
            const cfPayId = event?.data?.payment?.cf_payment_id;
            // Only process if no sale yet (webhook may arrive before verify-payment call)
            const existing = await Sale_1.default.findOne({ cashfreeOrderId: orderId });
            if (!existing && orderId) {
                console.log(`[PublicWebhook] Sale not yet created for ${orderId} — will be handled on verify`);
                // The verify-payment endpoint handles sale creation; this is just a backup log
            }
            // Mark payment as confirmed if sale exists but commission not yet processed
            if (existing && !existing.commissionProcessed) {
                existing.cashfreePaymentId = cfPayId;
                await existing.save();
                (0, commission_1.processCommission)(existing._id.toString()).catch(console.error);
            }
        }
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('[PublicWebhook] Error:', error.message);
        return res.status(500).json({ success: false });
    }
};
exports.razorpayWebhook = razorpayWebhook;
