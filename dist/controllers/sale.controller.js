"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMySales = exports.createSale = void 0;
const Sale_1 = __importDefault(require("../models/Sale"));
const Plan_1 = __importDefault(require("../models/Plan"));
const EPin_1 = __importDefault(require("../models/EPin"));
const commission_1 = require("../lib/commission");
const createSale = async (req, res) => {
    try {
        const { customerName, customerMobile, planId, ePinCode } = req.body;
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
        // 4. E-Pin Validation (if provided)
        let epin = null;
        if (ePinCode) {
            epin = await EPin_1.default.findOne({ pinCode: ePinCode, status: 'unused' });
            if (!epin) {
                return res.status(400).json({ success: false, message: 'E-Pin invalid or already used' });
            }
            if (epin.value < totalAmount) {
                return res.status(400).json({ success: false, message: 'E-Pin value insufficient for this plan (including GST)' });
            }
        }
        // 5. Generate unique Policy ID
        const policyId = `CB-POL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        // 6. Create Sale Record
        const newSale = new Sale_1.default({
            policyId,
            hccId: req.user._id,
            plan: planId,
            customerName,
            customerMobile,
            saleAmount: totalAmount,
            businessVolume: plan.businessVolume,
            cycleMonth: (0, commission_1.getCurrentCycleMonth)(),
            status: 'active'
        });
        await newSale.save();
        // 6. Mark E-Pin as used
        if (epin) {
            epin.status = 'used';
            epin.usedBy = req.user._id;
            epin.usedDate = new Date();
            await epin.save();
        }
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
        let query = {};
        // Filter based on role
        if (role === 'hcc') {
            query.hccId = _id;
        }
        else if (role === 'admin' || role === 'sh') {
            // Admin sees everything
        }
        else if (role === 'hcm') {
            // HCM sees their own sales + sales where they are the hcmId
            query.$or = [
                { hccId: _id },
                { hcmId: _id }
            ];
        }
        else if (role === 'hba') {
            // HBA sees their own sales + sales where they are the hbaId
            query.$or = [
                { hccId: _id },
                { hbaId: _id }
            ];
        }
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { customerName: searchRegex },
                { customerMobile: searchRegex },
                { policyId: searchRegex }
            ];
        }
        if (req.query.status && req.query.status !== 'all') {
            query.status = req.query.status;
        }
        const sales = await Sale_1.default.find(query)
            .populate('plan', 'name price')
            .populate('hccId', 'name memberId')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean();
        const total = await Sale_1.default.countDocuments(query);
        return res.status(200).json({
            success: true,
            data: sales,
            pagination: { total, page: Number(page), limit: Number(limit) }
        });
    }
    catch (error) {
        console.error('[Sale] getMySales Error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.getMySales = getMySales;
