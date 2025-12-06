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
import { FiTrophy, FiHeart, FiImage, FiUsers } from 'react-icons/fi';
import FollowButton from '@/components/FollowButton';

interface Creator {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  bio?: string;
  job?: string;
  totalLikes: number;
  totalPosts?: number;
  totalFollowers?: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [topCreators, setTopCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      fetchLeaderboard();
    }
  }, [isAuthenticated]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/users/top-creators?limit=50');
      if (response.data.success) {
        setTopCreators(response.data.data);
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

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
            <FiTrophy className="w-10 h-10 text-yellow-500 mr-3" />
            Leaderboard
          </h1>
          <p className="text-gray-600">
            Top creators on our platform based on likes and engagement
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {topCreators.map((creator, index) => (
              <div
                key={creator.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-center space-x-4">
                  
                  <div className="flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                        index === 0
                          ? 'bg-yellow-100 text-yellow-600'
                          : index === 1
                          ? 'bg-gray-200 text-gray-600'
                          : index === 2
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                  </div>

                  <Link
                    href={`/profile/${creator.id}`}
                    className="flex-shrink-0"
                  >
                    <div className="relative w-16 h-16 rounded-full overflow-hidden">
                      {creator.avatar_url ? (
                        <Image
                          src={getImageUrl(creator.avatar_url)}
                          alt={`${creator.first_name} ${creator.last_name}`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white text-xl font-semibold">
                          {creator.first_name[0]}
                          {creator.last_name[0]}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${creator.id}`}
                      className="group"
                    >
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-accent-600 transition-colors">
                        {creator.first_name} {creator.last_name}
                      </h3>
                    </Link>
                    {creator.job && (
                      <p className="text-sm text-gray-600">{creator.job}</p>
                    )}
                    {creator.bio && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {creator.bio}
                      </p>
                    )}
                  </div>

                  <div className="hidden md:flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <div className="flex items-center text-gray-600">
                        <FiHeart className="w-4 h-4 text-red-500 mr-1" />
                        <span className="font-semibold text-gray-900">
                          {formatNumber(creator.totalLikes)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Likes</div>
                    </div>

                    {creator.totalPosts !== undefined && (
                      <div className="text-center">
                        <div className="flex items-center text-gray-600">
                          <FiImage className="w-4 h-4 mr-1" />
                          <span className="font-semibold text-gray-900">
                            {formatNumber(creator.totalPosts)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Posts</div>
                      </div>
                    )}

                    {creator.totalFollowers !== undefined && (
                      <div className="text-center">
                        <div className="flex items-center text-gray-600">
                          <FiUsers className="w-4 h-4 mr-1" />
                          <span className="font-semibold text-gray-900">
                            {formatNumber(creator.totalFollowers)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Followers
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <FollowButton userId={creator.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

