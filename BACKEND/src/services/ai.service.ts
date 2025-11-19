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
}

