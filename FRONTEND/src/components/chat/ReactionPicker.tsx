'use client';

import { useState } from 'react';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface ReactionPickerProps {
  messageId: string;
  currentReactions: { emoji: string; user_id: string }[];
  currentUserId: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function ReactionPicker({
  messageId,
  currentReactions,
  currentUserId,
  onSelect,
  onClose,
}: ReactionPickerProps) {
  const [showAll, setShowAll] = useState(false);

  const handleReactionClick = (emoji: string) => {
    const existingReaction = currentReactions.find(
      (r) => r.emoji === emoji && r.user_id === currentUserId
    );

    if (existingReaction) {
      // Remove reaction
      onSelect(emoji);
    } else {
      // Add reaction
      onSelect(emoji);
    }
    onClose();
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50">
      <div className="flex items-center space-x-1">
        {QUICK_REACTIONS.map((emoji) => {
          const hasReacted = currentReactions.some(
            (r) => r.emoji === emoji && r.user_id === currentUserId
          );
          return (
            <button
              key={emoji}
              onClick={() => handleReactionClick(emoji)}
              className={`text-2xl p-2 rounded transition ${
                hasReacted ? 'bg-purple-100' : 'hover:bg-gray-100'
              }`}
            >
              {emoji}
            </button>
          );
        })}
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xl p-2 rounded hover:bg-gray-100 transition"
        >
          😀
        </button>
      </div>
      {showAll && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
            {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁', '👅', '👄'].map((emoji) => {
              const hasReacted = currentReactions.some(
                (r) => r.emoji === emoji && r.user_id === currentUserId
              );
              return (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className={`text-xl p-1 rounded transition ${
                    hasReacted ? 'bg-purple-100' : 'hover:bg-gray-100'
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}








