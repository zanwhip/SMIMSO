import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Created uploads directory at:', uploadDir);
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('📁 Saving file to:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    console.log('📝 Generated filename:', uniqueName);
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  console.log('🔍 Checking file type:', file.mimetype);

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF are allowed.`));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 10,
  },
});

// Error handling wrapper
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds the maximum limit of 10MB',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum 10 files allowed',
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  next();
};

// Middleware for single image upload
export const uploadSingle = (req: Request, res: Response, next: NextFunction) => {
  upload.single('image')(req, res, (err) => handleMulterError(err, req, res, next));
};

// Middleware for multiple images upload
export const uploadMultiple = (req: Request, res: Response, next: NextFunction) => {
  upload.array('images', 10)(req, res, (err) => handleMulterError(err, req, res, next));
};

// Middleware for avatar upload
export const uploadAvatar = (req: Request, res: Response, next: NextFunction) => {
  upload.single('avatar')(req, res, (err) => handleMulterError(err, req, res, next));
};

// Middleware for cover upload
export const uploadCover = (req: Request, res: Response, next: NextFunction) => {
  upload.single('cover')(req, res, (err) => handleMulterError(err, req, res, next));
};

// File filter for chat (images and audio)
const chatFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'
  ];

  console.log('🔍 Checking chat file type:', file.mimetype);

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only images and audio files are allowed.`));
  }
};

// Configure multer for chat uploads
export const chatUpload = multer({
  storage,
  fileFilter: chatFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 1,
  },
});

// Middleware for chat file upload (image or audio)
export const uploadChatFile = (req: Request, res: Response, next: NextFunction) => {
  chatUpload.single('file')(req, res, (err) => handleMulterError(err, req, res, next));
};

// Middleware for imagine image upload (for image-to-video)
export const uploadImagineFile = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err) => handleMulterError(err, req, res, next));
};

