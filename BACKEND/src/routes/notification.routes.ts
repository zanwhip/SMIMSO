import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { sseAuthMiddleware } from '../middleware/sseAuth.middleware';

const router = Router();
const notificationController = new NotificationController();

// SSE stream uses special auth middleware that accepts token from query param
router.get('/stream', sseAuthMiddleware, (req, res) => notificationController.streamNotifications(req, res));

// Other routes use normal auth middleware
router.get('/', authMiddleware, (req, res) => notificationController.getNotifications(req, res));
router.get('/unread-count', authMiddleware, (req, res) => notificationController.getUnreadCount(req, res));
router.put('/:id/read', authMiddleware, (req, res) => notificationController.markAsRead(req, res));
router.put('/read-all', authMiddleware, (req, res) => notificationController.markAllAsRead(req, res));

export default router;

