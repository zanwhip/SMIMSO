import { Response } from 'express';
import { PostService } from '../services/post.service';
import { InteractionService } from '../services/interaction.service';
import { AIService } from '../services/ai.service';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthRequest, CreatePostDTO, UpdatePostDTO } from '../types';
import supabase from '../config/supabase';
import { uploadChatFile } from '../middleware/upload.middleware';

const postService = new PostService();
const interactionService = new InteractionService();
const aiService = new AIService();

export class PostController {
  async generateCaption(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const file = req.file;

      if (!file) {
        return errorResponse(res, 'Image file is required', 400);
      }

      let categoryLabels: string[] = [];
      try {
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name, description');
        categoryLabels = categories?.map(c => c.name) || [];
        } catch (error: any) {
        }

      let result;
      try {
        result = await aiService.generateCaptionWithClip(file.path, categoryLabels);
        
        if (!result.caption || result.caption.trim() === '') {
          result.caption = 'Beautiful Image';
        }
        
        } catch (error: any) {
        result = {
          caption: 'Beautiful Image',
          category_label: undefined,
          category_score: undefined,
        };
      }

      return successResponse(res, result, 'Caption generated successfully');
    } catch (error: any) {
      return successResponse(res, {
        caption: 'Beautiful Image',
        category_label: undefined,
        category_score: undefined,
      }, 'Caption generated with fallback');
    }
  }

  async generateMetadata(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const images = req.files as Express.Multer.File[];

      if (!images || images.length === 0) {
        return errorResponse(res, 'At least one image is required', 400);
      }

      const firstImage = images[0];
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, description');

      const metadata = await aiService.generateMetadataFromImage(
        firstImage.path,
        categories || [],
        firstImage.filename
      );

      return successResponse(res, metadata, 'Metadata generated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }

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

  async getPosts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const categoryId = req.query.categoryId as string;
      const search = req.query.search as string;
      const currentUserId = req.user?.id; // Get current user ID from auth

      const { posts, total } = await postService.getPosts(page, limit, {
        categoryId,
        search,
      }, currentUserId);

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
      const currentUserId = req.user?.id; // Get current user ID from auth

      const { posts, total } = await postService.getPosts(page, limit, {
        userId,
      }, currentUserId);

      return paginatedResponse(res, posts, page, limit, total);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async likePost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { postId } = req.params;
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('post_id', postId)
        .maybeSingle();

      const wasLiked = !!existingLike;

      await interactionService.likePost(req.user.id, postId);

      if (wasLiked) {
        return successResponse(res, null, 'Post unliked successfully');
      } else {
        return successResponse(res, null, 'Post liked successfully');
      }
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

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

  async getComments(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { postId } = req.params;
      const comments = await interactionService.getComments(postId);

      return successResponse(res, comments);
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

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

  async updatePost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { id } = req.params;
      const data: UpdatePostDTO = req.body;

      const post = await postService.updatePost(id, req.user.id, data);

      return successResponse(res, post, 'Post updated successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  async uploadFile(req: AuthRequest, res: Response): Promise<Response> {
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
      
      let fileUrl: string;
      try {
        fileUrl = await storageService.uploadFile(file.path, 'chat');
        
        // Delete local file after successful upload
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (error: any) {
        // If upload fails, keep local file and use local URL
        fileUrl = `/uploads/${file.filename}`;
      }

      return successResponse(res, { url: fileUrl, filename: file.filename }, 'File uploaded successfully');
    } catch (error: any) {
      return errorResponse(res, error.message, 500);
    }
  }
}

