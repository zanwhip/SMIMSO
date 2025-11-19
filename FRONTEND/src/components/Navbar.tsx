'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { FiHome, FiPlusCircle, FiUser, FiLogOut, FiSearch } from 'react-icons/fi';
import { getImageUrl } from '@/lib/utils';
import { useState } from 'react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    router.push('/login');
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
                  placeholder="Tìm kiếm..."
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

                <Link
                  href="/profile"
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition"
                >
                  {user?.avatar_url ? (
                    <Image
                      src={getImageUrl(user.avatar_url)}
                      alt={user.first_name}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <FiUser size={16} />
                    </div>
                  )}
                  <span className="hidden sm:inline">{user?.first_name}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition"
                >
                  <FiLogOut size={20} />
                  <span className="hidden sm:inline">Đăng xuất</span>
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
    </nav>
  );
}

