import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadSingle } from '../middleware/upload.middleware';

const router = Router();
const searchController = new SearchController();

router.post(
  '/image',
  authMiddleware,
  uploadSingle,
  (req, res) => searchController.searchByImage(req, res)
);

router.post(
  '/text',
  authMiddleware,
  (req, res) => searchController.searchByText(req, res)
);

export default router;











