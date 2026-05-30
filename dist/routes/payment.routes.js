"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const payment_controller_1 = require("../controllers/payment.controller");
const router = (0, express_1.Router)();
// ─── Public (NO auth) ─────────────────────────────────────────────────────────
// Cashfree calls this endpoint server-to-server — must NOT be behind auth
router.post('/webhook', payment_controller_1.handleWebhook);
// ─── Protected (User) ─────────────────────────────────────────────────────────
router.post('/create-order', auth_middleware_1.authMiddleware, payment_controller_1.createOrder);
router.get('/verify/:orderId', auth_middleware_1.authMiddleware, payment_controller_1.verifyPayment);
router.get('/history', auth_middleware_1.authMiddleware, payment_controller_1.getMyPayments);
// ─── Protected (Admin) ────────────────────────────────────────────────────────
router.get('/all', auth_middleware_1.authMiddleware, (0, role_middleware_1.checkRole)(['admin']), payment_controller_1.getAllPayments);
exports.default = router;
