import { Response } from 'express';
import { PostService } from '../services/post.service';
import { InteractionService } from '../services/interaction.service';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthRequest, CreatePostDTO } from '../types';

const postService = new PostService();
const interactionService = new InteractionService();

export class PostController {
  // Create post
  async createPost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const data: CreatePostDTO = req.body;
      const images = req.files as Express.Multer.File[];

      if (!images || images.length === 0) {
        return errorResponse(res, 'At least one image is required', 400);
      }

      const post = await postService.createPost(req.user.id, data, images);

      return successResponse(res, post, 'Post created successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Get post by ID
  async getPostById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const post = await postService.getPostById(id, userId);

      return successResponse(res, post);
    } catch (error: any) {
      return errorResponse(res, error.message, 404);
    }
  }

  // Get posts list
  async getPosts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const categoryId = req.query.categoryId as string;
      const search = req.query.search as string;

      const { posts, total } = await postService.getPosts(page, limit, {
        categoryId,
        search,
      });

      return paginatedResponse(res, posts, page, limit, total);
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

      const { posts, total } = await postService.getPosts(page, limit, {
        userId,
      });

      return paginatedResponse(res, posts, page, limit, total);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Like post
  async likePost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { postId } = req.params;
      await interactionService.likePost(req.user.id, postId);

      return successResponse(res, null, 'Post liked successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Unlike post
  async unlikePost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { postId } = req.params;
      await interactionService.unlikePost(req.user.id, postId);

      return successResponse(res, null, 'Post unliked successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Add comment
  async addComment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { postId } = req.params;
      const { content, parent_comment_id } = req.body;

      const comment = await interactionService.addComment(
        req.user.id,
        postId,
        content,
        parent_comment_id
      );

      return successResponse(res, comment, 'Comment added successfully', 201);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Get comments
  async getComments(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { postId } = req.params;
      const comments = await interactionService.getComments(postId);

      return successResponse(res, comments);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Save post
  async savePost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { postId } = req.params;
      await interactionService.savePost(req.user.id, postId);

      return successResponse(res, null, 'Post saved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Unsave post
  async unsavePost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { postId } = req.params;
      await interactionService.unsavePost(req.user.id, postId);

      return successResponse(res, null, 'Post unsaved successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }
}

