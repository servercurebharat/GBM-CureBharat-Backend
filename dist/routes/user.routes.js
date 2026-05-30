"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const cloudinary_1 = require("../config/cloudinary");
const router = (0, express_1.Router)();
router.post('/heartbeat', auth_middleware_1.authMiddleware, user_controller_1.trackHeartbeat);
router.get('/stats', auth_middleware_1.authMiddleware, (0, role_middleware_1.checkRole)(['admin', 'sh']), user_controller_1.getUserStats);
router.get('/', auth_middleware_1.authMiddleware, (0, role_middleware_1.checkRole)(['admin', 'sh']), user_controller_1.getAllUsers);
router.post('/bank-update/request', auth_middleware_1.authMiddleware, user_controller_1.requestBankUpdateOTP);
router.post('/bank-update/verify', auth_middleware_1.authMiddleware, user_controller_1.verifyBankUpdateOTP);
router.get('/:id', auth_middleware_1.authMiddleware, user_controller_1.getUserById);
router.get('/:id/downline', auth_middleware_1.authMiddleware, user_controller_1.getDownline);
router.put('/:id/kyc', auth_middleware_1.authMiddleware, cloudinary_1.upload.fields([
    { name: 'aadhaarFront', maxCount: 1 },
    { name: 'aadhaarBack', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
    { name: 'bankProof', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
]), user_controller_1.updateKYC);
router.put('/:id/profile', auth_middleware_1.authMiddleware, user_controller_1.updateProfile);
exports.default = router;
