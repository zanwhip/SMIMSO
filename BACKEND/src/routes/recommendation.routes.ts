import { Router } from 'express';
import { RecommendationController } from '../controllers/recommendation.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const recommendationController = new RecommendationController();

// All routes require authentication
router.use(authMiddleware);

router.get('/similar-users', (req, res) =>
  recommendationController.getSimilarUsers(req, res)
);

export default router;

