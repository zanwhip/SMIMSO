import { Router } from 'express';
import authRoutes from './auth.routes';
import surveyRoutes from './survey.routes';
import postRoutes from './post.routes';
import userRoutes from './user.routes';
import optionsRoutes from './options.routes';
import recommendationRoutes from './recommendation.routes';
import notificationRoutes from './notification.routes';
import chatRoutes from './chat.routes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/survey', surveyRoutes);
router.use('/posts', postRoutes);
router.use('/users', userRoutes);
router.use('/options', optionsRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/chat', chatRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SMIMSO API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;

