import { Router } from 'express';
import { OptionsController } from '../controllers/options.controller';

const router = Router();
const optionsController = new OptionsController();

// GET /api/options - Get all form options
router.get('/', optionsController.getFormOptions.bind(optionsController));

// GET /api/options/jobs - Get job options
router.get('/jobs', optionsController.getJobOptions.bind(optionsController));

// GET /api/options/categories - Get categories
router.get('/categories', optionsController.getCategories.bind(optionsController));

export default router;

