import { Router } from 'express';
import { OptionsController } from '../controllers/options.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const optionsController = new OptionsController();

router.get('/', authMiddleware, optionsController.getFormOptions.bind(optionsController));
router.get('/jobs', authMiddleware, optionsController.getJobOptions.bind(optionsController));
router.get('/categories', authMiddleware, optionsController.getCategories.bind(optionsController));

export default router;

