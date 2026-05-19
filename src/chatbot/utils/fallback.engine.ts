import { ChatbotResponse } from '../types/chatbot.types';

export const handleFallback = (role: string): ChatbotResponse => {
  let suggestions = ['What is my wallet balance?', 'What is my KYC status?'];
  
  if (role === 'admin') {
    suggestions = ['How do I manage the member list?', 'Show payout status'];
  } else if (role === 'sh') {
    suggestions = ['Show state performance', 'View genealogy'];
  } else if (role === 'hba') {
    suggestions = ['Revenue trends', 'HCM productivity'];
  }

  return {
    success: true,
    intent: 'fallback',
    type: 'static',
    answer: "I'm sorry, I couldn't understand your request clearly. Please select from the suggestions below or rephrase your question.",
    suggestions,
    confidenceScore: 0
  };
};
