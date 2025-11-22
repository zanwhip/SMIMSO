import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Special auth middleware for SSE that accepts token from query param
export const sseAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Try to get token from query param (for SSE)
    let token = req.query.token as string;

    // Fallback to Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
    req.user = decoded;
    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
};

