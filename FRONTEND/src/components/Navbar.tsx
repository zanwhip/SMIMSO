'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { FiHome, FiPlusCircle, FiUser, FiLogOut, FiSearch, FiBell, FiMessageCircle, FiSettings, FiBookmark, FiImage, FiCompass, FiShield, FiAward } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import NotificationDropdown from './NotificationDropdown';
import { useNotifications } from '@/contexts/NotificationContext';
import { useChat } from '@/contexts/ChatContext';
import UserAvatar from './UserAvatar';
import CreatePostModal from './CreatePostModal';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showExplorePopover, setShowExplorePopover] = useState(false);
  const [showLicensePopover, setShowLicensePopover] = useState(false);
  const [showHomePopover, setShowHomePopover] = useState(false);
  const [showUploadPopover, setShowUploadPopover] = useState(false);
  const [showMessagesPopover, setShowMessagesPopover] = useState(false);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
  const profilePopoverRef = useRef<HTMLDivElement>(null);
  const explorePopoverRef = useRef<HTMLDivElement>(null);
  const licensePopoverRef = useRef<HTMLDivElement>(null);
  const homePopoverRef = useRef<HTMLDivElement>(null);
  const uploadPopoverRef = useRef<HTMLDivElement>(null);
  const messagesPopoverRef = useRef<HTMLDivElement>(null);
  const notificationsPopoverRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChat();

  useEffect(() => {
    }, [notificationUnreadCount]);

  // Listen for upload modal event
  useEffect(() => {
    const handleOpenUploadModal = () => {
      setIsCreateModalOpen(true);
    };

    window.addEventListener('openUploadModal', handleOpenUploadModal);
    return () => {
      window.removeEventListener('openUploadModal', handleOpenUploadModal);
    };
  }, []);

  // Track scroll to show/hide search bar
  useEffect(() => {
    if (pathname !== '/') {
      setShowSearchBar(true);
      return;
    }

    const handleScroll = () => {
      const heroSearchElement = document.querySelector('[data-hero-search]');
      if (heroSearchElement) {
        const rect = heroSearchElement.getBoundingClientRect();
        const heroSearchBottom = rect.bottom + window.scrollY;
        setShowSearchBar(window.scrollY > heroSearchBottom);
      } else {
        setShowSearchBar(window.scrollY > 400);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profilePopoverRef.current && !profilePopoverRef.current.contains(event.target as Node)) {
        setShowProfilePopover(false);
      }
      if (explorePopoverRef.current && !explorePopoverRef.current.contains(event.target as Node)) {
        setShowExplorePopover(false);
      }
      if (licensePopoverRef.current && !licensePopoverRef.current.contains(event.target as Node)) {
        setShowLicensePopover(false);
      }
      if (homePopoverRef.current && !homePopoverRef.current.contains(event.target as Node)) {
        setShowHomePopover(false);
      }
      if (uploadPopoverRef.current && !uploadPopoverRef.current.contains(event.target as Node)) {
        setShowUploadPopover(false);
      }
      if (messagesPopoverRef.current && !messagesPopoverRef.current.contains(event.target as Node)) {
        setShowMessagesPopover(false);
      }
      if (notificationsPopoverRef.current && !notificationsPopoverRef.current.contains(event.target as Node)) {
        setShowNotificationsPopover(false);
      }
    };

    if (showProfilePopover || showExplorePopover || showLicensePopover || showHomePopover || showUploadPopover || showMessagesPopover || showNotificationsPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfilePopover, showExplorePopover, showLicensePopover, showHomePopover, showUploadPopover, showMessagesPopover, showNotificationsPopover]);

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

  const handleImageSearchClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('Kích thước ảnh phải nhỏ hơn 10MB');
        return;
      }

      // Redirect to search page with image mode
      router.push('/search?mode=image');
      // Store file reference in sessionStorage as base64
      const reader = new FileReader();
      reader.onloadend = () => {
        sessionStorage.setItem('pendingImageSearch', reader.result as string);
        sessionStorage.setItem('pendingImageName', file.name);
        // Trigger event to notify search page
        window.dispatchEvent(new CustomEvent('imageSearchReady'));
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <Link href="/" className="flex items-center space-x-2 group flex-shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shadow-md">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:inline">SMIMSO</span>
          </Link>

          {isAuthenticated && (
            <form 
              onSubmit={handleSearch} 
              className={`flex-1 max-w-2xl mx-6 hidden md:block transition-all duration-300 ${
                showSearchBar 
                  ? 'opacity-100 translate-y-0 pointer-events-auto' 
                  : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}
            >
              <div className="relative search-focus rounded-lg">
                <input
                  type="text"
                  placeholder="Search for free photos"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 pl-11 pr-20 rounded-lg border border-gray-300 bg-white/90 backdrop-blur-sm hover:bg-white focus:bg-white focus:border-accent-500 focus:outline-none transition-all text-sm shadow-sm"
                />
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleImageSearchClick}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-accent-600 hover:bg-gray-100 rounded-md transition-all"
                  title="Tìm kiếm bằng ảnh"
                >
                  <FiImage className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}

          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <>
                <div className="relative" ref={explorePopoverRef}>
                  <button
                    onMouseEnter={() => setShowExplorePopover(true)}
                    onMouseLeave={() => setShowExplorePopover(false)}
                    className="p-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-all active-scale"
                    title="Explore"
                  >
                    <FiCompass className="w-5 h-5" />
                  </button>
                  {showExplorePopover && (
                    <div
                      className="absolute right-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 py-2 z-50 animate-fade-in"
                      onMouseEnter={() => setShowExplorePopover(true)}
                      onMouseLeave={() => setShowExplorePopover(false)}
                    >
                      <Link
                        href="/explore"
                        className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50/80 transition-colors text-gray-700 hover:text-gray-900"
                        onClick={() => setShowExplorePopover(false)}
                      >
                        <FiCompass className="w-5 h-5" />
                        <span className="font-medium">Explore</span>
                      </Link>
                      <Link
                        href="/challenges"
                        className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50/80 transition-colors text-gray-700 hover:text-gray-900"
                        onClick={() => setShowExplorePopover(false)}
                      >
                        <FiAward className="w-5 h-5" />
                        <span className="font-medium">Challenges</span>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="relative" ref={licensePopoverRef}>
                  <button
                    onMouseEnter={() => setShowLicensePopover(true)}
                    onMouseLeave={() => setShowLicensePopover(false)}
                    className="p-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-all active-scale"
                    title="License"
                  >
                    <FiShield className="w-5 h-5" />
                  </button>
                  {showLicensePopover && (
                    <div
                      className="absolute right-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 py-2 z-50 animate-fade-in"
                      onMouseEnter={() => setShowLicensePopover(true)}
                      onMouseLeave={() => setShowLicensePopover(false)}
                    >
                      <div className="px-4 py-2.5 text-sm text-gray-600">
                        <p className="font-semibold text-gray-900 mb-1">License Information</p>
                        <p className="text-xs">All content is licensed under Creative Commons</p>
                      </div>
                      <div className="border-t border-gray-200/50 my-2" />
                      <Link
                        href="/license"
                        className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50/80 transition-colors text-gray-700 hover:text-gray-900"
                        onClick={() => setShowLicensePopover(false)}
                      >
                        <FiShield className="w-5 h-5" />
                        <span className="font-medium">View License</span>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="relative" ref={homePopoverRef}>
                  <Link
                    href="/"
                    onMouseEnter={() => setShowHomePopover(true)}
                    onMouseLeave={() => setShowHomePopover(false)}
                    className="p-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-all active-scale"
                    title="Home"
                  >
                    <FiHome className="w-5 h-5" />
                  </Link>
                  {showHomePopover && (
                    <div
                      className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 py-2 z-50 animate-fade-in"
                      onMouseEnter={() => setShowHomePopover(true)}
                      onMouseLeave={() => setShowHomePopover(false)}
                    >
                      <div className="px-4 py-2.5">
                        <p className="font-semibold text-gray-900">Home</p>
                        <p className="text-xs text-gray-600">Go to homepage</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" ref={uploadPopoverRef}>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    onMouseEnter={() => setShowUploadPopover(true)}
                    onMouseLeave={() => setShowUploadPopover(false)}
                    className="hidden sm:flex items-center space-x-1.5 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-all font-medium active-scale"
                    title="Upload"
                  >
                    <FiPlusCircle className="w-5 h-5" />
                    <span className="hidden lg:inline">Upload</span>
                  </button>
                  {showUploadPopover && (
                    <div
                      className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 py-2 z-50 animate-fade-in"
                      onMouseEnter={() => setShowUploadPopover(true)}
                      onMouseLeave={() => setShowUploadPopover(false)}
                    >
                      <div className="px-4 py-2.5">
                        <p className="font-semibold text-gray-900">Upload</p>
                        <p className="text-xs text-gray-600">Share your photos</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" ref={messagesPopoverRef}>
                  <Link
                    href="/chat"
                    onMouseEnter={() => setShowMessagesPopover(true)}
                    onMouseLeave={() => setShowMessagesPopover(false)}
                    className="relative p-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-all active-scale"
                    title="Messages"
                  >
                    <FiMessageCircle className="w-5 h-5" />
                    {chatUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md">
                        {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                      </span>
                    )}
                  </Link>
                  {showMessagesPopover && (
                    <div
                      className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 py-2 z-50 animate-fade-in"
                      onMouseEnter={() => setShowMessagesPopover(true)}
                      onMouseLeave={() => setShowMessagesPopover(false)}
                    >
                      <div className="px-4 py-2.5">
                        <p className="font-semibold text-gray-900">Messages</p>
                        <p className="text-xs text-gray-600">
                          {chatUnreadCount > 0 ? `${chatUnreadCount} unread messages` : 'No new messages'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" ref={notificationsPopoverRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    onMouseEnter={() => setShowNotificationsPopover(true)}
                    onMouseLeave={() => setShowNotificationsPopover(false)}
                    className="relative p-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-all active-scale"
                    title="Notifications"
                  >
                    <FiBell className="w-5 h-5" />
                    {notificationUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md">
                        {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                      </span>
                    )}
                  </button>
                  {showNotificationsPopover && (
                    <div
                      className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 py-2 z-50 animate-fade-in"
                      onMouseEnter={() => setShowNotificationsPopover(true)}
                      onMouseLeave={() => setShowNotificationsPopover(false)}
                    >
                      <div className="px-4 py-2.5">
                        <p className="font-semibold text-gray-900">Notifications</p>
                        <p className="text-xs text-gray-600">
                          {notificationUnreadCount > 0 ? `${notificationUnreadCount} unread notifications` : 'No new notifications'}
                        </p>
                      </div>
                    </div>
                  )}
                  {showNotifications && (
                    <NotificationDropdown onClose={() => setShowNotifications(false)} />
                  )}
                </div>

                <div className="relative" ref={profilePopoverRef}>
                  <div
                    onMouseEnter={() => setShowProfilePopover(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-all active-scale cursor-pointer"
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
                      className="absolute right-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 py-2 z-50 animate-fade-in"
                      onMouseEnter={() => setShowProfilePopover(true)}
                      onMouseLeave={() => setShowProfilePopover(false)}
                    >
                      <Link
                        href="/profile"
                        className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50/80 transition-colors text-gray-700 hover:text-gray-900"
                        onClick={() => setShowProfilePopover(false)}
                      >
                        <FiUser className="w-5 h-5" />
                        <span className="font-medium">My Profile</span>
                      </Link>

                      <Link
                        href="/settings"
                        className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50/80 transition-colors text-gray-700 hover:text-gray-900"
                        onClick={() => setShowProfilePopover(false)}
                      >
                        <FiSettings className="w-5 h-5" />
                        <span className="font-medium">Settings</span>
                      </Link>

                      <Link
                        href="/collection"
                        className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50/80 transition-colors text-gray-700 hover:text-gray-900"
                        onClick={() => setShowProfilePopover(false)}
                      >
                        <FiBookmark className="w-5 h-5" />
                        <span className="font-medium">My Collection</span>
                      </Link>

                      <div className="border-t border-gray-200/50 my-2" />

                      <button
                        onClick={() => {
                          setShowProfilePopover(false);
                          setShowLogoutModal(true);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 hover:bg-red-50/80 transition-colors text-red-600 hover:text-red-700"
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

