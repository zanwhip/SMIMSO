import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import surveyRoutes from './survey.routes';
import postRoutes from './post.routes';
import userRoutes from './user.routes';
import optionsRoutes from './options.routes';
import recommendationRoutes from './recommendation.routes';
import notificationRoutes from './notification.routes';
import chatRoutes from './chat.routes';
import imagineRoutes from './imagine.routes';
import searchRoutes from './search.routes';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SMIMSO API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

router.use('/survey', surveyRoutes);
router.use('/posts', postRoutes);
router.use('/users', userRoutes);
router.use('/options', optionsRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/chat', chatRoutes);
router.use('/imagine', imagineRoutes);
router.use('/search', searchRoutes);

export default router;

