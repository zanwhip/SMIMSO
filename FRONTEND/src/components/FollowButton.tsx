'use client';

import { useState, useEffect } from 'react';
import { FiUserPlus, FiUserCheck } from 'react-icons/fi';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface FollowButtonProps {
  userId: string;
  isFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal';
}

export default function FollowButton({
  userId,
  isFollowing: initialIsFollowing = false,
  onFollowChange,
  size = 'md',
  variant = 'default',
}: FollowButtonProps) {
  const { user } = useAuthStore();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);

  // Sync state with prop when prop changes
  useEffect(() => {
    if (initialIsFollowing !== undefined) {
      setIsFollowing(initialIsFollowing);
      setHasCheckedStatus(true);
    }
  }, [initialIsFollowing]);

  // Fetch follow status on mount if prop is not provided
  useEffect(() => {
    if (!user || user.id === userId || hasCheckedStatus || initialIsFollowing !== undefined) {
      return;
    }

    const checkFollowStatus = async () => {
      try {
        // Check if following by trying to get the follow relationship
        const response = await api.get(`/users/${userId}`);
        if (response.data.data?.isFollowing !== undefined) {
          setIsFollowing(response.data.data.isFollowing);
          setHasCheckedStatus(true);
        }
      } catch (error) {
        // If error, assume not following
        setIsFollowing(false);
        setHasCheckedStatus(true);
      }
    };

    checkFollowStatus();
  }, [user, userId, hasCheckedStatus, initialIsFollowing]);

  // Don't show button if viewing own profile
  if (!user || user.id === userId) {
    return null;
  }

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    const currentState = isFollowing;
    
    // Optimistic update
    setIsFollowing(!currentState);
    setIsLoading(true);
    
    try {
      if (currentState) {
        // Unfollow
        await api.delete(`/users/${userId}/follow`);
        onFollowChange?.(false);
        toast.success('Unfollowed');
      } else {
        // Follow
        await api.post(`/users/${userId}/follow`);
        onFollowChange?.(true);
        toast.success('Following');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || '';
      
      // If already following, update state to true and allow unfollow
      if (errorMessage.includes('Already following') || errorMessage.includes('already following')) {
        setIsFollowing(true);
        onFollowChange?.(true);
        toast.success('You are already following this user');
      } else {
        // Revert on other errors
        setIsFollowing(currentState);
        toast.error(errorMessage || 'An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleFollow}
        disabled={isLoading}
        className={`p-1.5 rounded-full transition ${
          isFollowing
            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isFollowing ? 'Unfollow' : 'Follow'}
      >
        {isFollowing ? (
          <FiUserCheck size={iconSizes[size]} />
        ) : (
          <FiUserPlus size={iconSizes[size]} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading}
      className={`flex items-center space-x-1.5 rounded-lg transition ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          : 'bg-purple-600 text-white hover:bg-purple-700'
      } ${sizeClasses[size]} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isFollowing ? (
        <>
          <FiUserCheck size={iconSizes[size]} />
          <span>Following</span>
        </>
      ) : (
        <>
          <FiUserPlus size={iconSizes[size]} />
          <span>Follow</span>
        </>
      )}
    </button>
  );
}

