"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const authMiddleware = async (req, res, next) => {
    try {
        // 1. Get token from cookies or Authorization header
        let token = req.cookies?.auth_token;
        if (!token && req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        // 2. Verify Token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        // 3. Fetch User
        const user = await User_1.default.findById(decoded.userId).select('-password').lean();
        if (!user) {
            return res.status(401).json({ success: false, message: 'User no longer exists' });
        }
        if (user.status === 'blocked') {
            return res.status(403).json({ success: false, message: 'Your account is blocked' });
        }
        // 4. Attach user to request
        req.user = user;
        next();
    }
    catch (error) {
        console.error('[Middleware] Auth Error:', error.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};
exports.authMiddleware = authMiddleware;
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        let token = req.cookies?.auth_token;
        if (!token && req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return next(); // Public user
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await User_1.default.findById(decoded.userId).select('-password').lean();
        if (user && user.status !== 'blocked') {
            req.user = user;
        }
        next();
    }
    catch (error) {
        next(); // Silently fail and treat as public on error
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
