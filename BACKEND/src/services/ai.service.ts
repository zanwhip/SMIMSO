import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { ImageEmbedding, SimilarityResult } from '../types';
import { CLIPService } from './clip.service';

const clipService = new CLIPService();

export class AIService {
  async generateImageFeatures(imagePath: string): Promise<ImageEmbedding> {
    try {
      const embedding = await clipService.generateImageEmbedding(imagePath);
      return {
        embedding,
        caption: undefined, // Caption is generated separately
      };
    } catch (error: any) {
      return {
        embedding: [],
        caption: undefined,
      };
    }
  }

  async classifyImage(imagePath: string, labels: string[]): Promise<{ label: string; score: number }[]> {
    try {
      return await clipService.classifyImage(imagePath, labels);
    } catch (error: any) {
      return [];
    }
  }

  async searchImagesByText(query: string, limit: number = 20): Promise<SimilarityResult[]> {
    return [];
  }

  async findSimilarImages(imageEmbedding: number[], limit: number = 20): Promise<SimilarityResult[]> {
    return [];
  }

  async getRecommendations(userId: string, limit: number = 20): Promise<string[]> {
    return [];
  }

  async calculateUserEmbedding(likedPostEmbeddings: number[][]): Promise<number[]> {
    if (likedPostEmbeddings.length === 0) {
      return [];
    }

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

  async generateCaptionWithClip(
    imagePath: string,
    categoryLabels?: string[]
  ): Promise<{ caption: string; category_label?: string; category_score?: number }> {
    try {
      const result = await clipService.generateCaptionWithCategory(imagePath, categoryLabels);
      return result;
    } catch (error: any) {
      throw error; // Re-throw to let caller handle
    }
  }

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
    try {
      let caption = '';
      let aiWorked = false;

      try {
        const categoryLabels = categories.map(c => c.name);
        const clipResult = await this.generateCaptionWithClip(imagePath, categoryLabels);
        caption = clipResult.caption || '';

        if (caption && caption.trim().length > 0 && caption.trim().toLowerCase() !== 'beautiful image') {
          aiWorked = true;
        }
      } catch (error: any) {
        // Error handling
      }

      if (!aiWorked && (!caption || caption.trim().length === 0 || caption.trim().toLowerCase() === 'beautiful image')) {
        if (filename) {
          let cleanName = filename
            .replace(/\.[^/.]+$/, '') // Remove extension
            .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '') // Remove UUIDs
            .replace(/\d{13,}/g, '') // Remove timestamps (13+ digits)
            .replace(/[_-]+/g, ' ') // Replace underscores/dashes with spaces
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();

          if (cleanName.length > 3) {
            caption = cleanName
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            } else {
              caption = 'Beautiful Image';
            }
        } else {
          caption = 'Beautiful Image';
        }
      }

      let description = caption;
      if (aiWorked) {
        description = caption; // Use AI-generated caption as description
      } else {
        if (caption === 'Beautiful Image') {
          description = 'A beautiful image worth sharing. What do you see in this picture?';
        } else {
          description = `${caption}. Share your thoughts and impressions about this image!`;
        }
      }

      let tags: string[] = [];

      if (aiWorked && caption) {
        const words = caption.toLowerCase().split(/\s+/);
        const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'and', 'or', 'but', 'this', 'that'];
        tags = words
          .filter(word => word.length > 3 && !stopWords.includes(word))
          .filter((word, index, self) => self.indexOf(word) === index) // Remove duplicates
          .slice(0, 5); // Take first 5 meaningful words as tags
      } else if (caption && caption !== 'Beautiful Image') {
        const words = caption.toLowerCase().split(/\s+/);
        const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'and', 'or', 'but', 'this', 'that'];
        tags = words
          .filter(word => word.length > 3 && !stopWords.includes(word))
          .filter((word, index, self) => self.indexOf(word) === index)
          .slice(0, 5);
      }

      if (tags.length === 0) {
        tags = ['image', 'photo', 'creative'];
      }

      let category_id: string | undefined;

      if (categories.length > 0 && imagePath) {
        try {
          const categoryLabels = categories.map(c => c.name);
          const predictions = await this.classifyImage(imagePath, categoryLabels);

          if (predictions && predictions.length > 0) {
            const bestMatch = predictions[0];
            const matchedCategory = categories.find(c => c.name === bestMatch.label);
            if (matchedCategory && bestMatch.score > 0.25) { // Lower threshold to 0.25
              category_id = matchedCategory.id;
            }
          }
        } catch (error: any) {
          // Error handling
        }
      }

      if (!category_id && caption) {
        const captionLower = caption.toLowerCase();

        for (const category of categories) {
          const categoryName = category.name.toLowerCase();
          if (captionLower.includes(categoryName)) {
            category_id = category.id;
            break;
          }
        }

        if (!category_id) {
          for (const category of categories) {
            const keywords = category.description?.toLowerCase().split(',') || [];
            for (const keyword of keywords) {
              if (captionLower.includes(keyword.trim())) {
                category_id = category.id;
                break;
              }
            }
            if (category_id) break;
          }
        }
      }

      if (!category_id && categories.length > 0) {
        category_id = categories[0].id;
      }

      return {
        category_id,
        tags,
        description,
        caption,
      };
    } catch (error: any) {
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

