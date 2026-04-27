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

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

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
const start = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`[Server] CureBharat MLM Backend running on port ${PORT}`);
      
      // Initialize Cron Jobs
      scheduleActivityCheck();
      schedulePayoutCycle();
      console.log('[Server] Scheduled maintenance tasks initialized');
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
  }
};

start();
