// User Types
export interface User {
  id: string;
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  job?: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  auth_provider: 'credential' | 'google';
  is_verified: boolean;
  created_at: string;
}

export interface RegisterData {
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  job?: string;
}

export interface LoginData {
  emailOrPhone: string;
  password: string;
  rememberMe?: boolean;
}

// Survey Types
export interface Survey {
  id: string;
  user_id: string;
  favorite_categories: string[];
  usage_purposes: string[];
  awareness_source: string;
  expectation_level?: number;
  completed_at: string;
}

export interface SurveyData {
  favorite_categories: string[];
  usage_purposes: string[];
  awareness_source: string;
  expectation_level?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon_url?: string;
}

// Post Types
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
  created_at: string;
  updated_at: string;
  user?: User;
  category?: Category;
  images?: PostImage[];
  image?: PostImage;
  isLiked?: boolean;
}

export interface PostImage {
  id: string;
  post_id: string;
  image_url: string;
  image_path: string;
  width?: number;
  height?: number;
  file_size?: number;
  caption?: string;
  display_order: number;
  created_at: string;
}

export interface CreatePostData {
  title: string;
  description?: string;
  category_id?: string;
  tags?: string[];
  visibility?: 'public' | 'friends' | 'private';
  images: File[];
}

// Comment Types
export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  parent_comment_id?: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: User;
  replies?: Comment[];
}

// API Response Types
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

// User Profile Types
export interface UserProfile extends User {
  statistics: {
    postCount: number;
    totalLikes: number;
    totalComments: number;
  };
  survey?: Survey;
}

// Chat Types
export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  participants?: Participant[];
  unread_count?: number;
}

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at?: string;
  user?: User;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'sticker' | 'gif' | 'file';
  content?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to_id?: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender?: User;
  reply_to?: Message;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: User;
}

export interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}

