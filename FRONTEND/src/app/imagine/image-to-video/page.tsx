'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import { useDropzone } from 'react-dropzone';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiLoader, FiDownload, FiRefreshCw, FiArrowLeft, FiUpload, FiX, FiPlay } from 'react-icons/fi';
import Image from 'next/image';
import { extractVideoUrl } from '@/lib/imagine-utils';

const PROMPT_TEMPLATES = [
  'A close-up portrait of a young woman with striking green eyes and a delicate, ethereal appearance. she has a serene expression, with her lips slightly parted, and her skin is covered in a shimmering, scales-like texture. the woman is positioned in the middle of the image, with the background blurred to emphasise her features.',
  'A majestic lion walking through tall grass with wind blowing through its mane',
  'Ocean waves crashing against rocky cliffs at sunset',
  'A bird taking flight from a tree branch in slow motion',
  'A flower blooming in time-lapse with petals slowly opening',
  'A person walking through a foggy forest path',
  'Clouds drifting across a clear blue sky',
  'A butterfly flapping its wings while sitting on a flower',
  'A candle flame flickering in the wind',
  'A city street at night with lights moving and people walking',
];

export default function ImageToVideoPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('kling-1.0-pro');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
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
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (!selectedImage) {
      toast.error('Please upload an image');
      return;
    }

    setIsGenerating(true);
    toast.loading('Generating video... This may take a few minutes', { id: 'video-generation' });
    
    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('prompt', prompt);
      formData.append('style', style);

      const response = await api.post('/imagine/image-to-video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      ,
        keys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : [],
        stringified: JSON.stringify(response.data, null, 2).substring(0, 1000), // First 1000 chars
      });

      const videoUrl = extractVideoUrl(response.data);
      
      : Object.keys(response.data || {}),
      });

      if (videoUrl) {
        setGeneratedVideo(videoUrl);
        setHistory(prev => [{
          prompt,
          style,
          imagePreview,
          videoUrl,
          timestamp: new Date().toISOString(),
        }, ...prev]);
        toast.success('✅ Video generated successfully!', { id: 'video-generation' });
      } else {
        );
        
        let errorMsg = '⚠️ Could not extract video from response. ';
        if (response.data?.data) {
          errorMsg += 'The API returned data but video URL could not be found. ';
        } else if (response.data?.error) {
          errorMsg += response.data.error;
        } else {
          errorMsg += 'Please check console for details and try again.';
        }
        
        toast.error(errorMsg, { id: 'video-generation', duration: 5000 });
      }
    } catch (error: any) {
      let errorMessage = 'Failed to generate video';
      
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
      
      toast.error(errorMessage, { id: 'video-generation', duration: 5000 });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedVideo) return;
    
    try {
      const response = await fetch(generatedVideo);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-to-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Video downloaded!');
    } catch (error) {
      toast.error('Failed to download video');
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
          onClick={() => router.push('/')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition"
        >
          <FiArrowLeft className="mr-2" />
          Back to Home
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6">Image to Video</h1>

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
                    Prompt *
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the video motion you want to generate..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="kling-1.0-pro">Kling 1.0 Pro</option>
                    <option value="realistic">Realistic</option>
                    <option value="anime">Anime</option>
                    <option value="cinematic">Cinematic</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim() || !selectedImage}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isGenerating ? (
                    <>
                      <FiLoader className="animate-spin mr-2" />
                      Generating Video...
                    </>
                  ) : (
                    <>
                      <FiRefreshCw className="mr-2" />
                      Generate Video
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Prompt Templates</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {PROMPT_TEMPLATES.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => useTemplate(template)}
                      className="w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-700"
                    >
                      {template.substring(0, 80)}...
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="sticky top-4">
                {generatedVideo ? (
                  <div className="space-y-4">
                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                      <video
                        src={generatedVideo}
                        controls
                        className="w-full h-full"
                        autoPlay
                        loop
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    <button
                      onClick={handleDownload}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition flex items-center justify-center"
                    >
                      <FiDownload className="mr-2" />
                      Download Video
                    </button>
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <FiPlay className="mx-auto mb-2 text-4xl" />
                      <p>Generated video will appear here</p>
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

