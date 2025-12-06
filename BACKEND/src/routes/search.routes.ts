import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { authMiddleware, optionalAuth } from '../middleware/auth.middleware';
import { uploadSingle } from '../middleware/upload.middleware';

const router = Router();
const searchController = new SearchController();

router.post(
  '/image',
  optionalAuth, // Optional auth - allow public search
  uploadSingle,
  (req, res) => searchController.searchByImage(req, res)
);

router.post(
  '/text',
  optionalAuth, // Optional auth - allow public search
  (req, res) => searchController.searchByText(req, res)
);

export default router;

