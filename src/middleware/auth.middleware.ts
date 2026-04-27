import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export const authMiddleware = async (req: any, res: Response, next: NextFunction) => {
  try {
    // 1. Get token from cookies or Authorization header
    let token = req.cookies?.auth_token;

    if (!token && req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // 2. Verify Token
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    // 3. Fetch User
    const user: any = await User.findById(decoded.userId).select('-password').lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Your account is blocked' });
    }

    // 4. Attach user to request
    req.user = user;
    next();
  } catch (error: any) {
    console.error('[Middleware] Auth Error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
