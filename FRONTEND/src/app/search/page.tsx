'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import PostCard from '@/components/PostCard';
import api from '@/lib/api';
import { Post, Category } from '@/types';
import { FiSearch, FiImage, FiX } from 'react-icons/fi';

type SearchMode = 'text' | 'image';

interface SearchResult {
  post_id: string;
  image_id: string;
  image_url: string;
  similarity_score: number;
  post: Post;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('text');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedCaption, setGeneratedCaption] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      const query = searchParams.get('q') || '';
      setSearchQuery(query);
      fetchCategories();
      if (query) {
        searchPosts(query);
      }
    }
  }, [isAuthenticated, searchParams]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/options/categories');
      setCategories(response.data.data);
    } catch (error) {
      }
  };

  const searchPosts = async (query: string, categoryId?: string) => {
    setIsLoading(true);
    try {
      const response = await api.get('/posts', {
        params: {
          search: query,
          categoryId: categoryId || undefined,
          limit: 50,
        },
      });
      setPosts(response.data.data);
    } catch (error) {
      } finally {
      setIsLoading(false);
    }
  };

  const searchByImage = async (imageFile: File) => {
    setIsLoading(true);
    setGeneratedCaption(''); // Reset caption
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await api.post('/search/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        params: {
          limit: 50,
          minSimilarity: 0.3,
        },
      });

      const results: SearchResult[] = response.data.data.results || [];
      const caption = response.data.data.generated_caption || '';
      
      if (caption) {
        setGeneratedCaption(caption);
      }
      
      const postsFromResults = results.map((result) => ({
        ...result.post,
        image: {
          id: result.image_id,
          image_url: result.image_url,
          post_id: result.post_id,
        },
        similarity_score: result.similarity_score,
      }));

      setPosts(postsFromResults);
    } catch (error) {
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchByTextQuery = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/search/text', {
        query: query.trim(),
      }, {
        params: {
          limit: 50,
          minSimilarity: 0.3,
        },
      });

      const results: SearchResult[] = response.data.data.results || [];
      
      const postsFromResults = results.map((result) => ({
        ...result.post,
        image: {
          id: result.image_id,
          image_url: result.image_url,
          post_id: result.post_id,
        },
        similarity_score: result.similarity_score,
      }));

      setPosts(postsFromResults);
    } catch (error) {
      searchPosts(query);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('Image size should be less than 10MB');
        return;
      }

      setSelectedImage(file.name);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      searchByImage(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setGeneratedCaption('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setPosts([]);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (searchQuery) {
      searchPosts(searchQuery, categoryId);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMode === 'text' && searchQuery.trim()) {
      searchByTextQuery(searchQuery.trim());
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8">
        
        <div className="py-8 border-b border-gray-200">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Search Results
          </h1>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setSearchMode('text');
                setSelectedImage(null);
                setImagePreview(null);
                setPosts([]);
              }}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                searchMode === 'text'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiSearch className="inline mr-2 w-4 h-4" />
              Text Search
            </button>
            <button
              onClick={() => {
                setSearchMode('image');
                setSearchQuery('');
                setPosts([]);
                fileInputRef.current?.click();
              }}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                searchMode === 'image'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiImage className="inline mr-2 w-4 h-4" />
              Image Search
            </button>
          </div>

          {searchMode === 'text' ? (
            <form onSubmit={handleSearch}>
              <div className="relative max-w-3xl">
                <input
                  type="text"
                  placeholder="Search for photos, creators, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-11 pr-24 rounded-lg border border-gray-300 bg-gray-50 hover:bg-white focus:bg-white focus:border-accent-500 focus:outline-none transition-all"
                />
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-1.5 bg-accent-600 hover:bg-accent-700 text-white rounded-md font-medium transition-all active-scale"
                >
                  Search
                </button>
              </div>
            </form>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              {imagePreview ? (
                <div className="relative max-w-md">
                  <div className="relative rounded-lg overflow-hidden border border-gray-300">
                    <img
                      src={imagePreview}
                      alt="Selected for search"
                      className="w-full h-auto max-h-96 object-contain bg-gray-50"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-3 right-3 p-2 bg-white hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-full transition-colors shadow-md active-scale"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>
                  {isLoading && (
                    <p className="mt-3 text-sm text-gray-600">
                      🔍 Searching for similar images...
                    </p>
                  )}
                  {generatedCaption && !isLoading && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Generated caption:</p>
                      <p className="text-sm text-gray-700">"{generatedCaption}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="max-w-md cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-accent-500 hover:bg-gray-50 transition-all"
                >
                  <FiImage className="mx-auto text-gray-400 mb-3 w-12 h-12" />
                  <p className="text-gray-700 font-medium mb-1">
                    Click to upload an image
                  </p>
                  <p className="text-sm text-gray-500">
                    Find similar photos using AI
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide mt-6">
            <button
              onClick={() => handleCategoryChange('')}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all text-sm ${
                selectedCategory === ''
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all text-sm ${
                  selectedCategory === category.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="py-8">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="spinner"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <FiSearch className="mx-auto text-gray-400 mb-4 w-16 h-16" />
              <p className="text-gray-500 text-lg">
                {searchQuery || imagePreview ? 'No results found' : 'Enter a search query to find photos'}
              </p>
            </div>
          ) : (
            <div className="animate-fade-in">
              <p className="text-gray-600 mb-6">
                <strong className="text-gray-900">{posts.length}</strong> result{posts.length !== 1 ? 's' : ''}
                {searchMode === 'text' && searchQuery && ` for "${searchQuery}"`}
                {searchMode === 'image' && selectedImage && ` for similar images`}
              </p>
              {searchMode === 'image' && posts.length > 0 && (
                <p className="text-sm text-gray-500 mb-6">
                  Sorted by similarity
                </p>
              )}
              <div className="masonry-grid">
                {posts.map((post: any) => (
                  <div key={post.id}>
                    <PostCard post={post} />
                    {searchMode === 'image' && post.similarity_score !== undefined && (
                      <div className="mt-2 px-2 text-xs text-gray-500">
                        {(post.similarity_score * 100).toFixed(1)}% match
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

