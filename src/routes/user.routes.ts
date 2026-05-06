import { Router } from 'express';
import { getDownline, updateKYC, getAllUsers, getUserById, getUserStats } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/role.middleware';
import { upload } from '../config/cloudinary';

const router = Router();

router.get('/stats', authMiddleware, checkRole(['admin', 'sh']), getUserStats);
router.get('/', authMiddleware, checkRole(['admin', 'sh']), getAllUsers);
router.get('/:id', authMiddleware, getUserById);
router.get('/:id/downline', authMiddleware, getDownline);
router.put('/:id/kyc', authMiddleware, upload.fields([
  { name: 'aadhaarFront', maxCount: 1 },
  { name: 'aadhaarBack', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'bankProof', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]), updateKYC);

export default router;
