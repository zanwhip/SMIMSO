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
    let { title, description, category_id, visibility = 'public' } = data;
    let caption: string | undefined;

    // Parse tags if it's a string (from FormData)
    let tags: string[] | undefined;
    if (data.tags) {
      if (typeof data.tags === 'string') {
        try {
          tags = JSON.parse(data.tags);
        } catch (e) {
          // If parsing fails, split by comma
          tags = data.tags.split(',').map(t => t.trim()).filter(t => t);
        }
      } else {
        tags = data.tags;
      }
    }

    // Generate AI metadata from first image using CLIP + BLIP
    let aiGeneratedMetadata: any = null;
    if (images && images.length > 0) {
      try {
        console.log('🤖 Starting AI metadata generation...');
        const firstImage = images[0];

        // Get categories for CLIP classification
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name, description');

        console.log(`📂 Found ${categories?.length || 0} categories for classification`);

        // Generate metadata using improved AI service (with filename fallback)
        aiGeneratedMetadata = await aiService.generateMetadataFromImage(
          firstImage.path,
          categories || [],
          firstImage.filename
        );

        // Store caption
        caption = aiGeneratedMetadata.caption;

        // Use AI-generated data if not provided by user
        if (!title && aiGeneratedMetadata.caption) {
          title = aiGeneratedMetadata.caption.substring(0, 100); // Use caption as title
          console.log(`📝 Auto-generated title: "${title}"`);
        }
        if (!description && aiGeneratedMetadata.description) {
          description = aiGeneratedMetadata.description;
          console.log(`📝 Auto-generated description: "${description.substring(0, 50)}..."`);
        }
        if ((!tags || tags.length === 0) && aiGeneratedMetadata.tags.length > 0) {
          tags = aiGeneratedMetadata.tags;
          console.log(`🏷️ Auto-generated tags: ${tags.join(', ')}`);
        }
        if (!category_id && aiGeneratedMetadata.category_id) {
          category_id = aiGeneratedMetadata.category_id;
          console.log(`📁 Auto-selected category ID: ${category_id}`);
        }

        console.log('✅ Final post metadata:', {
          title: title?.substring(0, 50),
          description: description?.substring(0, 50),
          category_id,
          tags,
          caption: caption?.substring(0, 50),
        });
      } catch (error: any) {
        console.error('❌ AI metadata generation failed:', error.message);

        // Fallback: use filename if everything fails
        if (!title && images[0].filename) {
          title = images[0].filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          console.log(`📝 Fallback title from filename: "${title}"`);
        }
      }
    }

    // Ensure title is not empty (required field)
    if (!title || title.trim() === '') {
      title = 'Untitled Post';
      console.log('⚠️ No title provided, using default: "Untitled Post"');
    }

    console.log('📝 Creating post:', { userId, title, category_id, tags, visibility, caption: caption?.substring(0, 30) });

    // Create post with caption
    const { data: newPost, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        title,
        description,
        category_id,
        tags,
        visibility,
        caption,
      })
      .select()
      .single();

    if (postError || !newPost) {
      console.error('❌ Post creation error:', postError);
      throw new Error(postError?.message || 'Failed to create post');
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

        // Prepare image data
        const imageData: any = {
          post_id: newPost.id,
          image_url: imageUrl,
          image_path: imagePath,
          display_order: i,
        };

        // Only add embedding if it's valid (has elements)
        if (embedding && embedding.length > 0) {
          imageData.embedding = embedding;
        }

        // Only add caption if it exists
        if (caption) {
          imageData.caption = caption;
        }

        // Save image to database
        const { error: imageError } = await supabase
          .from('post_images')
          .insert(imageData);

        if (imageError) {
          console.error('Failed to save image:', imageError);
        }
      }
    }

    // Fetch post with images
    const { data: postImages } = await supabase
      .from('post_images')
      .select('*')
      .eq('post_id', newPost.id)
      .order('display_order');

    return {
      ...newPost,
      images: postImages || [],
    };
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
    },
    currentUserId?: string
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

    // Get first image and check if liked for each post
    const postsWithImages = await Promise.all(
      (posts || []).map(async (post) => {
        const { data: images } = await supabase
          .from('post_images')
          .select('*')
          .eq('post_id', post.id)
          .order('display_order')
          .limit(1);

        // Check if current user liked this post
        let isLiked = false;
        if (currentUserId) {
          const { data: like } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', currentUserId)
            .maybeSingle();

          isLiked = !!like;
        }

        return {
          ...post,
          image: images?.[0] || null,
          isLiked,
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

