import { Response } from 'express';
import { ImagineService } from '../services/imagine.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';

const imagineService = new ImagineService();

export class ImagineController {
  async textToImage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { prompt, style, aspect_ratio, seed } = req.body;

      if (!prompt) {
        return errorResponse(res, 'Prompt is required', 400);
      }

      const result = await imagineService.textToImage({
        prompt,
        style,
        aspect_ratio,
        seed,
      });

      return successResponse(res, result, 'Image generated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to generate image', 500);
    }
  }

  async textToVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { prompt, style } = req.body;

      if (!prompt) {
        return errorResponse(res, 'Prompt is required', 400);
      }

      const result = await imagineService.textToVideo({
        prompt,
        style,
      });

      return successResponse(res, result, 'Video generated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to generate video', 500);
    }
  }

  async imageToVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { prompt, style } = req.body;
      const file = req.file;

      if (!prompt) {
        return errorResponse(res, 'Prompt is required', 400);
      }

      if (!file) {
        return errorResponse(res, 'Image file is required', 400);
      }

      const result = await imagineService.imageToVideo({
        prompt,
        style,
        imagePath: file.path,
      });

      return successResponse(res, result, 'Video generated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to generate video', 500);
    }
  }
}
