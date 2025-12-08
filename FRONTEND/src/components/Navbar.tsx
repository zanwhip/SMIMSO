'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiHome, FiPlusCircle, FiUser, FiLogOut, FiSearch, FiBell, FiMessageCircle, FiSettings, FiBookmark } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import NotificationDropdown from './NotificationDropdown';
import { useNotifications } from '@/contexts/NotificationContext';
import { useChat } from '@/contexts/ChatContext';
import UserAvatar from './UserAvatar';
import CreatePostModal from './CreatePostModal';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const profilePopoverRef = useRef<HTMLDivElement>(null);
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChat();

  useEffect(() => {
    }, [notificationUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profilePopoverRef.current && !profilePopoverRef.current.contains(event.target as Node)) {
        setShowProfilePopover(false);
      }
    };

    if (showProfilePopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfilePopover]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    logout();
    router.push('/login');
    setShowLogoutModal(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:inline">SMIMSO</span>
          </Link>

          {isAuthenticated && (
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-6 hidden md:block">
              <div className="relative search-focus rounded-lg">
                <input
                  type="text"
                  placeholder="Search for free photos"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 pl-11 pr-4 rounded-lg border border-gray-300 bg-gray-50 hover:bg-white focus:bg-white focus:border-accent-500 focus:outline-none transition-all text-sm"
                />
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </form>
          )}

          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <>
                <Link
                  href="/"
                  className="p-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all active-scale"
                  title="Home"
                >
                  <FiHome className="w-5 h-5" />
                </Link>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="hidden sm:flex items-center space-x-1.5 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all font-medium active-scale"
                  title="Upload"
                >
                  <FiPlusCircle className="w-5 h-5" />
                  <span className="hidden lg:inline">Upload</span>
                </button>

                <Link
                  href="/chat"
                  className="relative p-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all active-scale"
                  title="Messages"
                >
                  <FiMessageCircle className="w-5 h-5" />
                  {chatUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                    </span>
                  )}
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all active-scale"
                    title="Notifications"
                  >
                    <FiBell className="w-5 h-5" />
                    {notificationUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <NotificationDropdown onClose={() => setShowNotifications(false)} />
                  )}
                </div>

                <div className="relative" ref={profilePopoverRef}>
                  <div
                    onMouseEnter={() => setShowProfilePopover(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all active-scale cursor-pointer"
                  >
                    {user && (
                      <UserAvatar
                        userId={user.id}
                        avatarUrl={user.avatar_url || undefined}
                        firstName={user.first_name}
                        lastName={user.last_name}
                        size="sm"
                        showOnlineStatus={false}
                      />
                    )}
                    <span className="hidden xl:inline font-medium">{user?.first_name}</span>
                  </div>

                  {showProfilePopover && (
                    <div
                      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-fade-in"
                      onMouseEnter={() => setShowProfilePopover(true)}
                      onMouseLeave={() => setShowProfilePopover(false)}
                    >
                      <Link
                        href="/profile"
                        className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-gray-700 hover:text-gray-900"
                        onClick={() => setShowProfilePopover(false)}
                      >
                        <FiUser className="w-5 h-5" />
                        <span className="font-medium">My Profile</span>
                      </Link>

                      <Link
                        href="/settings"
                        className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-gray-700 hover:text-gray-900"
                        onClick={() => setShowProfilePopover(false)}
                      >
                        <FiSettings className="w-5 h-5" />
                        <span className="font-medium">Settings</span>
                      </Link>

                      <Link
                        href="/collection"
                        className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-gray-700 hover:text-gray-900"
                        onClick={() => setShowProfilePopover(false)}
                      >
                        <FiBookmark className="w-5 h-5" />
                        <span className="font-medium">My Collection</span>
                      </Link>

                      <div className="border-t border-gray-200 my-2" />

                      <button
                        onClick={() => {
                          setShowProfilePopover(false);
                          setShowLogoutModal(true);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-red-600 hover:text-red-700"
                      >
                        <FiLogOut className="w-5 h-5" />
                        <span className="font-medium">Log Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-accent-600 hover:bg-accent-700 text-white px-5 py-2 rounded-lg font-medium transition-all active-scale"
                >
                  Join
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-large animate-scale-in">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Confirm Logout
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to logout?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg hover:from-red-700 hover:to-red-600 transition-all duration-300 shadow-medium hover:shadow-large font-medium ripple"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          window.location.reload();
        }}
      />
    </nav>
  );
}

