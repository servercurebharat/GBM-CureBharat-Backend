"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Primary login endpoint (password-only)
router.post('/login', auth_controller_1.login);
// Logout — clears the httpOnly auth_token cookie server-side
router.post('/logout', auth_controller_1.logout);
// Legacy OTP endpoints (now deprecated — return 410)
router.post('/send-otp', auth_controller_1.sendOTP);
router.post('/verify-otp', auth_controller_1.verifyOTP);
router.post('/register', auth_middleware_1.optionalAuthMiddleware, auth_controller_1.register);
router.get('/me', auth_middleware_1.authMiddleware, auth_controller_1.getMe);
router.post('/change-password', auth_middleware_1.authMiddleware, auth_controller_1.changePassword);
exports.default = router;
