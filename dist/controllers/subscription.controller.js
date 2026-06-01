"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionStatus = exports.subscriptionWebhook = exports.createSubscription = void 0;
const axios_1 = __importDefault(require("axios"));
const User_1 = __importDefault(require("../models/User"));
const Plan_1 = __importDefault(require("../models/Plan"));
const Sale_1 = __importDefault(require("../models/Sale"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const commission_1 = require("../lib/commission");
// ─────────────────────────────────────────────────────────────────────────────
// Cashfree Subscriptions API base config
// Uses v2 subscriptions API (separate from PG SDK)
// ─────────────────────────────────────────────────────────────────────────────
const CF_BASE_URL = process.env.CASHFREE_ENV === 'PROD'
    ? 'https://api.cashfree.com'
    : 'https://sandbox.cashfree.com';
const CF_HEADERS = {
    'x-client-id': process.env.CASHFREE_APP_ID || '',
    'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
    'Content-Type': 'application/json',
};
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/create
// Creates a Cashfree Subscription mandate and returns authLink for redirect.
// The first charge (plan amount) fires when the customer authorizes the mandate.
// ─────────────────────────────────────────────────────────────────────────────
const createSubscription = async (req, res) => {
    try {
        const { planId, refCode, customerName, customerMobile, customerEmail, customerState, customerDOB, customerPAN, enrollmentType, nomineeName, nomineeRelation, } = req.body;
        if (!planId || !refCode || !customerName || !customerMobile) {
            return res.status(400).json({ success: false, message: 'planId, refCode, customerName, customerMobile are required' });
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
        const gstAmount = Math.round((plan.price * (plan.gstPercent || 18)) / 100);
        const totalPaise = plan.price + gstAmount;
        const totalRupees = totalPaise / 100;
        // Step 2 — Generate unique subscription ID
        const subscriptionId = `cb_sub_${Date.now()}_${seller.memberId.replace(/-/g, '')}`;
        const baseUrl = req.body.returnUrl || process.env.CASHFREE_RETURN_URL || 'http://localhost:3000/buy/success';
        const returnUrl = `${baseUrl}?subscription_id=${subscriptionId}&ref=${refCode}&plan=${planId}`;
        const safePlanName = plan.name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
        const finalPlanName = `CB ${safePlanName} Yr`.substring(0, 40).trim();
        // Step 3 — Create the Cashfree Subscription (mandate)
        const firstChargeDate = new Date();
        firstChargeDate.setFullYear(firstChargeDate.getFullYear() + 1);
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 10);
        const subPayload = {
            subscription_id: subscriptionId,
            plan_details: {
                plan_name: finalPlanName,
                plan_type: 'PERIODIC',
                plan_amount: totalRupees,
                plan_max_amount: totalRupees,
                plan_currency: 'INR',
                plan_interval_type: 'YEAR',
                plan_intervals: 1,
                plan_note: `Annual renewal for ${plan.name}`
            },
            customer_details: {
                customer_name: customerName,
                customer_phone: customerMobile,
                customer_email: customerEmail || `${customerMobile}@curebharat.com`,
            },
            subscription_note: `Policy for ${customerName} - ${plan.name}`,
            subscription_first_charge_time: firstChargeDate.toISOString(),
            subscription_expiry_time: expiryDate.toISOString(),
            authorization_details: {
                authorization_amount: totalRupees,
                authorization_amount_refund: false,
                payment_methods: ["upi", "card", "enach", "pnach"]
            },
            subscription_meta: {
                return_url: returnUrl
            }
        };
        const cfRes = await axios_1.default.post(`${CF_BASE_URL}/pg/subscriptions`, subPayload, { headers: { ...CF_HEADERS, 'x-api-version': '2025-01-01' } });
        const subData = cfRes.data;
        // Step 4 — Save a pending Sale record (status = pending_autopay)
        const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const nextRenewal = new Date();
        nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
        const newSale = new Sale_1.default({
            policyId,
            sellerId: seller._id,
            sellerMemberId: seller.memberId,
            plan: planId,
            customerName,
            customerMobile,
            customerEmail,
            customerState: customerState || 'Maharashtra',
            customerDOB,
            customerPAN,
            enrollmentType: enrollmentType || 'customer',
            nomineeName,
            nomineeRelation,
            saleAmount: totalPaise,
            businessVolume: plan.businessVolume,
            cycleMonth: (0, commission_1.getCurrentCycleMonth)(),
            status: 'pending_autopay',
            sourceType: 'public_link',
            paymentMethod: 'cashfree',
            autopayEnabled: true,
            cashfreeSubscriptionId: subscriptionId,
            nextRenewalDate: nextRenewal,
            renewalCount: 0,
            commissionProcessed: false,
        });
        await newSale.save();
        console.log(`[Subscription] Created mandate ${subscriptionId} → authLink returned to frontend`);
        return res.status(200).json({
            success: true,
            data: {
                subscriptionId,
                authLink: subData.data?.authLink || subData.authorization_details?.authorization_link || subData.authorization_link || subData.data?.authorization?.url,
                subsSessionId: subData.subscription_session_id,
                policyId,
                amount: totalRupees,
                planName: plan.name,
            },
        });
    }
    catch (error) {
        const cfErr = error?.response?.data;
        console.error('[Subscription] createSubscription Error:', cfErr || error.message);
        return res.status(500).json({
            success: false,
            message: cfErr?.message || 'Failed to create subscription',
            error: error.message,
        });
    }
};
exports.createSubscription = createSubscription;
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/webhook
// Handles Cashfree Subscription events:
//   SUBSCRIPTION_ACTIVATED → first payment done, activate policy
//   SUBSCRIPTION_CHARGE_SUCCESS → yearly renewal, re-trigger commission
//   SUBSCRIPTION_CANCELLED → mark sale cancelled
// ─────────────────────────────────────────────────────────────────────────────
const subscriptionWebhook = async (req, res) => {
    try {
        const event = req.body;
        const eventType = (event?.type || '').toLowerCase();
        console.log(`[SubWebhook] Event: ${eventType}`, JSON.stringify(event?.data || {}).substring(0, 200));
        // Extract subscription ID — Cashfree puts it in different places depending on event
        const subscriptionId = event?.data?.subscription?.subscription_id ||
            event?.data?.subscription_id ||
            event?.data?.subscriptionId || '';
        // ── Mandate Authorized / Auth Status (mandate approved by user) ──────────
        // Cashfree event: "subscription auth status" or "SUBSCRIPTION_ACTIVATED"
        const isAuthEvent = eventType === 'subscription_activated'
            || eventType === 'subscription.auth.status'
            || eventType === 'subscription auth status'
            || eventType === 'subscription_auth_status'; // Added v2025 format
        // ── Yearly Payment Success ───────────────────────────────────────────────
        // Cashfree event: "subscription payment success" or "SUBSCRIPTION_CHARGE_SUCCESS"
        const isPaymentSuccess = eventType === 'subscription_charge_success'
            || eventType === 'subscription.payment.success'
            || eventType === 'subscription payment success'
            || eventType === 'subscription_payment_success'; // Added v2025 format
        // ── Cancelled / Deactivated ──────────────────────────────────────────────
        // Cashfree event: "subscription payment cancelled" or "subscription status changed"
        const isCancelled = eventType === 'subscription_cancelled'
            || eventType === 'subscription_deactivated'
            || eventType === 'subscription.payment.cancelled'
            || eventType === 'subscription payment cancelled'
            || eventType === 'subscription status changed'
            || eventType === 'subscription_status_changed'; // Added v2025 format
        // ── Handle Activation (first mandate approval) ───────────────────────────
        if (isAuthEvent || isPaymentSuccess) {
            if (!subscriptionId)
                return res.status(200).json({ success: true });
            const sale = await Sale_1.default.findOne({ cashfreeSubscriptionId: subscriptionId });
            if (!sale) {
                console.warn(`[SubWebhook] No sale found for subscription: ${subscriptionId}`);
                return res.status(200).json({ success: true });
            }
            const isFirstActivation = isAuthEvent && sale.status === 'pending_autopay';
            const isRenewal = isPaymentSuccess && sale.status === 'active';
            // ── First Activation → Create/link user account + activate sale ───────
            if (isFirstActivation) {
                sale.status = 'active';
                sale.cashfreePaymentId = event?.data?.payment?.cf_payment_id
                    || event?.data?.payment?.payment_id || '';
                // Create user account if not exists
                let newUserAccount = await User_1.default.findOne({ mobile: sale.customerMobile });
                if (!newUserAccount) {
                    const lastHCC = await User_1.default.findOne({ role: 'hcc' }).sort({ createdAt: -1 });
                    let nextNum = 1001;
                    if (lastHCC?.memberId) {
                        const match = lastHCC.memberId.match(/\d+$/);
                        if (match)
                            nextNum = parseInt(match[0]) + 1;
                    }
                    const seller = await User_1.default.findById(sale.sellerId);
                    newUserAccount = new User_1.default({
                        name: sale.customerName,
                        mobile: sale.customerMobile,
                        email: sale.customerEmail,
                        state: sale.customerState || 'Maharashtra',
                        password: '123456',
                        memberId: `CB-HCC-${nextNum}`,
                        referrerId: sale.sellerId,
                        role: 'hcc',
                        rank: 'HCC',
                        status: 'active',
                        kycStatus: 'not_submitted',
                    });
                    await newUserAccount.save();
                    await Wallet_1.default.create({ user: newUserAccount._id });
                    if (seller) {
                        await User_1.default.findByIdAndUpdate(seller._id, { $inc: { personalRecruitsThisMonth: 1 } });
                        let currentRefId = seller._id;
                        while (currentRefId) {
                            const refUser = await User_1.default.findById(currentRefId);
                            if (!refUser)
                                break;
                            refUser.teamSize = (refUser.teamSize || 0) + 1;
                            await refUser.save();
                            currentRefId = refUser.referrerId;
                        }
                    }
                    console.log(`[SubWebhook] User account created: ${newUserAccount.memberId}`);
                }
                // Set next renewal date
                const nextRenewal = new Date();
                nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
                sale.nextRenewalDate = nextRenewal;
                await sale.save();
                // Process commission
                (0, commission_1.processCommission)(sale._id.toString()).catch(console.error);
                console.log(`[SubWebhook] Policy activated: ${sale.policyId}`);
            }
            // ── Yearly Renewal → extend policy + re-trigger commission ────────────
            if (isRenewal) {
                sale.renewalCount += 1;
                const nextRenewal = new Date();
                nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
                sale.nextRenewalDate = nextRenewal;
                sale.commissionProcessed = false;
                sale.cycleMonth = (0, commission_1.getCurrentCycleMonth)();
                await sale.save();
                (0, commission_1.processCommission)(sale._id.toString()).catch(console.error);
                console.log(`[SubWebhook] Policy renewed: ${sale.policyId} (renewal #${sale.renewalCount})`);
            }
        }
        // ── Subscription Cancelled ──────────────────────────────────────────────
        if (isCancelled && subscriptionId) {
            // Only cancel if status changed to inactive/cancelled (not just a payment fail)
            const statusValue = (event?.data?.subscription?.status || event?.data?.status || '').toLowerCase();
            if (!statusValue || statusValue === 'cancelled' || statusValue === 'deactivated' || statusValue === 'inactive') {
                await Sale_1.default.updateOne({ cashfreeSubscriptionId: subscriptionId }, { status: 'cancelled' });
                console.log(`[SubWebhook] Subscription cancelled: ${subscriptionId}`);
            }
        }
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('[SubWebhook] Error:', error.message);
        return res.status(500).json({ success: false });
    }
};
exports.subscriptionWebhook = subscriptionWebhook;
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/subscriptions/status/:subscriptionId
// Used by success page to check if mandate was authorized
// ─────────────────────────────────────────────────────────────────────────────
const getSubscriptionStatus = async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const sale = await Sale_1.default.findOne({ cashfreeSubscriptionId: subscriptionId }).lean();
        if (!sale) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }
        return res.status(200).json({
            success: true,
            data: {
                policyId: sale.policyId,
                status: sale.status,
                autopayEnabled: sale.autopayEnabled,
                nextRenewalDate: sale.nextRenewalDate,
                renewalCount: sale.renewalCount,
                cashfreeSubscriptionId: sale.cashfreeSubscriptionId,
            },
        });
    }
    catch (error) {
        console.error('[Subscription] getStatus Error:', error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSubscriptionStatus = getSubscriptionStatus;
