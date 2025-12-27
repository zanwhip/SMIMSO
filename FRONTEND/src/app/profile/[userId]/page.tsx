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
import { getImageUrl, formatNumber, isExternalUrl } from '@/lib/utils';
import { FiHeart, FiMessageCircle, FiImage, FiPhone, FiVideo, FiUserPlus, FiUserCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import FollowModal from '@/components/FollowModal';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);

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
      setIsFollowing(response.data.data.isFollowing || false);
    } catch (error) {
      toast.error('Failed to load user profile');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile || isLoadingFollow) return;

    setIsLoadingFollow(true);
    try {
      if (isFollowing) {
        await api.delete(`/users/${userId}/follow`);
        setIsFollowing(false);
        setProfile(prev => prev ? {
          ...prev,
          statistics: {
            ...prev.statistics,
            followerCount: (prev.statistics.followerCount || 0) - 1,
          }
        } : null);
        toast.success('Unfollowed');
      } else {
        await api.post(`/users/${userId}/follow`);
        setIsFollowing(true);
        setProfile(prev => prev ? {
          ...prev,
          statistics: {
            ...prev.statistics,
            followerCount: (prev.statistics.followerCount || 0) + 1,
          }
        } : null);
        toast.success('Following');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await api.get(`/users/${userId}/posts`);
      setPosts(response.data.data);
    } catch (error) {
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
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="h-48 bg-gradient-to-r from-purple-500 to-pink-500">
            {profile.cover_url && (
              <Image
                src={getImageUrl(profile.cover_url)}
                unoptimized={isExternalUrl(getImageUrl(profile.cover_url))}
                alt="Cover"
                width={1200}
                height={300}
                className="w-full h-full object-cover"
                unoptimized
              />
            )}
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-16 mb-4">
              <div className="relative">
                {profile.avatar_url ? (
                  <Image
                    src={getImageUrl(profile.avatar_url)}
                    unoptimized={isExternalUrl(getImageUrl(profile.avatar_url))}
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

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-6 mb-4 sm:mb-0">
                <div className="flex items-center space-x-2">
                  <FiImage className="text-gray-500" />
                  <span className="text-sm text-gray-600">
                    <strong className="text-gray-900">{formatNumber(profile.statistics?.postCount || 0)}</strong> Posts
                  </span>
                </div>
                <button
                  onClick={() => setModalType('followers')}
                  className="flex items-center space-x-2 hover:opacity-80 transition"
                >
                  <FiUserPlus className="text-gray-500" />
                  <span className="text-sm text-gray-600">
                    <strong className="text-gray-900">{formatNumber(profile.statistics?.followerCount || 0)}</strong> Followers
                  </span>
                </button>
                <button
                  onClick={() => setModalType('following')}
                  className="flex items-center space-x-2 hover:opacity-80 transition"
                >
                  <FiUserCheck className="text-gray-500" />
                  <span className="text-sm text-gray-600">
                    <strong className="text-gray-900">{formatNumber(profile.statistics?.followingCount || 0)}</strong> Following
                  </span>
                </button>
                <div className="flex items-center space-x-2">
                  <FiHeart className="text-gray-500" />
                  <span className="text-sm text-gray-600">
                    <strong className="text-gray-900">{formatNumber(profile.statistics?.totalLikes || 0)}</strong> Likes
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleFollow}
                  disabled={isLoadingFollow}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                    isFollowing
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  } ${isLoadingFollow ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isFollowing ? (
                    <>
                      <FiUserCheck size={18} />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <FiUserPlus size={18} />
                      <span>Follow</span>
                    </>
                  )}
                </button>
                <Link
                  href={`/chat?userId=${profile.id}`}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  <FiMessageCircle size={18} />
                  <span>Message</span>
                </Link>
                <button
                  onClick={() => router.push(`/chat?userId=${profile.id}&callType=audio`)}
                  className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  title="Audio Call"
                >
                  <FiPhone size={18} />
                </button>
                <button
                  onClick={() => router.push(`/chat?userId=${profile.id}&callType=video`)}
                  className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  title="Video Call"
                >
                  <FiVideo size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

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

      {modalType && (
        <FollowModal
          isOpen={!!modalType}
          onClose={() => setModalType(null)}
          userId={userId}
          type={modalType}
          title={modalType === 'followers' ? 'Followers' : 'Following'}
        />
      )}
    </div>
  );
}

