'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { FiHeart } from 'react-icons/fi';
import FollowButton from './FollowButton';

interface Creator {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  bio?: string;
  job?: string;
  totalLikes: number;
}

interface RelatedUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  bio?: string;
  job?: string;
}

export default function Sidebar() {
  const [topCreators, setTopCreators] = useState<Creator[]>([]);
  const [relatedUsers, setRelatedUsers] = useState<RelatedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSidebarData();
  }, []);

  const fetchSidebarData = async () => {
    try {
      setLoading(true);
      
      const creatorsRes = await api.get('/users/top-creators?limit=5');
      if (creatorsRes.data.success) {
        setTopCreators(creatorsRes.data.data);
      }

      try {
        const relatedRes = await api.get('/users/related-users?limit=5');
        if (relatedRes.data.success) {
          setRelatedUsers(relatedRes.data.data);
        }
      } catch (error) {
        }
    } catch (error) {
      } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      
      {topCreators.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 animate-fade-in">
          <h3 className="font-bold text-base text-gray-900 mb-4 flex items-center">
            <FiHeart className="mr-2 text-red-500" size={18} />
            Top Creators
          </h3>
          <div className="space-y-2">
            {topCreators.map((creator) => (
              <Link
                key={creator.id}
                href={`/profile/${creator.id}`}
                className="flex items-center space-x-3 hover:bg-gray-50 p-2.5 rounded-lg transition-all group"
              >
                <div className="relative w-9 h-9 flex-shrink-0">
                  {creator.avatar_url ? (
                    <Image
                      src={getImageUrl(creator.avatar_url)}
                      alt={`${creator.first_name} ${creator.last_name}`}
                      fill
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-9 h-9 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {creator.first_name[0]}{creator.last_name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {creator.first_name} {creator.last_name}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center">
                    <FiHeart className="mr-1 text-red-500" size={11} />
                    {creator.totalLikes} likes
                  </p>
                </div>
                <FollowButton userId={creator.id} size="sm" variant="minimal" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {relatedUsers.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 animate-fade-in">
          <h3 className="font-bold text-base text-gray-900 mb-4">
            Suggested
          </h3>
          <div className="space-y-2">
            {relatedUsers.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.id}`}
                className="flex items-center space-x-3 hover:bg-gray-50 p-2.5 rounded-lg transition-all group"
              >
                <div className="relative w-9 h-9 flex-shrink-0">
                  {user.avatar_url ? (
                    <Image
                      src={getImageUrl(user.avatar_url)}
                      alt={`${user.first_name} ${user.last_name}`}
                      fill
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-9 h-9 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {user.first_name[0]}{user.last_name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.first_name} {user.last_name}
                  </p>
                  {user.job && (
                    <p className="text-xs text-gray-500 truncate">{user.job}</p>
                  )}
                </div>
                <FollowButton userId={user.id} size="sm" variant="minimal" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

