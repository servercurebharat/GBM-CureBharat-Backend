import { Router } from 'express';
import { getCommissionConfig, updateCommissionConfig, getPendingKYC, getPendingBankUpdates, updateKYCStatus, createManualAdjustment, updateUserStatus, resetUserPassword, sendAnnouncement, verifyBankDetails, sendKycLink, setCustomCommission, getCustomCommissions, deleteUser } from '../controllers/admin.controller';
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
router.get('/bank-updates/pending', getPendingBankUpdates);
router.put('/kyc/:id/status', updateKYCStatus);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/reset-password', resetUserPassword);
router.put('/users/:id/bank-verify', verifyBankDetails);
router.get('/tree', getAdminTree);
router.post('/manual-adjustment', createManualAdjustment);
router.get('/state-performance', getStatePerformance);
router.post('/announcements', sendAnnouncement);
router.post('/sales/:id/send-kyc-link', sendKycLink);
router.get('/custom-commission', getCustomCommissions);
router.post('/custom-commission', setCustomCommission);

export default router;
