import { Router } from 'express';
import { login, sendOTP, verifyOTP, register, getMe, logout, changePassword } from '../controllers/auth.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Primary login endpoint (password-only)
router.post('/login', login);

// Logout — clears the httpOnly auth_token cookie server-side
router.post('/logout', logout);

// Legacy OTP endpoints (now deprecated — return 410)
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

router.post('/register', optionalAuthMiddleware, register);
router.get('/me', authMiddleware, getMe);
router.post('/change-password', authMiddleware, changePassword);

export default router;
