'use client';

import { useState } from 'react';
import { FiEdit3, FiTrash2, FiMoreVertical } from 'react-icons/fi';
import { Message } from '@/types';

interface MessageActionsProps {
  message: Message;
  isOwnMessage: boolean;
  onEdit: (messageId: string, currentContent: string) => void;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string) => void;
}

export default function MessageActions({
  message,
  isOwnMessage,
  onEdit,
  onDelete,
  onReact,
}: MessageActionsProps) {
  const [showMenu, setShowMenu] = useState(false);

  if (!isOwnMessage) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-gray-200 rounded transition"
        >
          <FiMoreVertical className="w-4 h-4" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
            <button
              onClick={() => {
                onReact(message.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition"
            >
              React
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-1 hover:bg-gray-200 rounded transition"
      >
        <FiMoreVertical className="w-4 h-4" />
      </button>
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
          <button
            onClick={() => {
              onEdit(message.id, message.content || '');
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition flex items-center space-x-2"
          >
            <FiEdit3 className="w-4 h-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this message?')) {
                onDelete(message.id);
              }
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition flex items-center space-x-2 text-red-600"
          >
            <FiTrash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
          <button
            onClick={() => {
              onReact(message.id);
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition"
          >
            React
          </button>
        </div>
      )}
    </div>
  );
}

