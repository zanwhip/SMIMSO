import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/google-login', (req, res) => authController.googleLogin(req, res));

// Protected routes
router.get('/me', authMiddleware, (req, res) => authController.getCurrentUser(req, res));

export default router;

