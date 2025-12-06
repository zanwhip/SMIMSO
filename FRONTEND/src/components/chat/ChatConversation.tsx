'use client';

import { useRouter } from 'next/navigation';
import { Conversation } from '@/types';
import Image from 'next/image';
import { getImageUrl, formatDate } from '@/lib/utils';
import { OnlineStatus } from '@/types';

interface ChatConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  isSelected: boolean;
  onlineStatus: Map<string, OnlineStatus>;
}

export default function ChatConversationItem({
  conversation,
  currentUserId,
  isSelected,
  onlineStatus,
}: ChatConversationItemProps) {
  const router = useRouter();
  const hasUnread = (conversation.unread_count || 0) > 0;

  const handleClick = () => {
    router.push(`/chat/${conversation.id}`);
  };

  const otherParticipant = conversation.type === 'direct' 
    ? conversation.participants?.find(p => p.user_id !== currentUserId)
    : null;

  return (
    <div
      onClick={handleClick}
      className={`p-3 sm:p-4 border-b border-gray-100 cursor-pointer transition ${
        isSelected 
          ? 'bg-gray-50' 
          : hasUnread 
            ? 'bg-red-50 hover:bg-red-100' 
            : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex-shrink-0">
          {conversation.type === 'direct' && otherParticipant?.user?.avatar_url ? (
            <>
              <Image
                src={getImageUrl(otherParticipant.user.avatar_url)}
                alt="Avatar"
                fill
                className="rounded-full object-cover"
                unoptimized
              />
              
              {otherParticipant.user_id && 
               onlineStatus.get(otherParticipant.user_id)?.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </>
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
              {conversation.type === 'direct'
                ? (() => {
                    const otherP = conversation.participants?.find(p => p.user_id !== currentUserId);
                    return otherP?.user?.first_name?.[0] || 'U';
                  })()
                : conversation.name?.[0] || 'G'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 truncate">
              {conversation.type === 'direct'
                ? (() => {
                    const otherP = conversation.participants?.find(p => p.user_id !== currentUserId);
                    return otherP?.user 
                      ? `${otherP.user.first_name} ${otherP.user.last_name}`
                      : 'Unknown User';
                  })()
                : conversation.name}
            </p>
            {conversation.unread_count && conversation.unread_count > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium text-white bg-purple-600 rounded-full">
                {conversation.unread_count}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {conversation.last_message_at && formatDate(conversation.last_message_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
