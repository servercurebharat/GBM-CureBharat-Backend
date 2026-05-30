"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatbotRateLimiter = void 0;
const rateLimitCache = new Map();
const chatbotRateLimiter = (limit = 20, windowMs = 60000) => {
    return (req, res, next) => {
        // Determine user identifier (prefer userId, fallback to IP)
        const identifier = req.user?._id?.toString() || req.ip || 'unknown';
        const currentTime = Date.now();
        let record = rateLimitCache.get(identifier);
        if (!record) {
            record = { count: 1, resetTime: currentTime + windowMs };
            rateLimitCache.set(identifier, record);
            return next();
        }
        if (currentTime > record.resetTime) {
            record.count = 1;
            record.resetTime = currentTime + windowMs;
            return next();
        }
        record.count++;
        if (record.count > limit) {
            console.warn(`[Chatbot Rate Limiter] User ${identifier} exceeded rate limit.`);
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please slow down.',
                suggestions: ['Please wait a moment before trying again.'],
                type: 'static',
                intent: 'rate_limited'
            });
        }
        next();
    };
};
exports.chatbotRateLimiter = chatbotRateLimiter;
