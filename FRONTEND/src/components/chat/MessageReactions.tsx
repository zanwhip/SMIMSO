'use client';

import { MessageReaction } from '@/types';
import { useState } from 'react';
import ReactionPicker from './ReactionPicker';

interface MessageReactionsProps {
  messageId: string;
  reactions: MessageReaction[];
  currentUserId: string;
  onReactionClick: (emoji: string) => void;
  onShowPicker: () => void;
}

export default function MessageReactions({
  messageId,
  reactions,
  currentUserId,
  onReactionClick,
  onShowPicker,
}: MessageReactionsProps) {
  // Group reactions by emoji
  const reactionsByEmoji = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  if (Object.keys(reactionsByEmoji).length === 0) {
    return (
      <button
        onClick={onShowPicker}
        className="text-xs text-gray-500 hover:text-gray-700 transition"
      >
        Add reaction
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-1 flex-wrap gap-1 mt-1">
      {Object.entries(reactionsByEmoji).map(([emoji, emojiReactions]) => {
        const hasReacted = emojiReactions.some((r) => r.user_id === currentUserId);
        return (
          <button
            key={emoji}
            onClick={() => onReactionClick(emoji)}
            className={`text-xs px-2 py-1 rounded-full border transition ${
              hasReacted
                ? 'bg-purple-100 border-purple-300 text-purple-700'
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-1">{emoji}</span>
            <span>{emojiReactions.length}</span>
          </button>
        );
      })}
      <button
        onClick={onShowPicker}
        className="text-xs px-2 py-1 rounded-full border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
      >
        +
      </button>
    </div>
  );
}











