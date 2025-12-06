import { supabase } from '../config/supabase';
import { User } from '../types';

export class UserService {
  async getUserProfile(userId: string, currentUserId?: string): Promise<any> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

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

    const { count: followerCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    let isFollowing = false;
    if (currentUserId && currentUserId !== userId) {
      const { data: follow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', userId)
        .maybeSingle();
      
      isFollowing = !!follow;
    }

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
        followerCount: followerCount || 0,
        followingCount: followingCount || 0,
      },
      isFollowing,
      survey: survey || null,
    };
  }

  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;
    return users || [];
  }

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

  async getUserPosts(userId: string, page: number = 1, limit: number = 20, currentUserId?: string): Promise<any> {
    const offset = (page - 1) * limit;

    const { data: posts, error, count } = await supabase
      .from('posts')
      .select(`
        *,
        user:users(id, first_name, last_name, avatar_url),
        category:categories(id, name, slug)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch user posts');
    }

    const postsWithImages = await Promise.all(
      (posts || []).map(async (post) => {
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

  async getTopCreators(limit: number = 10): Promise<any[]> {
    try {
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
        return [];
      }

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

      return usersWithLikes
        .filter(user => user.totalLikes > 0)
        .sort((a, b) => b.totalLikes - a.totalLikes)
        .slice(0, limit);
    } catch (error) {
      return [];
    }
  }

  async getRelatedUsers(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data: userLikes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId);

      if (!userLikes || userLikes.length === 0) {
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

      const { data: commonLikes } = await supabase
        .from('likes')
        .select('user_id')
        .in('post_id', likedPostIds)
        .neq('user_id', userId);

      if (!commonLikes || commonLikes.length === 0) {
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

      const userLikeCounts: { [key: string]: number } = {};
      commonLikes.forEach(like => {
        userLikeCounts[like.user_id] = (userLikeCounts[like.user_id] || 0) + 1;
      });

      const sortedUserIds = Object.entries(userLikeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(entry => entry[0]);

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
      return [];
    }
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (existingFollow) {
      throw new Error('Already following this user');
    }

    const { data: follower } = await supabase
      .from('users')
      .select('id')
      .eq('id', followerId)
      .single();

    const { data: following } = await supabase
      .from('users')
      .select('id')
      .eq('id', followingId)
      .single();

    if (!follower || !following) {
      throw new Error('User not found');
    }

    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: followingId,
      });

    if (error) {
      throw new Error('Failed to follow user');
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new Error('Cannot unfollow yourself');
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      throw new Error('Failed to unfollow user');
    }
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    return !!data;
  }

  async getFollowers(userId: string, page: number = 1, limit: number = 20, currentUserId?: string): Promise<any> {
    const offset = (page - 1) * limit;

    const { data: follows, error, count } = await supabase
      .from('follows')
      .select(`
        *,
        follower:users!follows_follower_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url,
          bio,
          job
        )
      `, { count: 'exact' })
      .eq('following_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch followers');
    }

    const followers = (follows || []).map(f => f.follower);

    if (currentUserId) {
      const followerIds = followers.map(f => f.id);
      if (followerIds.length > 0) {
        const { data: followStatuses } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
          .in('following_id', followerIds);

        const followingSet = new Set(followStatuses?.map(f => f.following_id) || []);
        
        followers.forEach(follower => {
          follower.isFollowing = followingSet.has(follower.id);
        });
      }
    }

    return {
      followers,
      total: count || 0,
    };
  }

  async getFollowing(userId: string, page: number = 1, limit: number = 20, currentUserId?: string): Promise<any> {
    const offset = (page - 1) * limit;

    const { data: follows, error, count } = await supabase
      .from('follows')
      .select(`
        *,
        following:users!follows_following_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url,
          bio,
          job
        )
      `, { count: 'exact' })
      .eq('follower_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch following');
    }

    const following = (follows || []).map(f => f.following);

    if (currentUserId) {
      const followingIds = following.map(f => f.id);
      if (followingIds.length > 0) {
        const { data: followStatuses } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
          .in('following_id', followingIds);

        const followingSet = new Set(followStatuses?.map(f => f.following_id) || []);
        
        following.forEach(user => {
          user.isFollowing = followingSet.has(user.id);
        });
      }
    }

    return {
      following,
      total: count || 0,
    };
  }
}

