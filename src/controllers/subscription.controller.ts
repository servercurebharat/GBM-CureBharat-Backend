import { Request, Response } from 'express';
import axios from 'axios';
import User from '../models/User';
import Plan from '../models/Plan';
import Sale from '../models/Sale';
import Wallet from '../models/Wallet';
import { processCommission, getCurrentCycleMonth } from '../lib/commission';

// ─────────────────────────────────────────────────────────────────────────────
// Cashfree Subscriptions API base config
// Uses v2 subscriptions API (separate from PG SDK)
// ─────────────────────────────────────────────────────────────────────────────
const CF_BASE_URL =
  process.env.CASHFREE_ENV === 'PROD'
    ? 'https://api.cashfree.com'
    : 'https://sandbox.cashfree.com';

const CF_HEADERS = {
  'x-client-id':     process.env.CASHFREE_APP_ID || '',
  'x-client-secret': process.env.CASHFREE_SECRET_KEY || '',
  'Content-Type':    'application/json',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Get or create a Cashfree Plan for a CureBharat Plan
// Plan ID format: cb_plan_<mongoId> — deterministic so we never duplicate
// ─────────────────────────────────────────────────────────────────────────────
async function getOrCreateCashfreePlan(plan: any): Promise<string> {
  const cfPlanId = `cb_plan_${plan._id.toString()}`;

  const totalPaise  = Math.round(plan.price + (plan.price * (plan.gstPercent || 18)) / 100);
  const totalRupees = totalPaise / 100;

  // Try fetching existing plan first
  try {
    await axios.get(`${CF_BASE_URL}/pg/plans/${cfPlanId}`, { headers: CF_HEADERS });
    console.log(`[Subscription] Reusing existing Cashfree plan: ${cfPlanId}`);
    return cfPlanId;
  } catch {
    // Plan does not exist — create it
  }

  // Create new Cashfree plan (PERIODIC, YEAR interval)
  const safePlanName = plan.name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  
  await axios.post(`${CF_BASE_URL}/pg/plans`, {
    plan_id:            cfPlanId,
    plan_name:          `CureBharat ${safePlanName} Yearly`,
    plan_type:          'PERIODIC',
    plan_currency:      'INR',
    plan_max_amount:    totalRupees,
    plan_interval_type: 'YEAR',
    plan_intervals:     1,
    plan_note:          `Annual renewal for ${plan.name}`,
  }, { headers: { ...CF_HEADERS, 'x-api-version': '2025-01-01' } });

  console.log(`[Subscription] Created new Cashfree plan: ${cfPlanId} for ₹${totalRupees}/year`);
  return cfPlanId;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/create
// Creates a Cashfree Subscription mandate and returns authLink for redirect.
// The first charge (plan amount) fires when the customer authorizes the mandate.
// ─────────────────────────────────────────────────────────────────────────────
export const createSubscription = async (req: Request, res: Response) => {
  try {
    const {
      planId,
      refCode,
      customerName,
      customerMobile,
      customerEmail,
      customerState,
      nomineeName,
      nomineeRelation,
    } = req.body;

    if (!planId || !refCode || !customerName || !customerMobile) {
      return res.status(400).json({ success: false, message: 'planId, refCode, customerName, customerMobile are required' });
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

    const gstAmount   = Math.round((plan.price * (plan.gstPercent || 18)) / 100);
    const totalPaise  = plan.price + gstAmount;
    const totalRupees = totalPaise / 100;

    // Step 1 — Ensure a Cashfree Plan exists for this CureBharat plan
    const cfPlanId = await getOrCreateCashfreePlan(plan);

    // Step 2 — Generate unique subscription ID
    const subscriptionId = `cb_sub_${Date.now()}_${seller.memberId.replace(/-/g, '')}`;

    const returnUrl = `${process.env.CASHFREE_RETURN_URL || 'http://localhost:3000/buy/success'}?subscription_id=${subscriptionId}&ref=${refCode}&plan=${planId}`;

    // Step 3 — Create the Cashfree Subscription (mandate)
    const subPayload = {
      subscription_id:          subscriptionId,
      plan_id:                  cfPlanId,
      customer_details: {
        customer_name:  customerName,
        customer_phone: customerMobile,
        customer_email: customerEmail || `${customerMobile}@curebharat.com`,
      },
      subscription_note:         `Policy for ${customerName} — ${plan.name}`,
      subscription_charge_amount: totalRupees, // first charge = full plan price
      subscription_first_charge_time: new Date(Date.now() + 60 * 1000).toISOString(), // 1 min from now
      subscription_expiry_time:       new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 10 years
      return_url: returnUrl,
    };

    const cfRes = await axios.post(
      `${CF_BASE_URL}/pg/subscriptions`,
      subPayload,
      { headers: { ...CF_HEADERS, 'x-api-version': '2025-01-01' } }
    );

    const subData = cfRes.data;

    // Step 4 — Save a pending Sale record (status = pending_autopay)
    const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const nextRenewal = new Date();
    nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);

    const newSale = new Sale({
      policyId,
      sellerId:               seller._id,
      sellerMemberId:         seller.memberId,
      plan:                   planId,
      customerName,
      customerMobile,
      customerEmail,
      customerState:          customerState || 'Maharashtra',
      nomineeName,
      nomineeRelation,
      saleAmount:             totalPaise,
      businessVolume:         plan.businessVolume,
      cycleMonth:             getCurrentCycleMonth(),
      status:                 'pending_autopay',
      sourceType:             'public_link',
      paymentMethod:          'cashfree',
      autopayEnabled:         true,
      cashfreeSubscriptionId: subscriptionId,
      cashfreePlanId:         cfPlanId,
      nextRenewalDate:        nextRenewal,
      renewalCount:           0,
      commissionProcessed:    false,
    });

    await newSale.save();

    console.log(`[Subscription] Created mandate ${subscriptionId} → authLink returned to frontend`);

    return res.status(200).json({
      success: true,
      data: {
        subscriptionId,
        authLink:   subData.data?.authorization?.url || subData.authorization_link,
        policyId,
        amount:     totalRupees,
        planName:   plan.name,
      },
    });
  } catch (error: any) {
    const cfErr = error?.response?.data;
    console.error('[Subscription] createSubscription Error:', cfErr || error.message);
    return res.status(500).json({
      success: false,
      message: cfErr?.message || 'Failed to create subscription',
      error:   error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/webhook
// Handles Cashfree Subscription events:
//   SUBSCRIPTION_ACTIVATED → first payment done, activate policy
//   SUBSCRIPTION_CHARGE_SUCCESS → yearly renewal, re-trigger commission
//   SUBSCRIPTION_CANCELLED → mark sale cancelled
// ─────────────────────────────────────────────────────────────────────────────
export const subscriptionWebhook = async (req: Request, res: Response) => {
  try {
    const event     = req.body;
    const eventType = (event?.type as string || '').toLowerCase();

    console.log(`[SubWebhook] Event: ${eventType}`, JSON.stringify(event?.data || {}).substring(0, 200));

    // Extract subscription ID — Cashfree puts it in different places depending on event
    const subscriptionId: string =
      event?.data?.subscription?.subscription_id ||
      event?.data?.subscription_id ||
      event?.data?.subscriptionId || '';

    // ── Mandate Authorized / Auth Status (mandate approved by user) ──────────
    // Cashfree event: "subscription auth status" or "SUBSCRIPTION_ACTIVATED"
    const isAuthEvent = eventType === 'subscription_activated'
      || eventType === 'subscription.auth.status'
      || eventType === 'subscription auth status';

    // ── Yearly Payment Success ───────────────────────────────────────────────
    // Cashfree event: "subscription payment success" or "SUBSCRIPTION_CHARGE_SUCCESS"
    const isPaymentSuccess = eventType === 'subscription_charge_success'
      || eventType === 'subscription.payment.success'
      || eventType === 'subscription payment success';

    // ── Cancelled / Deactivated ──────────────────────────────────────────────
    // Cashfree event: "subscription payment cancelled" or "subscription status changed"
    const isCancelled = eventType === 'subscription_cancelled'
      || eventType === 'subscription_deactivated'
      || eventType === 'subscription.payment.cancelled'
      || eventType === 'subscription payment cancelled'
      || eventType === 'subscription status changed';

    // ── Handle Activation (first mandate approval) ───────────────────────────
    if (isAuthEvent || isPaymentSuccess) {
      if (!subscriptionId) return res.status(200).json({ success: true });

      const sale = await Sale.findOne({ cashfreeSubscriptionId: subscriptionId }) as any;
      if (!sale) {
        console.warn(`[SubWebhook] No sale found for subscription: ${subscriptionId}`);
        return res.status(200).json({ success: true });
      }

      const isFirstActivation = isAuthEvent && sale.status === 'pending_autopay';
      const isRenewal         = isPaymentSuccess && sale.status === 'active';

      // ── First Activation → Create/link user account + activate sale ───────
      if (isFirstActivation) {
        sale.status = 'active';
        sale.cashfreePaymentId = event?.data?.payment?.cf_payment_id
          || event?.data?.payment?.payment_id || '';

        // Create user account if not exists
        let newUserAccount: any = await User.findOne({ mobile: sale.customerMobile });

        if (!newUserAccount) {
          const lastHCC = await User.findOne({ role: 'hcc' }).sort({ createdAt: -1 });
          let nextNum = 1001;
          if (lastHCC?.memberId) {
            const match = lastHCC.memberId.match(/\d+$/);
            if (match) nextNum = parseInt(match[0]) + 1;
          }

          const seller = await User.findById(sale.sellerId) as any;
          newUserAccount = new User({
            name:       sale.customerName,
            mobile:     sale.customerMobile,
            email:      sale.customerEmail,
            state:      sale.customerState || 'Maharashtra',
            password:   '123456',
            memberId:   `CB-HCC-${nextNum}`,
            referrerId: sale.sellerId,
            role:       'hcc',
            rank:       'HCC',
            status:     'active',
            kycStatus:  'not_submitted',
          });
          await newUserAccount.save();
          await Wallet.create({ user: newUserAccount._id });

          if (seller) {
            await User.findByIdAndUpdate(seller._id, { $inc: { personalRecruitsThisMonth: 1 } });
            let currentRefId = seller._id;
            while (currentRefId) {
              const refUser = await User.findById(currentRefId);
              if (!refUser) break;
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
        processCommission(sale._id.toString()).catch(console.error);
        console.log(`[SubWebhook] Policy activated: ${sale.policyId}`);
      }

      // ── Yearly Renewal → extend policy + re-trigger commission ────────────
      if (isRenewal) {
        sale.renewalCount += 1;
        const nextRenewal = new Date();
        nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
        sale.nextRenewalDate     = nextRenewal;
        sale.commissionProcessed = false;
        sale.cycleMonth          = getCurrentCycleMonth();
        await sale.save();

        processCommission(sale._id.toString()).catch(console.error);
        console.log(`[SubWebhook] Policy renewed: ${sale.policyId} (renewal #${sale.renewalCount})`);
      }
    }

    // ── Subscription Cancelled ──────────────────────────────────────────────
    if (isCancelled && subscriptionId) {
      // Only cancel if status changed to inactive/cancelled (not just a payment fail)
      const statusValue = (event?.data?.subscription?.status || event?.data?.status || '').toLowerCase();
      if (!statusValue || statusValue === 'cancelled' || statusValue === 'deactivated' || statusValue === 'inactive') {
        await Sale.updateOne({ cashfreeSubscriptionId: subscriptionId }, { status: 'cancelled' });
        console.log(`[SubWebhook] Subscription cancelled: ${subscriptionId}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[SubWebhook] Error:', error.message);
    return res.status(500).json({ success: false });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/subscriptions/status/:subscriptionId
// Used by success page to check if mandate was authorized
// ─────────────────────────────────────────────────────────────────────────────
export const getSubscriptionStatus = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const sale = await Sale.findOne({ cashfreeSubscriptionId: subscriptionId }).lean() as any;

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        policyId:               sale.policyId,
        status:                 sale.status,
        autopayEnabled:         sale.autopayEnabled,
        nextRenewalDate:        sale.nextRenewalDate,
        renewalCount:           sale.renewalCount,
        cashfreeSubscriptionId: sale.cashfreeSubscriptionId,
      },
    });
  } catch (error: any) {
    console.error('[Subscription] getStatus Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
