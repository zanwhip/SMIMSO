import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import routes from './routes';
import { initializeSocket } from './socket/socket';
import { storageService } from './services/storage.service';
import { logger } from './utils/logger';
import { validateEnv, getEnvConfig } from './utils/env-validator';

dotenv.config();

try {
  validateEnv();
} catch (error) {
  logger.error('Failed to validate environment variables', error);
  process.exit(1);
}

const envConfig = getEnvConfig();

storageService.ensureBucket().catch((error) => {
  logger.warn('Failed to ensure storage bucket exists', error);
  logger.info('Note: Bucket should be created manually in Supabase dashboard if it does not exist');
});

const app: Application = express();
const PORT = parseInt(envConfig.PORT, 10);

const httpServer = createServer(app);

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
  fs.mkdirSync(uploadsDir, { recursive: true });
    logger.info('Created uploads directory');
  } catch (error) {
    logger.error('Failed to create uploads directory', error);
  }
  }

// Helper function to set CORS headers
const setCorsHeaders = (req: Request, res: Response) => {
  const origin = req.headers.origin;
  
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    logger.info(`CORS: Setting headers for origin: ${origin}`);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
};

// CORS Middleware - Handle ALL CORS requests manually for maximum control
// This MUST be the first middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Set CORS headers for all requests
  setCorsHeaders(req, res);
  
  // Handle preflight OPTIONS requests immediately - BEFORE any other processing
  if (req.method === 'OPTIONS') {
    logger.info(`CORS Preflight: ${req.method} ${req.path} from ${req.headers.origin || 'no origin'}`);
    return res.status(204).end();
  }
  
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

import authRoutes from './routes/auth.routes';
app.use('/auth', authRoutes);

app.use('/api', routes);

app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to SMIMSO API - Smart Image & Idea Social Network',
    version: '1.0.0',
      endpoints: {
        auth: '/auth',
        survey: '/api/survey',
        posts: '/api/posts',
        users: '/api/users',
        options: '/api/options',
        recommendations: '/api/recommendations',
        notifications: '/api/notifications',
        chat: '/api/chat',
        imagine: '/api/imagine',
        search: '/api/search',
        health: '/api/health',
      },
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Set CORS headers even for error responses
  setCorsHeaders(req, res);
  
  logger.error('Unhandled error in request', err, {
    path: req.path,
    method: req.method,
  });

  if (err.message.includes('File too large')) {
    return res.status(413).json({
      success: false,
      error: 'File size exceeds the maximum limit',
    });
  }

  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  const statusCode = (err as any).statusCode || 500;
  const isDevelopment = envConfig.NODE_ENV !== 'production';
  
  res.status(statusCode).json({
    success: false,
    error: 'Internal server error',
    message: isDevelopment ? err.message : undefined,
    ...(isDevelopment && { stack: err.stack }),
  });
});

app.use((req: Request, res: Response) => {
  // Set CORS headers for 404 responses
  setCorsHeaders(req, res);
  
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

initializeSocket(httpServer);

httpServer.listen(PORT, () => {
  logger.info(`🚀 SMIMSO Backend Server is running`);
  logger.info(`📍 Port: ${PORT}`);
  logger.info(`🌍 Environment: ${envConfig.NODE_ENV || 'development'}`);
  logger.info(`🔗 API Base URL: http://localhost:${PORT}`);
  logger.info(`📋 Health Check: http://localhost:${PORT}/api/health`);
});

httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;

