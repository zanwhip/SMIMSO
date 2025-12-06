import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

async function generateCaptionWithHuggingFace(imagePath: string): Promise<string | null> {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const callHFAPI = async (modelUrl: string, retries = 2): Promise<string | null> => {
      for (let i = 0; i <= retries; i++) {
        try {
          const response = await axios.post(
            modelUrl,
            { inputs: base64Image },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 45000,
            }
          );
          
          if (response.data?.error) {
            const errorMsg = typeof response.data.error === 'string' 
              ? response.data.error 
              : JSON.stringify(response.data.error);
            
            if (errorMsg.includes('loading') || errorMsg.includes('is currently loading')) {
              if (i < retries) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                continue;
              }
              return null;
            }
          }
          
          if (response.data) {
            let caption = '';
            if (Array.isArray(response.data) && response.data.length > 0) {
              const first = response.data[0];
              caption = first.generated_text || first.text || '';
            } else if (response.data.generated_text) {
              caption = response.data.generated_text;
            } else if (response.data.text) {
              caption = response.data.text;
            } else if (typeof response.data === 'string') {
              caption = response.data;
            }
            
            if (caption && caption.trim() && caption.trim().toLowerCase() !== 'beautiful image') {
              }"`);
              return caption.trim();
            }
          }
          
          return null;
        } catch (error: any) {
          if (error.response?.status === 503) {
            const errorData = error.response.data;
            const errorMsg = typeof errorData === 'string' 
              ? errorData 
              : (errorData?.error || JSON.stringify(errorData));
            
            if (errorMsg.includes('loading') || errorMsg.includes('is currently loading')) {
              if (i < retries) {
                , waiting 10s before retry ${i + 1}/${retries}...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
                continue;
              }
            }
          }
          if (i === retries) {
            if (error.response) {
              .substring(0, 300));
            }
          }
        }
      }
      return null;
    };
    
    const blipCaption = await callHFAPI(
      'https://router.huggingface.co/models/Salesforce/blip-image-captioning-base'
    );
    if (blipCaption) {
      return blipCaption;
    }
    
    const gpt2Caption = await callHFAPI(
      'https://router.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning'
    );
    if (gpt2Caption) {
      return gpt2Caption;
    }
    
    return null;
  } catch (error: any) {
    return null;
  }
}

let localCaptioner: any = null;
let isInitializing = false;

async function getLocalCaptioner() {
  if (localCaptioner) {
    return localCaptioner;
  }
  
  if (isInitializing) {
    for (let i = 0; i < 50; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (localCaptioner) {
        return localCaptioner;
      }
    }
    return null;
  }

  isInitializing = true;
  try {
    const importTransformers = new Function('return import("@xenova/transformers")');
    const transformers = await importTransformers();
    const { pipeline } = transformers;
    
    localCaptioner = await pipeline(
      'image-to-text',
      'Xenova/vit-gpt2-image-captioning',
      { 
        quantized: true,
        progress_callback: (progress: any) => {
          if (progress?.status === 'progress' && progress.progress) {
            }%`);
          }
        }
      }
    );
    
    isInitializing = false;
    return localCaptioner;
  } catch (error: any) {
    );
    isInitializing = false;
    localCaptioner = null; // Reset on error
    return null;
  }
}

async function prepareImage(imagePath: string): Promise<string> {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }
  
  const tempDir = path.join(__dirname, '../../uploads/temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempPath = path.join(tempDir, `processed_${Date.now()}.jpg`);
  const buffer = fs.readFileSync(imagePath);
  
  await sharp(buffer)
    .resize(384, 384, { fit: 'cover' })
    .jpeg({ quality: 90 })
    .toFile(tempPath);
  
  return tempPath;
}

function generateCaptionFromFilename(filename: string): string {
  if (!filename) return 'Beautiful Image';
  
  let clean = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/\d{13,}/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (clean.length < 3) return 'Beautiful Image';
  
  return clean
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export class CLIPService {
  async generateCaption(imagePath: string): Promise<string> {
    let tempImagePath: string | null = null;
    
    try {
      try {
        const localCap = await getLocalCaptioner();
        if (!localCap) {
          ');
        } else {
          try {
            tempImagePath = await prepareImage(imagePath);
            const startTime = Date.now();
            const results = await localCap(tempImagePath);
            const duration = Date.now() - startTime;
            );
            if (Array.isArray(results)) {
              }
            .substring(0, 1000));
            
            let caption = '';
            
            if (Array.isArray(results) && results.length > 0) {
              const first = results[0];
              caption = first.generated_text || first.text || first.caption || '';
              } else if (results && typeof results === 'object') {
              caption = results.generated_text || results.text || results.caption || '';
              } else if (typeof results === 'string') {
              caption = results;
              }
            
            caption = (caption || '').trim();
            
            === 'beautiful image'}`);
            
            if (caption && caption.length > 0 && caption.toLowerCase() !== 'beautiful image') {
              try { fs.unlinkSync(tempImagePath); } catch (e) {}
              return caption;
            } else {
              );
            }
            
            try { fs.unlinkSync(tempImagePath); tempImagePath = null; } catch (e) {}
          } catch (error: any) {
            );
            if (tempImagePath) {
              try { fs.unlinkSync(tempImagePath); tempImagePath = null; } catch (e) {}
            }
          }
        }
      } catch (error: any) {
        );
      }
      
      const hfCaption = await generateCaptionWithHuggingFace(imagePath);
      if (hfCaption && hfCaption.trim() && hfCaption.trim().toLowerCase() !== 'beautiful image') {
        return hfCaption.trim();
      }
      
      const filename = path.basename(imagePath);
      const caption = generateCaptionFromFilename(filename);
      return caption;
      
    } catch (error: any) {
      );
      const filename = path.basename(imagePath);
      return generateCaptionFromFilename(filename);
    } finally {
      if (tempImagePath && fs.existsSync(tempImagePath)) {
        try { fs.unlinkSync(tempImagePath); } catch (e) {}
      }
    }
  }

  async classifyImage(imagePath: string, labels: string[]): Promise<{ label: string; score: number }[]> {
    let tempImagePath: string | null = null;
    
    try {
      const importTransformers = new Function('return import("@xenova/transformers")');
      const transformers = await importTransformers();
      const { pipeline } = transformers;
      
      const classifier = await pipeline(
        'zero-shot-image-classification',
        'Xenova/clip-vit-base-patch32',
        { quantized: true }
      );
      
      tempImagePath = await prepareImage(imagePath);
      const results = await classifier(tempImagePath, labels);
      
      .substring(0, 500));
      
      if (!results || !Array.isArray(results)) {
        return [];
      }
      
      const predictions = results
        .map((r: any) => ({
          label: r.label ?? r.class ?? r.text ?? '',
          score: r.score ?? r.confidence ?? 0
        }))
        .filter((p: any) => p.label && p.score > 0)
        .sort((a: any, b: any) => b.score - a.score);
      
      return predictions;
    } catch (error: any) {
      );
      return [];
    } finally {
      if (tempImagePath && fs.existsSync(tempImagePath)) {
        try { fs.unlinkSync(tempImagePath); } catch (e) {}
      }
    }
  }

  async generateCaptionWithCategory(
    imagePath: string,
    categoryLabels?: string[]
  ): Promise<{ caption: string; category_label?: string; category_score?: number }> {
    try {
      const caption = await this.generateCaption(imagePath);
      let category_label: string | undefined;
      let category_score: number | undefined;

      if (categoryLabels && categoryLabels.length > 0) {
        try {
          const predictions = await this.classifyImage(imagePath, categoryLabels);
          if (predictions.length > 0 && predictions[0].score > 0.25) {
            category_label = predictions[0].label;
            category_score = predictions[0].score;
            }
        } catch (classifyError: any) {
          }
      }

      const result = { caption, category_label, category_score };
      );
      return result;
    } catch (error: any) {
      );
      const filename = path.basename(imagePath);
      const fallbackCaption = generateCaptionFromFilename(filename);
      return { caption: fallbackCaption };
    }
  }

  private clipModel: any = null;
  private isInitializingEmbedding = false;

  async getCLIPModel() {
    if (this.clipModel) {
      return this.clipModel;
    }

    if (this.isInitializingEmbedding) {
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        if (this.clipModel) {
          return this.clipModel;
        }
      }
      return null;
    }

    this.isInitializingEmbedding = true;
    try {
      const importTransformers = new Function('return import("@xenova/transformers")');
      const transformers = await importTransformers();
      const { pipeline } = transformers;

      this.clipModel = await pipeline(
        'image-feature-extraction',
        'Xenova/clip-vit-base-patch32',
        { quantized: true }
      );

      this.isInitializingEmbedding = false;
      return this.clipModel;
    } catch (error: any) {
      this.isInitializingEmbedding = false;
      this.clipModel = null;
      return null;
    }
  }

  async generateImageEmbedding(imagePath: string): Promise<number[]> {
    let tempImagePath: string | null = null;
    
    try {
      const model = await this.getCLIPModel();
      if (!model) {
        return [];
  }

      tempImagePath = await prepareImage(imagePath);
      
      const result = await model(tempImagePath);
      
      );
      if (result && typeof result === 'object') {
        );
      }
      
      let embedding: number[] = [];
      
      if (Array.isArray(result)) {
        if (result.length > 0) {
          const firstItem = result[0];
          if (firstItem && typeof firstItem === 'object') {
            if (firstItem.data) {
              embedding = Array.from(firstItem.data);
            } else if (Array.isArray(firstItem)) {
              embedding = firstItem;
            } else if (firstItem instanceof Float32Array || firstItem instanceof Float64Array) {
              embedding = Array.from(firstItem);
            }
          } else if (Array.isArray(firstItem)) {
            embedding = firstItem;
          } else {
            embedding = result[0] || [];
          }
        }
      } else if (result && typeof result === 'object') {
        if (result.data) {
          embedding = Array.from(result.data);
        } else if (result instanceof Float32Array || result instanceof Float64Array) {
          embedding = Array.from(result);
        } else if (Array.isArray(result)) {
          embedding = result;
        }
      }
      
      if (embedding.length > 0) {
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
          embedding = embedding.map(val => val / norm);
        }
      }

      return embedding;
    } catch (error: any) {
      return [];
    } finally {
      if (tempImagePath && fs.existsSync(tempImagePath)) {
        try {
          fs.unlinkSync(tempImagePath);
        } catch (e) {}
      }
    }
  }

  async generateTextEmbedding(text: string): Promise<number[]> {
    try {
      );
      
      const model = await this.getCLIPModel();
      if (!model) {
        return [];
      }

      const importTransformers = new Function('return import("@xenova/transformers")');
      const transformers = await importTransformers();
      const { pipeline } = transformers;

      const textModel = await pipeline(
        'feature-extraction',
        'Xenova/clip-vit-base-patch32',
        { quantized: true }
      );

      const result = await textModel(text);
      
      let embedding: number[] = [];
      
      if (Array.isArray(result)) {
        if (result[0] && Array.isArray(result[0])) {
          embedding = result[0];
        } else if (result[0] && typeof result[0] === 'object' && result[0].data) {
          embedding = Array.from(result[0].data);
        }
      } else if (result && typeof result === 'object') {
        if (result.data) {
          embedding = Array.from(result.data);
        }
      }

      if (embedding.length > 0) {
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
          embedding = embedding.map(val => val / norm);
        }
      }

      return embedding;
    } catch (error: any) {
      return [];
    }
  }

  cosineSimilarity(e1: number[], e2: number[]): number {
    if (e1.length === 0 || e2.length === 0 || e1.length !== e2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < e1.length; i++) {
      dotProduct += e1[i] * e2[i];
      norm1 += e1[i] * e1[i];
      norm2 += e2[i] * e2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
    return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}
