import { Router } from 'express';
import { getDownline, updateKYC, getAllUsers, getUserById, getUserStats, updateProfile, trackHeartbeat, requestBankUpdateOTP, verifyBankUpdateOTP } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/role.middleware';
import { upload } from '../config/cloudinary';

const router = Router();

router.post('/heartbeat', authMiddleware, trackHeartbeat);
router.get('/stats', authMiddleware, checkRole(['admin', 'sh']), getUserStats);
router.get('/', authMiddleware, checkRole(['admin', 'sh']), getAllUsers);
router.post('/bank-update/request', authMiddleware, requestBankUpdateOTP);
router.post('/bank-update/verify', authMiddleware, verifyBankUpdateOTP);
router.get('/:id', authMiddleware, getUserById);
router.get('/:id/downline', authMiddleware, getDownline);
router.put('/:id/kyc', authMiddleware, upload.fields([
  { name: 'aadhaarFront', maxCount: 1 },
  { name: 'aadhaarBack', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'bankProof', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]), updateKYC);
router.put('/:id/profile', authMiddleware, updateProfile);

export default router;
