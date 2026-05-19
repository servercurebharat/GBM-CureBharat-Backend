import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './lib/db';
import { validateEnv } from './config/validateEnv';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import saleRoutes from './routes/sale.routes';
import walletRoutes from './routes/wallet.routes';
// E-Pin routes removed
import planRoutes from './routes/plan.routes';
import adminRoutes from './routes/admin.routes';
import teamRoutes from './routes/team.routes';
import dashboardRoutes from './routes/dashboard.routes';
import publicRoutes from './routes/public.routes';
import notificationRoutes from './routes/notification.routes';
import activityRoutes from './routes/activity.routes';
import chatbotRoutes from './chatbot/routes/chatbot.routes';
import complaintRoutes from './routes/complaint.routes';

// Logic & Cron
import { scheduleMaintenanceCrons } from './lib/payoutCycle';

// Critical: Validate environment before proceeding
validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// Manual CORS middleware for Vercel robustness
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Request/Response Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const { method, url } = req;
  
  // Log request
  console.log(`\n[API Request] ${method} ${url}`);
  if (Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    if (safeBody.otp) safeBody.otp = '******'; // Hide OTP
    if (safeBody.password) safeBody.password = '******'; // Hide Password
    console.log(`  Body:`, JSON.stringify(safeBody, null, 2));
  }

  // Intercept response to log it
  const oldJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    console.log(`[API Response] ${method} ${url} - Status: ${res.statusCode} (${duration}ms)`);
    // console.log(`  Data:`, JSON.stringify(data, null, 2)); // Uncomment for full data logs
    return oldJson.call(this, data);
  };

  next();
});

// Database Connection Check Middleware
const dbCheck = async (req: any, res: express.Response, next: express.NextFunction) => {
  try {
    await connectDB();
    next();
  } catch (error: any) {
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
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/wallet', walletRoutes);
  // E-Pin routes removed
app.use('/api/plans', planRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicRoutes); // No auth — public Razorpay payment routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/complaints', complaintRoutes);

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
    await connectDB();
    
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`[Server] CureBharat MLM Backend running on port ${PORT}`);
        
        // Initialize Cron Jobs
        scheduleMaintenanceCrons();
        console.log('[Server] Scheduled maintenance tasks initialized');
      });
    }
  } catch (error) {
    console.error('[Server] Failed to start:', error);
  }
};

startServer();

export default app;
