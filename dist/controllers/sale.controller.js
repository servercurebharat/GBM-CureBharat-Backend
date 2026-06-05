"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMySales = exports.createSale = void 0;
const Sale_1 = __importDefault(require("../models/Sale"));
const User_1 = __importDefault(require("../models/User"));
const Plan_1 = __importDefault(require("../models/Plan"));
const commission_1 = require("../lib/commission");
const notification_controller_1 = require("./notification.controller");
const crm_1 = require("../lib/crm");
const createSale = async (req, res) => {
    try {
        const { customerName, customerMobile, planId, customerState } = req.body;
        // 1. Any role can record a sale (Personal Sale)
        const seller = req.user;
        // 2. Fetch Plan
        const plan = await Plan_1.default.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(400).json({ success: false, message: 'Invalid or inactive plan' });
        }
        // 3. Calculate Total Billing Amount (Price + GST)
        const gstAmount = Math.round((plan.price * (plan.gstPercent || 18)) / 100);
        const totalAmount = plan.price + gstAmount;
        // 5. Generate unique Policy ID
        const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        // 6. Create Sale Record
        const newSale = new Sale_1.default({
            policyId,
            sellerId: req.user._id,
            sellerMemberId: req.user.memberId,
            plan: planId,
            customerName,
            customerMobile,
            customerState: customerState || 'Maharashtra',
            saleAmount: totalAmount,
            businessVolume: plan.businessVolume,
            cycleMonth: (0, commission_1.getCurrentCycleMonth)(),
            status: 'active',
            sourceType: 'dashboard',
            razorpayOrderId: 'INTERNAL', // For dashboard sales, we'll implement the actual checkout later
            razorpayPaymentId: `INT_PAY_${Date.now()}`
        });
        await newSale.save();
        // 7. Trigger Commission Processing (Async)
        (0, commission_1.processCommission)(newSale._id.toString()).catch(err => {
            console.error(`[Commission Error] Sale ${newSale._id}:`, err);
        });
        // 8. Push to CRM and send onboarding email (Async)
        (0, crm_1.pushToCRMAndEmail)(newSale, plan).catch(err => {
            console.error(`[CRM Sync Error] Sale ${newSale._id}:`, err);
        });
        // Trigger in-app notification to all admin users about the new sale!
        try {
            const admins = await User_1.default.find({ role: 'admin' });
            for (const admin of admins) {
                await (0, notification_controller_1.createNotification)(admin._id.toString(), 'New Sale Recorded', `Partner ${seller.name} (${seller.memberId}) recorded a new sale: ${plan.name} for ${customerName} (₹${(totalAmount / 100).toFixed(2)}).`, 'success', `/admin/sales`);
            }
        }
        catch (notifErr) {
            console.error('[Sale] Admin notification failed:', notifErr);
        }
        return res.status(201).json({
            success: true,
            message: 'Sale recorded successfully. Commission processing started.',
            data: { policyId, amount: plan.price }
        });
    }
    catch (error) {
        console.error('[Sale] createSale Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.createSale = createSale;
const getMySales = async (req, res) => {
    try {
        const { role, _id } = req.user;
        const { page = 1, limit = 10 } = req.query;
        console.log(`[Sales] Fetching sales for user: ${_id}, role: ${role}`);
        console.log(`[Sales] Role: ${role}, ID: ${_id}`);
        let query = {};
        const criteria = [];
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
            const searchRegex = new RegExp(req.query.search, 'i');
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
        const sales = await Sale_1.default.find(query)
            .populate('plan', 'name price')
            .populate('sellerId', 'name memberId')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean();
        console.log(`[Sales] Found ${sales.length} results`);
        const total = await Sale_1.default.countDocuments(query);
        // Fetch target user's wallet to attach commission info
        const targetUserId = req.query.sellerId || _id;
        const Wallet = require('../models/Wallet').default;
        const targetWallet = await Wallet.findOne({ user: targetUserId }).select('ledger').lean();
        // Apply Privacy: Only direct seller can see customer details
        const processedSales = sales.map((sale) => {
            // Map sellerId to seller for frontend compatibility
            const seller = sale.sellerId;
            let commission = 0;
            if (targetWallet && targetWallet.ledger) {
                const entry = targetWallet.ledger.find((l) => l.saleId && l.saleId.toString() === sale._id.toString());
                if (entry)
                    commission = entry.amount;
            }
            // If current user is NOT the seller, redact customer details
            // Defensive check: if seller is missing (orphaned record), handle gracefully
            if (!seller) {
                return {
                    ...sale,
                    seller: null,
                    customerName: 'N/A',
                    customerMobile: 'N/A',
                    customerEmail: 'N/A',
                    commission
                };
            }
            const isSeller = seller._id?.toString() === _id.toString();
            const isAdmin = role === 'admin';
            if (isSeller || isAdmin) {
                return { ...sale, seller, commission };
            }
            return {
                ...sale,
                seller,
                customerName: 'PROTECTED',
                customerMobile: '**********',
                customerEmail: '***',
                nomineeName: '***',
                commission
            };
        });
        return res.status(200).json({
            success: true,
            data: processedSales,
            pagination: { total, page: Number(page), limit: Number(limit) }
        });
    }
    catch (error) {
        console.error('[Sale] getMySales Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getMySales = getMySales;
