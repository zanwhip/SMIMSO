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
import { FiEdit2, FiHeart, FiBookmark, FiUserPlus, FiUserCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import FollowModal from '@/components/FollowModal';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'liked' | 'saved'>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);

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
      toast.error('Failed to load user information');
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
        endpoint = '/users/saved-posts';
      }

      const response = await api.get(endpoint);
      // Handle paginated response
      const postsData = response.data.data || response.data;
      setPosts(Array.isArray(postsData) ? postsData : []);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      toast.error('Failed to load posts');
      setPosts([]);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Profile Header */}
        <div className="bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-large overflow-hidden mb-4 sm:mb-6 md:mb-8 animate-fade-in">
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
                className="flex items-center space-x-2 px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-300 font-medium shadow-soft hover:shadow-medium"
              >
                <FiEdit2 size={18} />
                <span>Edit</span>
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
                <p className="text-sm text-gray-600">Posts</p>
              </div>
              <button
                onClick={() => setModalType('followers')}
                className="hover:opacity-80 transition"
              >
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(profile.statistics.followerCount || 0)}
                </p>
                <p className="text-sm text-gray-600">Followers</p>
              </button>
              <button
                onClick={() => setModalType('following')}
                className="hover:opacity-80 transition"
              >
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(profile.statistics.followingCount || 0)}
                </p>
                <p className="text-sm text-gray-600">Following</p>
              </button>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(profile.statistics.totalLikes)}
                </p>
                <p className="text-sm text-gray-600">Likes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="inline-flex space-x-1 mb-8 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'posts'
                ? 'bg-white text-primary-600 shadow-soft'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Posts</span>
          </button>
          <button
            onClick={() => setActiveTab('liked')}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'liked'
                ? 'bg-white text-primary-600 shadow-soft'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiHeart size={18} />
            <span>Liked</span>
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'saved'
                ? 'bg-white text-primary-600 shadow-soft'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiBookmark size={18} />
            <span>Saved</span>
          </button>
        </div>

        {/* Posts Grid */}
        {posts.length === 0 ? (
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

        {/* Follow Modal */}
        {modalType && user && (
          <FollowModal
            isOpen={!!modalType}
            onClose={() => setModalType(null)}
            userId={user.id}
            type={modalType}
            title={modalType === 'followers' ? 'Followers' : 'Following'}
          />
        )}
      </div>
    </div>
  );
}

