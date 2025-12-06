'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import PostCard from '@/components/PostCard';
import api from '@/lib/api';
import { Post } from '@/types';
import { FiBookmark, FiPlus } from 'react-icons/fi';

export default function CollectionPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      fetchCollection();
    }
  }, [isAuthenticated]);

  const fetchCollection = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/posts/saved');
      if (response.data.success) {
        setPosts(response.data.data);
      }
    } catch (error) {
      try {
        const fallbackResponse = await api.get('/posts/liked');
        if (fallbackResponse.data.success) {
          setPosts(fallbackResponse.data.data);
        }
      } catch (fallbackError) {
        }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 py-8">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
              <FiBookmark className="w-10 h-10 text-accent-600 mr-3" />
              My Collection
            </h1>
            <p className="text-gray-600">
              Your saved photos and videos in one place
            </p>
          </div>

          <button
            className="flex items-center space-x-2 px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-all"
            onClick={() => {
              alert('Create new collection feature coming soon!');
            }}
          >
            <FiPlus className="w-5 h-5" />
            <span>New Collection</span>
          </button>
        </div>

        <div className="mb-8">
          <div className="bg-white border-2 border-accent-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FiBookmark className="w-5 h-5 text-accent-600 mr-2" />
                  Saved Items
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {posts.length} {posts.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="spinner"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <FiBookmark className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Your collection is empty
            </h3>
            <p className="text-gray-600 mb-6">
              Start saving photos to organize them here
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-all"
            >
              Browse Photos
            </button>
          </div>
        ) : (
          <div className="masonry-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

