import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadAvatar, uploadCover } from '../middleware/upload.middleware';

const router = Router();
const userController = new UserController();

// Protected routes
router.use(authMiddleware);

router.get('/profile', (req, res) => userController.getCurrentUserProfile(req, res));
router.put('/profile', (req, res) => userController.updateUserProfile(req, res));
router.post('/profile/avatar', uploadAvatar, (req, res) => userController.uploadAvatar(req, res));
router.post('/profile/cover', uploadCover, (req, res) => userController.uploadCover(req, res));
router.get('/activities', (req, res) => userController.getUserActivities(req, res));
router.get('/liked-posts', (req, res) => userController.getLikedPosts(req, res));
router.get('/:userId', (req, res) => userController.getUserProfile(req, res));
router.get('/:userId/posts', (req, res) => userController.getUserPosts(req, res));

export default router;

