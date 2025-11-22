import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { ImageEmbedding, SimilarityResult } from '../types';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export class AIService {
  // Generate image embedding and caption using CLIP + BLIP
  async generateImageFeatures(imagePath: string): Promise<ImageEmbedding> {
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));

      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/image-features`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000,
      });

      return {
        embedding: response.data.embedding,
        caption: response.data.caption,
      };
    } catch (error: any) {
      console.error('AI service error:', error.message);
      // Return empty features if AI service fails
      return {
        embedding: [],
        caption: undefined,
      };
    }
  }

  // Zero-shot image classification
  async classifyImage(imagePath: string, labels: string[]): Promise<{ label: string; score: number }[]> {
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));
      formData.append('labels', JSON.stringify(labels));

      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/classify`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000,
      });

      return response.data.predictions;
    } catch (error: any) {
      console.error('AI classification error:', error.message);
      return [];
    }
  }

  // Text-to-image search
  async searchImagesByText(query: string, limit: number = 20): Promise<SimilarityResult[]> {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/search-by-text`, {
        query,
        limit,
      });

      return response.data.results;
    } catch (error: any) {
      console.error('AI search error:', error.message);
      return [];
    }
  }

  // Find similar images
  async findSimilarImages(imageEmbedding: number[], limit: number = 20): Promise<SimilarityResult[]> {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/similar-images`, {
        embedding: imageEmbedding,
        limit,
      });

      return response.data.results;
    } catch (error: any) {
      console.error('AI similarity error:', error.message);
      return [];
    }
  }

  // Generate personalized recommendations
  async getRecommendations(userId: string, limit: number = 20): Promise<string[]> {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/recommendations`, {
        user_id: userId,
        limit,
      });

      return response.data.post_ids;
    } catch (error: any) {
      console.error('AI recommendation error:', error.message);
      return [];
    }
  }

  // Calculate user embedding based on liked posts
  async calculateUserEmbedding(likedPostEmbeddings: number[][]): Promise<number[]> {
    if (likedPostEmbeddings.length === 0) {
      return [];
    }

    // Calculate mean embedding
    const embeddingLength = likedPostEmbeddings[0].length;
    const meanEmbedding = new Array(embeddingLength).fill(0);

    for (const embedding of likedPostEmbeddings) {
      for (let i = 0; i < embeddingLength; i++) {
        meanEmbedding[i] += embedding[i];
      }
    }

    for (let i = 0; i < embeddingLength; i++) {
      meanEmbedding[i] /= likedPostEmbeddings.length;
    }

    return meanEmbedding;
  }

  // Calculate cosine similarity
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // Generate metadata (category, tags, description) from image using CLIP
  async generateMetadataFromImage(
    imagePath: string,
    categories: any[],
    filename?: string
  ): Promise<{
    category_id?: string;
    tags: string[];
    description: string;
    caption: string;
  }> {
    console.log('🤖 Starting AI metadata generation...');

    try {
      // Step 1: Try to generate caption using BLIP
      let caption = '';
      let aiWorked = false;

      try {
        console.log('📸 Calling BLIP for image caption...');
        const features = await this.generateImageFeatures(imagePath);
        caption = features.caption || '';

        if (caption && caption.trim().length > 0) {
          aiWorked = true;
          console.log(`✅ BLIP caption: "${caption}"`);
        } else {
          console.log('⚠️ BLIP returned empty caption');
        }
      } catch (error: any) {
        console.log(`⚠️ BLIP failed: ${error.message}`);
      }

      // Fallback: Generate meaningful caption from filename or use generic
      if (!caption || caption.trim().length === 0) {
        if (filename) {
          // Clean filename: remove UUID patterns, timestamps, and extensions
          let cleanName = filename
            .replace(/\.[^/.]+$/, '') // Remove extension
            .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '') // Remove UUIDs
            .replace(/\d{13,}/g, '') // Remove timestamps (13+ digits)
            .replace(/[_-]+/g, ' ') // Replace underscores/dashes with spaces
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();

          if (cleanName.length > 3) {
            // Capitalize first letter of each word
            caption = cleanName
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            console.log(`📝 Generated caption from filename: "${caption}"`);
          } else {
            caption = 'Beautiful Image';
            console.log(`📝 Using generic caption: "${caption}"`);
          }
        } else {
          caption = 'Beautiful Image';
          console.log(`📝 Using generic caption: "${caption}"`);
        }
      }

      // Step 2: Generate meaningful description
      let description = caption;
      if (aiWorked) {
        description = caption; // Use AI-generated caption as description
      } else {
        // Generate more engaging description based on caption
        if (caption === 'Beautiful Image') {
          description = 'A beautiful image worth sharing. What do you see in this picture?';
        } else {
          description = `${caption}. Share your thoughts and impressions about this image!`;
        }
        console.log(`📝 Generated description: "${description}"`);
      }

      // Step 3: Extract keywords from caption for tags
      let tags: string[] = [];

      if (aiWorked && caption) {
        const words = caption.toLowerCase().split(/\s+/);
        const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'and', 'or', 'but', 'this', 'that'];
        tags = words
          .filter(word => word.length > 3 && !stopWords.includes(word))
          .filter((word, index, self) => self.indexOf(word) === index) // Remove duplicates
          .slice(0, 5); // Take first 5 meaningful words as tags
        console.log(`🏷️ Extracted tags from caption: ${tags.join(', ')}`);
      } else if (caption && caption !== 'Beautiful Image') {
        // Extract tags from filename-based caption
        const words = caption.toLowerCase().split(/\s+/);
        const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'and', 'or', 'but', 'this', 'that'];
        tags = words
          .filter(word => word.length > 3 && !stopWords.includes(word))
          .filter((word, index, self) => self.indexOf(word) === index)
          .slice(0, 5);

        if (tags.length > 0) {
          console.log(`🏷️ Extracted tags from filename: ${tags.join(', ')}`);
        }
      }

      // If no tags from caption, generate generic tags
      if (tags.length === 0) {
        tags = ['image', 'photo', 'creative'];
        console.log(`🏷️ Using generic tags: ${tags.join(', ')}`);
      }

      // Step 4: Find best matching category using CLIP zero-shot classification
      let category_id: string | undefined;

      if (categories.length > 0 && imagePath && aiWorked) {
        try {
          console.log('🎯 Trying CLIP classification for category...');
          // Use CLIP to classify image into categories
          const categoryLabels = categories.map(c => c.name);
          const predictions = await this.classifyImage(imagePath, categoryLabels);

          if (predictions && predictions.length > 0) {
            // Get the category with highest score
            const bestMatch = predictions[0];
            const matchedCategory = categories.find(c => c.name === bestMatch.label);
            if (matchedCategory && bestMatch.score > 0.25) { // Lower threshold to 0.25
              category_id = matchedCategory.id;
              console.log(`✅ CLIP matched category: ${bestMatch.label} (score: ${bestMatch.score.toFixed(2)})`);
            } else {
              console.log(`⚠️ CLIP score too low: ${bestMatch.score.toFixed(2)}`);
            }
          }
        } catch (error: any) {
          console.log(`⚠️ CLIP classification failed: ${error.message}`);
        }
      }

      // Fallback: keyword matching if CLIP fails or AI not available
      if (!category_id && caption) {
        console.log('🔍 Trying keyword matching for category...');
        const captionLower = caption.toLowerCase();

        for (const category of categories) {
          const categoryName = category.name.toLowerCase();
          if (captionLower.includes(categoryName)) {
            category_id = category.id;
            console.log(`✅ Keyword matched category: ${category.name}`);
            break;
          }
        }

        // Try matching with category descriptions
        if (!category_id) {
          for (const category of categories) {
            const keywords = category.description?.toLowerCase().split(',') || [];
            for (const keyword of keywords) {
              if (captionLower.includes(keyword.trim())) {
                category_id = category.id;
                console.log(`✅ Description matched category: ${category.name}`);
                break;
              }
            }
            if (category_id) break;
          }
        }
      }

      // If still no category, use first category as default
      if (!category_id && categories.length > 0) {
        category_id = categories[0].id;
        console.log(`📌 Using default category: ${categories[0].name}`);
      }

      console.log('✅ Metadata generation complete:', {
        caption: caption.substring(0, 50),
        tags: tags.join(', '),
        category_id: category_id ? 'Found' : 'None',
        aiWorked,
      });

      return {
        category_id,
        tags,
        description,
        caption,
      };
    } catch (error: any) {
      console.error('❌ Metadata generation error:', error.message);

      // Return meaningful fallback metadata
      const fallbackCaption = 'Untitled Image';
      const fallbackDescription = 'An interesting image. Share your thoughts!';
      const fallbackTags = ['image', 'photo', 'post'];

      return {
        category_id: categories.length > 0 ? categories[0].id : undefined,
        tags: fallbackTags,
        description: fallbackDescription,
        caption: fallbackCaption,
      };
    }
  }
}

