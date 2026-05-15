"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMySales = exports.createSale = void 0;
const Sale_1 = __importDefault(require("../models/Sale"));
const Plan_1 = __importDefault(require("../models/Plan"));
const commission_1 = require("../lib/commission");
const createSale = async (req, res) => {
    try {
        const { customerName, customerMobile, planId } = req.body;
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
        // E-Pin logic removed (Online Only)
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
            saleAmount: totalAmount,
            businessVolume: plan.businessVolume,
            cycleMonth: (0, commission_1.getCurrentCycleMonth)(),
            status: 'active',
            sourceType: 'dashboard',
            razorpayOrderId: 'INTERNAL', // For dashboard sales, we'll implement the actual checkout later
            razorpayPaymentId: `INT_PAY_${Date.now()}`
        });
        await newSale.save();
        // E-Pin logic removed
        // 7. Trigger Commission Processing (Async)
        (0, commission_1.processCommission)(newSale._id.toString()).catch(err => {
            console.error(`[Commission Error] Sale ${newSale._id}:`, err);
        });
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
        // Apply Privacy: Only direct seller can see customer details
        const processedSales = sales.map((sale) => {
            // Defensive check: if sellerId is missing (orphaned record), handle gracefully
            if (!sale.sellerId) {
                return {
                    ...sale,
                    customerName: 'N/A',
                    customerMobile: 'N/A',
                    customerEmail: 'N/A'
                };
            }
            // If current user is NOT the seller, redact customer details
            const isSeller = sale.sellerId._id?.toString() === _id.toString();
            const isAdmin = role === 'admin';
            if (isSeller || isAdmin) {
                return sale;
            }
            return {
                ...sale,
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
    }
    catch (error) {
        console.error('[Sale] getMySales Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getMySales = getMySales;
