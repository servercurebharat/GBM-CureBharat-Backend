"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const complaint_controller_1 = require("../controllers/complaint.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
// Secure all routes
router.use(auth_middleware_1.authMiddleware);
// User and Admin routes
router.post('/', complaint_controller_1.createComplaint);
router.get('/my', complaint_controller_1.getUserComplaints);
router.post('/:id/reply', complaint_controller_1.replyToComplaint);
// Admin-only routes
router.get('/all', (0, role_middleware_1.checkRole)(['admin']), complaint_controller_1.getAllComplaints);
router.put('/:id/status', (0, role_middleware_1.checkRole)(['admin']), complaint_controller_1.updateComplaintStatus);
exports.default = router;
