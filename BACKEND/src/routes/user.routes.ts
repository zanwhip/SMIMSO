import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadAvatar, uploadCover } from '../middleware/upload.middleware';

const router = Router();
const userController = new UserController();

router.get('/top-creators', (req, res) => userController.getTopCreators(req, res));
router.get('/most-favorite', (req, res) => userController.getMostFavorite(req, res));
router.get('/most-viewed', (req, res) => userController.getMostViewed(req, res));
router.get('/most-active', (req, res) => userController.getMostActive(req, res));

router.use(authMiddleware);

router.get('/search', (req, res) => userController.searchUsers(req, res));

router.get('/profile', (req, res) => userController.getCurrentUserProfile(req, res));
router.put('/profile', (req, res) => userController.updateUserProfile(req, res));
router.get('/profile/posts', (req, res) => userController.getCurrentUserPosts(req, res));
router.post('/profile/avatar', uploadAvatar, (req, res) => userController.uploadAvatar(req, res));
router.post('/profile/cover', uploadCover, (req, res) => userController.uploadCover(req, res));
router.get('/activities', (req, res) => userController.getUserActivities(req, res));
router.get('/liked-posts', (req, res) => userController.getLikedPosts(req, res));
router.get('/related-users', (req, res) => userController.getRelatedUsers(req, res));
router.get('/:userId', (req, res) => userController.getUserProfile(req, res));
router.get('/:userId/posts', (req, res) => userController.getUserPosts(req, res));
router.post('/:userId/follow', (req, res) => userController.followUser(req, res));
router.delete('/:userId/follow', (req, res) => userController.unfollowUser(req, res));
router.get('/:userId/followers', (req, res) => userController.getFollowers(req, res));
router.get('/:userId/following', (req, res) => userController.getFollowing(req, res));

export default router;

