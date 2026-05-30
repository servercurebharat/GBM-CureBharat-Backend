"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canAccessIntent = void 0;
const ROLE_PERMISSIONS = {
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
const canAccessIntent = (role, intent) => {
    const allowedIntents = ROLE_PERMISSIONS[role.toLowerCase()];
    if (!allowedIntents)
        return false;
    return allowedIntents.includes(intent);
};
exports.canAccessIntent = canAccessIntent;
