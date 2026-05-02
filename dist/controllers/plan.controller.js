"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePlan = exports.updatePlan = exports.createPlan = exports.getCommissionablePlans = exports.getAllPlans = void 0;
const Plan_1 = __importDefault(require("../models/Plan"));
/**
 * GET /api/plans
 * Fetch all active plans
 */
const getAllPlans = async (req, res) => {
    try {
        const plans = await Plan_1.default.find({ isActive: true }).sort({ price: 1 });
        res.json({ success: true, data: plans });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllPlans = getAllPlans;
/**
 * GET /api/plans/commissionable
 * Fetch only plans that trigger commission
 */
const getCommissionablePlans = async (req, res) => {
    try {
        const plans = await Plan_1.default.find({ isActive: true, isCommissionable: true }).sort({ price: 1 });
        res.json({ success: true, data: plans });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCommissionablePlans = getCommissionablePlans;
/**
 * POST /api/plans
 * Create a new plan (Admin Only)
 */
const createPlan = async (req, res) => {
    try {
        const planData = req.body;
        const plan = await Plan_1.default.create(planData);
        res.status(201).json({ success: true, data: plan });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createPlan = createPlan;
/**
 * PUT /api/plans/:id
 * Update a plan (Admin Only)
 */
const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await Plan_1.default.findByIdAndUpdate(id, req.body, { new: true });
        if (!plan)
            return res.status(404).json({ success: false, message: 'Plan not found' });
        res.json({ success: true, data: plan });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updatePlan = updatePlan;
/**
 * DELETE /api/plans/:id
 * Soft delete a plan (Admin Only)
 */
const deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await Plan_1.default.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!plan)
            return res.status(404).json({ success: false, message: 'Plan not found' });
        res.json({ success: true, message: 'Plan deactivated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deletePlan = deletePlan;
