import { supabase } from '../config/supabase';
import { CLIPService } from './clip.service';
import { AIService } from './ai.service';

const clipService = new CLIPService();
const aiService = new AIService();

export interface ImageSearchResult {
  post_id: string;
  image_id: string;
  image_url: string;
  similarity_score: number;
  post: any;
  search_method?: 'embedding' | 'caption' | 'hybrid';
}

function extractKeywords(caption: string, maxKeywords: number = 5): string {
  if (!caption || caption.trim() === '') {
    return '';
  }

  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
    'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from',
    'and', 'or', 'but', 'so', 'if', 'then', 'else',
    'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how'
  ]);

  const peopleKeywords = new Set([
    'person', 'people', 'man', 'woman', 'men', 'women', 'boy', 'girl', 'child', 'children',
    'face', 'portrait', 'people', 'human', 'humans', 'individual', 'individuals',
    'guy', 'lady', 'gentleman', 'lady', 'teenager', 'adult', 'elderly'
  ]);

  const words = caption
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .filter((word, index, self) => self.indexOf(word) === index); // Remove duplicates

  const peopleWords = words.filter(w => peopleKeywords.has(w));
  const otherWords = words.filter(w => !peopleKeywords.has(w));
  
  const keywords = [...peopleWords, ...otherWords].slice(0, maxKeywords);
  
  return keywords.join(' ');
}

export class SearchService {
  async searchByImage(
    queryImagePath: string,
    limit: number = 20,
    minSimilarity: number = 0.3
  ): Promise<ImageSearchResult[]> {
    try {
      let queryCaption = '';
      try {
        const captionResult = await aiService.generateCaptionWithClip(queryImagePath);
        queryCaption = captionResult.caption || '';
        } catch (error: any) {
        }

      const queryKeywords = extractKeywords(queryCaption);
      const queryEmbedding = await clipService.generateImageEmbedding(queryImagePath);
      
      if (!queryEmbedding || queryEmbedding.length === 0) {
        if (queryKeywords) {
          return await this.searchByCaptionKeywords(queryKeywords, limit);
        }
        return [];
      }

      const { data: images, error } = await supabase
        .from('post_images')
        .select(`
          id,
          post_id,
          image_url,
          embedding,
          posts!inner(
            id,
            title,
            description,
            user_id,
            visibility,
            view_count,
            like_count,
            comment_count,
            created_at,
            user:users(id, first_name, last_name, avatar_url),
            category:categories(id, name, slug)
          )
        `)
        .not('embedding', 'is', null)
        .eq('posts.visibility', 'public');

      if (error) {
        throw new Error('Failed to fetch images from database');
      }

      if (!images || images.length === 0) {
        return [];
      }

      const results: ImageSearchResult[] = [];

      for (const image of images) {
        let dbEmbedding: number[] = [];
        
        if (image.embedding) {
          if (Array.isArray(image.embedding)) {
            dbEmbedding = image.embedding;
          } else if (typeof image.embedding === 'string') {
            try {
              dbEmbedding = JSON.parse(image.embedding);
            } catch (e) {
              continue;
            }
          } else {
            continue;
          }
        } else {
          continue;
        }

        if (dbEmbedding.length !== queryEmbedding.length) {
          continue;
        }

        const similarity = aiService.cosineSimilarity(queryEmbedding, dbEmbedding);

        if (similarity >= minSimilarity) {
          results.push({
            post_id: image.post_id,
            image_id: image.id,
            image_url: image.image_url,
            similarity_score: similarity,
            post: image.posts,
            search_method: 'embedding',
          });
        }
      }

      let captionResults: ImageSearchResult[] = [];
      if (queryKeywords) {
        captionResults = await this.searchByCaptionKeywords(queryKeywords, limit * 2);
        captionResults = captionResults.map(r => ({ ...r, search_method: 'caption' }));
      }

      const mergedResults = this.mergeSearchResults(results, captionResults, limit);

      const boostedResults = mergedResults.map(result => {
        let boostedScore = result.similarity_score;
        
        const postText = `${result.post?.title || ''} ${result.post?.description || ''} ${queryCaption || ''}`.toLowerCase();
        const peopleTerms = ['person', 'people', 'man', 'woman', 'face', 'portrait', 'human'];
        const hasPeopleTerm = peopleTerms.some(term => postText.includes(term));
        
        if (hasPeopleTerm && result.similarity_score > 0.2) {
          boostedScore = Math.min(result.similarity_score * 1.1, 1.0);
        }
        
        return {
          ...result,
          similarity_score: boostedScore
        };
      });

      boostedResults.sort((a, b) => b.similarity_score - a.similarity_score);

      const limitedResults = boostedResults.slice(0, limit);

      return limitedResults;
    } catch (error: any) {
      throw error;
    }
  }

  async searchByText(
    queryText: string,
    limit: number = 20,
    minSimilarity: number = 0.3
  ): Promise<ImageSearchResult[]> {
    try {
      const queryEmbedding = await clipService.generateTextEmbedding(queryText);
      
      if (!queryEmbedding || queryEmbedding.length === 0) {
        return await this.fallbackTextSearch(queryText, limit);
      }

      const { data: images, error } = await supabase
        .from('post_images')
        .select(`
          id,
          post_id,
          image_url,
          embedding,
          posts!inner(
            id,
            title,
            description,
            user_id,
            visibility,
            view_count,
            like_count,
            comment_count,
            created_at,
            user:users(id, first_name, last_name, avatar_url),
            category:categories(id, name, slug)
          )
        `)
        .not('embedding', 'is', null)
        .eq('posts.visibility', 'public');

      if (error) {
        throw new Error('Failed to fetch images from database');
      }

      if (!images || images.length === 0) {
        return [];
      }

      const results: ImageSearchResult[] = [];

      for (const image of images) {
        let dbEmbedding: number[] = [];
        
        if (image.embedding) {
          if (Array.isArray(image.embedding)) {
            dbEmbedding = image.embedding;
          } else if (typeof image.embedding === 'string') {
            try {
              dbEmbedding = JSON.parse(image.embedding);
            } catch (e) {
              continue;
            }
          } else {
            continue;
          }
        } else {
          continue;
        }

        if (dbEmbedding.length !== queryEmbedding.length) {
          continue;
        }

        const similarity = aiService.cosineSimilarity(queryEmbedding, dbEmbedding);

        if (similarity >= minSimilarity) {
          results.push({
            post_id: image.post_id,
            image_id: image.id,
            image_url: image.image_url,
            similarity_score: similarity,
            post: image.posts,
          });
        }
      }

      results.sort((a, b) => b.similarity_score - a.similarity_score);
      const limitedResults = results.slice(0, limit);

      return limitedResults;
    } catch (error: any) {
      return await this.fallbackTextSearch(queryText, limit);
    }
  }

  private async fallbackTextSearch(queryText: string, limit: number): Promise<ImageSearchResult[]> {
    try {
      const searchTerm = queryText.toLowerCase();
      
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          description,
          user_id,
          visibility,
          view_count,
          like_count,
          comment_count,
          created_at,
          user:users(id, first_name, last_name, avatar_url),
          category:categories(id, name, slug),
          post_images!inner(id, image_url)
        `)
        .eq('visibility', 'public')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

      if (error) {
        return [];
      }

      if (!posts || posts.length === 0) {
        return [];
      }

      const results: ImageSearchResult[] = [];
      
      for (const post of posts) {
        if (post.post_images && post.post_images.length > 0) {
          const firstImage = post.post_images[0];
          results.push({
            post_id: post.id,
            image_id: firstImage.id,
            image_url: firstImage.image_url,
            similarity_score: 0.5, // Default score for text matches
            post: {
              ...post,
              post_images: undefined, // Remove nested images
            },
          });
        }
      }

      return results.slice(0, limit);
    } catch (error: any) {
      return [];
    }
  }

  private async searchByCaptionKeywords(keywords: string, limit: number): Promise<ImageSearchResult[]> {
    try {
      if (!keywords || keywords.trim() === '') {
        return [];
      }

      const searchTerms = keywords.toLowerCase().split(/\s+/).filter(term => term.length > 2);
      if (searchTerms.length === 0) {
        return [];
      }

      const searchPattern = searchTerms.map(term => `%${term}%`).join('|');
      
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          description,
          user_id,
          visibility,
          view_count,
          like_count,
          comment_count,
          created_at,
          user:users(id, first_name, last_name, avatar_url),
          category:categories(id, name, slug),
          post_images!inner(id, image_url, ai_caption)
        `)
        .eq('visibility', 'public')
        .or(`title.ilike.%${searchTerms[0]}%,description.ilike.%${searchTerms[0]}%`);

      if (error) {
        return [];
      }

      if (!posts || posts.length === 0) {
        return [];
      }

      const { data: imagesByCaption, error: captionError } = await supabase
        .from('post_images')
        .select(`
          id,
          post_id,
          image_url,
          ai_caption,
          posts!inner(
            id,
            title,
            description,
            user_id,
            visibility,
            view_count,
            like_count,
            comment_count,
            created_at,
            user:users(id, first_name, last_name, avatar_url),
            category:categories(id, name, slug)
          )
        `)
        .not('ai_caption', 'is', null)
        .eq('posts.visibility', 'public');

      const results: ImageSearchResult[] = [];
      const seenPostIds = new Set<string>();

      for (const post of posts) {
        if (seenPostIds.has(post.id)) continue;
        
        if (post.post_images && post.post_images.length > 0) {
          const firstImage = post.post_images[0];
          
          let matchScore = 0;
          const postText = `${post.title || ''} ${post.description || ''} ${firstImage.ai_caption || ''}`.toLowerCase();
          
          for (const term of searchTerms) {
            const matches = (postText.match(new RegExp(term, 'gi')) || []).length;
            matchScore += matches;
          }
          
          const normalizedScore = Math.min(matchScore / (searchTerms.length * 2), 1);
          
          if (normalizedScore > 0.1) { // Minimum threshold
            results.push({
              post_id: post.id,
              image_id: firstImage.id,
              image_url: firstImage.image_url,
              similarity_score: normalizedScore,
              post: {
                ...post,
                post_images: undefined,
              },
            });
            seenPostIds.add(post.id);
          }
        }
      }

      if (imagesByCaption) {
        for (const image of imagesByCaption) {
          if (seenPostIds.has(image.post_id)) continue;
          
          const captionText = (image.ai_caption || '').toLowerCase();
          let matchScore = 0;
          
          for (const term of searchTerms) {
            if (captionText.includes(term)) {
              matchScore += 1;
            }
          }
          
          const normalizedScore = matchScore / searchTerms.length;
          
          if (normalizedScore > 0.3) {
            results.push({
              post_id: image.post_id,
              image_id: image.id,
              image_url: image.image_url,
              similarity_score: normalizedScore,
              post: image.posts,
            });
            seenPostIds.add(image.post_id);
          }
        }
      }

      return results;
    } catch (error: any) {
      return [];
    }
  }

  private mergeSearchResults(
    embeddingResults: ImageSearchResult[],
    captionResults: ImageSearchResult[],
    limit: number
  ): ImageSearchResult[] {
    const merged = new Map<string, ImageSearchResult>();

    for (const result of embeddingResults) {
      const key = result.post_id;
      if (!merged.has(key)) {
        merged.set(key, result);
      } else {
        const existing = merged.get(key)!;
        if (result.search_method === 'embedding') {
          existing.similarity_score = Math.max(existing.similarity_score, result.similarity_score);
          existing.search_method = 'hybrid';
        }
      }
    }

    for (const result of captionResults) {
      const key = result.post_id;
      if (!merged.has(key)) {
        merged.set(key, result);
      } else {
        const existing = merged.get(key)!;
        if (existing.search_method === 'embedding' || existing.search_method === 'hybrid') {
          existing.similarity_score = Math.min(existing.similarity_score + result.similarity_score * 0.2, 1.0);
          existing.search_method = 'hybrid';
        } else {
          existing.similarity_score = Math.min(existing.similarity_score + result.similarity_score * 0.3, 1.0);
          existing.search_method = 'hybrid';
        }
      }
    }

    return Array.from(merged.values());
  }
}

