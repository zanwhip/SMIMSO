import { Response } from 'express';
import { ImagineService } from '../services/imagine.service';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';

const imagineService = new ImagineService();

export class ImagineController {
  // Text to Image
  async textToImage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      console.log('📥 Text to Image request received:', {
        body: req.body,
        user: req.user?.id,
      });

      const { prompt, style, aspect_ratio, seed } = req.body;

      if (!prompt) {
        return errorResponse(res, 'Prompt is required', 400);
      }

      console.log('🔄 Calling imagine service...');
      const result = await imagineService.textToImage({
        prompt,
        style,
        aspect_ratio,
        seed,
      });

      console.log('✅ Service returned result:', result);
      return successResponse(res, result, 'Image generated successfully');
    } catch (error: any) {
      console.error('❌ Text to Image error:', {
        message: error.message,
        stack: error.stack,
      });
      return errorResponse(res, error.message || 'Failed to generate image', 500);
    }
  }

  // Text to Video
  async textToVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      console.log('📥 Text to Video request received:', {
        body: req.body,
        user: req.user?.id,
      });

      const { prompt, style } = req.body;

      if (!prompt) {
        return errorResponse(res, 'Prompt is required', 400);
      }

      console.log('🔄 Calling imagine service...');
      const result = await imagineService.textToVideo({
        prompt,
        style,
      });

      console.log('✅ Service returned result:', result);
      return successResponse(res, result, 'Video generated successfully');
    } catch (error: any) {
      console.error('❌ Text to Video error:', {
        message: error.message,
        stack: error.stack,
      });
      return errorResponse(res, error.message || 'Failed to generate video', 500);
    }
  }

  // Image to Video
  async imageToVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      console.log('📥 Image to Video request received:', {
        body: req.body,
        file: req.file ? {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
        } : null,
        user: req.user?.id,
      });

      const { prompt, style } = req.body;
      const file = req.file;

      if (!prompt) {
        return errorResponse(res, 'Prompt is required', 400);
      }

      if (!file) {
        return errorResponse(res, 'Image file is required', 400);
      }

      console.log('🔄 Calling imagine service...');
      const result = await imagineService.imageToVideo({
        prompt,
        style,
        imagePath: file.path,
      });

      console.log('✅ Service returned result:', result);
      return successResponse(res, result, 'Video generated successfully');
    } catch (error: any) {
      console.error('❌ Image to Video error:', {
        message: error.message,
        stack: error.stack,
      });
      return errorResponse(res, error.message || 'Failed to generate video', 500);
    }
  }
}


