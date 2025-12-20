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

  async styleTransfer(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { prompt, guidance_scale, negative_prompt, num_inference_steps, target_size } = req.body;
      const file = req.file;

      if (!file) {
        return errorResponse(res, 'Image file is required', 400);
      }

      let parsedTargetSize = undefined;
      if (target_size) {
        try {
          parsedTargetSize = typeof target_size === 'string' ? JSON.parse(target_size) : target_size;
        } catch (e) {
          // If parsing fails, ignore target_size
        }
      }

      const result = await imagineService.styleTransfer({
        imagePath: file.path,
        prompt,
        guidance_scale: guidance_scale ? parseFloat(guidance_scale) : undefined,
        negative_prompt,
        num_inference_steps: num_inference_steps ? parseInt(num_inference_steps) : undefined,
        target_size: parsedTargetSize,
      });

      return successResponse(res, result, 'Style transferred successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to transfer style', 500);
    }
  }

  async colorizeImage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { prompt, guidance_scale, negative_prompt, num_inference_steps, target_size } = req.body;
      const file = req.file;

      if (!file) {
        return errorResponse(res, 'Image file is required', 400);
      }

      let parsedTargetSize = undefined;
      if (target_size) {
        try {
          parsedTargetSize = typeof target_size === 'string' ? JSON.parse(target_size) : target_size;
        } catch (e) {
          // If parsing fails, ignore target_size
        }
      }

      const result = await imagineService.colorizeImage({
        imagePath: file.path,
        prompt,
        guidance_scale: guidance_scale ? parseFloat(guidance_scale) : undefined,
        negative_prompt,
        num_inference_steps: num_inference_steps ? parseInt(num_inference_steps) : undefined,
        target_size: parsedTargetSize,
      });

      return successResponse(res, result, 'Image colorized successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to colorize image', 500);
    }
  }

  async upscaleImage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { prompt, guidance_scale, negative_prompt, num_inference_steps, target_size } = req.body;
      const file = req.file;

      if (!file) {
        return errorResponse(res, 'Image file is required', 400);
      }

      let parsedTargetSize = undefined;
      if (target_size) {
        try {
          parsedTargetSize = typeof target_size === 'string' ? JSON.parse(target_size) : target_size;
        } catch (e) {
          // If parsing fails, ignore target_size
        }
      }

      const result = await imagineService.upscaleImage({
        imagePath: file.path,
        prompt,
        guidance_scale: guidance_scale ? parseFloat(guidance_scale) : undefined,
        negative_prompt,
        num_inference_steps: num_inference_steps ? parseInt(num_inference_steps) : undefined,
        target_size: parsedTargetSize,
      });

      return successResponse(res, result, 'Image upscaled successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to upscale image', 500);
    }
  }
}
