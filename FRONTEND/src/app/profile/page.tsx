'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import PostCard from '@/components/PostCard';
import Image from 'next/image';
import api from '@/lib/api';
import { UserProfile, Post } from '@/types';
import { getImageUrl, formatNumber } from '@/lib/utils';
import { FiEdit2, FiHeart, FiBookmark } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'liked' | 'saved'>('posts');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      fetchProfile();
      fetchPosts();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPosts();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      setProfile(response.data.data);
    } catch (error) {
      toast.error('Không thể tải thông tin người dùng');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      let endpoint = '/users/profile/posts';
      
      if (activeTab === 'liked') {
        endpoint = '/users/liked-posts';
      } else if (activeTab === 'saved') {
        // Implement saved posts endpoint
        endpoint = '/users/saved-posts';
      }

      const response = await api.get(endpoint);
      setPosts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          {/* Cover Image */}
          {profile.cover_url && (
            <div className="h-48 bg-gradient-to-r from-primary-500 to-secondary-500">
              <Image
                src={getImageUrl(profile.cover_url)}
                alt="Cover"
                width={1200}
                height={300}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {!profile.cover_url && (
            <div className="h-48 bg-gradient-to-r from-primary-500 to-secondary-500" />
          )}

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end justify-between -mt-16 mb-4">
              <div className="flex items-end space-x-4">
                {profile.avatar_url ? (
                  <Image
                    src={getImageUrl(profile.avatar_url)}
                    alt={profile.first_name}
                    width={128}
                    height={128}
                    className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-300" />
                )}
                <div className="pb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  {profile.job && (
                    <p className="text-gray-600">{profile.job}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => router.push('/profile/edit')}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                <FiEdit2 size={16} />
                <span>Chỉnh sửa</span>
              </button>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-gray-700 mb-4">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="flex space-x-8 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(profile.statistics.postCount)}
                </p>
                <p className="text-sm text-gray-600">Bài đăng</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(profile.statistics.totalLikes)}
                </p>
                <p className="text-sm text-gray-600">Lượt thích</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(profile.statistics.totalComments)}
                </p>
                <p className="text-sm text-gray-600">Bình luận</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === 'posts'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Bài đăng
          </button>
          <button
            onClick={() => setActiveTab('liked')}
            className={`pb-3 px-4 font-medium transition flex items-center space-x-2 ${
              activeTab === 'liked'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiHeart size={16} />
            <span>Đã thích</span>
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`pb-3 px-4 font-medium transition flex items-center space-x-2 ${
              activeTab === 'saved'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiBookmark size={16} />
            <span>Đã lưu</span>
          </button>
        </div>

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Chưa có bài đăng nào</p>
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

