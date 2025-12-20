import { Response } from 'express';
import { UserService } from '../services/user.service';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthRequest } from '../types';
import { notificationService } from '../services/notification.service';
import { supabase } from '../config/supabase';

const userService = new UserService();

export class UserController {
  async getUserProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;
      const profile = await userService.getUserProfile(userId, currentUserId);

      return successResponse(res, profile);
    } catch (error: any) {
      return errorResponse(res, error.message, 404);
    }
  }

  async searchUsers(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return errorResponse(res, 'Search query is required', 400);
      }

      const users = await userService.searchUsers(q);
      return successResponse(res, users);
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

  async getCurrentUserProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const profile = await userService.getUserProfile(req.user.id);

      return successResponse(res, profile);
    } catch (error: any) {
      return errorResponse(res, error.message, 404);
    }
  }

  async updateUserProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const updates = req.body;
      const updatedUser = await userService.updateUserProfile(req.user.id, updates);

      return successResponse(res, updatedUser, 'Profile updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getCurrentUserPosts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { posts, total } = await userService.getUserPosts(req.user.id, page, limit, req.user.id);

      return paginatedResponse(res, posts, page, limit, total);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getUserPosts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const currentUserId = req.user?.id;

      const { posts, total } = await userService.getUserPosts(userId, page, limit, currentUserId);

      return paginatedResponse(res, posts, page, limit, total);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getUserActivities(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const activityType = req.query.type as string;
      const activities = await userService.getUserActivities(req.user.id, activityType);

      return successResponse(res, activities);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getLikedPosts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { posts, total } = await userService.getLikedPosts(req.user.id, page, limit);

      return paginatedResponse(res, posts, page, limit, total);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async uploadAvatar(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const file = req.file;
      if (!file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const { storageService } = await import('../services/storage.service');
      const fs = await import('fs');
      
      let avatarUrl: string;
      try {
        avatarUrl = await storageService.uploadFile(file.path, 'avatars');
        
        // Delete local file after successful upload
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (error: any) {
        // If upload fails, keep local file and use local URL
        avatarUrl = `/uploads/${file.filename}`;
      }

      const updatedUser = await userService.updateUserProfile(req.user.id, {
        avatar_url: avatarUrl,
      });

      return successResponse(res, updatedUser, 'Avatar uploaded successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async uploadCover(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const file = req.file;
      if (!file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const { storageService } = await import('../services/storage.service');
      const fs = await import('fs');
      
      let coverUrl: string;
      try {
        coverUrl = await storageService.uploadFile(file.path, 'covers');
        
        // Delete local file after successful upload
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (error: any) {
        // If upload fails, keep local file and use local URL
        coverUrl = `/uploads/${file.filename}`;
      }

      const updatedUser = await userService.updateUserProfile(req.user.id, {
        cover_url: coverUrl,
      });

      return successResponse(res, updatedUser, 'Cover image uploaded successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getTopCreators(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const creators = await userService.getTopCreators(limit);

      return successResponse(res, creators);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getMostFavorite(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const creators = await userService.getMostFavorite(limit);

      return successResponse(res, creators);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getMostViewed(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const creators = await userService.getMostViewed(limit);

      return successResponse(res, creators);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getMostActive(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const creators = await userService.getMostActive(limit);

      return successResponse(res, creators);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getRelatedUsers(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const relatedUsers = await userService.getRelatedUsers(req.user.id, limit);

      return successResponse(res, relatedUsers);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async followUser(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { userId } = req.params;
      await userService.followUser(req.user.id, userId);

      const { data: currentUser } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', req.user.id)
        .single();

      const { data: followingUser } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      if (followingUser && currentUser) {
        await notificationService.createNotification({
          user_id: userId,
          type: 'follow',
          content: `${currentUser.first_name} ${currentUser.last_name} started following you`,
          related_user_id: req.user.id,
        });
      }

      return successResponse(res, null, 'Followed successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async unfollowUser(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { userId } = req.params;
      await userService.unfollowUser(req.user.id, userId);

      return successResponse(res, null, 'Unfollowed successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getFollowers(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const currentUserId = req.user?.id;

      const { followers, total } = await userService.getFollowers(userId, page, limit, currentUserId);

      return paginatedResponse(res, followers, page, limit, total);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async getFollowing(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const currentUserId = req.user?.id;

      const { following, total } = await userService.getFollowing(userId, page, limit, currentUserId);

      return paginatedResponse(res, following, page, limit, total);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }
}

