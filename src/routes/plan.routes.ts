import { Router } from 'express';
import { getAllPlans, getCommissionablePlans, createPlan, updatePlan, deletePlan } from '../controllers/plan.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/role.middleware';

const router = Router();

// Public/Member routes
router.get('/', authMiddleware, getAllPlans);
router.get('/commissionable', authMiddleware, getCommissionablePlans);

// Admin routes
router.post('/', authMiddleware, checkRole(['admin']), createPlan);
router.put('/:id', authMiddleware, checkRole(['admin']), updatePlan);
router.delete('/:id', authMiddleware, checkRole(['admin']), deletePlan);

export default router;
