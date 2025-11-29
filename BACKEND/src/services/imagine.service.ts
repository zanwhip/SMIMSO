import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const VYRO_API_BASE = 'https://api.vyro.ai/v2';
// Get token from env, ensure it has Bearer prefix
const getToken = (): string => {
  const token = process.env.IMAGINE_TOKEN || 'vk-G0L8QiCBFuL3XydqNnzB14kDYjkxNDnlD5hbOgVmDAidF';
  // If token doesn't start with 'Bearer', add it
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
  // Text to Image
  async textToImage(params: TextToImageParams): Promise<any> {
    try {
      const formData = new FormData();
      // According to API docs, values should be strings
      formData.append('prompt', String(params.prompt));
      formData.append('style', String(params.style || 'realistic'));
      formData.append('aspect_ratio', String(params.aspect_ratio || '1:1'));
      if (params.seed) {
        formData.append('seed', String(params.seed));
      }

      // Try to get response - handle both JSON and binary
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
      
      // Check if response is binary image
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
      
      // Try to parse as JSON
      try {
        const jsonString = Buffer.from(response.data).toString('utf-8');
        const jsonData = JSON.parse(jsonString);
        return jsonData;
      } catch (parseError) {
        // If not JSON, might be binary - convert to base64
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
      // Try to extract error message from response
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

  // Text to Video
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
          responseType: 'arraybuffer', // Get raw response
        }
      );

      const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
      
      // Check if response is binary video
      if (contentType.includes('video/')) {
        const videoBuffer = Buffer.from(response.data);
        const base64 = videoBuffer.toString('base64');
        const videoDataUrl = `data:${contentType};base64,${base64}`;
        
        return {
          video: videoDataUrl,
          url: videoDataUrl,
          format: 'base64',
          contentType: contentType,
        };
      }
      
      // Try to parse as JSON
      try {
        const jsonString = Buffer.from(response.data).toString('utf-8');
        const jsonData = JSON.parse(jsonString);
        return jsonData;
      } catch (parseError) {
        // If not JSON, might be binary video
        const videoBuffer = Buffer.from(response.data);
        const base64 = videoBuffer.toString('base64');
        const videoDataUrl = `data:video/mp4;base64,${base64}`;
        
        return {
          video: videoDataUrl,
          url: videoDataUrl,
          format: 'base64',
        };
      }
    } catch (error: any) {
      // Try to extract error message from response
      let errorMessage = 'Failed to generate video';
      
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

  // Image to Video
  async imageToVideo(params: ImageToVideoParams): Promise<any> {
    try {
      const formData = new FormData();
      
      // Check if image file exists
      if (!fs.existsSync(params.imagePath)) {
        throw new Error(`Image file not found: ${params.imagePath}`);
      }

      formData.append('prompt', String(params.prompt));
      formData.append('style', String(params.style || 'kling-1.0-pro'));
      
      // Determine content type from file extension
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
          responseType: 'arraybuffer', // Get raw response
        }
      );

      const responseContentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
      
      // Check if response is binary video
      if (responseContentType.includes('video/')) {
        const videoBuffer = Buffer.from(response.data);
        const base64 = videoBuffer.toString('base64');
        const videoDataUrl = `data:${responseContentType};base64,${base64}`;
        
        return {
          video: videoDataUrl,
          url: videoDataUrl,
          format: 'base64',
          contentType: responseContentType,
        };
      }
      
      // Try to parse as JSON
      try {
        const jsonString = Buffer.from(response.data).toString('utf-8');
        const jsonData = JSON.parse(jsonString);
        return jsonData;
      } catch (parseError) {
        // If not JSON, might be binary video
        const videoBuffer = Buffer.from(response.data);
        const base64 = videoBuffer.toString('base64');
        const videoDataUrl = `data:video/mp4;base64,${base64}`;
        
        return {
          video: videoDataUrl,
          url: videoDataUrl,
          format: 'base64',
        };
      }
    } catch (error: any) {
      // Try to extract error message from response
      let errorMessage = 'Failed to generate video';
      
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
}

