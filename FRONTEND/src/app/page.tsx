'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import SecondaryNav from '@/components/SecondaryNav';
import PostCard from '@/components/PostCard';
import Sidebar from '@/components/Sidebar';
import HeroBanner from '@/components/HeroBanner';
import api from '@/lib/api';
import { Post, Category } from '@/types';
import { useInView } from 'react-intersection-observer';
import Link from 'next/link';
import { FiPlusCircle } from 'react-icons/fi';
import CreatePostModal from '@/components/CreatePostModal';

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'suggestion' | 'newest'>('newest');
  const { ref, inView } = useInView();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const state = useAuthStore.getState();
      const tokenInStorage = localStorage.getItem('token');
      const authStorage = localStorage.getItem('auth-storage');
      
      if (tokenInStorage || authStorage) {
        setTimeout(() => {
          const finalState = useAuthStore.getState();
          if (!finalState.isAuthenticated && !finalState.isLoading) {
            router.push('/login');
          }
          setIsCheckingAuth(false);
        }, 200);
      } else {
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
    <div className="min-h-screen bg-white">
      <Navbar />

      <HeroBanner />

      <SecondaryNav />

      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="py-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pb-2">
              <button
                onClick={() => handleCategoryChange('')}
                className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all text-sm ${
                  selectedCategory === ''
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
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

            <div className="hidden md:flex items-center space-x-4 ml-4">
              <button
                onClick={() => setActiveTab('newest')}
                className={`px-4 py-2 font-medium transition-all text-sm ${
                  activeTab === 'newest'
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => setActiveTab('suggestion')}
                className={`px-4 py-2 font-medium transition-all text-sm ${
                  activeTab === 'suggestion'
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                For You
              </button>
            </div>
          </div>
        </div>

        <div className="py-8">
          {posts.length === 0 && !isLoading ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 text-lg">No posts yet</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-block mt-6 px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-all active-scale"
              >
                Upload your first photo
              </button>
            </div>
          ) : (
            <>
              <div className="masonry-grid">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              {isLoading && (
                <div className="flex justify-center py-12">
                  <div className="spinner"></div>
                </div>
              )}

              {hasMore && !isLoading && <div ref={ref} className="h-10" />}

              {!hasMore && posts.length > 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="font-medium">You've reached the end</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isAuthenticated && (
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="fab w-14 h-14 bg-accent-600 hover:bg-accent-700 text-white rounded-full flex items-center justify-center"
          title="Upload"
        >
          <FiPlusCircle className="w-6 h-6" />
        </button>
      )}

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}

