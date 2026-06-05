"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const public_controller_1 = require("../controllers/public.controller");
const router = (0, express_1.Router)();
// No auth middleware — these are fully public endpoints
router.get('/seller/:memberId', public_controller_1.getSeller);
router.post('/create-order', public_controller_1.createOrder);
router.post('/verify-payment', public_controller_1.verifyPayment);
router.post('/webhook', public_controller_1.razorpayWebhook);
// Enrollment form helpers
router.get('/check-mobile/:mobile', public_controller_1.checkMobile);
router.post('/send-otp', public_controller_1.sendEmailOTP);
router.post('/verify-otp', public_controller_1.verifyEmailOTP);
// KYC
router.get('/kyc/:saleId', public_controller_1.getKycSale);
router.post('/kyc/:saleId', public_controller_1.submitKyc);
router.get('/kyc/policy/:policyId', public_controller_1.getKycByPolicyId);
exports.default = router;
