import { supabase } from '../config/supabase';
import { User } from '../types';

export class UserService {
  // Get user profile
  async getUserProfile(userId: string): Promise<any> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    // Get user statistics
    const { count: postCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: posts } = await supabase
      .from('posts')
      .select('like_count, comment_count')
      .eq('user_id', userId);

    const totalLikes = posts?.reduce((sum, post) => sum + post.like_count, 0) || 0;
    const totalComments = posts?.reduce((sum, post) => sum + post.comment_count, 0) || 0;

    // Get survey data
    const { data: survey } = await supabase
      .from('surveys')
      .select('*')
      .eq('user_id', userId)
      .single();

    return {
      ...user,
      statistics: {
        postCount: postCount || 0,
        totalLikes,
        totalComments,
      },
      survey: survey || null,
    };
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const allowedFields = [
      'first_name',
      'last_name',
      'phone',
      'date_of_birth',
      'job',
      'bio',
      'avatar_url',
      'cover_url',
    ];

    const filteredUpdates: any = {};
    for (const field of allowedFields) {
      if (updates[field as keyof User] !== undefined) {
        filteredUpdates[field] = updates[field as keyof User];
      }
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(filteredUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error || !updatedUser) {
      throw new Error('Failed to update profile');
    }

    return updatedUser;
  }

  // Get user posts
  async getUserPosts(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    const offset = (page - 1) * limit;

    const { data: posts, error, count } = await supabase
      .from('posts')
      .select(`
        *,
        category:categories(id, name, slug)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch user posts');
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

  // Get user activities
  async getUserActivities(userId: string, activityType?: string): Promise<any[]> {
    let query = supabase
      .from('user_activities')
      .select(`
        *,
        post:posts(
          *,
          user:users(id, first_name, last_name, avatar_url),
          category:categories(id, name, slug)
        )
      `)
      .eq('user_id', userId);

    if (activityType) {
      query = query.eq('activity_type', activityType);
    }

    query = query.order('created_at', { ascending: false }).limit(100);

    const { data: activities, error } = await query;

    if (error) {
      throw new Error('Failed to fetch user activities');
    }

    return activities || [];
  }

  // Get liked posts
  async getLikedPosts(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    const offset = (page - 1) * limit;

    const { data: likes, error, count } = await supabase
      .from('likes')
      .select(`
        *,
        post:posts(
          *,
          user:users(id, first_name, last_name, avatar_url),
          category:categories(id, name, slug)
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch liked posts');
    }

    // Get first image for each post
    const postsWithImages = await Promise.all(
      (likes || []).map(async (like) => {
        const { data: images } = await supabase
          .from('post_images')
          .select('*')
          .eq('post_id', like.post.id)
          .order('display_order')
          .limit(1);

        return {
          ...like.post,
          image: images?.[0] || null,
        };
      })
    );

    return {
      posts: postsWithImages,
      total: count || 0,
    };
  }
}

