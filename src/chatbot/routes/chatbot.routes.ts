import { Router } from 'express';
import { handleChatbotMessage } from '../controller/chatbot.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { chatbotRateLimiter } from '../utils/rate.limiter';

const router = Router();

// Protect the chatbot route with the existing authMiddleware and add rate limiting
router.post('/message', authMiddleware, chatbotRateLimiter(20, 60000), handleChatbotMessage);

export default router;
