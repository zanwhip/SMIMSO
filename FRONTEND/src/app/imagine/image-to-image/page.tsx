'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import { useDropzone } from 'react-dropzone';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  FiLoader, 
  FiDownload, 
  FiRefreshCw, 
  FiArrowLeft, 
  FiUpload, 
  FiX, 
  FiEdit3,
  FiTrash2
} from 'react-icons/fi';
import NextImage from 'next/image';
import { extractImageUrl } from '@/lib/imagine-utils';

const PROMPT_TEMPLATES = [
  'Change the background to a beautiful sunset',
  'Add more vibrant colors to this image',
  'Transform this into a painting style',
  'Make this image more dramatic with better lighting',
  'Add a dreamy, ethereal atmosphere',
  'Convert to black and white with selective color',
  'Enhance the details and sharpness',
  'Apply a vintage film look',
  'Make it look like a professional photo',
  'Add artistic filters and effects',
];

export default function ImageToImagePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1:1' | '3:2' | '2:3'>('1:1');
  const [nVariants, setNVariants] = useState<1 | 2 | 4>(1);
  const [isEnhance, setIsEnhance] = useState(false);
  const [enableFallback, setEnableFallback] = useState(false);
  const [fallbackModel, setFallbackModel] = useState<'GPT_IMAGE_1' | 'FLUX_MAX'>('FLUX_MAX');
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [maskImage, setMaskImage] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [taskStatus, setTaskStatus] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Convert tempfile URLs to direct download URLs
  const convertToDirectUrl = async (url: string): Promise<string> => {
    if (!url.includes('tempfile.aiquickdraw.com')) {
      return url;
    }

    if (!taskId) {
      return url;
    }

    try {
      const response = await api.post('/imagine/gpt4o-image/download-url', {
        taskId,
        url,
      });

      if (response.data.success && response.data.data?.downloadUrl) {
        return response.data.data.downloadUrl;
      }
    } catch (error) {
      console.error('Failed to get direct download URL:', error);
    }

    return url;
  };

  // Poll task status
  useEffect(() => {
    if (!taskId || isGenerating === false) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get('/imagine/gpt4o-image/details', {
          params: { taskId },
        });

        if (response.data.success && response.data.data) {
          const data = response.data.data;
          setTaskStatus(data.status);

          if (data.status === 'SUCCESS' && data.resultUrls && data.resultUrls.length > 0) {
            // Convert all URLs to direct download URLs
            const directUrls = await Promise.all(
              data.resultUrls.map((url: string) => convertToDirectUrl(url))
            );
            
            setGeneratedImages(directUrls);
            setIsGenerating(false);
            setTaskStatus('');
            toast.success(`✅ Generated ${data.resultUrls.length} image(s) successfully!`);
            clearInterval(pollInterval);
          } else if (data.status === 'GENERATE_FAILED' || data.status === 'CREATE_TASK_FAILED') {
            setIsGenerating(false);
            setTaskStatus('');
            toast.error(data.errorMessage || 'Image generation failed');
            clearInterval(pollInterval);
          }
        }
      } catch (error: any) {
        console.error('Error polling task status:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [taskId, isGenerating]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
        setMaskImage(null);
        // Reset canvas
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.jfif', '.pjpeg', '.pjp'],
    },
    maxFiles: 1,
  });

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setMaskImage(null);
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Setup canvas for mask drawing
  useEffect(() => {
    if (!imagePreview || !canvasRef.current || typeof window === 'undefined') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      imageRef.current = img;
    };
    img.src = imagePreview;
  }, [imagePreview]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    if (!isDrawing && !isErasing) {
      setIsDrawing(true);
    }
    draw(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && !isErasing) return;
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Black = modify area, White = preserve area
    if (isErasing) {
      // Erase = draw white (preserve)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255,255,255,1)';
    } else {
      // Draw = draw black (modify)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    }
    
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    updateMaskPreview();
  };

  const updateMaskPreview = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    setMaskImage(canvas.toDataURL());
  };

  const clearMask = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setMaskImage(null);
    }
  };

  // Upload image to get public URL
  const uploadImage = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/posts/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.data?.url) {
        return response.data.data.url;
      }
      throw new Error('Failed to upload image');
    } catch (error: any) {
      toast.error('Failed to upload image. Please try again.');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Upload mask image
  const uploadMask = async (): Promise<string | null> => {
    if (!maskImage || !canvasRef.current) return null;

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current!.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(new Blob());
        }, 'image/png');
      });

      const file = new File([blob], 'mask.png', { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/posts/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.data?.url) {
        return response.data.data.url;
      }
      return null;
    } catch (error) {
      console.error('Failed to upload mask:', error);
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast.error('Please upload an image');
      return;
    }

    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    toast.loading('Creating image generation task...', { id: 'image-edit' });

    try {
      // Upload source image
      const imageUrl = await uploadImage(selectedImage);
      
      // Upload mask if exists
      let maskUrl: string | null = null;
      if (maskImage) {
        maskUrl = await uploadMask();
      }

      const requestBody: any = {
        prompt,
        filesUrl: [imageUrl],
        size,
        nVariants,
        isEnhance,
        enableFallback,
        fallbackModel,
      };

      if (maskUrl) {
        requestBody.maskUrl = maskUrl;
      }

      const response = await api.post('/imagine/gpt4o-image/generate', requestBody);

      if (response.data.success && response.data.data?.taskId) {
        setTaskId(response.data.data.taskId);
        toast.loading('Image generation in progress... This may take a few minutes', { id: 'image-edit' });
      } else {
        throw new Error(response.data.error || 'Failed to create generation task');
      }
    } catch (error: any) {
      let errorMessage = 'Failed to generate image';
      
      if (error.response?.status === 401) {
        errorMessage = '⚠️ Authentication failed. Please check your API token.';
      } else if (error.response?.status === 429) {
        errorMessage = '⚠️ Rate limit exceeded. Please try again later.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.error || error.response?.data?.message || '⚠️ Invalid request. Please check your input.';
      } else if (error.response?.status >= 500) {
        errorMessage = '⚠️ Server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      }
      
      toast.error(errorMessage, { id: 'image-edit' });
      setIsGenerating(false);
    }
  };

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      // Get direct download URL if needed
      let downloadUrl = imageUrl;
      if (taskId && imageUrl.includes('tempfile')) {
        try {
          const response = await api.post('/imagine/gpt4o-image/download-url', {
            taskId,
            url: imageUrl,
          });
          if (response.data.success && response.data.data?.downloadUrl) {
            downloadUrl = response.data.data.downloadUrl;
          }
        } catch (error) {
          console.error('Failed to get download URL, using original:', error);
        }
      }

      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-edit-${Date.now()}-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const useTemplate = (template: string) => {
    setPrompt(template);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push('/intelligence')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition"
        >
          <FiArrowLeft className="mr-2" />
          Back to Intelligence
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-2">Image to Image Editor</h1>
          <p className="text-gray-600 mb-6">Edit and transform your images using AI with GPT-4o Image</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Panel - Controls */}
            <div>
              <div className="space-y-4">
                
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Image *
                  </label>
                  {imagePreview ? (
                    <div className="relative">
                      <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <NextImage
                          src={imagePreview}
                          alt="Preview"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <button
                        onClick={removeImage}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                      >
                        <FiX />
                      </button>
                    </div>
                  ) : (
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                        isDragActive
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-300 hover:border-primary-400'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <FiUpload className="mx-auto text-4xl text-gray-400 mb-2" />
                      <p className="text-gray-600">
                        {isDragActive
                          ? 'Drop the image here'
                          : 'Drag & drop an image, or click to select'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        JPEG, PNG, WebP (max 10MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Mask Editor */}
                {imagePreview && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mask Editor (Optional)
                      <span className="text-xs text-gray-500 ml-2">Draw black areas to modify, white to preserve</span>
                    </label>
                    <div className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                      <div className="relative w-full aspect-square bg-white rounded overflow-hidden">
                        {imagePreview && (
                          <>
                            <NextImage
                              src={imagePreview}
                              alt="Source"
                              fill
                              className="object-contain opacity-50"
                              unoptimized
                            />
                            <canvas
                              ref={canvasRef}
                              className="absolute inset-0 cursor-crosshair"
                              onMouseDown={startDrawing}
                              onMouseMove={draw}
                              onMouseUp={stopDrawing}
                              onMouseLeave={stopDrawing}
                            />
                          </>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setIsErasing(false);
                            setIsDrawing(true);
                          }}
                          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                            isDrawing && !isErasing ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          <FiEdit3 className="inline mr-1" />
                          Mark to Edit (Black)
                        </button>
                        <button
                          onClick={() => {
                            setIsDrawing(false);
                            setIsErasing(true);
                          }}
                          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
                            isErasing ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          <FiTrash2 className="inline mr-1" />
                          Preserve (White)
                        </button>
                        <button
                          onClick={clearMask}
                          className="px-3 py-2 rounded text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="mt-2">
                        <label className="block text-xs text-gray-600 mb-1">
                          Brush Size: {brushSize}px
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="50"
                          value={brushSize}
                          onChange={(e) => setBrushSize(parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Edit Prompt *
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe how you want to edit this image..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                {/* Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aspect Ratio *
                  </label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value as '1:1' | '3:2' | '2:3')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="1:1">Square (1:1)</option>
                    <option value="3:2">Landscape (3:2)</option>
                    <option value="2:3">Portrait (2:3)</option>
                  </select>
                </div>

                {/* Advanced Options */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Advanced Options</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Variants
                      </label>
                      <select
                        value={nVariants}
                        onChange={(e) => setNVariants(parseInt(e.target.value) as 1 | 2 | 4)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value={1}>1 variant</option>
                        <option value={2}>2 variants</option>
                        <option value={4}>4 variants</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isEnhance"
                        checked={isEnhance}
                        onChange={(e) => setIsEnhance(e.target.checked)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <label htmlFor="isEnhance" className="ml-2 text-sm text-gray-700">
                        Enable Prompt Enhancement
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enableFallback"
                        checked={enableFallback}
                        onChange={(e) => setEnableFallback(e.target.checked)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <label htmlFor="enableFallback" className="ml-2 text-sm text-gray-700">
                        Enable Fallback Model
                      </label>
                    </div>

                    {enableFallback && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fallback Model
                        </label>
                        <select
                          value={fallbackModel}
                          onChange={(e) => setFallbackModel(e.target.value as 'GPT_IMAGE_1' | 'FLUX_MAX')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="FLUX_MAX">FLUX_MAX</option>
                          <option value="GPT_IMAGE_1">GPT_IMAGE_1</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedImage || !prompt.trim() || isUploading}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isGenerating ? (
                    <>
                      <FiLoader className="animate-spin mr-2" />
                      {taskStatus ? `Generating... (${taskStatus})` : 'Generating...'}
                    </>
                  ) : isUploading ? (
                    <>
                      <FiLoader className="animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FiRefreshCw className="mr-2" />
                      Generate Edited Image
                    </>
                  )}
                </button>
              </div>

              {/* Prompt Templates */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Prompt Templates</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {PROMPT_TEMPLATES.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => useTemplate(template)}
                      className="w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-700"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Results */}
            <div>
              <div className="sticky top-4">
                {generatedImages.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700">
                      Generated Images ({generatedImages.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {generatedImages.map((imageUrl, index) => (
                        <div key={index} className="space-y-2">
                          <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <NextImage
                              src={imageUrl}
                              alt={`Generated ${index + 1}`}
                              fill
                              className="object-contain"
                              unoptimized
                              onError={(e) => {
                                console.error('Image load error:', imageUrl);
                                toast.error(`Failed to load image ${index + 1}`);
                              }}
                            />
                          </div>
                          <button
                            onClick={() => handleDownload(imageUrl, index)}
                            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center"
                          >
                            <FiDownload className="mr-2" />
                            Download Image {index + 1}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <FiEdit3 className="mx-auto mb-2 text-4xl" />
                      <p>Generated images will appear here</p>
                      {isGenerating && (
                        <p className="text-sm mt-2">Task ID: {taskId}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
