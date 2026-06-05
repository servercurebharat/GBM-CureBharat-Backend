import { FAQ } from '../types/chatbot.types';

type HCCChatbotFAQItem = FAQ;

export const hccFAQ: HCCChatbotFAQItem[] = [
  {
    id: 'hcc-dashboard-overview',
    category: 'Dashboard & Analytics',
    question: 'How do I read my HCC dashboard overview?',
    answer:
      'Use the HCC dashboard as your personal business summary. Start with personal sales, direct commissions, wallet movement, promotion readiness, recent team joins, and any pending alerts. This helps you quickly tell whether your next focus should be sales, onboarding, KYC completion, or payout follow-up.',
    keywords: ['hcc dashboard', 'dashboard overview', 'summary', 'overview', 'metrics'],
    relatedPrompts: ['How do I track my commissions?', 'How do I become HCM?'],
  },

  {
    id: 'hcc-dashboard-mismatch',
    category: 'Support & Troubleshooting',
    question: 'Why does dashboard data look incorrect or delayed?',
    answer:
      'Compare the dashboard cards with their source modules first. Check My Sales for policy activity, Finance Hub for wallet movement, Team Management for referral counts, and Notifications for unresolved alerts.',
    keywords: ['dashboard mismatch', 'wrong dashboard', 'delayed dashboard', 'incorrect metrics', 'reporting lag'],
    relatedPrompts: ['Why is my wallet balance missing?', 'Why are team counts incorrect?'],
  },

  {
    id: 'hcc-personal-business',
    category: 'Personal Business',
    question: 'How do I use My Business effectively?',
    answer:
      'Use My Business to review your personal growth activity in one place. Focus on personal sales, referral onboarding status, direct income movement, promotion readiness, and recent branch activity.',
    keywords: ['my business', 'personal business', 'business overview', 'growth summary', 'activity review'],
    relatedPrompts: ['How do I increase my sales?', 'How do I recruit more members?'],
  },

  {
    id: 'hcc-sales-trend',
    category: 'Dashboard & Analytics',
    question: 'How do I track my sales trends?',
    answer:
      'Track your sales by reviewing daily movement, recent policy count, plan mix, and month-to-date totals.',
    keywords: ['sales trend', 'personal sales', 'mtd sales', 'policy trend', 'sales performance'],
    relatedPrompts: ['How do I increase my sales?', 'How do I review my sales?'],
  },

  {
    id: 'hcc-team-growth',
    category: 'Team Growth',
    question: 'How do I track my team growth?',
    answer:
      'Track team growth by reviewing how many referrals joined, how many became active, and how many started contributing through real sales.',
    keywords: ['team growth', 'referral growth', 'member growth', 'team expansion', 'branch growth'],
    relatedPrompts: ['How do I recruit more members?', 'Why are team counts incorrect?'],
  },

  {
    id: 'hcc-recruit-members',
    category: 'Referral Onboarding',
    question: 'How do I recruit more members?',
    answer:
      'Recruitment works best when you focus on both joining and activation. Bring in new referrals, guide them through registration, help them complete KYC if needed, and support their first sale or plan activation.',
    keywords: ['recruit members', 'recruit referrals', 'add members', 'onboard members', 'new joins'],
    relatedPrompts: ['How do I register a member using a pin?', 'How do I become HCM?'],
  },

  {
    id: 'hcc-referral-onboarding',
    category: 'Referral Onboarding',
    question: 'How does referral onboarding work?',
    answer:
      'Referral onboarding usually follows this workflow: identify the new member, complete registration, apply a valid pin if required, confirm sponsor linkage, and then help the member complete their initial setup.',
    keywords: ['referral onboarding', 'member onboarding', 'registration flow', 'new member setup', 'sponsor onboarding'],
    relatedPrompts: ['How do I register a member using a pin?', 'Why did registration using a pin fail?'],
  },

  {
    id: 'hcc-team-count-incorrect',
    category: 'Support & Troubleshooting',
    question: 'Why are team counts incorrect?',
    answer:
      'Team counts can look incorrect when recent referrals have not fully reflected in summary widgets, when filters are applied, or when inactive members are counted differently across views.',
    keywords: ['wrong team count', 'team count incorrect', 'referral count issue', 'member count mismatch', 'team mismatch'],
    relatedPrompts: ['How do I track my team growth?', 'Why does dashboard data look incorrect or delayed?'],
  },

  {
    id: 'hcc-become-hcm',
    category: 'Promotion Readiness',
    question: 'How do I become HCM?',
    answer:
      'To move from HCC to HCM, focus on the promotion rules tied to personal sales and recruit quality.',
    keywords: ['become hcm', 'hcm promotion', 'promotion path', 'next rank', 'rank upgrade'],
    relatedPrompts: ['Why is my promotion delayed?', 'How do I improve promotion readiness?'],
  },

  {
    id: 'hcc-promotion-readiness',
    category: 'Promotion Readiness',
    question: 'How do I improve promotion readiness?',
    answer:
      'Improve promotion readiness by growing both personal business and active referrals together.',
    keywords: ['promotion readiness', 'rank readiness', 'promotion', 'qualification', 'hcm upgrade'],
    relatedPrompts: ['How do I become HCM?', 'How do I recruit more members?'],
  },

  {
    id: 'hcc-promotion-delay',
    category: 'Support & Troubleshooting',
    question: 'Why is my promotion delayed?',
    answer:
      'Promotion delay usually means one or more required conditions are incomplete.',
    keywords: ['promotion delay', 'rank delay', 'not promoted', 'hcm upgrade delay', 'qualification delay'],
    relatedPrompts: ['How do I become HCM?', 'How do I improve promotion readiness?'],
  },

  {
    id: 'hcc-rank-progress',
    category: 'Rank Progress',
    question: 'How does rank progression work for HCC?',
    answer:
      'Rank progression for HCC is mainly driven by personal sales and the growth of a productive direct team.',
    keywords: ['rank progression', 'hcc rank', 'rank growth', 'promotion logic', 'upgrade'],
    relatedPrompts: ['How do I become HCM?', 'How do I track my sales trends?'],
  },

  {
    id: 'hcc-direct-commission',
    category: 'Wallet & Finance',
    question: 'How do I track my commissions?',
    answer:
      'Track your commissions using Finance or Finance Hub. Review direct income, provisional balance, final balance, and recent ledger entries together.',
    keywords: ['track commissions', 'direct commission', 'income tracking', 'earnings', 'wallet'],
    relatedPrompts: ['Why is my commission missing?', 'What is provisional balance?'],
  },

  {
    id: 'hcc-commission-missing',
    category: 'Support & Troubleshooting',
    question: 'Why is my commission missing?',
    answer:
      'Start by confirming the sale exists, then check whether the plan is commissionable and whether the amount is still provisional instead of final.',
    keywords: ['missing commission', 'commission not credited', 'direct income missing', 'earnings missing', 'wallet not updated'],
    relatedPrompts: ['How do I track my commissions?', 'Why is my wallet balance missing?'],
  },

  {
    id: 'hcc-wallet-overview',
    category: 'Wallet & Finance',
    question: 'Why is my wallet balance missing?',
    answer:
      'Wallet balance may look missing when the sale has not yet generated income, the credited amount is still provisional, or the summary has not refreshed yet.',
    keywords: ['wallet missing', 'missing wallet balance', 'balance issue', 'income not showing', 'wallet mismatch'],
    relatedPrompts: ['How do I track my commissions?', 'Why does dashboard data look incorrect or delayed?'],
  },

  {
    id: 'hcc-provisional-final',
    category: 'Wallet & Finance',
    question: 'What is provisional balance?',
    answer:
      'Provisional balance contains earnings that are credited but not yet settled for payout use.',
    keywords: ['provisional balance', 'final balance', 'wallet status', 'settled income', 'pending income'],
    relatedPrompts: ['How do I withdraw my earnings?', 'Why are payouts delayed?'],
  },

  {
    id: 'hcc-withdraw-earnings',
    category: 'Wallet & Finance',
    question: 'How do I withdraw my earnings?',
    answer:
      'To withdraw earnings, first make sure your KYC is approved and the amount is in final balance.',
    keywords: ['withdraw earnings', 'withdrawal', 'payout request', 'cash out', 'final balance'],
    relatedPrompts: ['Why was my payout rejected?', 'How does KYC affect payouts?'],
  },

  {
    id: 'hcc-payout-delay',
    category: 'Support & Troubleshooting',
    question: 'Why are payouts delayed?',
    answer:
      'Payout delays usually happen because the amount is still provisional, KYC is pending, or the settlement cycle has not completed.',
    keywords: ['payout delay', 'withdrawal delay', 'payment delay', 'settlement delay', 'finance review'],
    relatedPrompts: ['How do I withdraw my earnings?', 'How does KYC affect payouts?'],
  },

  {
    id: 'hcc-finance-hub',
    category: 'Finance Hub',
    question: 'How do I use the finance hub?',
    answer:
      'Finance Hub is your main financial summary screen. Use it to review direct income, provisional and final balance, transaction ledger, payout movement, and deduction impact such as TDS.',
    keywords: ['finance hub', 'wallet', 'ledger', 'earnings', 'tds'],
    relatedPrompts: ['How do I track my commissions?', 'How do I withdraw my earnings?'],
  },

  {
    id: 'hcc-sales-overview',
    category: 'Sales Management',
    question: 'How do I increase my sales?',
    answer:
      'Increase sales by keeping your sale flow consistent and removing operational blockers.',
    keywords: ['increase sales', 'personal sales', 'sales growth', 'policy growth', 'sell more'],
    relatedPrompts: ['How do I create a sale?', 'How do I track my sales trends?'],
  },

  {
    id: 'hcc-create-sale',
    category: 'Policy Sales',
    question: 'How do I create a sale?',
    answer:
      'Open the New Sale screen, choose an active plan, enter the customer or member details, and add any required E-Pin information if applicable.',
    keywords: ['create sale', 'new sale', 'policy sale', 'submit sale', 'sales entry'],
    relatedPrompts: ['Why did my sale fail?', 'How do I review my sales?'],
  },

  {
    id: 'hcc-review-sales',
    category: 'Sales Management',
    question: 'How do I review my sales?',
    answer:
      'Use My Sales to validate recent policy entries, compare sale history, and spot missing or mislinked records.',
    keywords: ['review sales', 'my sales', 'sales history', 'recent policies', 'sale list'],
    relatedPrompts: ['How do I create a sale?', 'Why is a sales record missing?'],
  },

  {
    id: 'hcc-sales-missing',
    category: 'Support & Troubleshooting',
    question: 'Why is a sales record missing?',
    answer:
      'A sale can appear missing if it was not submitted successfully, was entered with wrong details, or has not yet reflected in summary views.',
    keywords: ['missing sale', 'sales record missing', 'policy missing', 'sale not found', 'sales issue'],
    relatedPrompts: ['How do I review my sales?', 'Why did my sale fail?'],
  },

  {
    id: 'hcc-policy-certificates',
    category: 'Policy Certificates',
    question: 'How do I access policy certificates?',
    answer:
      'Use the Policy Certificates section to open or download certificates linked to completed policy sales.',
    keywords: ['policy certificates', 'certificate access', 'download certificate', 'policy document', 'sale certificate'],
    relatedPrompts: ['Why is a sales record missing?', 'Why did my sale fail?'],
  },

  {
    id: 'hcc-kyc-overview',
    category: 'KYC & Documents',
    question: 'How do I check or update KYC?',
    answer:
      'Open My KYC Status or Documents to review what has been uploaded and what is still pending.',
    keywords: ['check kyc', 'update kyc', 'documents', 'aadhaar', 'pan', 'bank proof'],
    relatedPrompts: ['Why is my KYC rejected?', 'How does KYC affect payouts?'],
  },

  {
    id: 'hcc-kyc-payout-impact',
    category: 'KYC & Documents',
    question: 'How does KYC affect payouts?',
    answer:
      'If KYC is pending, incomplete, or rejected, payout processing can be blocked even when earnings are visible in the wallet.',
    keywords: ['kyc payout', 'payout blocked', 'verification issue', 'withdrawal block', 'kyc delay'],
    relatedPrompts: ['How do I withdraw my earnings?', 'Why is my KYC rejected?'],
  },

  {
    id: 'hcc-kyc-rejected',
    category: 'Support & Troubleshooting',
    question: 'Why is my KYC rejected?',
    answer:
      'KYC is usually rejected because the documents are unclear, incomplete, mismatched, or do not meet the required format.',
    keywords: ['kyc rejected', 'rejected kyc', 'document rejected', 'verification failed', 'kyc issue'],
    relatedPrompts: ['How do I check or update KYC?', 'How does KYC affect payouts?'],
  },

  {
    id: 'hcc-epin-overview',
    category: 'E-Pin Wallet',
    question: 'How do I use E-Pins?',
    answer:
      'Use E-Pins from your pin wallet when registration or sale flows require a valid unused pin.',
    keywords: ['use epin', 'e-pin', 'pin wallet', 'activation code', 'pin usage'],
    relatedPrompts: ['How do I register a member using a pin?', 'Why did an E-Pin fail?'],
  },

  {
    id: 'hcc-pin-wallet',
    category: 'E-Pin Wallet',
    question: 'How do I use My Pin Wallet?',
    answer:
      'My Pin Wallet shows your available, used, and transferred pins.',
    keywords: ['my pin wallet', 'pin wallet', 'used pin', 'unused pin', 'pin status'],
    relatedPrompts: ['How do I use E-Pins?', 'Why did an E-Pin fail?'],
  },

  {
    id: 'hcc-register-using-pin',
    category: 'Pin Registration',
    question: 'How do I register a member using a pin?',
    answer:
      'To register a member using a pin, first confirm the member details, sponsor link, and the pin status.',
    keywords: ['register using pin', 'pin registration', 'use pin to register', 'member registration', 'registration pin'],
    relatedPrompts: ['How does referral onboarding work?', 'Why did registration using a pin fail?'],
  },

  {
    id: 'hcc-pin-registration-failed',
    category: 'Support & Troubleshooting',
    question: 'Why did registration using a pin fail?',
    answer:
      'Pin-based registration usually fails because the pin is already used, belongs to someone else, or does not match the required value.',
    keywords: ['pin registration failed', 'registration pin failed', 'use pin failed', 'invalid pin registration', 'registration error'],
    relatedPrompts: ['How do I register a member using a pin?', 'Why did an E-Pin fail?'],
  },

  {
    id: 'hcc-epin-failed',
    category: 'Support & Troubleshooting',
    question: 'Why did an E-Pin fail?',
    answer:
      'An E-Pin usually fails because it is already used, assigned incorrectly, linked to the wrong plan value, blocked, or entered incorrectly.',
    keywords: ['epin failed', 'invalid pin', 'activation failed', 'pin issue', 'epin error'],
    relatedPrompts: ['How do I use E-Pins?', 'How do I use My Pin Wallet?'],
  },

  {
    id: 'hcc-notifications-usage',
    category: 'Notifications',
    question: 'How do I use notifications effectively?',
    answer:
      'Use Notifications as your action queue for business follow-up.',
    keywords: ['notifications', 'alerts', 'updates', 'action queue', 'system messages'],
    relatedPrompts: ['Why are notifications missing?', 'How do I raise a support ticket?'],
  },

  {
    id: 'hcc-support-ticket',
    category: 'Support & Troubleshooting',
    question: 'How do I raise a support ticket?',
    answer:
      'Raise a support ticket with the exact issue type, member or sale reference, and what you already checked.',
    keywords: ['support ticket', 'raise support', 'help request', 'ticket', 'support case'],
    relatedPrompts: ['Why are notifications missing?', 'Why did my sale fail?'],
  },

  {
    id: 'hcc-my-business-focus',
    category: 'Personal Business',
    question: 'What should I focus on first to grow my HCC business?',
    answer:
      'Start with three priorities: consistent personal sales, correct referral onboarding, and complete KYC.',
    keywords: ['grow business', 'hcc growth', 'business focus', 'first steps', 'growth priorities'],
    relatedPrompts: ['How do I increase my sales?', 'How do I recruit more members?'],
  },

  {
    id: 'hcc-hierarchy-basics',
    category: 'Team Growth',
    question: 'How does the GBM hierarchy work for me?',
    answer:
      'As HCC, your immediate focus is your direct sponsor, your own sales, and the referrals you personally bring in.',
    keywords: ['gbm hierarchy', 'sponsor', 'referrals', 'direct team', 'branch basics'],
    relatedPrompts: ['How does referral onboarding work?', 'How do I become HCM?'],
  },
  {
    id: 'hcc-financial-rules',
    category: 'Compensation & Rules',
    question: 'What are the financial rules for withdrawal and TDS?',
    answer:
      'A 5% TDS is deducted on all payouts. Admin charges are 5%. Withdrawals are processed after the locking period ends and KYC is approved.',
    keywords: ['withdrawal limit', 'minimum withdrawal', 'admin charges', 'tax rules', 'payout cycle', 'monthly closing', 'tds'],
    relatedPrompts: ['How do I withdraw my earnings?', 'Why are payouts delayed?'],
  },
  {
    id: 'hcc-rank-progression',
    category: 'Rank Progression',
    question: 'How many sales to become HCM?',
    answer:
      'To become a Health Care Manager (HCM), you need to achieve 50 active direct policy sales and ensure your referrals are active. Focus on personal sales first.',
    keywords: ['how many sales to become hcm', 'hcm criteria', 'requirements for hcm', 'level up', 'promotion requirements'],
    relatedPrompts: ['How do I become HCM?', 'How do I track my sales trends?'],
  },
  {
    id: 'hcc-commission-percentage',
    category: 'Compensation & Rules',
    question: 'What is my commission percentage?',
    answer:
      'As an HCC, you earn a flat 10% direct commission on all your personal sales. You do not earn override income until you reach HCM rank.',
    keywords: ['commission percentage', 'override commission', 'override income', 'direct commission', 'how much do i earn'],
    relatedPrompts: ['How do I become HCM?', 'How do I track my commissions?'],
  },
  {
    id: 'hcc-product-knowledge',
    category: 'Product Knowledge',
    question: 'What policies do we sell and how much do they cost?',
    answer:
      'We offer CureBharat Micro-Health and Micro-Life insurance plans designed for rural and semi-urban markets. Premiums vary by plan type. Check the Product Catalog for exact pricing and benefits.',
    keywords: ['what policies do we sell', 'life insurance', 'health insurance', 'product catalog', 'premium amount', 'how much does a policy cost'],
    relatedPrompts: ['How do I create a sale?'],
  },
  {
    id: 'hcc-operational-help',
    category: 'Operational Support',
    question: 'Where can I find marketing materials and company info?',
    answer:
      'CureBharat is a registered GBM entity. You can download your official ID Card and promotional banners directly from the Dashboard under the Profile or Resources section.',
    keywords: ['marketing banners', 'download my id card', 'is curebharat legal', 'company registered', 'company address'],
    relatedPrompts: ['How do I use notifications effectively?'],
  }
];