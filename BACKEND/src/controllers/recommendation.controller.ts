import { Response } from 'express';
import { RecommendationService } from '../services/recommendation.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';

const recommendationService = new RecommendationService();

export class RecommendationController {
  // Get similar users
  async getSimilarUsers(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const similarUsers = await recommendationService.findSimilarUsers(
        req.user.id,
        limit
      );

      return successResponse(res, similarUsers);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }
}

