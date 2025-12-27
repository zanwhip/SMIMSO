import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'Vừa xong';
  }

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Vừa xong';
  }

  try {
    return formatDistanceToNow(dateObj, {
      addSuffix: true,
      locale: vi,
    });
  } catch (error) {
    return 'Vừa xong';
  }
}

export function getImageUrl(path: string): string {
  if (!path) return '';
  
  // If already a full URL (http/https), return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // If it's a Supabase storage URL (starts with /storage), construct full URL
  if (path.startsWith('/storage/')) {
    // Extract Supabase URL from environment or use default pattern
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      return `${supabaseUrl}${path}`;
    }
    // Fallback: try to extract from API URL if it contains supabase
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    if (apiUrl.includes('supabase')) {
      // This shouldn't happen, but handle it
      return path;
    }
  }
  
  // For relative paths, prepend API base URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://smimso-api-production.up.railway.app/api';
  return `${apiUrl.replace('/api', '')}${path}`;
}

/**
 * Check if an image URL is an external URL (not a relative path)
 * External URLs include Supabase Storage, Railway API, or any http/https URL
 * These should use unoptimized to avoid Next.js Image optimization issues
 */
export function isExternalUrl(url: string): boolean {
  if (!url) return false;
  // Check if it's a full URL (http/https)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return true;
  }
  // Check if it's a Supabase storage path
  if (url.includes('supabase.co') || url.includes('/storage/v1/object/public/')) {
    return true;
  }
  // Check if it's a Railway API URL pattern
  if (url.includes('railway.app') || url.includes('/uploads/')) {
    return true;
  }
  return false;
}

/**
 * Check if we should use regular <img> tag instead of Next.js Image component
 * This is needed to avoid ORB (Opaque Response Blocking) errors with external URLs
 */
export function shouldUseRegularImg(url: string): boolean {
  return isExternalUrl(url);
}

/**
 * Check if an image URL is from Supabase Storage
 * Supabase URLs typically look like: https://[project].supabase.co/storage/v1/object/public/...
 */
export function isSupabaseUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('supabase.co') && url.includes('/storage/v1/object/public/');
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone: string): boolean {
  const re = /^[0-9]{10,11}$/;
  return re.test(phone);
}

