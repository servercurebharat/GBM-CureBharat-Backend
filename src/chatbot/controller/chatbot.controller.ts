import { Request, Response } from 'express';
import { detectIntent } from '../core/intent.engine';
import { buildResponse } from '../core/response.builder';
import { canAccessIntent } from '../roles/access.control';
import { logChatbotInteraction } from '../utils/chatbot.logger';
import { updateSession } from '../utils/chatbot.session';

export const handleChatbotMessage = async (req: any, res: Response) => {
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
    const { intent, confidenceScore } = detectIntent(message);

    // 2. Check Permissions
    const role = user.role || 'hcc';
    if (!canAccessIntent(role, intent)) {
      const resp = {
        success: false,
        intent: 'unauthorized',
        type: 'static',
        answer: 'You do not have permission to access this information.',
        suggestions: ['FAQ help'],
        confidenceScore: 1
      };
      logChatbotInteraction(user._id.toString(), role, message, intent, confidenceScore, resp.type, Date.now() - startTime, false, 'Access Denied');
      return res.status(403).json(resp);
    }

    // 3. Build Response
    const response = await buildResponse(intent, message, user, confidenceScore);

    // 4. Update Session & Log
    updateSession(user._id.toString(), message, intent);
    logChatbotInteraction(user._id.toString(), role, message, intent, confidenceScore, response.type, Date.now() - startTime, true);

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('[Chatbot Controller Error]', error);
    logChatbotInteraction(req.user?._id?.toString() || 'unknown', req.user?.role || 'unknown', req.body?.message || '', 'error', 0, 'static', Date.now() - startTime, false, error.message);
    
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
