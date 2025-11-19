import { Router } from 'express';
import { SurveyController } from '../controllers/survey.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const surveyController = new SurveyController();

// All routes require authentication
router.use(authMiddleware);

router.post('/', (req, res) => surveyController.submitSurvey(req, res));
router.get('/', (req, res) => surveyController.getUserSurvey(req, res));
router.get('/status', (req, res) => surveyController.checkSurveyStatus(req, res));
router.get('/options', (req, res) => surveyController.getSurveyOptions(req, res));

export default router;

