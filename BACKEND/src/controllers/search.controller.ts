import { Response } from 'express';
import { SearchService } from '../services/search.service';
import { AIService } from '../services/ai.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import { uploadSingle } from '../middleware/upload.middleware';

const searchService = new SearchService();
const aiService = new AIService();

export class SearchController {
  async searchByImage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const file = req.file;

      if (!file) {
        return errorResponse(res, 'Image file is required', 400);
      }

      const limit = parseInt(req.query.limit as string) || 20;
      // Lower default threshold for better recall, especially for people search
      const minSimilarity = parseFloat(req.query.minSimilarity as string) || 0.25;

      const fs = require('fs');
      if (!fs.existsSync(file.path)) {
        return errorResponse(res, 'Uploaded file not found', 400);
      }

      const results = await searchService.searchByImage(
        file.path,
        limit,
        minSimilarity
      );

      let generatedCaption = '';
      try {
        const captionResult = await aiService.generateCaptionWithClip(file.path);
        generatedCaption = captionResult.caption || '';
      } catch (error: any) {
        }

      return successResponse(
        res,
        {
          results,
          count: results.length,
          query_type: 'image',
          generated_caption: generatedCaption,
        },
        'Image search completed successfully'
      );
    } catch (error: any) {
      return errorResponse(res, error.message || 'Image search failed', 500);
    }
  }

  async searchByText(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { query } = req.body;

      if (!query || typeof query !== 'string' || query.trim() === '') {
        return errorResponse(res, 'Search query is required', 400);
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const minSimilarity = parseFloat(req.query.minSimilarity as string) || 0.3;

      const results = await searchService.searchByText(
        query.trim(),
        limit,
        minSimilarity
      );

      return successResponse(
        res,
        {
          results,
          count: results.length,
          query_type: 'text',
          query: query.trim(),
        },
        'Text search completed successfully'
      );
    } catch (error: any) {
      return errorResponse(res, error.message || 'Text search failed', 500);
    }
  }
}

