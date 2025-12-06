import { Request, Response } from 'express';
import { OptionsService } from '../services/options.service';
import { successResponse, errorResponse } from '../utils/response';

const optionsService = new OptionsService();

export class OptionsController {
  async getFormOptions(req: Request, res: Response): Promise<Response> {
    try {
      const options = await optionsService.getFormOptions();
      return successResponse(res, options, 'Options retrieved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  async getJobOptions(req: Request, res: Response): Promise<Response> {
    try {
      const jobs = await optionsService.getJobOptions();
      return successResponse(res, jobs, 'Job options retrieved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  async getCategories(req: Request, res: Response): Promise<Response> {
    try {
      const categories = await optionsService.getCategories();
      return successResponse(res, categories, 'Categories retrieved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}

