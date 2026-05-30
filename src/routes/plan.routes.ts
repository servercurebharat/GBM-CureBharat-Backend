import express from 'express';
import { 
  getPlans, 
  getAllPlansAdmin, 
  createPlan, 
  updatePlan, 
  deletePlan 
} from '../controllers/plan.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/role.middleware';

const router = express.Router();

import { upload } from '../config/cloudinary';

// Public/Member routes
router.get('/', authMiddleware, getPlans);

// Admin-only routes
router.get('/admin/all', authMiddleware, checkRole(['admin']), getAllPlansAdmin);
router.post('/', authMiddleware, checkRole(['admin']), upload.single('brochure'), createPlan);
router.put('/:id', authMiddleware, checkRole(['admin']), upload.single('brochure'), updatePlan);
router.delete('/:id', authMiddleware, checkRole(['admin']), deletePlan);

export default router;
