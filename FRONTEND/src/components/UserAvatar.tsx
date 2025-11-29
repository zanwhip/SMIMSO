'use client';

import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface UserAvatarProps {
  userId: string;
  avatarUrl?: string;
  firstName: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnlineStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const dotSizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
};

export default function UserAvatar({
  userId,
  avatarUrl,
  firstName,
  lastName = '',
  size = 'md',
  showOnlineStatus = true,
  className = '',
}: UserAvatarProps) {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!showOnlineStatus) return;

    // Fetch online status
    const fetchOnlineStatus = async () => {
      try {
        const response = await api.get(`/chat/status?userIds=${userId}`);
        const statusData = response.data.data;
        if (statusData[userId]) {
          setIsOnline(statusData[userId].isOnline);
        }
      } catch (error) {
        console.error('Failed to fetch online status:', error);
      }
    };

    fetchOnlineStatus();

    // Poll every 30 seconds
    const interval = setInterval(fetchOnlineStatus, 30000);

    return () => clearInterval(interval);
  }, [userId, showOnlineStatus]);

  const initials = `${firstName[0]}${lastName ? lastName[0] : ''}`.toUpperCase();

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {avatarUrl ? (
        <Image
          src={getImageUrl(avatarUrl)}
          alt={`${firstName} ${lastName}`}
          fill
          className="rounded-full object-cover"
          unoptimized
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
          {initials}
        </div>
      )}
      
      {showOnlineStatus && isOnline && (
        <div 
          className={`absolute bottom-0 right-0 bg-green-500 border-2 border-white rounded-full ${dotSizeClasses[size]}`}
          title="Online"
        />
      )}
    </div>
  );
}

