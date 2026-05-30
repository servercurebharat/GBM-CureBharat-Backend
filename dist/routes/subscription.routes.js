"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscription_controller_1 = require("../controllers/subscription.controller");
const router = (0, express_1.Router)();
// Public — no auth needed (customer is not logged in during checkout)
router.post('/create', subscription_controller_1.createSubscription);
router.post('/webhook', subscription_controller_1.subscriptionWebhook);
router.get('/status/:subscriptionId', subscription_controller_1.getSubscriptionStatus);
exports.default = router;
