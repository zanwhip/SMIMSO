import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import routes from './routes';
import { initializeSocket } from './socket/socket';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  }

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', routes);

app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to SMIMSO API - Smart Image & Idea Social Network',
    version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
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

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

initializeSocket(httpServer);
httpServer.listen(PORT);

export default app;

