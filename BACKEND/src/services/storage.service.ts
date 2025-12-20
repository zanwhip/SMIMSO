import { supabaseAdmin } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export class StorageService {
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
  }

  /**
   * Upload file to Supabase Storage
   * @param filePath Local file path
   * @param folder Folder in storage bucket (e.g., 'posts', 'avatars', 'covers')
   * @param fileName Optional custom file name, otherwise uses UUID
   * @returns Public URL of uploaded file
   */
  async uploadFile(
    filePath: string,
    folder: string = 'general',
    fileName?: string
  ): Promise<string> {
    try {
      // Read file from local path
      const fileBuffer = fs.readFileSync(filePath);
      const fileExtension = path.extname(filePath);
      const finalFileName = fileName || `${uuidv4()}${fileExtension}`;
      const storagePath = `${folder}/${finalFileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(storagePath, fileBuffer, {
          contentType: this.getContentType(fileExtension),
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(this.bucketName)
        .getPublicUrl(storagePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL from Supabase Storage');
      }

      return urlData.publicUrl;
    } catch (error: any) {
      throw new Error(`Storage upload error: ${error.message}`);
    }
  }

  /**
   * Upload file buffer directly (without saving to disk first)
   * @param buffer File buffer
   * @param originalName Original file name for extension
   * @param folder Folder in storage bucket
   * @returns Public URL of uploaded file
   */
  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    folder: string = 'general'
  ): Promise<string> {
    try {
      const fileExtension = path.extname(originalName);
      const fileName = `${uuidv4()}${fileExtension}`;
      const storagePath = `${folder}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(storagePath, buffer, {
          contentType: this.getContentType(fileExtension),
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(this.bucketName)
        .getPublicUrl(storagePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL from Supabase Storage');
      }

      return urlData.publicUrl;
    } catch (error: any) {
      throw new Error(`Storage upload error: ${error.message}`);
    }
  }

  /**
   * Delete file from Supabase Storage
   * @param fileUrl Public URL of the file
   * @returns true if deleted successfully
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      // Extract path from URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === this.bucketName);
      
      if (bucketIndex === -1) {
        throw new Error('Invalid file URL');
      }

      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      const { error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      throw new Error(`Storage delete error: ${error.message}`);
    }
  }

  /**
   * Get content type from file extension
   */
  private getContentType(extension: string): string {
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/m4a',
    };

    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Ensure storage bucket exists
   */
  async ensureBucket(): Promise<void> {
    try {
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      
      if (listError) {
        throw new Error(`Failed to list buckets: ${listError.message}`);
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        const { error: createError } = await supabaseAdmin.storage.createBucket(this.bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/gif',
            'video/webm',
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/ogg',
            'audio/m4a',
          ],
        });

        if (createError) {
          throw new Error(`Failed to create bucket: ${createError.message}`);
        }
      }
    } catch (error: any) {
      throw new Error(`Bucket setup error: ${error.message}`);
    }
  }
}

export const storageService = new StorageService();

