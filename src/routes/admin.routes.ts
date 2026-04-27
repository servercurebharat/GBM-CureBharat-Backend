import { Router } from 'express';
import { getCommissionConfig, updateCommissionConfig, getPendingKYC, updateKYCStatus } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/role.middleware';

const router = Router();

// All routes in this file are Admin only
router.use(authMiddleware);
router.use(checkRole(['admin']));

router.get('/commission-config', getCommissionConfig);
router.put('/commission-config', updateCommissionConfig);
router.get('/kyc/pending', getPendingKYC);
router.put('/kyc/:id/status', updateKYCStatus);

export default router;
