'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiHome, FiPlusCircle, FiUser, FiLogOut, FiSearch, FiBell, FiMessageCircle } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import NotificationDropdown from './NotificationDropdown';
import { useNotifications } from '@/contexts/NotificationContext';
import { useChat } from '@/contexts/ChatContext';
import UserAvatar from './UserAvatar';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChat();

  // Debug: Log when unreadCount changes
  useEffect(() => {
    console.log('🔔 Navbar: notificationUnreadCount changed to:', notificationUnreadCount);
  }, [notificationUnreadCount]);

  const handleLogout = async () => {
    // Sign out from NextAuth
    await signOut({ redirect: false });
    // Also clear Zustand store
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
    <nav className="glass sticky top-0 z-50 border-b border-gray-200/50 shadow-soft backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-1.5 sm:space-x-2 group flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-glow group-hover:shadow-glow-blue transition-all duration-300 group-hover:scale-110">
              <span className="text-white font-bold text-lg sm:text-xl">S</span>
            </div>
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent hidden xs:inline">SMIMSO</span>
          </Link>

          {/* Search Bar */}
          {isAuthenticated && (
            <form onSubmit={handleSearch} className="flex-1 max-w-md mx-2 sm:mx-4 md:mx-8 hidden md:block">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 pl-9 sm:pl-11 pr-4 rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-300 transition-all duration-300 shadow-soft hover:shadow-medium text-sm sm:text-base"
                />
                <FiSearch className="absolute left-2.5 sm:left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
              </div>
            </form>
          )}

          {/* Navigation Links */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  href="/"
                  className="flex items-center justify-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50/50 transition-all duration-300 group"
                  title="Home"
                >
                  <FiHome size={18} className="sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                  <span className="hidden lg:inline font-medium text-sm sm:text-base">Home</span>
                </Link>

                <Link
                  href="/create"
                  className="flex items-center justify-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50/50 transition-all duration-300 group"
                  title="Create"
                >
                  <FiPlusCircle size={18} className="sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                  <span className="hidden lg:inline font-medium text-sm sm:text-base">Create</span>
                </Link>

                {/* Chat */}
                <Link
                  href="/chat"
                  className="relative flex items-center justify-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50/50 transition-all duration-300 group"
                  title="Messages"
                >
                  <div className="relative">
                    <FiMessageCircle size={18} className="sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    {chatUnreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] sm:text-xs font-bold rounded-full min-w-[16px] sm:min-w-[20px] h-4 sm:h-5 flex items-center justify-center px-1 sm:px-1.5 shadow-lg animate-pulse-slow">
                        {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden lg:inline font-medium text-sm sm:text-base">Messages</span>
                </Link>

                {/* Notification Bell */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative flex items-center justify-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50/50 transition-all duration-300 group"
                    title="Notifications"
                  >
                    <div className="relative">
                      <FiBell size={18} className="sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                      {notificationUnreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] sm:text-xs font-bold rounded-full min-w-[16px] sm:min-w-[20px] h-4 sm:h-5 flex items-center justify-center px-1 sm:px-1.5 shadow-lg animate-pulse-slow">
                          {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                        </span>
                      )}
                    </div>
                    <span className="hidden lg:inline font-medium text-sm sm:text-base">Notifications</span>
                  </button>
                  {showNotifications && (
                    <NotificationDropdown onClose={() => setShowNotifications(false)} />
                  )}
                </div>

                <Link
                  href="/profile"
                  className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-gray-700 hover:text-primary-600 hover:bg-primary-50/50 transition-all duration-300 group"
                  title="Profile"
                >
                  {user && (
                    <div className="group-hover:scale-110 transition-transform">
                      <UserAvatar
                        userId={user.id}
                        avatarUrl={user.avatar_url || undefined}
                        firstName={user.first_name}
                        lastName={user.last_name}
                        size="sm"
                        showOnlineStatus={false}
                      />
                    </div>
                  )}
                  <span className="hidden xl:inline font-medium text-sm sm:text-base">{user?.first_name}</span>
                </Link>

                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="flex items-center justify-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-gray-700 hover:text-red-600 hover:bg-red-50/50 transition-all duration-300 group"
                  title="Logout"
                >
                  <FiLogOut size={18} className="sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                  <span className="hidden lg:inline font-medium text-sm sm:text-base">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-gray-700 hover:text-primary-600 font-medium transition-colors duration-300 text-sm sm:text-base"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-lg hover:from-primary-700 hover:to-secondary-700 transition-all duration-300 shadow-medium hover:shadow-large font-medium ripple text-sm sm:text-base"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
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
    </nav>
  );
}

