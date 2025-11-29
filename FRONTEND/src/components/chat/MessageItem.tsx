'use client';

import { useState, useRef, useEffect } from 'react';
import { Message, MessageReaction, User } from '@/types';
import { getImageUrl, formatDate } from '@/lib/utils';
import Image from 'next/image';
import MessageActions from './MessageActions';
import MessageReactions from './MessageReactions';
import ReactionPicker from './ReactionPicker';
import { FiCheck, FiCheckCircle, FiEdit3, FiX } from 'react-icons/fi';
import { socketService } from '@/lib/socket';
import api from '@/lib/api';

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
  currentUser: User;
  readReceipts: Map<string, string>;
  onMessageUpdate: () => void;
}

export default function MessageItem({
  message,
  isOwnMessage,
  currentUser,
  readReceipts,
  onMessageUpdate,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [reactions, setReactions] = useState<MessageReaction[]>(message.reactions || []);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    // Listen for reaction updates
    const handleReactionAdded = (data: { messageId: string; userId: string; emoji: string }) => {
      if (data.messageId === message.id) {
        fetchReactions();
      }
    };

    const handleReactionRemoved = (data: { messageId: string; userId: string; emoji: string }) => {
      if (data.messageId === message.id) {
        fetchReactions();
      }
    };

    socketService.onReactionAdded(handleReactionAdded);
    socketService.onReactionRemoved(handleReactionRemoved);

    return () => {
      socketService.offReactionAdded(handleReactionAdded);
      socketService.offReactionRemoved(handleReactionRemoved);
    };
  }, [message.id]);

  const fetchReactions = async () => {
    try {
      const response = await api.get(`/chat/messages/${message.id}/reactions`);
      setReactions(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content || '');
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;

    try {
      await api.patch(`/chat/messages/${message.id}`, { content: editContent });
      setIsEditing(false);
      onMessageUpdate();
    } catch (error: any) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content || '');
  };

  const handleDelete = async () => {
    try {
      socketService.deleteMessage(message.id);
      onMessageUpdate();
    } catch (error: any) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleReaction = async (emoji: string) => {
    const existingReaction = reactions.find(
      (r) => r.emoji === emoji && r.user_id === currentUser.id
    );

    if (existingReaction) {
      socketService.removeReaction(message.id, emoji);
    } else {
      socketService.addReaction(message.id, emoji);
    }
    setShowReactionPicker(false);
  };

  if (message.is_deleted) {
    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        <div className="text-sm text-gray-400 italic px-4 py-2">
          This message was deleted
        </div>
      </div>
    );
  }

  const isRead = readReceipts.has(message.id);

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative max-w-xs lg:max-w-md">
        <div
          className={`px-4 py-2 rounded-lg relative ${
            isOwnMessage
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-900'
          }`}
        >
          {message.reply_to && (
            <div className="mb-2 pl-3 border-l-2 border-opacity-50 text-xs opacity-75">
              <div className="font-semibold">
                {message.reply_to.sender?.first_name} {message.reply_to.sender?.last_name}
              </div>
              <div className="truncate">{message.reply_to.content}</div>
            </div>
          )}

          {message.message_type === 'image' && message.file_url && (
            <div className="mb-2">
              <Image
                src={getImageUrl(message.file_url)}
                alt="Image"
                width={300}
                height={300}
                className="rounded-lg"
                unoptimized
              />
            </div>
          )}

          {message.message_type === 'video' && message.file_url && (
            <div className="mb-2">
              <video
                src={getImageUrl(message.file_url)}
                controls
                className="rounded-lg max-w-full"
              />
            </div>
          )}

          {message.message_type === 'audio' && message.file_url && (
            <div className="mb-2">
              <audio controls className="w-full">
                <source src={getImageUrl(message.file_url)} type="audio/webm" />
                <source src={getImageUrl(message.file_url)} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {message.message_type === 'file' && message.file_url && (
            <div className="mb-2">
              <a
                href={getImageUrl(message.file_url)}
                download={message.file_name}
                className="flex items-center space-x-2 text-sm underline"
              >
                <span>📎</span>
                <span>{message.file_name}</span>
              </a>
            </div>
          )}

          {message.message_type === 'sticker' && message.file_url && (
            <div className="mb-2">
              <Image
                src={getImageUrl(message.file_url)}
                alt="Sticker"
                width={200}
                height={200}
                className="rounded-lg"
                unoptimized
              />
            </div>
          )}

          {message.message_type === 'gif' && message.file_url && (
            <div className="mb-2">
              <Image
                src={getImageUrl(message.file_url)}
                alt="GIF"
                width={300}
                height={300}
                className="rounded-lg"
                unoptimized
              />
            </div>
          )}

          {isEditing ? (
            <div className="space-y-2">
              <input
                ref={editInputRef}
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                className="w-full px-2 py-1 bg-white text-gray-900 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveEdit}
                  className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {message.content && (
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              )}
              {message.is_edited && (
                <span className="text-xs opacity-75 ml-1">(edited)</span>
              )}
            </>
          )}

          <div className="flex items-center justify-end space-x-1 mt-1">
            <p
              className={`text-xs ${
                isOwnMessage ? 'text-purple-100' : 'text-gray-500'
              }`}
            >
              {formatDate(message.created_at)}
            </p>
            {isOwnMessage && (
              <span className={isRead ? 'text-blue-300' : 'text-purple-100'}>
                {isRead ? (
                  <FiCheckCircle className="w-3 h-3" />
                ) : (
                  <FiCheck className="w-3 h-3" />
                )}
              </span>
            )}
          </div>

          {showActions && (
            <div className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition">
              <MessageActions
                message={message}
                isOwnMessage={isOwnMessage}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReact={() => setShowReactionPicker(true)}
              />
            </div>
          )}
        </div>

        <div className="mt-1">
          <MessageReactions
            messageId={message.id}
            reactions={reactions}
            currentUserId={currentUser.id}
            onReactionClick={handleReaction}
            onShowPicker={() => setShowReactionPicker(true)}
          />
          {showReactionPicker && (
            <div className="relative">
              <ReactionPicker
                messageId={message.id}
                currentReactions={reactions}
                currentUserId={currentUser.id}
                onSelect={handleReaction}
                onClose={() => setShowReactionPicker(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}








