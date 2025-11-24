import { Response } from 'express';
import { PostService } from '../services/post.service';
import { InteractionService } from '../services/interaction.service';
import { AIService } from '../services/ai.service';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthRequest, CreatePostDTO } from '../types';
import supabase from '../config/supabase';
import { uploadChatFile } from '../middleware/upload.middleware';

const postService = new PostService();
const interactionService = new InteractionService();
const aiService = new AIService();

export class PostController {
  // Generate metadata from image (for preview before creating post)
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
      console.log('🤖 Generating metadata for image:', firstImage.filename);

      // Get categories for CLIP classification
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, description');

      // Generate metadata using AI
      const metadata = await aiService.generateMetadataFromImage(
        firstImage.path,
        categories || [],
        firstImage.filename
      );

      console.log('✅ Generated metadata:', metadata);

      return successResponse(res, metadata, 'Metadata generated successfully');
    } catch (error: any) {
      console.error('❌ Generate metadata error:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  // Create post
  async createPost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const data: CreatePostDTO = req.body;
      const images = req.files as Express.Multer.File[];

      console.log('📝 Create post request:', {
        user: req.user.id,
        data,
        filesCount: images?.length || 0,
      });

      if (!images || images.length === 0) {
        return errorResponse(res, 'At least one image is required', 400);
      }

      const post = await postService.createPost(req.user.id, data, images);

      return successResponse(res, post, 'Post created successfully', 201);
    } catch (error: any) {
      console.error('❌ Create post error:', error);
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

  // Get user posts
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

  // Like post
  async likePost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const { postId } = req.params;
      console.log('❤️ Like post request:', { userId: req.user.id, postId });

      await interactionService.likePost(req.user.id, postId);

      return successResponse(res, null, 'Post liked successfully');
    } catch (error: any) {
      console.error('❌ Like post error:', error);
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
      console.log('💔 Unlike post request:', { userId: req.user.id, postId });

      await interactionService.unlikePost(req.user.id, postId);

      return successResponse(res, null, 'Post unliked successfully');
    } catch (error: any) {
      console.error('❌ Unlike post error:', error);
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

  // Upload file (for chat or posts)
  async uploadFile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const file = req.file;
      if (!file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const fileUrl = `/uploads/${file.filename}`;

      return successResponse(res, { url: fileUrl, filename: file.filename }, 'File uploaded successfully');
    } catch (error: any) {
      console.error('❌ Upload file error:', error);
      return errorResponse(res, error.message, 500);
    }
  }
}

