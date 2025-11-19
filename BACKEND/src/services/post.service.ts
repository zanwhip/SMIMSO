import { supabase } from '../config/supabase';
import { Post, PostImage, CreatePostDTO, UpdatePostDTO } from '../types';
import { AIService } from './ai.service';

const aiService = new AIService();

export class PostService {
  // Create post
  async createPost(
    userId: string,
    data: CreatePostDTO,
    images: Express.Multer.File[]
  ): Promise<Post> {
    const { title, description, category_id, tags, visibility = 'public' } = data;

    // Create post
    const { data: newPost, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        title,
        description,
        category_id,
        tags,
        visibility,
      })
      .select()
      .single();

    if (postError || !newPost) {
      throw new Error('Failed to create post');
    }

    // Upload images and generate AI features
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imagePath = image.path;
        const imageUrl = `/uploads/${image.filename}`;

        // Generate AI features (embedding and caption)
        let embedding: number[] | undefined;
        let caption: string | undefined;

        try {
          const aiFeatures = await aiService.generateImageFeatures(imagePath);
          embedding = aiFeatures.embedding;
          caption = aiFeatures.caption;
        } catch (error) {
          console.error('AI feature generation failed:', error);
        }

        // Save image to database
        const { error: imageError } = await supabase
          .from('post_images')
          .insert({
            post_id: newPost.id,
            image_url: imageUrl,
            image_path: imagePath,
            embedding,
            caption,
            display_order: i,
          });

        if (imageError) {
          console.error('Failed to save image:', imageError);
        }
      }
    }

    return newPost;
  }

  // Get post by ID
  async getPostById(postId: string, userId?: string): Promise<any> {
    // Get post with user info and category
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:users(id, first_name, last_name, avatar_url),
        category:categories(id, name, slug)
      `)
      .eq('id', postId)
      .single();

    if (error || !post) {
      throw new Error('Post not found');
    }

    // Get images
    const { data: images } = await supabase
      .from('post_images')
      .select('*')
      .eq('post_id', postId)
      .order('display_order');

    // Check if user liked the post
    let isLiked = false;
    if (userId) {
      const { data: like } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      isLiked = !!like;

      // Track view activity
      await this.trackActivity(userId, postId, 'view');
    }

    // Increment view count
    await supabase
      .from('posts')
      .update({ view_count: post.view_count + 1 })
      .eq('id', postId);

    return {
      ...post,
      images: images || [],
      isLiked,
    };
  }

  // Get posts list
  async getPosts(
    page: number = 1,
    limit: number = 20,
    filters?: {
      userId?: string;
      categoryId?: string;
      visibility?: string;
      search?: string;
    }
  ): Promise<{ posts: any[]; total: number }> {
    let query = supabase
      .from('posts')
      .select(`
        *,
        user:users(id, first_name, last_name, avatar_url),
        category:categories(id, name, slug)
      `, { count: 'exact' });

    // Apply filters
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters?.visibility) {
      query = query.eq('visibility', filters.visibility);
    } else {
      query = query.eq('visibility', 'public');
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data: posts, error, count } = await query;

    if (error) {
      throw new Error('Failed to fetch posts');
    }

    // Get first image for each post
    const postsWithImages = await Promise.all(
      (posts || []).map(async (post) => {
        const { data: images } = await supabase
          .from('post_images')
          .select('*')
          .eq('post_id', post.id)
          .order('display_order')
          .limit(1);

        return {
          ...post,
          image: images?.[0] || null,
        };
      })
    );

    return {
      posts: postsWithImages,
      total: count || 0,
    };
  }

  // Track user activity
  async trackActivity(userId: string, postId: string, activityType: string): Promise<void> {
    await supabase.from('user_activities').insert({
      user_id: userId,
      post_id: postId,
      activity_type: activityType,
    });
  }
}

