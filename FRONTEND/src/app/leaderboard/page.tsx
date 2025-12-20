'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import SecondaryNav from '@/components/SecondaryNav';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { getImageUrl, formatNumber } from '@/lib/utils';
import { FiEye, FiMail, FiStar } from 'react-icons/fi';
import FollowButton from '@/components/FollowButton';

interface Creator {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  bio?: string;
  job?: string;
  totalLikes?: number;
  totalViews?: number;
  totalPosts?: number;
  totalComments?: number;
  recentPosts?: number;
  activityScore?: number;
  totalFollowers?: number;
}

interface MediaItem {
  id: string;
  image_url: string;
  post_id: string;
  post?: {
    id: string;
    user_id: string;
    view_count: number;
  };
}

interface UserMediaRow {
  userId: string;
  userName: string;
  mediaItems: MediaItem[];
  totalMedia: number;
}

type TabType = 'viewed' | 'active';

export default function LeaderboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('viewed');
  const [mostViewed, setMostViewed] = useState<Creator[]>([]);
  const [mostActive, setMostActive] = useState<Creator[]>([]);
  const [userMediaRows, setUserMediaRows] = useState<UserMediaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      fetchLeaderboard();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // When tab or list changes, fetch media for all users
    const currentList = activeTab === 'viewed' ? mostViewed : mostActive;
    if (currentList.length > 0) {
      fetchAllUsersMedia(currentList);
    }
  }, [activeTab, mostViewed, mostActive]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const [viewedResponse, activeResponse] = await Promise.all([
        api.get('/users/most-viewed?limit=50'),
        api.get('/users/most-active?limit=50'),
      ]);

      if (viewedResponse.data.success) {
        setMostViewed(viewedResponse.data.data);
      }
      if (activeResponse.data.success) {
        setMostActive(activeResponse.data.data);
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsersMedia = async (users: Creator[]) => {
    setIsLoadingMedia(true);
    try {
      // Fetch media for all users in parallel (limit to first 10 users for performance)
      const usersToFetch = users.slice(0, 10);
      const mediaPromises = usersToFetch.map(async (user) => {
        try {
          const response = await api.get(`/users/${user.id}/posts?limit=100`);
          
          if (response.data.success) {
            const posts = response.data.data || [];
            
            // Extract images from posts and sort by view_count
            const allMedia: MediaItem[] = [];
            posts.forEach((post: any) => {
              if (post.images && post.images.length > 0) {
                post.images.forEach((img: any) => {
                  allMedia.push({
                    id: img.id,
                    image_url: img.image_url,
                    post_id: post.id,
                    post: {
                      id: post.id,
                      user_id: post.user_id,
                      view_count: post.view_count || 0,
                    },
                  });
                });
              } else if (post.image) {
                allMedia.push({
                  id: post.image.id,
                  image_url: post.image.image_url,
                  post_id: post.id,
                  post: {
                    id: post.id,
                    user_id: post.user_id,
                    view_count: post.view_count || 0,
                  },
                });
              }
            });

            // Sort by view_count descending
            allMedia.sort((a, b) => (b.post?.view_count || 0) - (a.post?.view_count || 0));
            
            return {
              userId: user.id,
              userName: `${user.first_name} ${user.last_name}`,
              mediaItems: allMedia,
              totalMedia: allMedia.length,
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(mediaPromises);
      const validResults = results.filter((r): r is UserMediaRow => r !== null);
      
      // Sort results to match the order of users in leaderboard
      const sortedResults = validResults.sort((a, b) => {
        const indexA = users.findIndex(u => u.id === a.userId);
        const indexB = users.findIndex(u => u.id === b.userId);
        return indexA - indexB;
      });
      
      setUserMediaRows(sortedResults);
    } catch (error) {
      setUserMediaRows([]);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const currentList = activeTab === 'viewed' ? mostViewed : mostActive;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <SecondaryNav />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Community Favorites
          </h1>
          <p className="text-gray-600">
            Members with the most views on photos & videos added in the last 4 weeks
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex space-x-2">
          <button
            onClick={() => setActiveTab('viewed')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              activeTab === 'viewed'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Most Viewed
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              activeTab === 'active'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Most Active
          </button>
        </div>

        {/* User Rows - Each row has user info on left and media grid on right */}
        {isLoading || isLoadingMedia ? (
          <div className="flex justify-center py-20">
            <div className="spinner"></div>
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No creators found
          </div>
        ) : (
          <div className="space-y-8">
            {currentList.map((creator, index) => {
              const userMedia = userMediaRows.find(row => row.userId === creator.id);
              const displayMedia = userMedia?.mediaItems.slice(0, 4) || [];
              const remainingCount = userMedia ? userMedia.mediaItems.length - 4 : 0;
              const hasMoreMedia = remainingCount > 0;
              
              return (
                <div
                  key={creator.id}
                  className="grid grid-cols-3 gap-8"
                >
                  {/* Left Column - User Info (1/3 width) */}
                  <div className="col-span-1">
                    <div className="flex items-center space-x-4">
                      {/* Rank Number */}
                      <div className="flex-shrink-0">
                        <span className="text-3xl font-bold text-gray-400">
                          {index + 1}
                        </span>
                      </div>

                      {/* Avatar */}
                      <Link
                        href={`/profile/${creator.id}`}
                        className="flex-shrink-0"
                      >
                        <div className="relative w-14 h-14 rounded-full overflow-hidden">
                          {creator.avatar_url ? (
                            <Image
                              src={getImageUrl(creator.avatar_url)}
                              alt={`${creator.first_name} ${creator.last_name}`}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white text-lg font-semibold">
                              {creator.first_name[0]}
                              {creator.last_name[0]}
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/profile/${creator.id}`}
                          className="group"
                        >
                          <div className="flex items-center space-x-1">
                            <h3 className="text-base font-semibold text-gray-900 group-hover:text-accent-600 transition-colors">
                              {creator.first_name} {creator.last_name}
                            </h3>
                            {index === 0 && (
                              <FiStar className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                        </Link>
                        {activeTab === 'viewed' && creator.totalViews !== undefined && (
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <FiEye className="w-4 h-4 mr-1" />
                            <span>{formatNumber(creator.totalViews)} views</span>
                          </div>
                        )}
                        {activeTab === 'active' && creator.totalPosts !== undefined && (
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <span>{formatNumber(creator.totalPosts)} posts</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center space-x-2">
                        <FollowButton userId={creator.id} size="sm" />
                        <Link
                          href={`/chat?userId=${creator.id}`}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <FiMail className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Media Grid (2/3 width) */}
                  <div className="col-span-2">
                    {userMedia && userMedia.mediaItems.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {displayMedia.map((item, imgIndex) => {
                          const isLastImage = imgIndex === 3 && hasMoreMedia;
                          
                          return (
                            <Link
                              key={item.id}
                              href={isLastImage ? `/profile/${creator.id}` : `/post/${item.post_id}`}
                              className="relative aspect-square overflow-hidden rounded-lg group"
                            >
                              <Image
                                src={getImageUrl(item.image_url)}
                                alt="Media"
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              {isLastImage && (
                                <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center text-white group-hover:bg-opacity-70 transition-all">
                                  <div className="text-2xl font-bold mb-1">
                                    +{formatNumber(remainingCount)}K
                                  </div>
                                  <div className="text-sm opacity-90">
                                    See All &gt;
                                  </div>
                                </div>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">No media available</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
