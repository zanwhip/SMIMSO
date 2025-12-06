import { Router } from 'express';
import { OptionsController } from '../controllers/options.controller';

const router = Router();
const optionsController = new OptionsController();

router.get('/', optionsController.getFormOptions.bind(optionsController));

router.get('/jobs', optionsController.getJobOptions.bind(optionsController));

router.get('/categories', optionsController.getCategories.bind(optionsController));

export default router;

