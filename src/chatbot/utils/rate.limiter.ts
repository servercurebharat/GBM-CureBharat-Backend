import { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const rateLimitCache = new Map<string, RateLimitInfo>();

export const chatbotRateLimiter = (limit: number = 20, windowMs: number = 60000) => {
  return (req: any, res: Response, next: NextFunction) => {
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
