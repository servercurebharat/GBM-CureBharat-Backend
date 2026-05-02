import { Router } from 'express';
import { sendOTP, verifyOTP, register, getMe } from '../controllers/auth.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/register', optionalAuthMiddleware, register);
router.get('/me', authMiddleware, getMe);

export default router;
