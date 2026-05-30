"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logChatbotInteraction = void 0;
const logChatbotInteraction = (userId, role, question, intent, confidence, type, responseTimeMs, success, failureReason) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        userId,
        role,
        question,
        intent,
        confidence,
        type,
        responseTimeMs,
        success,
        failureReason
    };
    // In a production setup with a dedicated ChatbotLog model, this would be:
    // await ChatbotLog.create(logEntry);
    // For now, securely log to console for monitoring without breaking existing schema
    console.log(`[CHATBOT_LOG] ${JSON.stringify(logEntry)}`);
};
exports.logChatbotInteraction = logChatbotInteraction;
