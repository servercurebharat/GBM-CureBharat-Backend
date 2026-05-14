import { Router } from 'express';
import { createSale, getMySales } from '../controllers/sale.controller';
import { getFTDAnalytics, getMTDAnalytics } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/role.middleware';

const router = Router();

router.post('/', authMiddleware, checkRole(['sh', 'hba', 'hcm', 'hcc']), createSale);
router.get('/', authMiddleware, getMySales);
router.get('/analytics/ftd', authMiddleware, getFTDAnalytics);
router.get('/analytics/mtd', authMiddleware, getMTDAnalytics);

export default router;
