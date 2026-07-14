"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = require("./lib/db");
const validateEnv_1 = require("./config/validateEnv");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const sale_routes_1 = __importDefault(require("./routes/sale.routes"));
const wallet_routes_1 = __importDefault(require("./routes/wallet.routes"));
// E-Pin routes removed
const plan_routes_1 = __importDefault(require("./routes/plan.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const team_routes_1 = __importDefault(require("./routes/team.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const public_routes_1 = __importDefault(require("./routes/public.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const activity_routes_1 = __importDefault(require("./routes/activity.routes"));
const chatbot_routes_1 = __importDefault(require("./chatbot/routes/chatbot.routes"));
const complaint_routes_1 = __importDefault(require("./routes/complaint.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const subscription_routes_1 = __importDefault(require("./routes/subscription.routes"));
// Logic & Cron
const payoutCycle_1 = require("./lib/payoutCycle");
// Critical: Validate environment before proceeding
(0, validateEnv_1.validateEnv)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Manual CORS middleware for Vercel robustness
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
    // Instantly handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use(express_1.default.json({
    limit: '50mb',
    verify: (req, res, buf) => { req.rawBody = buf.toString(); }
}));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use((0, cookie_parser_1.default)());
// Request/Response Logging Middleware
app.use((req, res, next) => {
    const start = Date.now();
    const { method, url } = req;
    // Log request
    console.log(`\n[API Request] ${method} ${url}`);
    if (Object.keys(req.body).length > 0) {
        const safeBody = { ...req.body };
        if (safeBody.otp)
            safeBody.otp = '******'; // Hide OTP
        if (safeBody.password)
            safeBody.password = '******'; // Hide Password
        console.log(`  Body:`, JSON.stringify(safeBody, null, 2));
    }
    // Intercept response to log it
    const oldJson = res.json;
    res.json = function (data) {
        const duration = Date.now() - start;
        console.log(`[API Response] ${method} ${url} - Status: ${res.statusCode} (${duration}ms)`);
        // console.log(`  Data:`, JSON.stringify(data, null, 2)); // Uncomment for full data logs
        return oldJson.call(this, data);
    };
    next();
});
// Database Connection Check Middleware
const dbCheck = async (req, res, next) => {
    try {
        await (0, db_1.connectDB)();
        next();
    }
    catch (error) {
        res.status(503).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
};
app.use('/api', dbCheck);
// Root Welcome Route
app.get('/', (req, res) => {
    res.send(`
    <div style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0d0f14; color: white;">
      <h1 style="color: #3b82f6;">🚀 CureBharat API is Live</h1>
      <p style="opacity: 0.6;">Backend Engine Status: Operational</p>
      <div style="margin-top: 20px; padding: 10px 20px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px border-white/10;">
        <code style="color: #60a5fa;">v1.0.0-production</code>
      </div>
    </div>
  `);
});
// Route Handlers
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/sales', sale_routes_1.default);
app.use('/api/wallet', wallet_routes_1.default);
// E-Pin routes removed
app.use('/api/plans', plan_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/team', team_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/public', public_routes_1.default); // No auth — public Razorpay payment routes
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/activity', activity_routes_1.default);
app.use('/api/chatbot', chatbot_routes_1.default);
app.use('/api/complaints', complaint_routes_1.default);
app.use('/api/payment', payment_routes_1.default); // Cashfree one-time payment
app.use('/api/subscriptions', subscription_routes_1.default); // Cashfree AutoPay / Subscriptions
// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime()
    });
});
// Start Server
const startServer = async () => {
    try {
        await (0, db_1.connectDB)();
        if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
            app.listen(PORT, () => {
                console.log(`[Server] CureBharat MLM Backend running on port ${PORT}`);
                // Initialize Cron Jobs
                (0, payoutCycle_1.scheduleMaintenanceCrons)();
                console.log('[Server] Scheduled maintenance tasks initialized');
            });
        }
    }
    catch (error) {
        console.error('[Server] Failed to start:', error);
    }
};
startServer();
exports.default = app;
