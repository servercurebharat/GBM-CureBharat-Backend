"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const plan_controller_1 = require("../controllers/plan.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
// Public/Member routes
router.get('/', auth_middleware_1.authMiddleware, plan_controller_1.getAllPlans);
router.get('/commissionable', auth_middleware_1.authMiddleware, plan_controller_1.getCommissionablePlans);
// Admin routes
router.post('/', auth_middleware_1.authMiddleware, (0, role_middleware_1.checkRole)(['admin']), plan_controller_1.createPlan);
router.put('/:id', auth_middleware_1.authMiddleware, (0, role_middleware_1.checkRole)(['admin']), plan_controller_1.updatePlan);
router.delete('/:id', auth_middleware_1.authMiddleware, (0, role_middleware_1.checkRole)(['admin']), plan_controller_1.deletePlan);
exports.default = router;
