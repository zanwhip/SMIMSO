import { supabase } from '../config/supabase';
import { Comment } from '../types';
import { notificationService } from './notification.service';

export class InteractionService {
  async likePost(userId: string, postId: string): Promise<void> {
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (checkError) {
      throw new Error('Failed to check like status');
    }

    if (existingLike) {
      await this.unlikePost(userId, postId);
      return;
    }

    const { error: insertError } = await supabase.from('likes').insert({
      user_id: userId,
      post_id: postId,
    });

    if (insertError) {
      throw new Error('Failed to like post: ' + insertError.message);
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('like_count, user_id, title')
      .eq('id', postId)
      .single();

    if (postError) {
      // Error handling
    }

    if (post) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ like_count: (post.like_count || 0) + 1 })
        .eq('id', postId);

      if (updateError) {
        // Error handling
      }

      if (post.user_id !== userId) {
        try {
          const { data: liker } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', userId)
            .single();

          await notificationService.createNotification({
            user_id: post.user_id,
            type: 'like',
            content: `${liker?.first_name} ${liker?.last_name} liked your post "${post.title}"`,
            related_user_id: userId,
            post_id: postId,
          });
          } catch (error) {
          }
      }
    }

    await supabase.from('user_activities').insert({
      user_id: userId,
      post_id: postId,
      activity_type: 'like',
    });
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    const { error: deleteError } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);

    if (deleteError) {
      throw new Error('Failed to unlike post: ' + deleteError.message);
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('like_count')
      .eq('id', postId)
      .single();

    if (postError) {
      // Error handling
    }

    if (post && (post.like_count || 0) > 0) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ like_count: (post.like_count || 0) - 1 })
        .eq('id', postId);

      if (updateError) {
        // Error handling
      }
    }
  }

  async addComment(
    userId: string,
    postId: string,
    content: string,
    parentCommentId?: string
  ): Promise<Comment> {
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        post_id: postId,
        parent_comment_id: parentCommentId,
        content,
      })
      .select()
      .single();

    if (error || !comment) {
      throw new Error('Failed to add comment');
    }

    const { data: post } = await supabase
      .from('posts')
      .select('comment_count, user_id, title')
      .eq('id', postId)
      .single();

    if (post) {
      await supabase
        .from('posts')
        .update({ comment_count: post.comment_count + 1 })
        .eq('id', postId);

      if (post.user_id !== userId) {
        try {
          const { data: commenter } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', userId)
            .single();

          await notificationService.createNotification({
            user_id: post.user_id,
            type: 'comment',
            content: `${commenter?.first_name} ${commenter?.last_name} commented on your post "${post.title}"`,
            related_user_id: userId,
            post_id: postId,
          });
          } catch (error) {
          }
      }
    }

    await supabase.from('user_activities').insert({
      user_id: userId,
      post_id: postId,
      activity_type: 'comment',
    });

    return comment;
  }

  async getComments(postId: string): Promise<any[]> {
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users(id, first_name, last_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error('Failed to fetch comments');
    }

    return comments || [];
  }

  async deleteComment(userId: string, commentId: string): Promise<void> {
    const { data: comment } = await supabase
      .from('comments')
      .select('user_id, post_id')
      .eq('id', commentId)
      .single();

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.user_id !== userId) {
      throw new Error('Unauthorized to delete this comment');
    }

    const { error } = await supabase.from('comments').delete().eq('id', commentId);

    if (error) {
      throw new Error('Failed to delete comment');
    }

    const { data: post } = await supabase
      .from('posts')
      .select('comment_count')
      .eq('id', comment.post_id)
      .single();

    if (post && post.comment_count > 0) {
      await supabase
        .from('posts')
        .update({ comment_count: post.comment_count - 1 })
        .eq('id', comment.post_id);
    }
  }

  async savePost(userId: string, postId: string): Promise<void> {
    const { data: existing } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .single();

    if (existing) {
      throw new Error('Post already saved');
    }

    const { error } = await supabase.from('saved_posts').insert({
      user_id: userId,
      post_id: postId,
    });

    if (error) {
      throw new Error('Failed to save post');
    }

    await supabase.from('user_activities').insert({
      user_id: userId,
      post_id: postId,
      activity_type: 'save',
    });
  }

  async unsavePost(userId: string, postId: string): Promise<void> {
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);

    if (error) {
      throw new Error('Failed to unsave post');
    }
  }

  async getSavedPosts(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    const offset = (page - 1) * limit;

    const { data: savedPosts, error, count } = await supabase
      .from('saved_posts')
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
      throw new Error('Failed to fetch saved posts');
    }

    return {
      posts: savedPosts?.map(sp => sp.post) || [],
      total: count || 0,
    };
  }
}

