import { ChatbotIntent } from '../types/chatbot.types';

const ROLE_PERMISSIONS: Record<string, ChatbotIntent[]> = {
  admin: [
    'greeting', 'wallet_balance', 'wallet_history', 'wallet_tds', 'sales_count', 'sales_latest', 
    'rank_status', 'promotion_status', 'team_growth', 'kyc_status', 'epin_status', 
    'commission_status', 'genealogy_status', 'payout_status', 'dashboard_help', 'faq_help', 'unknown'
  ],
  sh: [
    'greeting', 'wallet_balance', 'wallet_history', 'wallet_tds', 'sales_count', 'sales_latest', 
    'rank_status', 'promotion_status', 'team_growth', 'kyc_status', 'epin_status', 
    'commission_status', 'genealogy_status', 'payout_status', 'dashboard_help', 'faq_help', 'unknown'
  ],
  hba: [
    'greeting', 'wallet_balance', 'wallet_history', 'wallet_tds', 'sales_count', 'sales_latest', 
    'rank_status', 'promotion_status', 'team_growth', 'kyc_status', 'epin_status', 
    'commission_status', 'genealogy_status', 'payout_status', 'dashboard_help', 'faq_help', 'unknown'
  ],
  hcm: [
    'greeting', 'wallet_balance', 'wallet_history', 'wallet_tds', 'sales_count', 'sales_latest', 
    'rank_status', 'promotion_status', 'team_growth', 'kyc_status', 'epin_status', 
    'commission_status', 'genealogy_status', 'payout_status', 'dashboard_help', 'faq_help', 'unknown'
  ],
  hcc: [
    'greeting', 'wallet_balance', 'wallet_history', 'wallet_tds', 'sales_count', 'sales_latest', 
    'rank_status', 'promotion_status', 'team_growth', 'kyc_status', 'epin_status', 
    'commission_status', 'genealogy_status', 'payout_status', 'dashboard_help', 'faq_help', 'unknown'
  ]
};

export const canAccessIntent = (role: string, intent: ChatbotIntent): boolean => {
  const allowedIntents = ROLE_PERMISSIONS[role.toLowerCase()];
  if (!allowedIntents) return false;
  return allowedIntents.includes(intent);
};
