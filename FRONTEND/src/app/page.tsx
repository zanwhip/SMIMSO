'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import PostCard from '@/components/PostCard';
import Sidebar from '@/components/Sidebar';
import InteractiveBanner from '@/components/InteractiveBanner';
import api from '@/lib/api';
import { Post, Category } from '@/types';
import { useInView } from 'react-intersection-observer';

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'suggestion' | 'newest'>('newest');
  const { ref, inView } = useInView();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Wait for hydration and check auth
  useEffect(() => {
    // Give time for persist middleware to hydrate
    const timer = setTimeout(() => {
      const state = useAuthStore.getState();
      console.log('Home page - Auth state check:', state);
      
      // Check if we have token in localStorage but state is not authenticated
      const tokenInStorage = localStorage.getItem('token');
      const authStorage = localStorage.getItem('auth-storage');
      
      if (tokenInStorage || authStorage) {
        // We have persisted data, wait a bit more for hydration
        setTimeout(() => {
          const finalState = useAuthStore.getState();
          console.log('Home page - Final auth state:', finalState);
          
          if (!finalState.isAuthenticated && !finalState.isLoading) {
            // Still not authenticated after hydration, redirect to login
            router.push('/login');
          }
          setIsCheckingAuth(false);
        }, 200);
      } else {
        // No persisted data, check normal state
        if (!authLoading && !isAuthenticated) {
          router.push('/login');
        }
        setIsCheckingAuth(false);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
      fetchPosts(1, true);
    }
  }, [isAuthenticated, activeTab, selectedCategory, searchParams]);

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      fetchPosts(page + 1);
    }
  }, [inView]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/options/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchPosts = async (pageNum: number, reset = false) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await api.get('/posts', {
        params: {
          page: pageNum,
          limit: 20,
          categoryId: selectedCategory || undefined,
        },
      });

      const newPosts = response.data.data;
      const pagination = response.data.pagination;

      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setPage(pageNum);
      setHasMore(pageNum < pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setPage(1);
    setPosts([]);
    setHasMore(true);
  };

  if (authLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Interactive Banner */}
        <InteractiveBanner />

        {/* AI Features */}
        <div className="mb-6 sm:mb-8 md:mb-10 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            <button
              onClick={() => router.push('/imagine/text-to-image')}
              className="group relative aspect-square bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 hover:shadow-large transition-all duration-500 hover:scale-105 flex flex-col items-center justify-center text-white overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/50 to-pink-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 md:mb-4 transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">🎨</div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2 relative z-10">Text to Image</h3>
              <p className="text-xs sm:text-sm opacity-95 text-center relative z-10 px-2">Generate stunning images from text descriptions</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
            </button>

            <button
              onClick={() => router.push('/imagine/text-to-video')}
              className="group relative aspect-square bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 hover:shadow-large transition-all duration-500 hover:scale-105 flex flex-col items-center justify-center text-white overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/50 to-cyan-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 md:mb-4 transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">🎬</div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2 relative z-10">Text to Video</h3>
              <p className="text-xs sm:text-sm opacity-95 text-center relative z-10 px-2">Create dynamic videos from text prompts</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
            </button>

            <button
              onClick={() => router.push('/imagine/image-to-video')}
              className="group relative aspect-square bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 hover:shadow-large transition-all duration-500 hover:scale-105 flex flex-col items-center justify-center text-white overflow-hidden sm:col-span-2 lg:col-span-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-600/50 to-emerald-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 md:mb-4 transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">🎥</div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2 relative z-10">Image to Video</h3>
              <p className="text-xs sm:text-sm opacity-95 text-center relative z-10 px-2">Bring static images to life with animation</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
        {/* Tabs */}
        <div className="inline-flex space-x-1 mb-4 sm:mb-6 md:mb-8 bg-gray-100 p-1 rounded-lg sm:rounded-xl">
          <button
            onClick={() => setActiveTab('newest')}
            className={`px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-lg font-semibold transition-all duration-300 text-sm sm:text-base ${
              activeTab === 'newest'
                ? 'bg-white text-primary-600 shadow-soft'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setActiveTab('suggestion')}
            className={`px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-lg font-semibold transition-all duration-300 text-sm sm:text-base ${
              activeTab === 'suggestion'
                ? 'bg-white text-primary-600 shadow-soft'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            For You
          </button>
        </div>

        {/* Category Filter */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto pb-2 sm:pb-3 scrollbar-hide">
            <button
              onClick={() => handleCategoryChange('')}
              className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-full whitespace-nowrap font-medium transition-all duration-300 text-xs sm:text-sm ${
                selectedCategory === ''
                  ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-medium'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-soft hover:shadow-medium'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-full whitespace-nowrap font-medium transition-all duration-300 text-xs sm:text-sm ${
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

        {/* Posts Grid */}
        {posts.length === 0 && !isLoading ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500 text-lg font-medium">No posts yet</p>
          </div>
        ) : (
          <div className="masonry-grid">
            {posts.map((post, index) => (
              <div key={post.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <PostCard post={post} />
              </div>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        )}

        {/* Infinite scroll trigger */}
        {hasMore && !isLoading && <div ref={ref} className="h-10" />}

        {/* No more posts */}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="inline-flex items-center space-x-2 text-gray-500">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <p className="font-medium">All posts displayed</p>
              <div className="w-2 h-2 bg-secondary-500 rounded-full"></div>
            </div>
          </div>
        )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 hidden lg:block">
            <div className="sticky top-20">
              <Sidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

