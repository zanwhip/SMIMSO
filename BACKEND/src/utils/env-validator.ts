import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

interface EnvConfig {
  NODE_ENV?: string;
  PORT: string;
  FRONTEND_URL?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_STORAGE_BUCKET?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_EMAIL?: string;
  HUGGINGFACE_API_KEY?: string;
  MAX_FILE_SIZE?: string;
}

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
] as const;

const optionalEnvVars = [
  'NODE_ENV',
  'PORT',
  'FRONTEND_URL',
  'SUPABASE_STORAGE_BUCKET',
  'JWT_EXPIRES_IN',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_EMAIL',
  'HUGGINGFACE_API_KEY',
  'MAX_FILE_SIZE',
] as const;

export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long for security');
  }

  if (!process.env.FRONTEND_URL && process.env.NODE_ENV === 'production') {
    warnings.push('FRONTEND_URL is recommended in production for proper CORS configuration');
  }

  if (missing.length > 0) {
    logger.error('Missing required environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (warnings.length > 0) {
    warnings.forEach(warning => logger.warn(warning));
  }

  logger.info('Environment variables validated successfully');
}

export function getEnvConfig(): EnvConfig {
  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT || '5000',
    FRONTEND_URL: process.env.FRONTEND_URL,
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'uploads',
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_EMAIL: process.env.VAPID_EMAIL,
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '10485760',
  };
}

