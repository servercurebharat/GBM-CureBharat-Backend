"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activity_controller_1 = require("../controllers/activity.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
// Only admin and super heads can view system-wide activity logs
router.get('/', auth_middleware_1.authMiddleware, (0, role_middleware_1.checkRole)(['admin', 'sh']), activity_controller_1.getActivityLogs);
exports.default = router;
