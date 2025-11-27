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
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900">SMIMSO</span>
          </Link>

          {/* Search Bar */}
          {isAuthenticated && (
            <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 pr-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </form>
          )}

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link
                  href="/"
                  className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition"
                >
                  <FiHome size={20} />
                  <span className="hidden sm:inline">Trang chủ</span>
                </Link>

                <Link
                  href="/create"
                  className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition"
                >
                  <FiPlusCircle size={20} />
                  <span className="hidden sm:inline">Tạo bài</span>
                </Link>

                {/* Chat */}
                <Link
                  href="/chat"
                  className="relative flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition"
                >
                  <div className="relative">
                    <FiMessageCircle size={20} />
                    {chatUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline">Tin nhắn</span>
                </Link>

                {/* Notification Bell */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition"
                  >
                    <div className="relative">
                      <FiBell size={20} />
                      {notificationUnreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                        </span>
                      )}
                    </div>
                    <span className="hidden sm:inline">Thông báo</span>
                  </button>
                  {showNotifications && (
                    <NotificationDropdown onClose={() => setShowNotifications(false)} />
                  )}
                </div>

                <Link
                  href="/profile"
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition"
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
                  <span className="hidden sm:inline">{user?.first_name}</span>
                </Link>

                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition"
                >
                  <FiLogOut size={20} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-primary-600 transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirm Logout
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to logout?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
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

