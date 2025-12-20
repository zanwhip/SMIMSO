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

const PROMPT_TEMPLATES = [
  'Colorize this black and white image with realistic colors',
  'Add vibrant and natural colors to this grayscale image',
  'Restore colors to this vintage black and white photograph',
  'Colorize this image with warm, nostalgic tones',
  'Add modern, vivid colors to this black and white image',
];

export default function ColorizePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [prompt, setPrompt] = useState('Colorize this black and white image with realistic colors');
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [negativePrompt, setNegativePrompt] = useState('black and white, grayscale, monochrome');
  const [numInferenceSteps, setNumInferenceSteps] = useState(50);
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

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast.error('Please upload an image');
      return;
    }

    setIsGenerating(true);
    toast.loading('Colorizing image... This may take a few minutes', { id: 'colorize' });
    
    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      if (prompt) formData.append('prompt', prompt);
      if (guidanceScale) formData.append('guidance_scale', guidanceScale.toString());
      if (negativePrompt) formData.append('negative_prompt', negativePrompt);
      if (numInferenceSteps) formData.append('num_inference_steps', numInferenceSteps.toString());

      const response = await api.post('/imagine/colorize', formData, {
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
          timestamp: new Date().toISOString(),
        }, ...prev]);
        toast.success('✅ Image colorized successfully!', { id: 'colorize' });
      } else {
        toast.error('⚠️ Could not extract image from response. Please try again.', { id: 'colorize', duration: 5000 });
      }
    } catch (error: any) {
      let errorMessage = 'Failed to colorize image';
      
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
      
      toast.error(errorMessage, { id: 'colorize', duration: 5000 });
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
      a.download = `colorized-${Date.now()}.png`;
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
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push('/intelligence')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition"
        >
          <FiArrowLeft className="mr-2" />
          Back to Intelligence
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6">Colorize Image</h1>
          <p className="text-gray-600 mb-6">Colorize black and white images with AI</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div>
              <div className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Black & White Image *
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
                    Colorization Prompt (Optional)
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the colors you want..."
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
                      Colorizing...
                    </>
                  ) : (
                    <>
                      <FiRefreshCw className="mr-2" />
                      Colorize Image
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Colorization Templates</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {PROMPT_TEMPLATES.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => useTemplate(template)}
                      className="w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-700"
                    >
                      {template.substring(0, 60)}...
                    </button>
                  ))}
                </div>
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
                      <p>Colorized image will appear here</p>
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

