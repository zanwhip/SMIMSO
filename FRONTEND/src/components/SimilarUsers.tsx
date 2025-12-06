'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { FiUsers } from 'react-icons/fi';
import UserAvatar from './UserAvatar';
import FollowButton from './FollowButton';

interface SimilarUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  job: string | null;
  similarity_score: number;
  shared_interests: string[];
}

export default function SimilarUsers() {
  const [users, setUsers] = useState<SimilarUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSimilarUsers();
  }, []);

  const fetchSimilarUsers = async () => {
    try {
      const response = await api.get('/recommendations/similar-users', {
        params: { limit: 5 },
      });
      setUsers(response.data.data);
    } catch (error) {
      } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FiUsers className="text-primary-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">Similar Users</h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center space-x-2 mb-4">
        <FiUsers className="text-primary-600" size={20} />
        <h2 className="text-lg font-semibold text-gray-900">Similar Users</h2>
      </div>

      <div className="space-y-4">
        {users.map((user) => (
          <Link
            key={user.id}
            href={`/profile/${user.id}`}
            className="flex items-start space-x-3 hover:bg-gray-50 p-2 rounded-lg transition"
          >
            <UserAvatar
              userId={user.id}
              avatarUrl={user.avatar_url || undefined}
              firstName={user.first_name}
              lastName={user.last_name}
              size="lg"
              showOnlineStatus={true}
              className="flex-shrink-0"
            />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.first_name} {user.last_name}
              </p>
              {user.job && (
                <p className="text-xs text-gray-500 truncate">{user.job}</p>
              )}
              {user.shared_interests.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.shared_interests.slice(0, 2).map((interest, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full"
                    >
                      {interest}
                    </span>
                  ))}
                  {user.shared_interests.length > 2 && (
                    <span className="text-xs text-gray-500">
                      +{user.shared_interests.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 flex items-center space-x-2">
              <div className="text-xs text-gray-500">
                {Math.round(user.similarity_score * 100)}% match
              </div>
              <FollowButton userId={user.id} size="sm" variant="minimal" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

