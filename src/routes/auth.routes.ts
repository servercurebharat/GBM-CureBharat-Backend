import { Router } from 'express';
import { sendOTP, verifyOTP, register, getMe } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/register', register);
router.get('/me', authMiddleware, getMe);

export default router;
