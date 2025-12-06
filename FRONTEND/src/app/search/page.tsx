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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-4 sm:mb-6">
            Search
          </h1>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative max-w-2xl">
              <input
                type="text"
                placeholder="Search for posts, tags, or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-4 pl-14 pr-24 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-300 bg-white/80 backdrop-blur-sm transition-all duration-300 shadow-soft hover:shadow-medium"
              />
              <FiSearch className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400" size={22} />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl hover:from-primary-700 hover:to-secondary-700 transition-all duration-300 shadow-medium hover:shadow-large font-semibold"
              >
                Search
              </button>
            </div>
          </form>

          {/* Category Filter */}
          <div className="flex items-center space-x-3 overflow-x-auto pb-3 scrollbar-hide">
            <button
              onClick={() => handleCategoryChange('')}
              className={`px-5 py-2.5 rounded-full whitespace-nowrap font-medium transition-all duration-300 ${
                selectedCategory === ''
                  ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-medium'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-soft hover:shadow-medium'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-5 py-2.5 rounded-full whitespace-nowrap font-medium transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-medium'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-soft hover:shadow-medium'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="spinner"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <FiSearch className="mx-auto text-gray-400 mb-4" size={64} />
            <p className="text-gray-500 text-lg font-medium">
              {searchQuery ? 'No results found' : 'Enter a search query to find posts'}
            </p>
          </div>
        ) : (
          <div className="animate-fade-in">
            <p className="text-gray-600 mb-6 font-medium">
              Found <strong className="text-primary-600">{posts.length}</strong> result{posts.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
            <div className="masonry-grid">
              {posts.map((post, index) => (
                <div key={post.id} style={{ animationDelay: `${index * 0.1}s` }} className="animate-fade-in">
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

