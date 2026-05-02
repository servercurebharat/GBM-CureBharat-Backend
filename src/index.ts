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
import epinRoutes from './routes/epin.routes';
import planRoutes from './routes/plan.routes';
import adminRoutes from './routes/admin.routes';

// Logic & Cron
import { scheduleActivityCheck } from './lib/activityCheck';
import { schedulePayoutCycle } from './lib/payoutCycle';

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
app.use('/api/epins', epinRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/admin', adminRoutes);

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
        scheduleActivityCheck();
        schedulePayoutCycle();
        console.log('[Server] Scheduled maintenance tasks initialized');
      });
    }
  } catch (error) {
    console.error('[Server] Failed to start:', error);
  }
};

startServer();

export default app;
