"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const user_controller_1 = require("../controllers/user.controller");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const cloudinary_1 = require("../config/cloudinary");
const router = (0, express_1.Router)();
// All routes in this file are Admin only
router.use(auth_middleware_1.authMiddleware);
router.use((0, role_middleware_1.checkRole)(['admin']));
router.get('/commission-config', admin_controller_1.getCommissionConfig);
router.put('/commission-config', admin_controller_1.updateCommissionConfig);
router.get('/kyc/pending', admin_controller_1.getPendingKYC);
router.get('/bank-updates/pending', admin_controller_1.getPendingBankUpdates);
router.put('/kyc/:id/status', admin_controller_1.updateKYCStatus);
router.put('/users/:id/status', admin_controller_1.updateUserStatus);
router.delete('/users/:id', admin_controller_1.deleteUser);
router.get('/customers/export', admin_controller_1.exportCustomersXLSX);
router.put('/users/:id/profile', cloudinary_1.upload.fields([
    { name: 'aadhaarFront', maxCount: 1 },
    { name: 'aadhaarBack', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
    { name: 'bankProof', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 }
]), admin_controller_1.adminUpdateMemberProfile);
router.put('/customers/:id/profile', cloudinary_1.upload.fields([
    { name: 'aadhaarFront', maxCount: 1 },
    { name: 'aadhaarBack', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
]), admin_controller_1.adminUpdateCustomerProfile);
router.put('/users/:id/reset-password', admin_controller_1.resetUserPassword);
router.put('/users/:id/bank-verify', admin_controller_1.verifyBankDetails);
router.get('/tree', user_controller_1.getAdminTree);
router.post('/manual-adjustment', admin_controller_1.createManualAdjustment);
router.get('/state-performance', analytics_controller_1.getStatePerformance);
router.post('/announcements', admin_controller_1.sendAnnouncement);
router.post('/sales/:id/send-kyc-link', admin_controller_1.sendKycLink);
router.get('/custom-commission', admin_controller_1.getCustomCommissions);
router.post('/custom-commission', admin_controller_1.setCustomCommission);
exports.default = router;
