import { Response } from 'express';
import { UserService } from '../services/user.service';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthRequest } from '../types';

const userService = new UserService();

export class UserController {
  // Get user profile
  async getUserProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const profile = await userService.getUserProfile(userId);

      return successResponse(res, profile);
    } catch (error: any) {
      return errorResponse(res, error.message, 404);
    }
  }

  // Get current user profile
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

  // Update user profile
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

  // Get user posts
  async getUserPosts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { posts, total } = await userService.getUserPosts(userId, page, limit);

      return paginatedResponse(res, posts, page, limit, total);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Get user activities
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

  // Get liked posts
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

  // Upload avatar
  async uploadAvatar(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const file = req.file;
      if (!file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const avatarUrl = `/uploads/${file.filename}`;
      const updatedUser = await userService.updateUserProfile(req.user.id, {
        avatar_url: avatarUrl,
      });

      return successResponse(res, updatedUser, 'Avatar uploaded successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Upload cover
  async uploadCover(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const file = req.file;
      if (!file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const coverUrl = `/uploads/${file.filename}`;
      const updatedUser = await userService.updateUserProfile(req.user.id, {
        cover_url: coverUrl,
      });

      return successResponse(res, updatedUser, 'Cover image uploaded successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }
}

