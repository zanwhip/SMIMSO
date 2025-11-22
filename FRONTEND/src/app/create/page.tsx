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

  const generateMetadataFromImage = async (file: File) => {
    try {
      setIsGeneratingMetadata(true);
      const loadingToast = toast.loading('🤖 AI is analyzing your image...');

      const formData = new FormData();
      formData.append('images', file);

      const response = await api.post('/posts/generate-metadata', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const metadata = response.data.data;
      console.log('✅ Received metadata:', metadata);

      // Auto-fill form fields
      setFormData((prev) => ({
        ...prev,
        title: metadata.caption || prev.title,
        description: metadata.description || prev.description,
        category_id: metadata.category_id || prev.category_id,
        tags: metadata.tags?.join(', ') || prev.tags,
      }));

      toast.success('✨ AI generated metadata!', { id: loadingToast });
    } catch (error: any) {
      console.error('Failed to generate metadata:', error);
      toast.error('AI generation failed, you can fill manually');
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
      setImages((prev) => [...prev, ...acceptedFiles]);

      // Create previews
      acceptedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          setPreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });

      // Generate metadata from first image
      if (acceptedFiles.length > 0 && images.length === 0) {
        await generateMetadataFromImage(acceptedFiles[0]);
      }
    },
  });

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
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
    const loadingToast = toast.loading('🤖 AI is analyzing your image and generating metadata...');

    try {
      const formDataToSend = new FormData();

      // Only append if user provided values (AI will fill the rest)
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

      // Append images
      images.forEach((image) => {
        formDataToSend.append('images', image);
      });

      console.log('📤 Uploading post with images...');
      await api.post('/posts', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.dismiss(loadingToast);
      toast.success('✅ Post created successfully with AI-generated metadata!');
      // Redirect to home and force refresh
      router.push('/?refresh=' + Date.now());
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('❌ Post creation error:', error);
      toast.error(error.response?.data?.error || 'Failed to create post');
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        width={200}
                        height={200}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <FiX size={16} />
                      </button>
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

            {/* AI Info Banner */}
            {images.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h3 className="font-semibold text-purple-900 mb-1">
                      {isGeneratingMetadata ? 'AI is analyzing your image...' : 'AI Generated Metadata'}
                    </h3>
                    <p className="text-sm text-purple-700">
                      {isGeneratingMetadata
                        ? 'Please wait while AI generates title, description, category, and tags...'
                        : 'AI has auto-filled the fields below. You can edit them as needed.'
                      }
                    </p>
                    {!isGeneratingMetadata && (
                      <ul className="text-sm text-purple-600 mt-2 space-y-1">
                        <li>• <strong>Title</strong> - From image caption</li>
                        <li>• <strong>Description</strong> - Detailed image description</li>
                        <li>• <strong>Category</strong> - Using CLIP classification</li>
                        <li>• <strong>Tags</strong> - Extracted keywords</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-purple-500 text-xs">(Optional - AI will generate)</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Leave empty for AI to generate from image"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-purple-500 text-xs">(Optional - AI will generate)</span>
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Leave empty for AI to generate from image"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-purple-500 text-xs">(Optional - AI will classify)</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Let AI choose category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags <span className="text-purple-500 text-xs">(Optional - AI will extract)</span>
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Leave empty for AI to extract keywords from image"
              />
            </div>

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

