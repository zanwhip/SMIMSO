import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const VYRO_API_BASE = 'https://api.vyro.ai/v2';
const getToken = (): string => {
  const token = process.env.IMAGINE_TOKEN || 'vk-G0L8QiCBFuL3XydqNnzB14kDYjkxNDnlD5hbOgVmDAidF';
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
}

