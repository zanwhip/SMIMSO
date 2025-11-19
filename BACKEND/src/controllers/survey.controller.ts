import { Response } from 'express';
import { SurveyService } from '../services/survey.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest, SurveyDTO } from '../types';

const surveyService = new SurveyService();

export class SurveyController {
  // Submit survey
  async submitSurvey(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const data: SurveyDTO = req.body;
      const survey = await surveyService.submitSurvey(req.user.id, data);

      return successResponse(res, survey, 'Survey submitted successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Get user survey
  async getUserSurvey(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const survey = await surveyService.getUserSurvey(req.user.id);

      if (!survey) {
        return successResponse(res, null, 'No survey found');
      }

      return successResponse(res, survey);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Check if user has completed survey
  async checkSurveyStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const hasCompleted = await surveyService.hasCompletedSurvey(req.user.id);

      return successResponse(res, { hasCompleted });
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Get survey options
  async getSurveyOptions(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const options = await surveyService.getSurveyOptions();
      return successResponse(res, options);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }
}

