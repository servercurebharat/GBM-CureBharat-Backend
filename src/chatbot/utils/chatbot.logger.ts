import { ChatbotIntent } from '../types/chatbot.types';

export const logChatbotInteraction = (
  userId: string,
  role: string,
  question: string,
  intent: ChatbotIntent | string,
  confidence: number,
  type: string,
  responseTimeMs: number,
  success: boolean,
  failureReason?: string
) => {
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
