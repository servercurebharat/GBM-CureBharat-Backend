import { Router } from 'express';
import { getDownline, updateKYC, getAllUsers } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/role.middleware';

const router = Router();

router.get('/', authMiddleware, checkRole(['admin', 'sh']), getAllUsers);
router.get('/:id/downline', authMiddleware, getDownline);
router.put('/:id/kyc', authMiddleware, updateKYC);

export default router;
