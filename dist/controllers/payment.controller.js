"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllPayments = exports.getMyPayments = exports.handleWebhook = exports.verifyPayment = exports.createOrder = void 0;
const cashfree_pg_1 = require("cashfree-pg");
const User_1 = __importDefault(require("../models/User"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const Payment_1 = __importDefault(require("../models/Payment"));
const notification_controller_1 = require("./notification.controller");
// ─────────────────────────────────────────────
// Initialize Cashfree SDK instance at module load
// ─────────────────────────────────────────────
const cfEnv = process.env.CASHFREE_ENV === 'PROD'
    ? cashfree_pg_1.CFEnvironment.PRODUCTION
    : cashfree_pg_1.CFEnvironment.SANDBOX;
const cashfree = new cashfree_pg_1.Cashfree(cfEnv, process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY);
// ─────────────────────────────────────────────
// 1. Create Cashfree Order
//    POST /api/payment/create-order
// ─────────────────────────────────────────────
const createOrder = async (req, res) => {
    try {
        const { amount, purpose = 'wallet_topup' } = req.body;
        if (!amount || isNaN(Number(amount)) || Number(amount) < 1) {
            return res.status(400).json({ success: false, message: 'Invalid amount. Minimum ₹1.' });
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const amountInRupees = parseFloat(Number(amount).toFixed(2));
        const orderId = `CB_${Date.now()}_${req.user._id.toString().slice(-6)}`;
        const orderRequest = {
            order_id: orderId,
            order_amount: amountInRupees,
            order_currency: 'INR',
            customer_details: {
                customer_id: req.user._id.toString(),
                customer_name: user.name,
                customer_email: user.email || `${user.memberId}@curebharat.com`,
                customer_phone: user.mobile || user.phone || '9999999999',
            },
            order_meta: {
                return_url: `${req.body.returnUrl || process.env.CASHFREE_RETURN_URL?.replace('/buy/success', '/payment/status') || 'http://localhost:3000/payment/status'}?order_id={order_id}`,
                notify_url: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/payment/webhook`,
            },
            order_tags: {
                purpose,
                memberId: user.memberId,
            },
        };
        const response = await cashfree.PGCreateOrder(orderRequest);
        const orderData = response.data;
        // Persist a pending payment record
        await Payment_1.default.create({
            orderId,
            user: req.user._id,
            amount: Math.round(amountInRupees * 100), // paise
            currency: 'INR',
            status: 'pending',
            purpose,
            cashfreeOrderId: orderData.cf_order_id,
            paymentSessionId: orderData.payment_session_id,
        });
        return res.status(200).json({
            success: true,
            data: {
                orderId,
                paymentSessionId: orderData.payment_session_id,
                cfOrderId: orderData.cf_order_id,
                amount: amountInRupees,
            },
        });
    }
    catch (error) {
        const cfErr = error?.response?.data;
        console.error('[Payment] createOrder Error:', cfErr || error.message);
        return res.status(500).json({
            success: false,
            message: cfErr?.message || 'Failed to create payment order',
            error: error.message,
        });
    }
};
exports.createOrder = createOrder;
// ─────────────────────────────────────────────
// 2. Verify Payment (after redirect from Cashfree)
//    GET /api/payment/verify/:orderId
// ─────────────────────────────────────────────
const verifyPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const payment = await Payment_1.default.findOne({ orderId });
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment record not found' });
        }
        // Already processed — return current status
        if (payment.status === 'success') {
            return res.status(200).json({
                success: true,
                data: { orderStatus: 'PAID', paymentStatus: 'success', amount: payment.amount / 100 },
            });
        }
        // Fetch fresh order status from Cashfree
        const response = await cashfree.PGFetchOrder(orderId);
        const order = response.data;
        if (order.order_status === 'PAID') {
            await creditWalletAndUpdatePayment(payment, `Order ${orderId}`);
        }
        else {
            payment.status = 'failed';
            await payment.save();
        }
        return res.status(200).json({
            success: true,
            data: {
                orderStatus: order.order_status,
                paymentStatus: payment.status,
                amount: payment.amount / 100,
            },
        });
    }
    catch (error) {
        console.error('[Payment] verifyPayment Error:', error?.response?.data || error.message);
        return res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
    }
};
exports.verifyPayment = verifyPayment;
// ─────────────────────────────────────────────
// 3. Cashfree Webhook (server-to-server event)
//    POST /api/payment/webhook  ← NO auth middleware
// ─────────────────────────────────────────────
const handleWebhook = async (req, res) => {
    try {
        const rawBody = JSON.stringify(req.body);
        const signature = req.headers['x-webhook-signature'] || '';
        const timestamp = req.headers['x-webhook-timestamp'] || '';
        // ── Option A: Use SDK's built-in webhook verifier ─────────────────────────
        if (signature && timestamp) {
            try {
                cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
            }
            catch (sigErr) {
                console.warn('[Webhook] Signature verification failed — possible spoofed request');
                return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
            }
        }
        const event = req.body;
        const eventType = event?.type;
        console.log(`[Webhook] Received event: ${eventType}`);
        if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
            const orderId = event?.data?.order?.order_id;
            const cfPayId = event?.data?.payment?.cf_payment_id;
            if (orderId) {
                const payment = await Payment_1.default.findOne({ orderId });
                if (payment && payment.status !== 'success') {
                    payment.cfPaymentId = cfPayId;
                    await creditWalletAndUpdatePayment(payment, `Webhook — Order ${orderId}`);
                }
            }
        }
        if (eventType === 'PAYMENT_FAILED_WEBHOOK') {
            const orderId = event?.data?.order?.order_id;
            if (orderId) {
                await Payment_1.default.updateOne({ orderId, status: 'pending' }, { status: 'failed' });
            }
        }
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('[Webhook] Error:', error.message);
        return res.status(500).json({ success: false });
    }
};
exports.handleWebhook = handleWebhook;
// ─────────────────────────────────────────────
// 4. Get My Payment History (user)
//    GET /api/payment/history
// ─────────────────────────────────────────────
const getMyPayments = async (req, res) => {
    try {
        const payments = await Payment_1.default.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        return res.status(200).json({ success: true, data: payments });
    }
    catch (error) {
        console.error('[Payment] getMyPayments Error:', error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMyPayments = getMyPayments;
// ─────────────────────────────────────────────
// 5. Admin — All Payments
//    GET /api/payment/all
// ─────────────────────────────────────────────
const getAllPayments = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        const { page = 1, limit = 50, status } = req.query;
        const filter = {};
        if (status && status !== 'all')
            filter.status = status;
        const payments = await Payment_1.default.find(filter)
            .populate('user', 'name memberId role')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));
        const total = await Payment_1.default.countDocuments(filter);
        return res.status(200).json({
            success: true,
            data: payments,
            pagination: { total, page: Number(page), limit: Number(limit) },
        });
    }
    catch (error) {
        console.error('[Payment] getAllPayments Error:', error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllPayments = getAllPayments;
// ─────────────────────────────────────────────
// INTERNAL HELPER — Credit wallet on payment success
// ─────────────────────────────────────────────
async function creditWalletAndUpdatePayment(payment, description) {
    payment.status = 'success';
    payment.paidAt = new Date();
    await payment.save();
    const wallet = await Wallet_1.default.findOne({ user: payment.user });
    if (wallet) {
        wallet.finalBalance += payment.amount; // amount in paise
        wallet.totalEarned += payment.amount;
        wallet.ledger.push({
            amount: payment.amount,
            type: 'topup',
            description: `Wallet top-up via Cashfree — ${description}`,
            status: 'final',
            date: new Date(),
            cycleMonth: '',
        });
        await wallet.save();
    }
    // In-app notification to user
    try {
        await (0, notification_controller_1.createNotification)(payment.user.toString(), 'Payment Successful ✅', `Your payment of ₹${(payment.amount / 100).toFixed(2)} was successful. Your wallet has been credited.`, 'success', '/sh/finance');
    }
    catch (notifErr) {
        console.error('[Payment] Notification failed:', notifErr);
    }
}
