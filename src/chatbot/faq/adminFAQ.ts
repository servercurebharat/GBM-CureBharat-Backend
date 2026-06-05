import { FAQ } from '../types/chatbot.types';

type AdminChatbotFAQItem = FAQ;

export const adminFAQ: AdminChatbotFAQItem[] = [
  {
    id: 'admin-dashboard-overview-metrics',
    category: 'Dashboard & Analytics',
    question: 'How do I read the admin overview dashboard?',
    answer:
      'Use the admin dashboard as the daily operational summary. Start with total users, active users, inactive users, total revenue, FTD revenue, and MTD revenue.',
    keywords: ['dashboard', 'overview', 'metrics', 'admin dashboard', 'summary'],
    relatedPrompts: ['How do I monitor state performance?', 'How do I review pending withdrawals?'],
  },

  {
    id: 'admin-dashboard-data-mismatch',
    category: 'Troubleshooting',
    question: 'Why does dashboard data look incorrect or delayed?',
    answer:
      'Compare dashboard cards against Member List, sales reports, wallet summaries, and payout queue status.',
    keywords: ['dashboard mismatch', 'incorrect dashboard', 'delayed metrics', 'wrong data', 'dashboard error'],
    relatedPrompts: ['How do I audit transactions?', 'How do I review FTD and MTD reports?'],
  },

  {
    id: 'admin-ftd-report',
    category: 'Reports & Analytics',
    question: 'How do I review FTD reports?',
    answer:
      'Use FTD reports to review daily sales performance, total revenue, total sales count, and top performers.',
    keywords: ['ftd', 'daily report', 'today sales', 'day performance', 'hourly velocity'],
    relatedPrompts: ['How do I review MTD reports?', 'How do I monitor sales anomalies?'],
  },

  {
    id: 'admin-mtd-report',
    category: 'Reports & Analytics',
    question: 'How do I review MTD reports?',
    answer:
      'Use MTD reports to review current month sales, revenue trends, state-wise contribution, and member growth.',
    keywords: ['mtd', 'month to date', 'monthly report', 'month performance', 'state revenue'],
    relatedPrompts: ['How do I monitor state performance?', 'How do I track member growth?'],
  },

  {
    id: 'admin-state-performance',
    category: 'Reports & Analytics',
    question: 'How do I monitor state performance?',
    answer:
      'Use state performance analytics to compare revenue, active members, and leadership output by region.',
    keywords: ['state performance', 'region performance', 'branch performance', 'sh performance', 'state analytics'],
    relatedPrompts: ['How do I inspect genealogy?', 'How do I review top leaders?'],
  },

  {
    id: 'admin-top-leaders-review',
    category: 'Dashboard & Analytics',
    question: 'How do I review top leaders properly?',
    answer:
      'Review top leaders using direct count, team sales value, branch width, and active downline growth.',
    keywords: ['top leaders', 'leaderboard', 'leaders', 'top performer', 'top income'],
    relatedPrompts: ['How does rank progression work?', 'How do I inspect genealogy?'],
  },

  {
    id: 'admin-member-list-usage',
    category: 'Member Management',
    question: 'How do I use the member list effectively?',
    answer:
      'Use Member List to search, filter, inspect, and manage all members across the GBM network.',
    keywords: ['member list', 'members', 'user list', 'member management', 'search member'],
    relatedPrompts: ['How do I inspect a member profile?', 'How do I verify referral relationships?'],
  },

  {
    id: 'admin-member-profile-audit',
    category: 'Member Management',
    question: 'How do I inspect a member profile?',
    answer:
      'Validate role, sponsor link, KYC status, wallet summary, recent sales, and downline structure.',
    keywords: ['member profile', 'user profile', 'inspect member', 'member details', 'user details'],
    relatedPrompts: ['How do I verify referral relationships?', 'How do I audit transactions?'],
  },

  {
    id: 'admin-referral-relationship',
    category: 'Network Management',
    question: 'How do I verify referral relationships?',
    answer:
      'Verify sponsor linkage using member profile data and genealogy tree structure.',
    keywords: ['referral', 'sponsor', 'referrer', 'placement', 'relationship'],
    relatedPrompts: ['How do I inspect genealogy?', 'Why is genealogy incorrect?'],
  },

  {
    id: 'admin-inactive-members',
    category: 'Network Management',
    question: 'Why are some members inactive?',
    answer:
      'Inactive members usually fail monthly activity requirements such as sales or engagement rules.',
    keywords: ['inactive members', 'inactive user', 'member inactive', 'status inactive', 'activity audit'],
    relatedPrompts: ['How does rank progression work?', 'How do I reactivate a member branch operationally?'],
  },

  {
    id: 'admin-network-growth-review',
    category: 'Network Management',
    question: 'How do I review network growth quality?',
    answer:
      'Review network growth using active members, hierarchy depth, sales activity, and branch expansion.',
    keywords: ['network growth', 'team growth', 'branch growth', 'downline growth', 'quality'],
    relatedPrompts: ['How do I inspect genealogy?', 'How do I monitor state performance?'],
  },

  {
    id: 'admin-kyc-approve',
    category: 'KYC Management',
    question: 'How do I approve KYC?',
    answer:
      'Review Aadhaar, PAN, bank proof, and identity verification before approving KYC.',
    keywords: ['approve kyc', 'kyc approval', 'verify kyc', 'approve documents', 'kyc review'],
    relatedPrompts: ['How do I reject KYC?', 'Why was a withdrawal rejected?'],
  },

  {
    id: 'admin-kyc-reject',
    category: 'KYC Management',
    question: 'How do I reject KYC?',
    answer:
      'Reject KYC when documents are incomplete, invalid, mismatched, or unreadable.',
    keywords: ['reject kyc', 'kyc rejected', 'kyc fail', 'invalid documents', 'document mismatch'],
    relatedPrompts: ['How do I review pending KYC?', 'How do members resubmit KYC?'],
  },

  {
    id: 'admin-review-pending-kyc',
    category: 'KYC Management',
    question: 'How do I review pending KYC?',
    answer:
      'Sort pending KYC by submission age, payout urgency, and verification completeness.',
    keywords: ['pending kyc', 'review kyc', 'kyc queue', 'compliance queue', 'pending verification'],
    relatedPrompts: ['How do I approve KYC?', 'Why was a withdrawal rejected?'],
  },

  {
    id: 'admin-wallet-balances',
    category: 'Wallet & Finance',
    question: 'How do I track wallet balances?',
    answer:
      'Track provisional balance, final balance, and withdrawal history together.',
    keywords: ['wallet balance', 'wallet', 'earnings', 'balance', 'finance'],
    relatedPrompts: ['What is provisional balance?', 'How do I audit wallet ledger entries?'],
  },

  {
    id: 'admin-provisional-vs-final',
    category: 'Wallet & Finance',
    question: 'What is the difference between provisional and final balance?',
    answer:
      'Provisional balance contains unsettled income. Final balance contains payout-ready earnings.',
    keywords: ['provisional balance', 'final balance', 'wallet status', 'settled income', 'pending income'],
    relatedPrompts: ['How does the payout cycle work?', 'Why was a withdrawal rejected?'],
  },

  {
    id: 'admin-wallet-ledger-audit',
    category: 'Wallet & Finance',
    question: 'How do I audit wallet ledger entries?',
    answer:
      'Audit wallet ledger entries by tracing transaction type, cycle month, source member, and settlement status.',
    keywords: ['wallet ledger', 'ledger', 'audit wallet', 'wallet entries', 'income audit'],
    relatedPrompts: ['Why is a commission missing?', 'How does the payout cycle work?'],
  },

  {
    id: 'admin-manual-adjustments',
    category: 'Wallet & Finance',
    question: 'How do manual adjustments work?',
    answer:
      'Manual adjustments should only be used for verified finance corrections or operational exceptions.',
    keywords: ['manual adjustment', 'adjust wallet', 'correction', 'ledger correction', 'finance correction'],
    relatedPrompts: ['How do I audit transactions?', 'How do I handle missing commissions?'],
  },

  {
    id: 'admin-commission-engine-overview',
    category: 'Commission Engine',
    question: 'How does the commission engine work?',
    answer:
      'The commission engine distributes direct, override, and leadership income after a valid sale.',
    keywords: ['commission engine', 'commission', 'income engine', 'override logic', 'bonus flow'],
    relatedPrompts: ['How are override commissions calculated?', 'How do leadership bonuses work?'],
  },

  {
    id: 'admin-override-calculation',
    category: 'Commission Engine',
    question: 'How are override commissions calculated?',
    answer:
      'Override commissions depend on sponsor hierarchy, active uplines, and qualifying sales volume.',
    keywords: ['override commission', 'override', 'upline income', 'downline commission', 'pass up'],
    relatedPrompts: ['How do I verify referral relationships?', 'Why is a commission missing?'],
  },

  {
    id: 'admin-leadership-bonus',
    category: 'Commission Engine',
    question: 'How do leadership bonuses work?',
    answer:
      'Leadership bonuses are distributed to qualified upper-level leadership roles in the GBM hierarchy.',
    keywords: ['leadership bonus', 'leadership income', 'sh bonus', 'top bonus', 'uplink bonus'],
    relatedPrompts: ['How does the commission engine work?', 'How does rank progression work?'],
  },

  {
    id: 'admin-missing-commission',
    category: 'Troubleshooting',
    question: 'Why is a commission missing?',
    answer:
      'Missing commissions are usually caused by wrong genealogy, non-commissionable plans, or unsettled balances.',
    keywords: ['missing commission', 'commission not credited', 'income missing', 'override missing', 'wallet not updated'],
    relatedPrompts: ['How do I audit wallet ledger entries?', 'Why is genealogy incorrect?'],
  },

  {
    id: 'admin-commission-config',
    category: 'Commission Engine',
    question: 'How do I manage commission configuration?',
    answer:
      'Commission configuration controls direct, override, and leadership payout percentages.',
    keywords: ['commission config', 'commission settings', 'income config', 'percentage update', 'engine settings'],
    relatedPrompts: ['How does the commission engine work?', 'How do manual adjustments work?'],
  },

  {
    id: 'admin-payout-cycle-workflow',
    category: 'Payout Management',
    question: 'How does the payout cycle work?',
    answer:
      'The payout cycle settles provisional income into final payout-ready balances.',
    keywords: ['payout cycle', 'settlement cycle', 'wallet settlement', 'cycle run', 'monthly payout'],
    relatedPrompts: ['How do I review payout history?', 'What is the difference between provisional and final balance?'],
  },

  {
    id: 'admin-review-pending-withdrawals',
    category: 'Payout Management',
    question: 'How do I review pending withdrawals?',
    answer:
      'Review pending withdrawals using KYC status, final balance, and payout queue data.',
    keywords: ['pending withdrawals', 'withdrawal queue', 'pending payout', 'review withdrawals', 'processing payout'],
    relatedPrompts: ['Why was a withdrawal rejected?', 'Why are payouts delayed?'],
  },

  {
    id: 'admin-withdrawal-rejected',
    category: 'Payout Management',
    question: 'Why was a withdrawal rejected?',
    answer:
      'Withdrawals are rejected due to pending KYC, insufficient final balance, invalid bank details, or payout rules.',
    keywords: ['withdrawal rejected', 'payout rejected', 'request failed', 'withdrawal blocked', 'bank issue'],
    relatedPrompts: ['How do I approve KYC?', 'How do I review pending withdrawals?'],
  },

  {
    id: 'admin-payout-delay',
    category: 'Troubleshooting',
    question: 'Why are payouts delayed?',
    answer:
      'Payout delays happen because of pending KYC, unsettled balances, finance backlog, or payment processing delays.',
    keywords: ['payout delay', 'delayed withdrawal', 'slow payout', 'pending payout', 'settlement delay'],
    relatedPrompts: ['How does the payout cycle work?', 'Why was a withdrawal rejected?'],
  },

  {
    id: 'admin-payout-history',
    category: 'Payout Management',
    question: 'How do I review payout history?',
    answer:
      'Review payout history using cycle, status, member, and ledger deduction records.',
    keywords: ['payout history', 'withdrawal history', 'payment history', 'past payouts', 'settlement history'],
    relatedPrompts: ['How do I audit transactions?', 'How do I review pending withdrawals?'],
  },

  {
    id: 'admin-product-catalog',
    category: 'Product Management',
    question: 'How do I manage the product catalog?',
    answer:
      'Use Product Catalog to manage plans, pricing, GST, business volume, and commission eligibility.',
    keywords: ['product catalog', 'plans', 'products', 'manage products', 'plan setup'],
    relatedPrompts: ['How do I create or update a plan?', 'What makes a plan commissionable?'],
  },

  {
    id: 'admin-plan-create-update',
    category: 'Product Management',
    question: 'How do I create or update a plan?',
    answer:
      'Configure selling price, GST, business volume, and commission eligibility while creating or updating a plan.',
    keywords: ['create plan', 'update plan', 'plan edit', 'product update', 'plan configuration'],
    relatedPrompts: ['What makes a plan commissionable?', 'How do E-Pins work?'],
  },

  {
    id: 'admin-plan-commissionable',
    category: 'Product Management',
    question: 'What makes a plan commissionable?',
    answer:
      'A commissionable plan is eligible for GBM income distribution through business volume calculations.',
    keywords: ['commissionable plan', 'business volume', 'bv', 'commission plan', 'income eligible'],
    relatedPrompts: ['How does the commission engine work?', 'Why is a commission missing?'],
  },

  {
    id: 'admin-epin-generate',
    category: 'E-Pin Management',
    question: 'How do I generate E-Pins?',
    answer:
      'Generate E-Pins by selecting the plan, quantity, and optional member assignment.',
    keywords: ['generate epin', 'create pin', 'issue pin', 'bulk pin generation', 'activation codes'],
    relatedPrompts: ['How do I assign pins to a member?', 'How do I track used E-Pins?'],
  },

  {
    id: 'admin-epin-assign',
    category: 'E-Pin Management',
    question: 'How do I assign pins to a member?',
    answer:
      'Assign or transfer E-Pins carefully using the correct target member and plan value.',
    keywords: ['assign pin', 'pin owner', 'transfer pin', 'allocate epin', 'member pin'],
    relatedPrompts: ['How do I generate E-Pins?', 'How do I track used E-Pins?'],
  },

  {
    id: 'admin-epin-track-used',
    category: 'E-Pin Management',
    question: 'How do I track used E-Pins?',
    answer:
      'Track used E-Pins using status, owner, used-by member, and transfer history.',
    keywords: ['used epin', 'pin status', 'track pin', 'used pins', 'pin history'],
    relatedPrompts: ['How do I assign pins to a member?', 'Why did a registration pin fail?'],
  },

  {
    id: 'admin-epin-failed-registration',
    category: 'Troubleshooting',
    question: 'Why did a registration or activation pin fail?',
    answer:
      'Pins fail because they are already used, blocked, mismatched, or assigned incorrectly.',
    keywords: ['pin failed', 'epin invalid', 'activation failed', 'pin error', 'registration code issue'],
    relatedPrompts: ['How do I track used E-Pins?', 'How do I assign pins to a member?'],
  },
];