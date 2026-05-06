"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const team_controller_1 = require("../controllers/team.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/stats', auth_middleware_1.authMiddleware, team_controller_1.getTeamStats);
router.get('/members', auth_middleware_1.authMiddleware, team_controller_1.getTeamList);
exports.default = router;
