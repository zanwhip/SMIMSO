import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api', routes);

// Root route
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
      health: '/api/health',
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

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

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 SMIMSO API Server                                    ║
║   Smart Image & Idea Social Network                      ║
║                                                           ║
║   Server running on: http://localhost:${PORT}              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║                                                           ║
║   API Endpoints:                                          ║
║   - Auth:    http://localhost:${PORT}/api/auth             ║
║   - Survey:  http://localhost:${PORT}/api/survey           ║
║   - Posts:   http://localhost:${PORT}/api/posts            ║
║   - Users:   http://localhost:${PORT}/api/users            ║
║   - Options: http://localhost:${PORT}/api/options          ║
║   - Health:  http://localhost:${PORT}/api/health           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;

