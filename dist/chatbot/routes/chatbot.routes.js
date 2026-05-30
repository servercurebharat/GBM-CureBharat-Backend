"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatbot_controller_1 = require("../controller/chatbot.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rate_limiter_1 = require("../utils/rate.limiter");
const router = (0, express_1.Router)();
// Protect the chatbot route with the existing authMiddleware and add rate limiting
router.post('/message', auth_middleware_1.authMiddleware, (0, rate_limiter_1.chatbotRateLimiter)(20, 60000), chatbot_controller_1.handleChatbotMessage);
exports.default = router;
