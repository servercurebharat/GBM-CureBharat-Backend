import { Router } from 'express';
import { getCommissionConfig, updateCommissionConfig, getPendingKYC, updateKYCStatus, createManualAdjustment } from '../controllers/admin.controller';
import { getAdminTree } from '../controllers/user.controller';
import { getStatePerformance } from '../controllers/analytics.controller';
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
router.get('/tree', getAdminTree);
router.post('/manual-adjustment', createManualAdjustment);
router.get('/state-performance', getStatePerformance);

export default router;
