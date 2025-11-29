'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import PostCard from '@/components/PostCard';
import Sidebar from '@/components/Sidebar';
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Imagine Buttons */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Create with AI</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/imagine/text-to-image')}
              className="group relative aspect-square bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center text-white"
            >
              <div className="text-4xl mb-3">🎨</div>
              <h3 className="text-xl font-bold mb-2">Text to Image</h3>
              <p className="text-sm opacity-90 text-center">Generate stunning images from text descriptions</p>
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
            </button>

            <button
              onClick={() => router.push('/imagine/text-to-video')}
              className="group relative aspect-square bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center text-white"
            >
              <div className="text-4xl mb-3">🎬</div>
              <h3 className="text-xl font-bold mb-2">Text to Video</h3>
              <p className="text-sm opacity-90 text-center">Create dynamic videos from text prompts</p>
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
            </button>

            <button
              onClick={() => router.push('/imagine/image-to-video')}
              className="group relative aspect-square bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center text-white"
            >
              <div className="text-4xl mb-3">🎥</div>
              <h3 className="text-xl font-bold mb-2">Image to Video</h3>
              <p className="text-sm opacity-90 text-center">Bring static images to life with animation</p>
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 rounded-lg transition-opacity"></div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('newest')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'newest'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setActiveTab('suggestion')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'suggestion'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            For You
          </button>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            <button
              onClick={() => handleCategoryChange('')}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                selectedCategory === ''
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                  selectedCategory === category.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        {posts.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No posts yet</p>
          </div>
        ) : (
          <div className="masonry-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="spinner"></div>
          </div>
        )}

        {/* Infinite scroll trigger */}
        {hasMore && !isLoading && <div ref={ref} className="h-10" />}

        {/* No more posts */}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">All posts displayed</p>
          </div>
        )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <Sidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

