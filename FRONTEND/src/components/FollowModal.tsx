'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { FiX, FiUserPlus, FiUserCheck } from 'react-icons/fi';
import FollowButton from './FollowButton';
import toast from 'react-hot-toast';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  bio?: string;
  job?: string;
  isFollowing?: boolean;
}

interface FollowModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  title: string;
}

export default function FollowModal({
  isOpen,
  onClose,
  userId,
  type,
  title,
}: FollowModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchUsers(1, true);
    } else {
      setUsers([]);
      setPage(1);
      setHasMore(true);
    }
  }, [isOpen, userId, type]);

  const fetchUsers = async (pageNum: number = 1, reset: boolean = false) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const endpoint = type === 'followers' 
        ? `/users/${userId}/followers`
        : `/users/${userId}/following`;
      
      const response = await api.get(endpoint, {
        params: {
          page: pageNum,
          limit: 20,
        },
      });

      const newUsers = response.data.data || [];
      const pagination = response.data.pagination || {};

      if (reset) {
        setUsers(newUsers);
      } else {
        setUsers(prev => [...prev, ...newUsers]);
      }

      setPage(pageNum);
      setHasMore(pagination && pageNum < pagination.totalPages);
    } catch (error: any) {
      toast.error('Failed to load list');
      } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchUsers(page + 1, false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-scale-in">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <FiX size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {users.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No {type === 'followers' ? 'followers' : 'following'} yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={`/profile/${user.id}`}
                  onClick={onClose}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-xl transition"
                >
                  <div className="relative w-12 h-12 flex-shrink-0">
                    {user.avatar_url ? (
                      <Image
                        src={getImageUrl(user.avatar_url)}
                        alt={`${user.first_name} ${user.last_name}`}
                        fill
                        className="rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
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
                  <div onClick={(e) => e.preventDefault()}>
                    <FollowButton 
                      userId={user.id} 
                      size="sm" 
                      variant="minimal" 
                      isFollowing={user.isFollowing}
                      onFollowChange={(isFollowing) => {
                        setUsers(prev => prev.map(u => 
                          u.id === user.id ? { ...u, isFollowing } : u
                        ));
                      }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {hasMore && users.length > 0 && (
            <div className="mt-4 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-purple-600 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}

          {isLoading && users.length === 0 && (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

