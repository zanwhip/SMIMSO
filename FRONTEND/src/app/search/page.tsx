'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import PostCard from '@/components/PostCard';
import api from '@/lib/api';
import { Post, Category } from '@/types';
import { FiSearch } from 'react-icons/fi';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      console.error('Failed to fetch categories:', error);
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
      console.error('Failed to search posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (searchQuery) {
      searchPosts(searchQuery, categoryId);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchPosts(searchQuery.trim(), selectedCategory);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Results</h1>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative max-w-2xl">
              <input
                type="text"
                placeholder="Search for posts, tags, or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
              >
                Search
              </button>
            </div>
          </form>

          {/* Category Filter */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            <button
              onClick={() => handleCategoryChange('')}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                selectedCategory === ''
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                  selectedCategory === category.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <FiSearch className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 text-lg">
              {searchQuery ? 'No results found' : 'Enter a search query to find posts'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Found <strong>{posts.length}</strong> result{posts.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
            <div className="masonry-grid">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

