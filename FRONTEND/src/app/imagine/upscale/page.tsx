'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import { useDropzone } from 'react-dropzone';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiLoader, FiDownload, FiRefreshCw, FiArrowLeft, FiUpload, FiX } from 'react-icons/fi';
import Image from 'next/image';
import { extractImageUrl } from '@/lib/imagine-utils';

const RESOLUTION_PRESETS = [
  { label: '512x512', width: 512, height: 512 },
  { label: '768x768', width: 768, height: 768 },
  { label: '1024x1024', width: 1024, height: 1024 },
  { label: '1536x1536', width: 1536, height: 1536 },
  { label: '2048x2048', width: 2048, height: 2048 },
];

export default function UpscalePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [prompt, setPrompt] = useState('Increase the resolution and quality of this image while maintaining all details');
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, pixelated');
  const [numInferenceSteps, setNumInferenceSteps] = useState(50);
  const [targetWidth, setTargetWidth] = useState(1024);
  const [targetHeight, setTargetHeight] = useState(1024);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxFiles: 1,
  });

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handlePresetSelect = (preset: typeof RESOLUTION_PRESETS[0]) => {
    setTargetWidth(preset.width);
    setTargetHeight(preset.height);
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast.error('Please upload an image');
      return;
    }

    setIsGenerating(true);
    toast.loading('Upscaling image... This may take a few minutes', { id: 'upscale' });
    
    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      if (prompt) formData.append('prompt', prompt);
      if (guidanceScale) formData.append('guidance_scale', guidanceScale.toString());
      if (negativePrompt) formData.append('negative_prompt', negativePrompt);
      if (numInferenceSteps) formData.append('num_inference_steps', numInferenceSteps.toString());
      formData.append('target_size', JSON.stringify({
        width: targetWidth,
        height: targetHeight,
      }));

      const response = await api.post('/imagine/upscale', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = extractImageUrl(response.data);

      if (imageUrl) {
        setGeneratedImage(imageUrl);
        setHistory(prev => [{
          prompt,
          imagePreview,
          imageUrl,
          targetWidth,
          targetHeight,
          timestamp: new Date().toISOString(),
        }, ...prev]);
        toast.success('✅ Image upscaled successfully!', { id: 'upscale' });
      } else {
        toast.error('⚠️ Could not extract image from response. Please try again.', { id: 'upscale', duration: 5000 });
      }
    } catch (error: any) {
      let errorMessage = 'Failed to upscale image';
      
      const backendError = error.response?.data?.error || error.response?.data?.message;
      
      if (error.response?.status === 401) {
        errorMessage = '⚠️ Authentication failed. Please check your API token.';
      } else if (error.response?.status === 429) {
        errorMessage = '⚠️ Rate limit exceeded. Please try again later.';
      } else if (error.response?.status === 400) {
        errorMessage = backendError || '⚠️ Invalid request. Please check your input.';
      } else if (error.response?.status >= 500) {
        errorMessage = backendError || '⚠️ Server error. Please try again later.';
      } else if (backendError) {
        errorMessage = backendError;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { id: 'upscale', duration: 5000 });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upscaled-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push('/intelligence')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition"
        >
          <FiArrowLeft className="mr-2" />
          Back to Intelligence
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6">Upscale Image</h1>
          <p className="text-gray-600 mb-6">Increase the resolution of your images with AI</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div>
              <div className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Image *
                  </label>
                  {imagePreview ? (
                    <div className="relative">
                      <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <Image
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Resolution
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {RESOLUTION_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => handlePresetSelect(preset)}
                        className={`px-3 py-2 text-sm rounded-lg border transition ${
                          targetWidth === preset.width && targetHeight === preset.height
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Width</label>
                      <input
                        type="number"
                        value={targetWidth}
                        onChange={(e) => setTargetWidth(parseInt(e.target.value))}
                        min="256"
                        max="4096"
                        step="64"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Height</label>
                      <input
                        type="number"
                        value={targetHeight}
                        onChange={(e) => setTargetHeight(parseInt(e.target.value))}
                        min="256"
                        max="4096"
                        step="64"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upscale Prompt (Optional)
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe how to enhance the image..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Guidance Scale
                    </label>
                    <input
                      type="number"
                      value={guidanceScale}
                      onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                      min="1"
                      max="20"
                      step="0.5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inference Steps
                    </label>
                    <input
                      type="number"
                      value={numInferenceSteps}
                      onChange={(e) => setNumInferenceSteps(parseInt(e.target.value))}
                      min="10"
                      max="100"
                      step="5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Negative Prompt (Optional)
                  </label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="What to avoid in the output..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedImage}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isGenerating ? (
                    <>
                      <FiLoader className="animate-spin mr-2" />
                      Upscaling...
                    </>
                  ) : (
                    <>
                      <FiRefreshCw className="mr-2" />
                      Upscale Image
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <div className="sticky top-4">
                {generatedImage ? (
                  <div className="space-y-4">
                    <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={generatedImage}
                        alt="Generated"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <button
                      onClick={handleDownload}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center"
                    >
                      <FiDownload className="mr-2" />
                      Download Image
                    </button>
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <FiUpload className="mx-auto mb-2 text-4xl" />
                      <p>Upscaled image will appear here</p>
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

