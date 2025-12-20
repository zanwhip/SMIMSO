import { supabase } from '../config/supabase';
import { Post, PostImage, CreatePostDTO, UpdatePostDTO } from '../types';
import { AIService } from './ai.service';
import { storageService } from './storage.service';
import fs from 'fs';

const aiService = new AIService();

export class PostService {
  async createPost(
    userId: string,
    data: CreatePostDTO,
    images: Express.Multer.File[]
  ): Promise<Post> {
    let { title, description, category_id, visibility = 'public' } = data;
    let caption: string | undefined;

    let tags: string[] | undefined;
    if (data.tags) {
      if (typeof data.tags === 'string') {
        try {
          tags = JSON.parse(data.tags);
        } catch (e) {
          tags = data.tags.split(',').map(t => t.trim()).filter(t => t);
        }
      } else {
        tags = data.tags;
      }
    }

    let aiGeneratedMetadata: any = null;
    if (images && images.length > 0) {
      try {
        const firstImage = images[0];

        const { data: categories } = await supabase
          .from('categories')
          .select('id, name, description');

        aiGeneratedMetadata = await aiService.generateMetadataFromImage(
          firstImage.path,
          categories || [],
          firstImage.filename
        );

        caption = aiGeneratedMetadata.caption;

        if (!title && aiGeneratedMetadata.caption) {
          title = aiGeneratedMetadata.caption.substring(0, 100); // Use caption as title
          }
        if (!description && aiGeneratedMetadata.description) {
          description = aiGeneratedMetadata.description;
        }
        if ((!tags || tags.length === 0) && aiGeneratedMetadata.tags.length > 0) {
          tags = aiGeneratedMetadata.tags;
        }
        if (!category_id && aiGeneratedMetadata.category_id) {
          category_id = aiGeneratedMetadata.category_id;
        }
      } catch (error: any) {
        if (!title && images[0].filename) {
          title = images[0].filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        }
      }
    }

    if (!title || title.trim() === '') {
      title = 'Untitled Post';
    }

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
      throw new Error(postError?.message || 'Failed to create post');
    }

    let userCaptions: string[] = [];
    if (data.user_captions) {
      if (typeof data.user_captions === 'string') {
        try {
          userCaptions = JSON.parse(data.user_captions);
        } catch (e) {
          userCaptions = data.user_captions ? [data.user_captions] : [];
        }
      } else {
        userCaptions = data.user_captions;
      }
    }

    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, description');

    const categoryLabels = categories?.map(c => c.name) || [];

    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imagePath = image.path;

        let embedding: number[] | undefined;
        try {
          const aiFeatures = await aiService.generateImageFeatures(imagePath);
          embedding = aiFeatures.embedding;
        } catch (error) {
          // Error handling
        }

        let aiCaption: string | undefined;
        try {
          const clipResult = await aiService.generateCaptionWithClip(imagePath, categoryLabels);
          aiCaption = clipResult.caption;
        } catch (error) {
          // Error handling
        }

        const userCaption = userCaptions[i]?.trim() || undefined;

        // Upload to Supabase Storage
        let imageUrl: string;
        try {
          imageUrl = await storageService.uploadFile(imagePath, 'posts');
          
          // Delete local file after successful upload
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (error: any) {
          // If upload fails, keep local file and use local URL
          imageUrl = `/uploads/${image.filename}`;
        }

        const imageData: any = {
          post_id: newPost.id,
          image_url: imageUrl,
          image_path: imageUrl, // Store Supabase URL in image_path as well
          display_order: i,
        };

        if (embedding && embedding.length > 0) {
          if (embedding.length !== 512) {
            if (embedding.length < 512) {
              embedding = [...embedding, ...new Array(512 - embedding.length).fill(0)];
            } else {
              embedding = embedding.slice(0, 512);
            }
          }
          imageData.embedding = embedding;
        }

        if (aiCaption) {
          imageData.ai_caption = aiCaption;
        }

        if (userCaption) {
          imageData.user_caption = userCaption;
        }

        const { error: imageError } = await supabase
          .from('post_images')
          .insert(imageData);
        
        if (imageError) {
          if (imageError.message?.includes('ai_caption') || imageError.message?.includes('user_caption')) {
            throw new Error('Database migration required. Please run MIGRATION_AI_CAPTION.sql in Supabase SQL Editor');
          }
          throw imageError;
        }
      }
    }

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

  async getPostById(postId: string, userId?: string): Promise<any> {
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

    const { data: images } = await supabase
      .from('post_images')
      .select('*')
      .eq('post_id', postId)
      .order('display_order');

    let isLiked = false;
    if (userId) {
      const { data: like } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      isLiked = !!like;

      await this.trackActivity(userId, postId, 'view');
    }

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
      const searchTerm = filters.search.toLowerCase();
      
      const { data: postsByText } = await supabase
        .from('posts')
        .select('id')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      
      const postIdsByText = postsByText?.map(p => p.id) || [];
      
      const { data: imagesByCaption } = await supabase
        .from('post_images')
        .select('post_id')
        .ilike('ai_caption', `%${searchTerm}%`);
      
      const postIdsByCaption = imagesByCaption?.map(img => img.post_id) || [];
      
      const { data: categoriesBySearch } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', `%${searchTerm}%`);
      
      const categoryIdsBySearch = categoriesBySearch?.map(c => c.id) || [];
      
      const allPostIds = [...new Set([...postIdsByText, ...postIdsByCaption])];
      
      if (allPostIds.length > 0 || categoryIdsBySearch.length > 0) {
        if (allPostIds.length > 0 && categoryIdsBySearch.length > 0) {
          query = query.or(`id.in.(${allPostIds.join(',')}),category_id.in.(${categoryIdsBySearch.join(',')})`);
        } else if (allPostIds.length > 0) {
          query = query.in('id', allPostIds);
        } else if (categoryIdsBySearch.length > 0) {
          query = query.in('category_id', categoryIdsBySearch);
        }
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    let followedUserIds: string[] = [];
    if (currentUserId) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);
      
      followedUserIds = follows?.map(f => f.following_id) || [];
    }

    const { data: allPosts, error, count } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch posts');
    }

    const sortedPosts = (allPosts || []).sort((a, b) => {
      const aIsFollowed = followedUserIds.includes(a.user_id);
      const bIsFollowed = followedUserIds.includes(b.user_id);
      
      if (aIsFollowed && !bIsFollowed) return -1;
      if (!aIsFollowed && bIsFollowed) return 1;
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const offset = (page - 1) * limit;
    const paginatedPosts = sortedPosts.slice(offset, offset + limit);

    const postsWithImages = await Promise.all(
      paginatedPosts.map(async (post) => {
        const { data: images } = await supabase
          .from('post_images')
          .select('*')
          .eq('post_id', post.id)
          .order('display_order')
          .limit(1);

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

  async updatePost(
    postId: string,
    userId: string,
    data: UpdatePostDTO
  ): Promise<Post> {
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      throw new Error('Post not found');
    }

    if (post.user_id !== userId) {
      throw new Error('You can only edit your own posts');
    }

    const updateData: any = {};

    if (data.title !== undefined) {
      if (!data.title || data.title.trim() === '') {
        throw new Error('Title is required');
      }
      updateData.title = data.title.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description.trim() || null;
    }

    if (data.category_id !== undefined) {
      updateData.category_id = data.category_id || null;
    }

    if (data.tags !== undefined) {
      updateData.tags = data.tags.length > 0 ? data.tags : null;
    }

    if (data.visibility !== undefined) {
      updateData.visibility = data.visibility;
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single();

    if (updateError || !updatedPost) {
      throw new Error('Failed to update post');
    }

    const { data: postWithRelations } = await supabase
      .from('posts')
      .select(`
        *,
        user:users(id, first_name, last_name, avatar_url),
        category:categories(id, name, slug)
      `)
      .eq('id', postId)
      .single();

    const { data: images } = await supabase
      .from('post_images')
      .select('*')
      .eq('post_id', postId)
      .order('display_order');

    return {
      ...postWithRelations,
      images: images || [],
    };
  }

  async trackActivity(userId: string, postId: string, activityType: string): Promise<void> {
    await supabase.from('user_activities').insert({
      user_id: userId,
      post_id: postId,
      activity_type: activityType,
    });
  }
}

