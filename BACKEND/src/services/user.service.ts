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

  // Search users
  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;
    return users || [];
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

  // Get top creators (users with most likes on their posts)
  async getTopCreators(limit: number = 10): Promise<any[]> {
    try {
      // Get all users with their total likes
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          avatar_url,
          bio,
          job
        `)
        .eq('is_active', true)
        .limit(100); // Get more users to calculate likes

      if (error || !users) {
        console.error('Error fetching users:', error);
        return [];
      }

      // Calculate total likes for each user
      const usersWithLikes = await Promise.all(
        users.map(async (user) => {
          const { data: posts } = await supabase
            .from('posts')
            .select('like_count')
            .eq('user_id', user.id);

          const totalLikes = posts?.reduce((sum, post) => sum + (post.like_count || 0), 0) || 0;

          return {
            ...user,
            totalLikes,
          };
        })
      );

      // Sort by total likes and return top creators
      return usersWithLikes
        .filter(user => user.totalLikes > 0)
        .sort((a, b) => b.totalLikes - a.totalLikes)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting top creators:', error);
      return [];
    }
  }

  // Get related users (users with common interests, follows, etc.)
  async getRelatedUsers(userId: string, limit: number = 10): Promise<any[]> {
    try {
      // Get current user's liked posts to find common interests
      const { data: userLikes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId);

      if (!userLikes || userLikes.length === 0) {
        // If no likes, return random active users
        const { data: randomUsers } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            avatar_url,
            bio,
            job
          `)
          .eq('is_active', true)
          .neq('id', userId)
          .limit(limit);

        return randomUsers || [];
      }

      const likedPostIds = userLikes.map(like => like.post_id);

      // Find users who liked the same posts
      const { data: commonLikes } = await supabase
        .from('likes')
        .select('user_id')
        .in('post_id', likedPostIds)
        .neq('user_id', userId);

      if (!commonLikes || commonLikes.length === 0) {
        // If no common likes, return random users
        const { data: randomUsers } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            avatar_url,
            bio,
            job
          `)
          .eq('is_active', true)
          .neq('id', userId)
          .limit(limit);

        return randomUsers || [];
      }

      // Count common likes for each user
      const userLikeCounts: { [key: string]: number } = {};
      commonLikes.forEach(like => {
        userLikeCounts[like.user_id] = (userLikeCounts[like.user_id] || 0) + 1;
      });

      // Sort users by common likes count
      const sortedUserIds = Object.entries(userLikeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(entry => entry[0]);

      // Get user details
      const { data: relatedUsers } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          avatar_url,
          bio,
          job
        `)
        .in('id', sortedUserIds)
        .eq('is_active', true);

      return relatedUsers || [];
    } catch (error) {
      console.error('Error getting related users:', error);
      return [];
    }
  }
}

