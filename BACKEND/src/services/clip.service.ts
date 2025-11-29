import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// Use Hugging Face Inference API with base64 image
async function generateCaptionWithHuggingFace(imagePath: string): Promise<string | null> {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Helper function to call HF API with retry
    const callHFAPI = async (modelUrl: string, retries = 2): Promise<string | null> => {
      for (let i = 0; i <= retries; i++) {
        try {
          // Use new router.huggingface.co format with JSON
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
          
          // Check if model is still loading
          if (response.data?.error) {
            const errorMsg = typeof response.data.error === 'string' 
              ? response.data.error 
              : JSON.stringify(response.data.error);
            
            if (errorMsg.includes('loading') || errorMsg.includes('is currently loading')) {
              if (i < retries) {
                console.log(`⏳ [CLIP] Model is loading, waiting 10s before retry ${i + 1}/${retries}...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
                continue;
              }
              return null;
            }
          }
          
          // Extract caption from response
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
              console.log(`✅ [CLIP] HF API caption: "${caption.trim()}"`);
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
                console.log(`⏳ [CLIP] Model is loading (503), waiting 10s before retry ${i + 1}/${retries}...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
                continue;
              }
            }
          }
          if (i === retries) {
            console.warn(`⚠️ [CLIP] HF API error after ${retries} retries:`, error.message);
            if (error.response) {
              console.warn(`⚠️ [CLIP] Status: ${error.response.status}, Data:`, JSON.stringify(error.response.data).substring(0, 300));
            }
          }
        }
      }
      return null;
    };
    
    // Try BLIP model first (better for captioning)
    // Use new router.huggingface.co endpoint
    console.log('🌐 [CLIP] Trying BLIP model via HF API...');
    const blipCaption = await callHFAPI(
      'https://router.huggingface.co/models/Salesforce/blip-image-captioning-base'
    );
    if (blipCaption) {
      return blipCaption;
    }
    
    // Fallback to GPT2 image captioning
    console.log('🌐 [CLIP] Trying GPT2 model via HF API...');
    const gpt2Caption = await callHFAPI(
      'https://router.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning'
    );
    if (gpt2Caption) {
      return gpt2Caption;
    }
    
    return null;
  } catch (error: any) {
    console.warn('⚠️ [CLIP] Hugging Face API failed:', error.message);
    return null;
  }
}

// Fallback: Use @xenova/transformers locally
let localCaptioner: any = null;
let isInitializing = false;

async function getLocalCaptioner() {
  if (localCaptioner) {
    console.log('✅ [CLIP] Using cached local captioner');
    return localCaptioner;
  }
  
  if (isInitializing) {
    console.log('⏳ [CLIP] Model is already initializing, waiting...');
    for (let i = 0; i < 50; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (localCaptioner) {
        console.log('✅ [CLIP] Model loaded after waiting');
        return localCaptioner;
      }
    }
    console.warn('⚠️ [CLIP] Model initialization timeout');
    return null;
  }

  isInitializing = true;
  try {
    console.log('🤖 [CLIP] Loading local image-to-text model...');
    console.log('🤖 [CLIP] Model: Xenova/vit-gpt2-image-captioning');
    
    // Use Function constructor to ensure proper dynamic import in CommonJS
    const importTransformers = new Function('return import("@xenova/transformers")');
    const transformers = await importTransformers();
    const { pipeline } = transformers;
    
    console.log('🤖 [CLIP] Creating pipeline...');
    localCaptioner = await pipeline(
      'image-to-text',
      'Xenova/vit-gpt2-image-captioning',
      { 
        quantized: true,
        progress_callback: (progress: any) => {
          if (progress?.status === 'progress' && progress.progress) {
            console.log(`📥 [CLIP] Downloading model: ${Math.round(progress.progress * 100)}%`);
          }
        }
      }
    );
    
    console.log('✅ [CLIP] Local captioner loaded successfully');
    isInitializing = false;
    return localCaptioner;
  } catch (error: any) {
    console.error('❌ [CLIP] Failed to load local model:', error.message);
    console.error('❌ [CLIP] Error name:', error.name);
    console.error('❌ [CLIP] Error stack:', error.stack?.substring(0, 1000));
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
      console.log('📸 [CLIP] Starting caption generation for:', imagePath);
      
      // Method 1: Try local model first (most reliable)
      console.log('💻 [CLIP] Trying local model first...');
      try {
        const localCap = await getLocalCaptioner();
        if (!localCap) {
          console.warn('⚠️ [CLIP] Local model not available (returned null)');
        } else {
          console.log('✅ [CLIP] Local model loaded, processing image...');
          try {
            tempImagePath = await prepareImage(imagePath);
            console.log('🔍 [CLIP] Running local model on:', tempImagePath);
            
            const startTime = Date.now();
            const results = await localCap(tempImagePath);
            const duration = Date.now() - startTime;
            console.log(`⏱️ [CLIP] Local model took ${duration}ms`);
            
            // Log full structure for debugging
            console.log('📊 [CLIP] Results type:', typeof results);
            console.log('📊 [CLIP] Is array:', Array.isArray(results));
            if (Array.isArray(results)) {
              console.log('📊 [CLIP] Array length:', results.length);
            }
            console.log('📊 [CLIP] Raw results:', JSON.stringify(results, null, 2).substring(0, 1000));
            
            // Extract caption - image-to-text pipeline returns array of objects with generated_text
            let caption = '';
            
            // Extract caption from results
            if (Array.isArray(results) && results.length > 0) {
              const first = results[0];
              // image-to-text pipeline returns { generated_text: "..." }
              caption = first.generated_text || first.text || first.caption || '';
              console.log('📊 [CLIP] Extracted from array[0]:', {
                generated_text: first.generated_text,
                text: first.text,
                caption: first.caption,
                final: caption
              });
            } else if (results && typeof results === 'object') {
              // Try direct object access
              caption = results.generated_text || results.text || results.caption || '';
              console.log('📊 [CLIP] Extracted from object:', caption);
            } else if (typeof results === 'string') {
              caption = results;
              console.log('📊 [CLIP] Result is string:', caption);
            }
            
            // Clean and validate caption
            caption = (caption || '').trim();
            
            console.log(`🔍 [CLIP] Validating caption: "${caption}"`);
            console.log(`🔍 [CLIP] Caption length: ${caption.length}`);
            console.log(`🔍 [CLIP] Is "Beautiful Image": ${caption.toLowerCase() === 'beautiful image'}`);
            
            if (caption && caption.length > 0 && caption.toLowerCase() !== 'beautiful image') {
              console.log(`✅ [CLIP] Using local model caption: "${caption}"`);
              // Clean up temp file
              try { fs.unlinkSync(tempImagePath); } catch (e) {}
              return caption;
            } else {
              console.warn(`⚠️ [CLIP] Local model returned invalid/empty caption: "${caption}"`);
              console.warn(`⚠️ [CLIP] Full results:`, JSON.stringify(results, null, 2));
              // Don't return here - continue to try other methods
            }
            
            // Clean up temp file
            try { fs.unlinkSync(tempImagePath); tempImagePath = null; } catch (e) {}
          } catch (error: any) {
            console.error('❌ [CLIP] Local model execution failed:', error.message);
            console.error('❌ [CLIP] Error stack:', error.stack?.substring(0, 500));
            if (tempImagePath) {
              try { fs.unlinkSync(tempImagePath); tempImagePath = null; } catch (e) {}
            }
          }
        }
      } catch (error: any) {
        console.error('❌ [CLIP] Failed to get local model:', error.message);
        console.error('❌ [CLIP] Error stack:', error.stack?.substring(0, 500));
      }
      
      // Method 2: Try Hugging Face Inference API as fallback
      console.log('🌐 [CLIP] Trying Hugging Face Inference API as fallback...');
      const hfCaption = await generateCaptionWithHuggingFace(imagePath);
      if (hfCaption && hfCaption.trim() && hfCaption.trim().toLowerCase() !== 'beautiful image') {
        console.log(`✅ [CLIP] Using Hugging Face caption: "${hfCaption}"`);
        return hfCaption.trim();
      }
      
      // Method 3: Fallback to filename
      const filename = path.basename(imagePath);
      const caption = generateCaptionFromFilename(filename);
      console.log(`📝 [CLIP] Using filename-based caption: "${caption}"`);
      return caption;
      
    } catch (error: any) {
      console.error('❌ [CLIP] All methods failed:', error.message);
      console.error('❌ [CLIP] Error stack:', error.stack?.substring(0, 500));
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
      console.log('🔍 [CLIP] Starting image classification...');
      console.log('🔍 [CLIP] Labels:', labels);
      
      // Use Function constructor to ensure proper dynamic import in CommonJS
      const importTransformers = new Function('return import("@xenova/transformers")');
      const transformers = await importTransformers();
      const { pipeline } = transformers;
      
      console.log('🔍 [CLIP] Creating classifier pipeline...');
      const classifier = await pipeline(
        'zero-shot-image-classification',
        'Xenova/clip-vit-base-patch32',
        { quantized: true }
      );
      
      console.log('🔍 [CLIP] Preparing image for classification...');
      tempImagePath = await prepareImage(imagePath);
      console.log('🔍 [CLIP] Classifying image...');
      
      const results = await classifier(tempImagePath, labels);
      
      console.log('🔍 [CLIP] Classification results:', JSON.stringify(results, null, 2).substring(0, 500));
      
      if (!results || !Array.isArray(results)) {
        console.warn('⚠️ [CLIP] Classification returned invalid results');
        return [];
      }
      
      const predictions = results
        .map((r: any) => ({
          label: r.label ?? r.class ?? r.text ?? '',
          score: r.score ?? r.confidence ?? 0
        }))
        .filter((p: any) => p.label && p.score > 0)
        .sort((a: any, b: any) => b.score - a.score);
      
      console.log('🔍 [CLIP] Processed predictions:', predictions);
      return predictions;
    } catch (error: any) {
      console.error('❌ [CLIP] Classification failed:', error.message);
      console.error('❌ [CLIP] Error stack:', error.stack?.substring(0, 500));
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
      console.log('🎯 [CLIP] generateCaptionWithCategory called');
      console.log('🎯 [CLIP] Image path:', imagePath);
      console.log('🎯 [CLIP] Category labels:', categoryLabels);
      
      const caption = await this.generateCaption(imagePath);
      console.log('🎯 [CLIP] Generated caption:', caption);
      
      let category_label: string | undefined;
      let category_score: number | undefined;

      if (categoryLabels && categoryLabels.length > 0) {
        try {
          const predictions = await this.classifyImage(imagePath, categoryLabels);
          console.log('🎯 [CLIP] Classification predictions:', predictions);
          if (predictions.length > 0 && predictions[0].score > 0.25) {
            category_label = predictions[0].label;
            category_score = predictions[0].score;
            console.log('🎯 [CLIP] Selected category:', category_label, 'score:', category_score);
          }
        } catch (classifyError: any) {
          console.warn('⚠️ [CLIP] Classification failed:', classifyError.message);
        }
      }

      const result = { caption, category_label, category_score };
      console.log('🎯 [CLIP] Final result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ [CLIP] generateCaptionWithCategory failed:', error.message);
      console.error('❌ [CLIP] Error stack:', error.stack?.substring(0, 1000));
      const filename = path.basename(imagePath);
      const fallbackCaption = generateCaptionFromFilename(filename);
      console.log('🎯 [CLIP] Using fallback caption:', fallbackCaption);
      return { caption: fallbackCaption };
    }
  }

  async generateImageEmbedding(_imagePath: string): Promise<number[]> {
    return [];
  }

  async generateTextEmbedding(_text: string): Promise<number[]> {
    return [];
  }

  cosineSimilarity(_e1: number[], _e2: number[]): number {
    return 0;
  }
}
