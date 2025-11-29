import { Router } from 'express';
import { PostController } from '../controllers/post.controller';
import { authMiddleware, optionalAuth } from '../middleware/auth.middleware';
import { uploadMultiple, uploadChatFile, uploadSingle } from '../middleware/upload.middleware';

const router = Router();
const postController = new PostController();

// Public routes (with optional auth)
router.get('/', optionalAuth, (req, res) => postController.getPosts(req, res));
router.get('/:id', optionalAuth, (req, res) => postController.getPostById(req, res));
router.get('/user/:userId', optionalAuth, (req, res) => postController.getUserPosts(req, res));

// Protected routes
router.post('/upload', authMiddleware, uploadChatFile, (req, res) => postController.uploadFile(req, res));
router.post('/generate-caption', authMiddleware, uploadSingle, (req, res) => postController.generateCaption(req, res));
router.post('/', authMiddleware, uploadMultiple, (req, res) => postController.createPost(req, res));
router.post('/generate-metadata', authMiddleware, uploadMultiple, (req, res) => postController.generateMetadata(req, res));
router.post('/:postId/like', authMiddleware, (req, res) => postController.likePost(req, res));
router.delete('/:postId/like', authMiddleware, (req, res) => postController.unlikePost(req, res));
router.post('/:postId/comments', authMiddleware, (req, res) => postController.addComment(req, res));
router.get('/:postId/comments', optionalAuth, (req, res) => postController.getComments(req, res));
router.post('/:postId/save', authMiddleware, (req, res) => postController.savePost(req, res));
router.delete('/:postId/save', authMiddleware, (req, res) => postController.unsavePost(req, res));

export default router;

