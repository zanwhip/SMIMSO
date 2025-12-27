import { Router } from 'express';
import { ImagineController } from '../controllers/imagine.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadImagineFile } from '../middleware/upload.middleware';

const router = Router();
const imagineController = new ImagineController();

router.post('/text-to-image', authMiddleware, (req, res) => 
  imagineController.textToImage(req, res)
);

router.post('/text-to-video', authMiddleware, (req, res) => 
  imagineController.textToVideo(req, res)
);

router.post('/image-to-video', authMiddleware, uploadImagineFile, (req, res) => 
  imagineController.imageToVideo(req, res)
);

router.post('/style-transfer', authMiddleware, uploadImagineFile, (req, res) => 
  imagineController.styleTransfer(req, res)
);

router.post('/colorize', authMiddleware, uploadImagineFile, (req, res) => 
  imagineController.colorizeImage(req, res)
);

router.post('/upscale', authMiddleware, uploadImagineFile, (req, res) => 
  imagineController.upscaleImage(req, res)
);

router.post('/gpt4o-image/generate', authMiddleware, (req, res) => 
  imagineController.generate4oImage(req, res)
);

router.get('/gpt4o-image/details', authMiddleware, (req, res) => 
  imagineController.get4oImageDetails(req, res)
);

router.post('/gpt4o-image/download-url', authMiddleware, (req, res) => 
  imagineController.get4oImageDownloadUrl(req, res)
);

router.post('/gpt4o-image/callback', (req, res) => 
  imagineController.handle4oImageCallback(req, res)
);

export default router;

