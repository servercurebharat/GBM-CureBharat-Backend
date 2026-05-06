import { Request, Response } from 'express';
import Plan from '../models/Plan';

/**
 * GET /api/plans
 * Fetch all active plans
 */
export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/plans/admin/all
 * Fetch all plans including inactive ones (Admin Only)
 */
export const getAllPlansAdmin = async (req: Request, res: Response) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/plans
 * Create a new plan (Admin Only)
 */
export const createPlan = async (req: Request, res: Response) => {
  try {
    const planData = req.body;
    const newPlan = await Plan.create(planData);
    res.status(201).json({ success: true, data: newPlan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/plans/:id
 * Update an existing plan (Admin Only)
 */
export const updatePlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const plan = await Plan.findByIdAndUpdate(id, updates, { new: true });
    
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/plans/:id
 * Delete a plan (Admin Only)
 */
export const deletePlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findByIdAndDelete(id);
    
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    
    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
