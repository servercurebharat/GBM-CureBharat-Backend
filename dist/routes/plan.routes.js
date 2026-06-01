"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const plan_controller_1 = require("../controllers/plan.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = express_1.default.Router();
const cloudinary_1 = require("../config/cloudinary");
// Public/Member routes
router.get('/', auth_middleware_1.authMiddleware, plan_controller_1.getPlans);
// Admin-only routes
router.get('/admin/all', auth_middleware_1.authMiddleware, (0, role_middleware_1.checkRole)(['admin']), plan_controller_1.getAllPlansAdmin);
router.post('/', auth_middleware_1.authMiddleware, (0, role_middleware_1.checkRole)(['admin']), cloudinary_1.upload.single('brochure'), plan_controller_1.createPlan);
router.put('/:id', auth_middleware_1.authMiddleware, (0, role_middleware_1.checkRole)(['admin']), cloudinary_1.upload.single('brochure'), plan_controller_1.updatePlan);
router.delete('/:id', auth_middleware_1.authMiddleware, (0, role_middleware_1.checkRole)(['admin']), plan_controller_1.deletePlan);
exports.default = router;
