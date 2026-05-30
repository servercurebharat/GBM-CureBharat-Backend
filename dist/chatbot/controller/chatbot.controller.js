"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChatbotMessage = void 0;
const intent_engine_1 = require("../core/intent.engine");
const response_builder_1 = require("../core/response.builder");
const access_control_1 = require("../roles/access.control");
const chatbot_logger_1 = require("../utils/chatbot.logger");
const chatbot_session_1 = require("../utils/chatbot.session");
const handleChatbotMessage = async (req, res) => {
    const startTime = Date.now();
    try {
        const { message } = req.body;
        const user = req.user;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        // 1. Detect Intent
        const { intent, confidenceScore } = (0, intent_engine_1.detectIntent)(message);
        // 2. Check Permissions
        const role = user.role || 'hcc';
        if (!(0, access_control_1.canAccessIntent)(role, intent)) {
            const resp = {
                success: false,
                intent: 'unauthorized',
                type: 'static',
                answer: 'You do not have permission to access this information.',
                suggestions: ['FAQ help'],
                confidenceScore: 1
            };
            (0, chatbot_logger_1.logChatbotInteraction)(user._id.toString(), role, message, intent, confidenceScore, resp.type, Date.now() - startTime, false, 'Access Denied');
            return res.status(403).json(resp);
        }
        // 3. Build Response
        const response = await (0, response_builder_1.buildResponse)(intent, message, user, confidenceScore);
        // 4. Update Session & Log
        (0, chatbot_session_1.updateSession)(user._id.toString(), message, intent);
        (0, chatbot_logger_1.logChatbotInteraction)(user._id.toString(), role, message, intent, confidenceScore, response.type, Date.now() - startTime, true);
        return res.status(200).json(response);
    }
    catch (error) {
        console.error('[Chatbot Controller Error]', error);
        (0, chatbot_logger_1.logChatbotInteraction)(req.user?._id?.toString() || 'unknown', req.user?.role || 'unknown', req.body?.message || '', 'error', 0, 'static', Date.now() - startTime, false, error.message);
        return res.status(500).json({
            success: false,
            intent: 'error',
            type: 'static',
            answer: 'An internal error occurred while processing your request.',
            suggestions: ['Please try again later'],
            confidenceScore: 0
        });
    }
};
exports.handleChatbotMessage = handleChatbotMessage;
