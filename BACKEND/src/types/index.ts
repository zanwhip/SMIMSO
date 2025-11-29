import { Request } from 'express';

// =============================================
// User Types
// =============================================
export interface User {
  id: string;
  email: string;
  phone?: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
  date_of_birth?: Date;
  job?: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  auth_provider: 'credential' | 'google';
  google_id?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RegisterDTO {
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  job?: string;
}

export interface LoginDTO {
  emailOrPhone: string;
  password: string;
  rememberMe?: boolean;
}

export interface GoogleLoginDTO {
  token: string;
}

// =============================================
// Survey Types
// =============================================
export interface Survey {
  id: string;
  user_id: string;
  favorite_categories: string[];
  usage_purposes: string[];
  awareness_source: string;
  expectation_level?: number;
  completed_at: Date;
}

export interface SurveyDTO {
  favorite_categories: string[];
  usage_purposes: string[];
  awareness_source: string;
  expectation_level?: number;
}

// =============================================
// Category Types
// =============================================
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon_url?: string;
  created_at: Date;
}

// =============================================
// Post Types
// =============================================
export interface Post {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category_id?: string;
  tags?: string[];
  visibility: 'public' | 'friends' | 'private';
  caption?: string; // AI-generated caption from first image
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface PostImage {
  id: string;
  post_id: string;
  image_url: string;
  image_path: string;
  width?: number;
  height?: number;
  file_size?: number;
  embedding?: number[];
  caption?: string;
  display_order: number;
  created_at: Date;
}

export interface CreatePostDTO {
  title: string;
  description?: string;
  category_id?: string;
  tags?: string[] | string; // Can be array or JSON string from FormData
  visibility?: 'public' | 'friends' | 'private';
  user_captions?: string[] | string; // Array of user captions for each image, can be JSON string from FormData
}

export interface UpdatePostDTO {
  title?: string;
  description?: string;
  category_id?: string;
  tags?: string[];
  visibility?: 'public' | 'friends' | 'private';
}

// =============================================
// Comment Types
// =============================================
export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  parent_comment_id?: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCommentDTO {
  post_id: string;
  parent_comment_id?: string;
  content: string;
}

// =============================================
// Activity Types
// =============================================
export interface UserActivity {
  id: string;
  user_id: string;
  post_id: string;
  activity_type: 'view' | 'like' | 'comment' | 'save' | 'share';
  created_at: Date;
}

// =============================================
// AI Types
// =============================================
export interface ImageEmbedding {
  embedding: number[];
  caption?: string;
}

export interface SimilarityResult {
  post_id: string;
  similarity_score: number;
}

// =============================================
// Request Types
// =============================================
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// =============================================
// Response Types
// =============================================
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

