import { ChatbotIntent } from '../types/chatbot.types';

interface IntentMapping {
  intent: ChatbotIntent;
  keywords: string[];
}

const INTENT_MAPPINGS: IntentMapping[] = [
  {
    intent: 'wallet_balance',
    keywords: ['wallet balance', 'my balance', 'provisional balance', 'final balance', 'how much money', 'available funds']
  },
  {
    intent: 'wallet_history',
    keywords: ['transactions', 'wallet history', 'ledger', 'recent transactions', 'transaction history']
  },
  {
    intent: 'wallet_tds',
    keywords: ['tds', 'tax deducted', 'tax', 'deduction', 'taxes']
  },
  {
    intent: 'sales_count',
    keywords: ['how many sales', 'my sales', 'total sales', 'number of sales', 'policies sold']
  },
  {
    intent: 'sales_latest',
    keywords: ['latest sale', 'recent sale', 'last sale', 'newest policy']
  },
  {
    intent: 'rank_status',
    keywords: ['my rank', 'current rank', 'what is my rank', 'leadership rank']
  },
  {
    intent: 'promotion_status',
    keywords: ['promotion status', 'next rank', 'when will i get promoted', 'promotion readiness']
  },
  {
    intent: 'kyc_status',
    keywords: ['kyc status', 'is my kyc done', 'kyc approved', 'kyc pending', 'documents approved']
  },
  {
    intent: 'team_growth',
    keywords: ['team size', 'my team', 'downline size', 'how many people', 'network size', 'total members']
  },
  {
    intent: 'epin_status',
    keywords: ['how many epins', 'e-pins', 'epin status', 'available pins', 'my pins']
  },
  {
    intent: 'commission_status',
    keywords: ['commission status', 'my commission', 'override income', 'leadership bonus', 'how much commission']
  },
  {
    intent: 'genealogy_status',
    keywords: ['who is my sponsor', 'genealogy', 'my referrer', 'upline', 'hierarchy']
  },
  {
    intent: 'payout_status',
    keywords: ['payout status', 'delayed payout', 'when is payout', 'payout cycle', 'withdrawal status']
  },
  {
    intent: 'dashboard_help',
    keywords: ['dashboard', 'how to use dashboard', 'where is', 'navigate to']
  },
  {
    intent: 'faq_help',
    keywords: ['responsibility', 'what is my role', 'help', 'what can i do', 'how to', 'guide', 'explain']
  }
];

export const detectIntent = (message: string): { intent: ChatbotIntent, confidenceScore: number } => {
  const lowerMessage = message.toLowerCase().trim();

  // Instant greeting detection to avoid substring conflicts
  const greetings = ['hi', 'hii', 'hiii', 'hello', 'hey', 'greetings', 'morning', 'afternoon', 'evening', 'hola'];
  const words = lowerMessage.split(/\s+/);
  const hasGreeting = words.some(word => greetings.includes(word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")));
  if (hasGreeting && words.length <= 3) {
    return { intent: 'greeting' as ChatbotIntent, confidenceScore: 0.98 };
  }

  let bestIntent: ChatbotIntent = 'unknown';
  let highestScore = 0;

  for (const mapping of INTENT_MAPPINGS) {
    let matches = 0;
    for (const kw of mapping.keywords) {
      if (lowerMessage.includes(kw.toLowerCase())) {
        matches++;
      }
    }

    if (matches > 0) {
      // Basic confidence logic: base + (matches * factor), capped at 0.98
      const score = Math.min(0.6 + (matches * 0.15), 0.98);
      if (score > highestScore) {
        highestScore = score;
        bestIntent = mapping.intent;
      }
    }
  }

  // Fallback for unknown
  if (highestScore < 0.4) {
    return { intent: 'unknown', confidenceScore: 0.3 };
  }

  return { intent: bestIntent, confidenceScore: highestScore };
};
