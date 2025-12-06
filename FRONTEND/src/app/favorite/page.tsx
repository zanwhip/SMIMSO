'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import SecondaryNav from '@/components/SecondaryNav';
import PostCard from '@/components/PostCard';
import CategoryShowcase from '@/components/CategoryShowcase';
import api from '@/lib/api';
import { Post } from '@/types';
import { FiHeart } from 'react-icons/fi';

export default function FavoritePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      fetchFavorites();
    }
  }, [isAuthenticated]);

  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/posts/liked');
      if (response.data.success) {
        setPosts(response.data.data);
      }
    } catch (error) {
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
      <SecondaryNav />

      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
            <FiHeart className="w-10 h-10 text-red-500 mr-3" />
            Favorite Categories
          </h1>
          <p className="text-gray-600">
            Explore curated collections of stunning photos and videos
          </p>
        </div>

        <CategoryShowcase />

        <div className="mt-16 pt-12 border-t border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Your Liked Photos
          </h2>
          
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="spinner"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <FiHeart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No favorites yet
              </h3>
              <p className="text-gray-600 mb-6">
                Start liking photos to see them here
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-all"
              >
                Explore Photos
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
    </div>
  );
}

