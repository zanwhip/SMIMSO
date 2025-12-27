import { supabaseAdmin } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export class StorageService {
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
  }

  async uploadFile(
    filePath: string,
    folder: string = 'general',
    fileName?: string
  ): Promise<string> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const fileExtension = path.extname(filePath);
      const finalFileName = fileName || `${uuidv4()}${fileExtension}`;
      const storagePath = `${folder}/${finalFileName}`;

      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(storagePath, fileBuffer, {
          contentType: this.getContentType(fileExtension),
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
      }

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

  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    folder: string = 'general'
  ): Promise<string> {
    try {
      const fileExtension = path.extname(originalName);
      const fileName = `${uuidv4()}${fileExtension}`;
      const storagePath = `${folder}/${fileName}`;

      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(storagePath, buffer, {
          contentType: this.getContentType(fileExtension),
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
      }

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

  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
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
          fileSizeLimit: 10485760,
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

