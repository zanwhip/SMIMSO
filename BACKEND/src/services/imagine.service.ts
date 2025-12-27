import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { HfInference } from '@huggingface/inference';
import { Blob } from 'buffer';

const VYRO_API_BASE = 'https://api.vyro.ai/v2';
const KIE_API_BASE = 'https://api.kie.ai/api/v1';
const getToken = (): string => {
  const token = process.env.IMAGINE_TOKEN || 'vk-G0L8QiCBFuL3XydqNnzB14kDYjkxNDnlD5hbOgVmDAidF';
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

const getKieToken = (): string => {
  const token = process.env.KIE_KEY;
  if (!token) {
    throw new Error('KIE_KEY is not set in environment variables');
  }
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

export interface TextToImageParams {
  prompt: string;
  style?: string;
  aspect_ratio?: string;
  seed?: string;
}

export interface TextToVideoParams {
  prompt: string;
  style?: string;
}

export interface ImageToVideoParams {
  prompt: string;
  style?: string;
  imagePath: string;
}

export interface ImageToImageParams {
  imagePath: string;
  prompt?: string;
  guidance_scale?: number;
  negative_prompt?: string;
  num_inference_steps?: number;
  target_size?: {
    width: number;
    height: number;
  };
}

export interface Kie4oImageGenerateParams {
  prompt?: string;
  filesUrl?: string[];
  size?: '1:1' | '3:2' | '2:3';
  callBackUrl?: string;
  isEnhance?: boolean;
  uploadCn?: boolean;
  nVariants?: 1 | 2 | 4;
  enableFallback?: boolean;
  fallbackModel?: 'GPT_IMAGE_1' | 'FLUX_MAX';
  maskUrl?: string;
  fileUrl?: string; // deprecated
}

export class ImagineService {
  async textToImage(params: TextToImageParams): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('prompt', String(params.prompt));
      formData.append('style', String(params.style || 'realistic'));
      formData.append('aspect_ratio', String(params.aspect_ratio || '1:1'));
      if (params.seed) {
        formData.append('seed', String(params.seed));
      }

      const response = await axios.post(
        `${VYRO_API_BASE}/image/generations`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': getToken(),
          },
          timeout: 120000, // 2 minutes timeout for image generation
          responseType: 'arraybuffer', // Get raw response
        }
      );

      const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
      
      if (contentType.includes('image/')) {
        const imageBuffer = Buffer.from(response.data);
        const base64 = imageBuffer.toString('base64');
        const imageDataUrl = `data:${contentType};base64,${base64}`;
        
        return {
          image: imageDataUrl,
          url: imageDataUrl,
          format: 'base64',
          contentType: contentType,
        };
      }
      
      try {
        const jsonString = Buffer.from(response.data).toString('utf-8');
        const jsonData = JSON.parse(jsonString);
        return jsonData;
      } catch (parseError) {
        const imageBuffer = Buffer.from(response.data);
        const base64 = imageBuffer.toString('base64');
        const imageDataUrl = `data:image/png;base64,${base64}`;
        
        return {
          image: imageDataUrl,
          url: imageDataUrl,
          format: 'base64',
        };
      }
    } catch (error: any) {
      let errorMessage = 'Failed to generate image';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  async textToVideo(params: TextToVideoParams): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('prompt', String(params.prompt));
      formData.append('style', String(params.style || 'kling-1.0-pro'));

      const response = await axios.post(
        `${VYRO_API_BASE}/video/text-to-video`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': getToken(),
          },
          timeout: 300000, // 5 minutes timeout for video generation
        }
      );

      const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
      
      if (contentType.includes('application/json') || (typeof response.data === 'object' && !Buffer.isBuffer(response.data))) {
        const jsonData = response.data;
        
        if (jsonData.url) {
          return {
            video: jsonData.url,
            url: jsonData.url,
            format: 'url',
          };
        }
        
        if (jsonData.video) {
          const videoUrl = typeof jsonData.video === 'string' ? jsonData.video : jsonData.video.url;
          if (videoUrl) {
            return {
              video: videoUrl,
              url: videoUrl,
              format: 'url',
            };
          }
        }
        
        if (jsonData.output) {
          const outputUrl = typeof jsonData.output === 'string' ? jsonData.output : jsonData.output.url;
          if (outputUrl) {
            return {
              video: outputUrl,
              url: outputUrl,
              format: 'url',
            };
          }
        }
        
        if (jsonData.data) {
          const dataUrl = typeof jsonData.data === 'string' ? jsonData.data : jsonData.data.url || jsonData.data.video;
          if (dataUrl) {
            return {
              video: dataUrl,
              url: dataUrl,
              format: 'url',
            };
          }
        }
        
        if (jsonData.task_id || jsonData.id) {
          throw new Error('Video generation is asynchronous. Please use polling or check task status.');
        }
        
        return jsonData;
      }
      
      if (contentType.includes('video/')) {
        const videoBuffer = Buffer.isBuffer(response.data) 
          ? response.data 
          : Buffer.from(response.data);
        const base64 = videoBuffer.toString('base64');
        const videoDataUrl = `data:${contentType};base64,${base64}`;
        
        return {
          video: videoDataUrl,
          url: videoDataUrl,
          format: 'base64',
          contentType: contentType,
        };
      }
      
      if (typeof response.data === 'string') {
        try {
          const jsonData = JSON.parse(response.data);
          
          if (jsonData.url || jsonData.video || jsonData.output) {
            return {
              video: jsonData.url || jsonData.video || jsonData.output,
              url: jsonData.url || jsonData.video || jsonData.output,
              format: 'url',
            };
          }
          
          return jsonData;
        } catch (parseError) {
        }
      }
      
      if (Buffer.isBuffer(response.data) || Array.isArray(response.data)) {
        const videoBuffer = Buffer.from(response.data);
        const base64 = videoBuffer.toString('base64');
        const videoDataUrl = `data:video/mp4;base64,${base64}`;
        
        return {
          video: videoDataUrl,
          url: videoDataUrl,
          format: 'base64',
        };
      }
      
      if (typeof response.data === 'string' && (response.data.startsWith('http') || response.data.startsWith('data:'))) {
        return {
          video: response.data,
          url: response.data,
          format: response.data.startsWith('data:') ? 'base64' : 'url',
        };
      }
    } catch (error: any) {
      let errorMessage = 'Failed to generate video';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          try {
            const errorJson = JSON.parse(error.response.data);
            errorMessage = errorJson.error || errorJson.message || errorJson.detail || errorMessage;
          } catch {
            errorMessage = error.response.data;
          }
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  async imageToVideo(params: ImageToVideoParams): Promise<any> {
    try {
      const formData = new FormData();
      
      if (!fs.existsSync(params.imagePath)) {
        throw new Error(`Image file not found: ${params.imagePath}`);
      }

      formData.append('prompt', String(params.prompt));
      formData.append('style', String(params.style || 'kling-1.0-pro'));
      
      const ext = path.extname(params.imagePath).toLowerCase();
      const contentTypeMap: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };
      const fileContentType = contentTypeMap[ext] || 'image/jpeg';
      
      formData.append('file', fs.createReadStream(params.imagePath), {
        filename: path.basename(params.imagePath),
        contentType: fileContentType,
      });

      const response = await axios.post(
        `${VYRO_API_BASE}/video/image-to-video`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': getToken(),
          },
          timeout: 300000, // 5 minutes timeout for video generation
        }
      );

      const responseContentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
      
      if (responseContentType.includes('application/json') || (typeof response.data === 'object' && !Buffer.isBuffer(response.data))) {
        const jsonData = response.data;
        
        if (jsonData.url) {
          return {
            video: jsonData.url,
            url: jsonData.url,
            format: 'url',
          };
        }
        
        if (jsonData.video) {
          const videoUrl = typeof jsonData.video === 'string' ? jsonData.video : jsonData.video.url;
          if (videoUrl) {
            return {
              video: videoUrl,
              url: videoUrl,
              format: 'url',
            };
          }
        }
        
        if (jsonData.output) {
          const outputUrl = typeof jsonData.output === 'string' ? jsonData.output : jsonData.output.url;
          if (outputUrl) {
            return {
              video: outputUrl,
              url: outputUrl,
              format: 'url',
            };
          }
        }
        
        if (jsonData.data) {
          const dataUrl = typeof jsonData.data === 'string' ? jsonData.data : jsonData.data.url || jsonData.data.video;
          if (dataUrl) {
            return {
              video: dataUrl,
              url: dataUrl,
              format: 'url',
            };
          }
        }
        
        if (jsonData.task_id || jsonData.id) {
          throw new Error('Video generation is asynchronous. Please use polling or check task status.');
        }
        
        return jsonData;
      }
      
      if (responseContentType.includes('video/')) {
        const videoBuffer = Buffer.isBuffer(response.data) 
          ? response.data 
          : Buffer.from(response.data);
        const base64 = videoBuffer.toString('base64');
        const videoDataUrl = `data:${responseContentType};base64,${base64}`;
        
        return {
          video: videoDataUrl,
          url: videoDataUrl,
          format: 'base64',
          contentType: responseContentType,
        };
      }
      
      if (typeof response.data === 'string') {
        try {
          const jsonData = JSON.parse(response.data);
          
          if (jsonData.url || jsonData.video || jsonData.output) {
            return {
              video: jsonData.url || jsonData.video || jsonData.output,
              url: jsonData.url || jsonData.video || jsonData.output,
              format: 'url',
            };
          }
          
          return jsonData;
        } catch (parseError) {
        }
      }
      
      if (Buffer.isBuffer(response.data) || Array.isArray(response.data)) {
        const videoBuffer = Buffer.from(response.data);
        const base64 = videoBuffer.toString('base64');
        const videoDataUrl = `data:video/mp4;base64,${base64}`;
        
        return {
          video: videoDataUrl,
          url: videoDataUrl,
          format: 'base64',
        };
      }
      
      if (typeof response.data === 'string' && (response.data.startsWith('http') || response.data.startsWith('data:'))) {
        return {
          video: response.data,
          url: response.data,
          format: response.data.startsWith('data:') ? 'base64' : 'url',
        };
      }
    } catch (error: any) {
      let errorMessage = 'Failed to generate video';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          try {
            const errorJson = JSON.parse(error.response.data);
            errorMessage = errorJson.error || errorJson.message || errorJson.detail || errorMessage;
          } catch {
            errorMessage = error.response.data;
          }
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  private getHfClient(): HfInference {
    const token = process.env.HF_KEY;
    if (!token) {
      throw new Error('HF_KEY is not set in environment variables');
    }
    return new HfInference(token);
  }

  async styleTransfer(params: ImageToImageParams): Promise<any> {
    try {
      if (!fs.existsSync(params.imagePath)) {
        throw new Error(`Image file not found: ${params.imagePath}`);
      }

      const imageBuffer = fs.readFileSync(params.imagePath);
      const token = process.env.HF_KEY;
      if (!token) {
        throw new Error('HF_KEY is not set in environment variables');
      }

      const ext = path.extname(params.imagePath).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };
      const mimeType = mimeTypes[ext] || 'image/jpeg';

      const base64Image = imageBuffer.toString('base64');
      
      const requestBody: any = {
        inputs: base64Image,
        parameters: {
          prompt: params.prompt || 'Transfer the style of this image',
          guidance_scale: params.guidance_scale || 7.5,
          num_inference_steps: params.num_inference_steps || 50,
        },
      };
      
      if (params.negative_prompt) {
        requestBody.parameters.negative_prompt = params.negative_prompt;
      }
      
      if (params.target_size) {
        requestBody.parameters.target_size = params.target_size;
      }

      const response = await axios.post(
        'https://router.huggingface.co/models/timbrooks/instruct-pix2pix',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 300000, // 5 minutes
          responseType: 'arraybuffer',
        }
      );

      const resultBuffer = Buffer.from(response.data);
      const base64 = resultBuffer.toString('base64');
      const contentType = response.headers['content-type'] || 'image/png';
      const imageDataUrl = `data:${contentType};base64,${base64}`;

      return {
        image: imageDataUrl,
        url: imageDataUrl,
        format: 'base64',
        contentType: contentType,
      };
    } catch (error: any) {
      let errorMessage = 'Failed to transfer image style';
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = 'Model not found or not available. Please try a different model.';
        } else if (error.response.data) {
          if (Buffer.isBuffer(error.response.data)) {
            const errorText = error.response.data.toString('utf-8');
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorJson.message || errorMessage;
            } catch {
              errorMessage = errorText || `HTTP ${error.response.status}: ${error.response.statusText}`;
            }
          } else if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else {
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
          }
        } else {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  async colorizeImage(params: ImageToImageParams): Promise<any> {
    try {
      if (!fs.existsSync(params.imagePath)) {
        throw new Error(`Image file not found: ${params.imagePath}`);
      }

      const imageBuffer = fs.readFileSync(params.imagePath);
      const token = process.env.HF_KEY;
      if (!token) {
        throw new Error('HF_KEY is not set in environment variables');
      }

      const ext = path.extname(params.imagePath).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };
      const mimeType = mimeTypes[ext] || 'image/jpeg';

      const base64Image = imageBuffer.toString('base64');
      
      const requestBody: any = {
        inputs: base64Image,
        parameters: {
          prompt: params.prompt || 'Colorize this black and white image with realistic colors',
          guidance_scale: params.guidance_scale || 7.5,
          negative_prompt: params.negative_prompt || 'black and white, grayscale, monochrome',
          num_inference_steps: params.num_inference_steps || 50,
        },
      };
      
      if (params.target_size) {
        requestBody.parameters.target_size = params.target_size;
      }

      const response = await axios.post(
        'https://router.huggingface.co/models/timbrooks/instruct-pix2pix',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 300000, // 5 minutes
          responseType: 'arraybuffer',
        }
      );

      const resultBuffer = Buffer.from(response.data);
      const base64 = resultBuffer.toString('base64');
      const contentType = response.headers['content-type'] || 'image/png';
      const imageDataUrl = `data:${contentType};base64,${base64}`;

      return {
        image: imageDataUrl,
        url: imageDataUrl,
        format: 'base64',
        contentType: contentType,
      };
    } catch (error: any) {
      let errorMessage = 'Failed to colorize image';
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = 'Model not found or not available. Please try a different model.';
        } else if (error.response.data) {
          if (Buffer.isBuffer(error.response.data)) {
            const errorText = error.response.data.toString('utf-8');
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorJson.message || errorMessage;
            } catch {
              errorMessage = errorText || `HTTP ${error.response.status}: ${error.response.statusText}`;
            }
          } else if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else {
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
          }
        } else {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  async upscaleImage(params: ImageToImageParams): Promise<any> {
    try {
      if (!fs.existsSync(params.imagePath)) {
        throw new Error(`Image file not found: ${params.imagePath}`);
      }

      const imageBuffer = fs.readFileSync(params.imagePath);
      const token = process.env.HF_KEY;
      if (!token) {
        throw new Error('HF_KEY is not set in environment variables');
      }

      const ext = path.extname(params.imagePath).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };
      const mimeType = mimeTypes[ext] || 'image/jpeg';

      const base64Image = imageBuffer.toString('base64');

      const defaultTargetSize = params.target_size || { width: 1024, height: 1024 };

      const requestBody: any = {
        inputs: base64Image,
        parameters: {
          prompt: params.prompt || 'Increase the resolution and quality of this image while maintaining all details',
          guidance_scale: params.guidance_scale || 7.5,
          negative_prompt: params.negative_prompt || 'blurry, low quality, pixelated',
          num_inference_steps: params.num_inference_steps || 50,
          target_size: defaultTargetSize,
        },
      };

      const response = await axios.post(
        'https://router.huggingface.co/models/timbrooks/instruct-pix2pix',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 300000, // 5 minutes
          responseType: 'arraybuffer',
        }
      );

      const resultBuffer = Buffer.from(response.data);
      const base64 = resultBuffer.toString('base64');
      const contentType = response.headers['content-type'] || 'image/png';
      const imageDataUrl = `data:${contentType};base64,${base64}`;

      return {
        image: imageDataUrl,
        url: imageDataUrl,
        format: 'base64',
        contentType: contentType,
      };
    } catch (error: any) {
      let errorMessage = 'Failed to upscale image';
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = 'Model not found or not available. Please try a different model.';
        } else if (error.response.data) {
          if (Buffer.isBuffer(error.response.data)) {
            const errorText = error.response.data.toString('utf-8');
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorJson.message || errorMessage;
            } catch {
              errorMessage = errorText || `HTTP ${error.response.status}: ${error.response.statusText}`;
            }
          } else if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else {
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
          }
        } else {
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Generate 4o Image using Kie.ai API
   * Creates a new image generation task
   */
  async generate4oImage(params: Kie4oImageGenerateParams): Promise<any> {
    try {
      if (!params.prompt && !params.filesUrl && !params.fileUrl) {
        throw new Error('At least one of prompt, filesUrl, or fileUrl must be provided');
      }

      if (!params.size) {
        throw new Error('size is required (1:1, 3:2, or 2:3)');
      }

      const requestBody: any = {
        size: params.size,
      };

      if (params.prompt) {
        requestBody.prompt = params.prompt;
      }

      if (params.filesUrl && params.filesUrl.length > 0) {
        requestBody.filesUrl = params.filesUrl;
      }

      if (params.fileUrl) {
        requestBody.fileUrl = params.fileUrl;
      }

      if (params.callBackUrl) {
        requestBody.callBackUrl = params.callBackUrl;
      }

      if (params.isEnhance !== undefined) {
        requestBody.isEnhance = params.isEnhance;
      }

      if (params.uploadCn !== undefined) {
        requestBody.uploadCn = params.uploadCn;
      }

      if (params.nVariants) {
        requestBody.nVariants = params.nVariants;
      }

      if (params.enableFallback !== undefined) {
        requestBody.enableFallback = params.enableFallback;
      }

      if (params.fallbackModel) {
        requestBody.fallbackModel = params.fallbackModel;
      }

      if (params.maskUrl) {
        requestBody.maskUrl = params.maskUrl;
      }

      const response = await axios.post(
        `${KIE_API_BASE}/gpt4o-image/generate`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': getKieToken(),
          },
          timeout: 60000, // 1 minute timeout for task creation
        }
      );

      if (response.data.code === 200) {
        return {
          taskId: response.data.data.taskId,
          message: response.data.msg || 'Task created successfully',
        };
      } else {
        throw new Error(response.data.msg || 'Failed to create image generation task');
      }
    } catch (error: any) {
      let errorMessage = 'Failed to generate 4o image';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.msg) {
          errorMessage = error.response.data.msg;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Get 4o Image generation task details
   * Query task status and results using taskId
   */
  async get4oImageDetails(taskId: string): Promise<any> {
    try {
      if (!taskId) {
        throw new Error('taskId is required');
      }

      const response = await axios.get(
        `${KIE_API_BASE}/gpt4o-image/record-info`,
        {
          headers: {
            'Authorization': getKieToken(),
          },
          params: {
            taskId,
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      if (response.data.code === 200) {
        return {
          taskId: response.data.data.taskId,
          status: response.data.data.status,
          successFlag: response.data.data.successFlag,
          progress: response.data.data.progress,
          createTime: response.data.data.createTime,
          completeTime: response.data.data.completeTime,
          paramJson: response.data.data.paramJson,
          resultUrls: response.data.data.response?.resultUrls || [],
          errorCode: response.data.data.errorCode,
          errorMessage: response.data.data.errorMessage,
        };
      } else {
        throw new Error(response.data.msg || 'Failed to get image generation details');
      }
    } catch (error: any) {
      let errorMessage = 'Failed to get 4o image details';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.msg) {
          errorMessage = error.response.data.msg;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Get direct download URL for generated image
   * Converts image URL to direct download URL (valid for 20 minutes)
   */
  async get4oImageDownloadUrl(taskId: string, url: string): Promise<any> {
    try {
      if (!taskId) {
        throw new Error('taskId is required');
      }

      if (!url) {
        throw new Error('url is required');
      }

      const response = await axios.post(
        `${KIE_API_BASE}/gpt4o-image/download-url`,
        {
          taskId,
          url,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': getKieToken(),
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      if (response.data.code === 200) {
        return {
          downloadUrl: response.data.data,
          expiresIn: 1200, // 20 minutes in seconds
        };
      } else {
        throw new Error(response.data.msg || 'Failed to get download URL');
      }
    } catch (error: any) {
      let errorMessage = 'Failed to get download URL';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.msg) {
          errorMessage = error.response.data.msg;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }
}

