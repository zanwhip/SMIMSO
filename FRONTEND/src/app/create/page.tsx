'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import { useDropzone } from 'react-dropzone';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Category } from '@/types';
import { FiUpload, FiX } from 'react-icons/fi';
import Image from 'next/image';

export default function CreatePostPage() {
  const router = useRouter();
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
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      fetchCategories();
    }
  }, [isAuthenticated]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/options/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // Generate caption for a single image using CLIP
  const generateCaptionForImage = async (file: File, index: number) => {
    try {
      // Set generating state for this specific image
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
        timeout: 90000, // 90 seconds for AI operations
      });

      const aiCaption = response.data.data.caption || '';
      console.log(`✅ Generated CLIP caption for image ${index + 1}:`, aiCaption);

      // Update AI caption for this specific image
      setAiCaptions((prev) => {
        const newState = [...prev];
        newState[index] = aiCaption;
        return newState;
      });
    } catch (error: any) {
      console.error(`Failed to generate caption for image ${index + 1}:`, error);
      // Set empty caption on error
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
      // Silent metadata generation - no toast notification

      const formData = new FormData();
      formData.append('images', file);

      const response = await api.post('/posts/generate-metadata', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 90000, // 90 seconds for AI operations
      });

      const metadata = response.data.data;
      console.log('✅ Received metadata:', metadata);

      // Auto-fill form fields silently (not shown to user)
      setFormData((prev) => ({
        ...prev,
        title: metadata.caption || prev.title,
        description: metadata.description || prev.description,
        category_id: metadata.category_id || prev.category_id,
        tags: metadata.tags?.join(', ') || prev.tags,
      }));
    } catch (error: any) {
      console.error('Failed to generate metadata:', error);
      // Silent fail - metadata will be generated on backend anyway
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

      // Initialize captions and generating states for new images
      setAiCaptions((prev) => [...prev, ...new Array(acceptedFiles.length).fill('')]);
      setUserCaptions((prev) => [...prev, ...new Array(acceptedFiles.length).fill('')]);
      setIsGeneratingCaptions((prev) => [...prev, ...new Array(acceptedFiles.length).fill(false)]);

      // Create previews
      acceptedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          setPreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });

      // Generate caption for each uploaded image
      acceptedFiles.forEach(async (file, index) => {
        const imageIndex = currentImageCount + index;
        await generateCaptionForImage(file, imageIndex);
      });

      // Generate metadata from first image (only for the first upload)
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

    // Title is optional now - AI will generate if not provided
    // if (!formData.title.trim()) {
    //   toast.error('Please enter a title');
    //   return;
    // }

    setIsLoading(true);
    const loadingToast = toast.loading('📤 Đang tạo bài viết...');

    try {
      const formDataToSend = new FormData();

      // Metadata will be auto-generated by AI on backend
      // Only send if user explicitly provided (though fields are hidden)
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

      // Parse tags
      const tagsArray = formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);
      if (tagsArray.length > 0) {
        formDataToSend.append('tags', JSON.stringify(tagsArray));
      }

      // Append user captions (array of captions for each image)
      if (userCaptions.length > 0) {
        formDataToSend.append('user_captions', JSON.stringify(userCaptions));
      }

      // Append images
      images.forEach((image) => {
        formDataToSend.append('images', image);
      });

      console.log('📤 Uploading post with images...');
      await api.post('/posts', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 90000, // 90 seconds for AI operations
      });

      toast.dismiss(loadingToast);
      toast.success('✅ Bài viết đã được tạo thành công!');
      // Redirect to home and force refresh
      router.push('/?refresh=' + Date.now());
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('❌ Post creation error:', error);
      toast.error(error.response?.data?.error || 'Không thể tạo bài viết');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Post</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
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
                        {/* User Caption - only field visible to user */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Caption của bạn <span className="text-gray-500">(tùy chọn)</span>
                            {isGeneratingCaptions[index] && (
                              <span className="ml-2 text-purple-500 text-xs">(AI đang tạo caption...)</span>
                            )}
                          </label>
                          <textarea
                            value={userCaptions[index] || ''}
                            onChange={(e) => updateUserCaption(index, e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Nhập caption của bạn cho hình ảnh này (để trống nếu không muốn nhập)..."
                          />
                        </div>
                        {/* AI Caption is generated but hidden - saved to database automatically */}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                  isDragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <FiUpload className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm text-gray-600">
                  {isDragActive
                    ? 'Drop images here...'
                    : 'Drag & drop images or click to select'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supported: JPG, PNG, WebP (Max 10 images)
                </p>
              </div>
            </div>

            {/* Metadata fields are hidden - auto-generated by AI and saved to database */}

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Privacy
              </label>
              <select
                value={formData.visibility}
                onChange={(e) =>
                  setFormData({ ...formData, visibility: e.target.value as any })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="private">Private</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 transition"
              >
                {isLoading ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

