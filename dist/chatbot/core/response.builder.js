"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildResponse = void 0;
const faq_1 = require("../faq");
const wallet_query_1 = require("../database/wallet.query");
const users_query_1 = require("../database/users.query");
const sales_query_1 = require("../database/sales.query");
const epins_query_1 = require("../database/epins.query");
const fallback_engine_1 = require("../utils/fallback.engine");
const buildResponse = async (intent, message, user, confidenceScore) => {
    const role = user.role || 'hcc';
    const userId = user._id.toString();
    // FAQ MATCHING BEFORE FALLBACK
    const faqs = (0, faq_1.getFAQByRole)(role);
    const lowerMessage = message.toLowerCase().trim();
    let bestFaq = null;
    let highestScore = 0;
    for (const faq of faqs) {
        let score = 0;
        const faqQuestion = faq.question.toLowerCase();
        // EXACT QUESTION MATCH
        if (faqQuestion === lowerMessage) {
            score += 100;
        }
        // PARTIAL QUESTION MATCH
        else if (faqQuestion.includes(lowerMessage) ||
            lowerMessage.includes(faqQuestion)) {
            score += 40;
        }
        // KEYWORD MATCHING
        for (const keyword of faq.keywords) {
            const lowerKeyword = keyword.toLowerCase();
            if (lowerMessage.includes(lowerKeyword)) {
                score += 15;
            }
        }
        // CATEGORY BOOST
        if (lowerMessage.includes(faq.category.toLowerCase())) {
            score += 10;
        }
        // TRACK BEST FAQ
        if (score > highestScore) {
            highestScore = score;
            bestFaq = faq;
        }
    }
    // DYNAMIC INTENTS SHOULD TAKE PRIORITY OVER FAQS
    const dynamicIntents = [
        'wallet_balance',
        'wallet_history',
        'wallet_tds',
        'sales_count',
        'sales_latest',
        'rank_status',
        'promotion_status',
        'team_growth',
        'kyc_status',
        'epin_status',
        'commission_status',
        'genealogy_status',
        'payout_status'
    ];
    const isDynamicIntent = dynamicIntents.includes(intent) &&
        confidenceScore >= 0.6;
    // ONLY USE FAQ IF NO STRONG DYNAMIC INTENT EXISTS
    if (!isDynamicIntent && bestFaq && highestScore >= 15) {
        return {
            success: true,
            intent: 'faq_help',
            type: 'static',
            answer: bestFaq.answer,
            data: null,
            suggestions: bestFaq.relatedPrompts || [],
            confidenceScore: 0.98
        };
    }
    let type = 'static';
    let answer = "I'm not sure how to answer that yet.";
    let data = null;
    let suggestions = ['What is my wallet balance?', 'What is my KYC status?'];
    try {
        switch (intent) {
            case 'greeting': {
                type = 'static';
                answer = `Hello! I am your CureBharat Assistant. How can I help you today? Feel free to ask about your wallet balance, team network growth, latest sales, or KYC status!`;
                suggestions = ['What is my wallet balance?', 'What is my KYC status?', 'What is my current rank?'];
                break;
            }
            case 'wallet_balance': {
                type = 'dynamic';
                const balanceData = await (0, wallet_query_1.getWalletBalance)(userId);
                answer = `Your final balance is ₹${balanceData.finalBalance} and provisional balance is ₹${balanceData.provisionalBalance}. You have earned a total of ₹${balanceData.totalEarned} so far.`;
                data = balanceData;
                suggestions = ['Show my latest transactions', 'Why is payout delayed?'];
                break;
            }
            case 'wallet_history': {
                type = 'dynamic';
                const history = await (0, wallet_query_1.getWalletHistory)(userId);
                answer = history.length > 0
                    ? `Here are your latest transactions. You have ${history.length} recent entries.`
                    : 'You do not have any recent transactions in your ledger.';
                data = history;
                suggestions = ['What is my wallet balance?', 'Commission status'];
                break;
            }
            case 'wallet_tds': {
                type = 'static';
                answer = 'TDS (Tax Deducted at Source) is automatically deducted from your final payouts as per government regulations. You can view the deducted amount in your transaction ledger.';
                suggestions = ['Show my latest transactions', 'Finance Hub Help'];
                break;
            }
            case 'kyc_status': {
                type = 'dynamic';
                const kycStatus = await (0, users_query_1.getKYCStatus)(userId);
                answer = `Your current KYC status is: ${kycStatus.toUpperCase()}.`;
                suggestions = ['Upload documents', 'What is my wallet balance?'];
                break;
            }
            case 'rank_status': {
                type = 'dynamic';
                const rank = await (0, users_query_1.getUserRank)(userId);
                answer = `Your current leadership rank is: ${rank.toUpperCase()}.`;
                suggestions = ['Promotion status', 'Team growth'];
                break;
            }
            case 'promotion_status': {
                type = 'hybrid';
                const rank = await (0, users_query_1.getUserRank)(userId);
                answer = `Your current rank is ${rank.toUpperCase()}. To achieve your next promotion, check the Rank & Promotion widget on your dashboard to see your required volume targets.`;
                suggestions = ['My sales', 'Team growth'];
                break;
            }
            case 'team_growth': {
                type = 'dynamic';
                const teamMembers = await (0, users_query_1.getTeamMembers)(user);
                if (teamMembers.length === 0) {
                    answer =
                        'No active team members were found under your network currently.';
                }
                else {
                    // GROUP MEMBERS BY ROLE
                    const grouped = {};
                    teamMembers.forEach((member) => {
                        const role = member.role?.toUpperCase() || 'UNKNOWN';
                        if (!grouped[role]) {
                            grouped[role] = [];
                        }
                        grouped[role].push(member);
                    });
                    let formattedAnswer = `📊 TEAM NETWORK OVERVIEW\n\n` +
                        `👥 Total Active Members: ${teamMembers.length}\n\n`;
                    Object.keys(grouped).forEach((role) => {
                        formattedAnswer += `━━━━━━━━━━━━━━\n`;
                        formattedAnswer += `🏷️ ${role} MEMBERS\n`;
                        formattedAnswer += `━━━━━━━━━━━━━━\n`;
                        grouped[role].forEach((member, index) => {
                            formattedAnswer +=
                                `${index + 1}. ${member.name}\n` +
                                    `   Rank : ${member.rank}\n` +
                                    `   State : ${member.state}\n` +
                                    `   Member ID : ${member.memberId}\n\n`;
                        });
                    });
                    answer = formattedAnswer;
                }
                data = teamMembers;
                suggestions = [
                    'Show my latest sales',
                    'What is my wallet balance?',
                    'What is my rank?'
                ];
                break;
            }
            case 'genealogy_status': {
                type = 'dynamic';
                const sponsor = await (0, users_query_1.getSponsor)(userId);
                if (sponsor) {
                    answer = `Your sponsor is ${sponsor.name} (Rank: ${sponsor.rank}).`;
                }
                else {
                    answer = `You do not have a sponsor assigned or you are a root node.`;
                }
                suggestions = ['Team growth', 'Dashboard help'];
                break;
            }
            case 'sales_count': {
                type = 'dynamic';
                const count = await (0, sales_query_1.getSalesCount)(userId, role);
                answer = `You have generated ${count} total sales in your downline scope.`;
                suggestions = ['Show latest sale', 'Commission status'];
                break;
            }
            case 'sales_latest': {
                type = 'dynamic';
                const sale = await (0, sales_query_1.getLatestSale)(userId, role);
                if (sale) {
                    answer = `Your latest sale was for policy ID ${sale.policyId} with an amount of ₹${sale.saleAmount}.`;
                    data = sale;
                }
                else {
                    answer = `You do not have any recent sales recorded.`;
                }
                suggestions = ['How many sales do I have?', 'Commission status'];
                break;
            }
            case 'epin_status': {
                type = 'dynamic';
                const counts = await (0, epins_query_1.getEPinCount)(userId);
                answer = `You currently have ${counts.activeCount} active E-Pins and ${counts.usedCount} used E-Pins.`;
                suggestions = ['Request new E-Pins', 'Wallet balance'];
                break;
            }
            case 'commission_status': {
                type = 'hybrid';
                answer = 'Commissions from sales are credited provisionally. Once the locking period clears, they move to your final balance as override income or direct sales income.';
                suggestions = ['Wallet balance', 'Payout status'];
                break;
            }
            case 'payout_status': {
                type = 'hybrid';
                answer = 'Payouts are processed automatically in cycles. If your payout is delayed, please ensure your KYC is approved and the locking period has ended.';
                suggestions = ['Wallet history', 'KYC status'];
                break;
            }
            case 'dashboard_help':
            case 'faq_help': {
                type = 'static';
                const faqs = (0, faq_1.getFAQByRole)(role);
                const matchedFaq = faqs.find(f => f.keywords.some(kw => message.toLowerCase().includes(kw.toLowerCase())));
                if (matchedFaq) {
                    answer = matchedFaq.answer;
                    suggestions = matchedFaq.relatedPrompts;
                }
                else if (faqs.length > 0) {
                    answer = 'I can help you with operations. ' + faqs[0].answer;
                    suggestions = faqs[0].relatedPrompts;
                }
                else {
                    answer = "I don't have specific FAQ help for your role yet.";
                }
                break;
            }
            case 'unknown':
            default: {
                return (0, fallback_engine_1.handleFallback)(role);
            }
        }
    }
    catch (error) {
        console.error('[Chatbot Response Builder Error]', error);
        return (0, fallback_engine_1.handleFallback)(role);
    }
    return {
        success: true,
        intent,
        type,
        answer,
        data,
        suggestions,
        confidenceScore
    };
};
exports.buildResponse = buildResponse;
