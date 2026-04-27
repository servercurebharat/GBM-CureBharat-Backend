import { Router } from 'express';
import { createSale, getMySales } from '../controllers/sale.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/role.middleware';

const router = Router();

router.post('/', authMiddleware, checkRole(['hcc']), createSale);
router.get('/', authMiddleware, getMySales);

export default router;
