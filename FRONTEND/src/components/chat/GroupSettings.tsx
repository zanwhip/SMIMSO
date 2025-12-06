'use client';

import { useState } from 'react';
import { Conversation, User } from '@/types';
import { FiUsers, FiUserPlus, FiUserMinus, FiX } from 'react-icons/fi';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface GroupSettingsProps {
  conversation: Conversation;
  currentUser: User;
  onClose: () => void;
  onMemberAdded: () => void;
  onMemberRemoved: () => void;
}

export default function GroupSettings({
  conversation,
  currentUser,
  onClose,
  onMemberAdded,
  onMemberRemoved,
}: GroupSettingsProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      // Filter out users who are already members
      const memberIds = conversation.participants?.map((p) => p.user_id) || [];
      const filtered = response.data.data.filter(
        (user: User) => !memberIds.includes(user.id) && user.id !== currentUser.id
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await api.post(`/chat/conversations/${conversation.id}/members`, { userId });
      toast.success('Member added');
      setShowAddMember(false);
      setSearchQuery('');
      setSearchResults([]);
      onMemberAdded();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await api.delete(`/chat/conversations/${conversation.id}/members/${userId}`);
      toast.success('Member removed');
      onMemberRemoved();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove member');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Group Settings</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h4 className="font-medium mb-2">Members ({conversation.participants?.length || 0})</h4>
            <div className="space-y-2">
              {conversation.participants?.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      {participant.user?.first_name?.[0] || 'U'}
                    </div>
                    <span className="text-sm">
                      {participant.user?.first_name} {participant.user?.last_name}
                    </span>
                  </div>
                  {participant.user_id !== currentUser.id && (
                    <button
                      onClick={() => handleRemoveMember(participant.user_id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiUserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {!showAddMember ? (
            <button
              onClick={() => setShowAddMember(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <FiUserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                placeholder="Search users..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {isSearching && <div className="text-sm text-gray-500">Searching...</div>}
              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleAddMember(user.id)}
                      className="w-full flex items-center space-x-2 p-2 hover:bg-gray-50 rounded text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.first_name[0]}
                      </div>
                      <span className="text-sm">
                        {user.first_name} {user.last_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}











