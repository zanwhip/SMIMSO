'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDropzone } from 'react-dropzone';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Category } from '@/types';
import { FiUpload, FiX } from 'react-icons/fi';
import Image from 'next/image';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePostModalProps) {
  const { isAuthenticated } = useAuthStore();
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [aiCaptions, setAiCaptions] = useState<string[]>([]);
  const [userCaptions, setUserCaptions] = useState<string[]>([]);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState<boolean[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    tags: '',
    visibility: 'public' as 'public' | 'friends' | 'private',
  });

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchCategories();
    }
  }, [isOpen, isAuthenticated]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setImages([]);
      setPreviews([]);
      setAiCaptions([]);
      setUserCaptions([]);
      setIsGeneratingCaptions([]);
      setFormData({
        title: '',
        description: '',
        category_id: '',
        tags: '',
        visibility: 'public',
      });
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/options/categories');
      setCategories(response.data.data);
    } catch (error) {
      // Silent fail
    }
  };

  const generateCaptionForImage = async (file: File, index: number) => {
    try {
      setIsGeneratingCaptions((prev) => {
        const newState = [...prev];
        newState[index] = true;
        return newState;
      });

      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/posts/generate-caption', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 90000,
      });

      const aiCaption = response.data.data.caption || '';
      setAiCaptions((prev) => {
        const newState = [...prev];
        newState[index] = aiCaption;
        return newState;
      });
    } catch (error: any) {
      setAiCaptions((prev) => {
        const newState = [...prev];
        newState[index] = '';
        return newState;
      });
    } finally {
      setIsGeneratingCaptions((prev) => {
        const newState = [...prev];
        newState[index] = false;
        return newState;
      });
    }
  };

  const generateMetadataFromImage = async (file: File) => {
    try {
      setIsGeneratingMetadata(true);

      const formData = new FormData();
      formData.append('images', file);

      const response = await api.post('/posts/generate-metadata', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 90000,
      });

      const metadata = response.data.data;
      setFormData((prev) => ({
        ...prev,
        title: metadata.caption || prev.title,
        description: metadata.description || prev.description,
        category_id: metadata.category_id || prev.category_id,
        tags: metadata.tags?.join(', ') || prev.tags,
      }));
    } catch (error: any) {
      // Silent fail
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxFiles: 10,
    onDrop: async (acceptedFiles) => {
      const currentImageCount = images.length;
      setImages((prev) => [...prev, ...acceptedFiles]);

      setAiCaptions((prev) => [...prev, ...new Array(acceptedFiles.length).fill('')]);
      setUserCaptions((prev) => [...prev, ...new Array(acceptedFiles.length).fill('')]);
      setIsGeneratingCaptions((prev) => [...prev, ...new Array(acceptedFiles.length).fill(false)]);

      acceptedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          setPreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });

      acceptedFiles.forEach(async (file, index) => {
        const imageIndex = currentImageCount + index;
        await generateCaptionForImage(file, imageIndex);
      });

      if (acceptedFiles.length > 0 && currentImageCount === 0) {
        await generateMetadataFromImage(acceptedFiles[0]);
      }
    },
  });

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setAiCaptions((prev) => prev.filter((_, i) => i !== index));
    setUserCaptions((prev) => prev.filter((_, i) => i !== index));
    setIsGeneratingCaptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateUserCaption = (index: number, caption: string) => {
    setUserCaptions((prev) => {
      const newState = [...prev];
      newState[index] = caption;
      return newState;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (images.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('📤 Creating post...');

    try {
      const formDataToSend = new FormData();

      if (formData.title.trim()) {
        formDataToSend.append('title', formData.title);
      }
      if (formData.description.trim()) {
        formDataToSend.append('description', formData.description);
      }
      if (formData.category_id) {
        formDataToSend.append('category_id', formData.category_id);
      }
      formDataToSend.append('visibility', formData.visibility);

      const tagsArray = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);
      if (tagsArray.length > 0) {
        formDataToSend.append('tags', JSON.stringify(tagsArray));
      }

      if (userCaptions.length > 0) {
        formDataToSend.append('user_captions', JSON.stringify(userCaptions));
      }

      images.forEach((image) => {
        formDataToSend.append('images', image);
      });

      await api.post('/posts', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 90000,
      });

      toast.dismiss(loadingToast);
      toast.success('✅ Post created successfully!');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.error || 'Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle ESC key and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      window.addEventListener('keydown', handleEsc);
      
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !isAuthenticated) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      style={{ minHeight: '100dvh' } as React.CSSProperties}
    >
      <div className="h-screen w-full overflow-y-auto" style={{ minHeight: '100dvh' }}>
        <div className="min-h-screen flex items-start justify-center py-8 px-4 pb-12">
          <div 
            className="relative w-full max-w-4xl bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 animate-scale-in my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-3 bg-white/90 backdrop-blur-md rounded-full hover:bg-white transition-all duration-200 shadow-lg hover:scale-110"
            >
              <FiX size={24} className="text-gray-800" />
            </button>

            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-4 sm:mb-6 md:mb-8">
              Create New Post
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Images <span className="text-red-500">*</span>
                </label>

                {previews.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {previews.map((preview, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="relative group mb-2">
                          <Image
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            width={200}
                            height={200}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                        <div className="mt-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Your Caption <span className="text-gray-500">(optional)</span>
                              {isGeneratingCaptions[index] && (
                                <span className="ml-2 text-purple-500 text-xs">(AI generating caption...)</span>
                              )}
                            </label>
                            <textarea
                              value={userCaptions[index] || ''}
                              onChange={(e) => updateUserCaption(index, e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Enter your caption for this image (leave empty if you don't want to add one)..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive
                      ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-secondary-50 scale-105 shadow-medium'
                      : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50 shadow-soft hover:shadow-medium'
                  }`}
                >
                  <input {...getInputProps()} />
                  <FiUpload className={`mx-auto mb-4 transition-all duration-300 ${isDragActive ? 'text-primary-500 scale-125' : 'text-gray-400'}`} size={40} />
                  <p className="text-base font-medium text-gray-700 mb-2">
                    {isDragActive
                      ? 'Drop images here...'
                      : 'Drag & drop images or click to select'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Supported: JPG, PNG, WebP (Max 10 images)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-300 bg-white/80 backdrop-blur-sm transition-all duration-300 shadow-soft hover:shadow-medium"
                  placeholder="Enter post title (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-300 bg-white/80 backdrop-blur-sm transition-all duration-300 shadow-soft hover:shadow-medium resize-none"
                  placeholder="Enter post description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-300 bg-white/80 backdrop-blur-sm transition-all duration-300 shadow-soft hover:shadow-medium"
                >
                  <option value="">Select a category (optional)</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-300 bg-white/80 backdrop-blur-sm transition-all duration-300 shadow-soft hover:shadow-medium"
                  placeholder="Enter tags separated by commas (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Privacy
                </label>
                <select
                  value={formData.visibility}
                  onChange={(e) =>
                    setFormData({ ...formData, visibility: e.target.value as any })
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-300 bg-white/80 backdrop-blur-sm transition-all duration-300 shadow-soft hover:shadow-medium"
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-300 font-medium shadow-soft hover:shadow-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-2.5 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 transition-all duration-300 shadow-medium hover:shadow-large hover:scale-[1.02] active:scale-[0.98] font-semibold ripple"
                >
                  {isLoading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}







