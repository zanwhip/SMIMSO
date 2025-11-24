'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import PostCard from '@/components/PostCard';
import Image from 'next/image';
import api from '@/lib/api';
import { UserProfile, Post } from '@/types';
import { getImageUrl, formatNumber } from '@/lib/utils';
import { FiHeart, FiMessageCircle, FiImage, FiPhone, FiVideo } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (userId) {
      // If viewing own profile, redirect to /profile
      if (user?.id === userId) {
        router.push('/profile');
      } else {
        fetchProfile();
        fetchPosts();
      }
    }
  }, [isAuthenticated, userId, user]);

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/users/${userId}`);
      setProfile(response.data.data);
    } catch (error) {
      toast.error('Failed to load user profile');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await api.get(`/users/${userId}/posts`);
      setPosts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          {/* Cover Image */}
          <div className="h-48 bg-gradient-to-r from-purple-500 to-pink-500">
            {profile.cover_url && (
              <Image
                src={getImageUrl(profile.cover_url)}
                alt="Cover"
                width={1200}
                height={300}
                className="w-full h-full object-cover"
                unoptimized
              />
            )}
          </div>

          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-16 mb-4">
              <div className="relative">
                {profile.avatar_url ? (
                  <Image
                    src={getImageUrl(profile.avatar_url)}
                    alt={profile.first_name}
                    width={128}
                    height={128}
                    className="w-32 h-32 rounded-full border-4 border-white object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold">
                    {profile.first_name[0]}{profile.last_name[0]}
                  </div>
                )}
              </div>

              <div className="mt-4 sm:mt-0 sm:ml-6 flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.first_name} {profile.last_name}
                </h1>
                {profile.job && (
                  <p className="text-gray-600">{profile.job}</p>
                )}
                {profile.bio && (
                  <p className="text-gray-700 mt-2">{profile.bio}</p>
                )}
              </div>
            </div>

            {/* Stats and Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-6 mb-4 sm:mb-0">
                <div className="flex items-center space-x-2">
                  <FiImage className="text-gray-500" />
                  <span className="text-sm text-gray-600">
                    <strong className="text-gray-900">{formatNumber(profile.statistics?.postCount || 0)}</strong> Posts
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiHeart className="text-gray-500" />
                  <span className="text-sm text-gray-600">
                    <strong className="text-gray-900">{formatNumber(profile.statistics?.totalLikes || 0)}</strong> Likes
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiMessageCircle className="text-gray-500" />
                  <span className="text-sm text-gray-600">
                    <strong className="text-gray-900">{formatNumber(profile.statistics?.totalComments || 0)}</strong> Comments
                  </span>
                </div>
              </div>
              
              {/* Chat Button */}
              <div className="flex items-center space-x-2">
                <Link
                  href={`/chat?userId=${profile.id}`}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  <FiMessageCircle size={18} />
                  <span>Nhắn tin</span>
                </Link>
                <button
                  onClick={() => router.push(`/chat?userId=${profile.id}&callType=audio`)}
                  className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  title="Gọi điện"
                >
                  <FiPhone size={18} />
                </button>
                <button
                  onClick={() => router.push(`/chat?userId=${profile.id}&callType=video`)}
                  className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  title="Gọi video"
                >
                  <FiVideo size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Posts</h2>
          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">No posts yet</p>
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

