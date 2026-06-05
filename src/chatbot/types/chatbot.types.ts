export interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  relatedPrompts: string[];
}

export type ChatbotIntent = 
  | 'greeting'
  | 'wallet_balance'
  | 'wallet_history'
  | 'wallet_tds'
  | 'sales_count'
  | 'sales_latest'
  | 'rank_status'
  | 'promotion_status'
  | 'team_growth'
  | 'kyc_status'
  | 'epin_status'
  | 'commission_status'
  | 'genealogy_status'
  | 'payout_status'
  | 'dashboard_help'
  | 'faq_help'
  | 'financial_rules'
  | 'rank_progression'
  | 'product_knowledge'
  | 'operational_help'
  | 'unknown';

export interface ChatbotRequest {
  message: string;
  userId?: string;
  role?: string;
}

export interface ChatbotResponse {
  success: boolean;
  intent: ChatbotIntent | string;
  type: 'static' | 'dynamic' | 'hybrid';
  answer: string;
  data?: any;
  suggestions: string[];
  confidenceScore: number;
}
