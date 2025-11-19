import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { successResponse, errorResponse } from '../utils/response';
import { RegisterDTO, LoginDTO, GoogleLoginDTO, AuthRequest } from '../types';

const authService = new AuthService();

export class AuthController {
  // Register
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const data: RegisterDTO = req.body;
      const result = await authService.register(data);

      return successResponse(
        res,
        {
          user: {
            id: result.user.id,
            email: result.user.email,
            first_name: result.user.first_name,
            last_name: result.user.last_name,
            avatar_url: result.user.avatar_url,
          },
          token: result.token,
        },
        'Registration successful',
        201
      );
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Login
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const data: LoginDTO = req.body;
      const result = await authService.login(data);

      return successResponse(res, {
        user: {
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          avatar_url: result.user.avatar_url,
        },
        token: result.token,
      }, 'Login successful');
    } catch (error: any) {
      return errorResponse(res, error.message, 401);
    }
  }

  // Google Login
  async googleLogin(req: Request, res: Response): Promise<Response> {
    try {
      const data: GoogleLoginDTO = req.body;
      const result = await authService.googleLogin(data);

      return successResponse(res, {
        user: {
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          avatar_url: result.user.avatar_url,
        },
        token: result.token,
        isNewUser: result.isNewUser,
      }, 'Google login successful');
    } catch (error: any) {
      return errorResponse(res, error.message, 401);
    }
  }

  // Get current user
  async getCurrentUser(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Not authenticated', 401);
      }

      const user = await authService.getUserById(req.user.id);

      return successResponse(res, {
        id: user.id,
        email: user.email,
        phone: user.phone,
        first_name: user.first_name,
        last_name: user.last_name,
        date_of_birth: user.date_of_birth,
        job: user.job,
        avatar_url: user.avatar_url,
        cover_url: user.cover_url,
        bio: user.bio,
        auth_provider: user.auth_provider,
        is_verified: user.is_verified,
        created_at: user.created_at,
      });
    } catch (error: any) {
      return errorResponse(res, error.message, 400);
    }
  }
}

