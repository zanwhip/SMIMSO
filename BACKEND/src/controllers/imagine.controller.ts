import { Request, Response } from 'express';
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

  /**
   * Generate 4o Image using Kie.ai API
   * Creates a new image generation task
   */
  async generate4oImage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        prompt,
        filesUrl,
        size,
        callBackUrl,
        isEnhance,
        uploadCn,
        nVariants,
        enableFallback,
        fallbackModel,
        maskUrl,
        fileUrl,
      } = req.body;

      // Validate required fields
      if (!prompt && !filesUrl && !fileUrl) {
        return errorResponse(res, 'At least one of prompt, filesUrl, or fileUrl must be provided', 400);
      }

      if (!size || !['1:1', '3:2', '2:3'].includes(size)) {
        return errorResponse(res, 'size is required and must be one of: 1:1, 3:2, 2:3', 400);
      }

      const result = await imagineService.generate4oImage({
        prompt,
        filesUrl: Array.isArray(filesUrl) ? filesUrl : filesUrl ? [filesUrl] : undefined,
        size: size as '1:1' | '3:2' | '2:3',
        callBackUrl,
        isEnhance: isEnhance === true || isEnhance === 'true',
        uploadCn: uploadCn === true || uploadCn === 'true',
        nVariants: nVariants ? (nVariants as 1 | 2 | 4) : undefined,
        enableFallback: enableFallback === true || enableFallback === 'true',
        fallbackModel: fallbackModel as 'GPT_IMAGE_1' | 'FLUX_MAX' | undefined,
        maskUrl,
        fileUrl,
      });

      return successResponse(res, result, '4o image generation task created successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to generate 4o image', 500);
    }
  }

  /**
   * Get 4o Image generation task details
   * Query task status and results using taskId
   */
  async get4oImageDetails(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { taskId } = req.query;

      if (!taskId || typeof taskId !== 'string') {
        return errorResponse(res, 'taskId is required as query parameter', 400);
      }

      const result = await imagineService.get4oImageDetails(taskId);

      return successResponse(res, result, 'Task details retrieved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to get 4o image details', 500);
    }
  }

  /**
   * Get direct download URL for generated image
   * Converts image URL to direct download URL (valid for 20 minutes)
   */
  async get4oImageDownloadUrl(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { taskId, url } = req.body;

      if (!taskId) {
        return errorResponse(res, 'taskId is required', 400);
      }

      if (!url) {
        return errorResponse(res, 'url is required', 400);
      }

      const result = await imagineService.get4oImageDownloadUrl(taskId, url);

      return successResponse(res, result, 'Download URL retrieved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message || 'Failed to get download URL', 500);
    }
  }

  /**
   * Handle 4o Image generation callback
   * Receives callback from Kie.ai when image generation completes
   */
  async handle4oImageCallback(req: Request, res: Response): Promise<Response> {
    try {
      const { code, msg, data } = req.body;

      if (code === 200) {
        // Task completed successfully
        const resultUrls = data?.info?.result_urls || [];
        
        // Here you can process the generated images
        // For example: save to database, notify user, etc.
        
        return res.status(200).json({ status: 'received', message: 'Callback processed successfully' });
      } else {
        // Task failed
        
        return res.status(200).json({ status: 'received', message: 'Callback processed (failed task)' });
      }
    } catch (error: any) {
      // Still return 200 to acknowledge receipt
      return res.status(200).json({ status: 'received', error: error.message });
    }
  }
}
