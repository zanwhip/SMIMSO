'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiHome, FiTrendingUp, FiHeart, FiZap, FiAward } from 'react-icons/fi';

export default function SecondaryNav() {
  const pathname = usePathname();

  const navItems = [
    {
      icon: FiHome,
      label: 'Home',
      href: '/',
    },
    {
      icon: FiTrendingUp,
      label: 'Leaderboard',
      href: '/leaderboard',
    },
    {
      icon: FiHeart,
      label: 'Favorite',
      href: '/favorite',
    },
    {
      icon: FiZap,
      label: 'Intelligence',
      href: '/intelligence',
    },
    {
      icon: FiAward,
      label: 'Challenges',
      href: '/challenges',
    },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-center space-x-2 py-4 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-5 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg shadow-gray-900/20 scale-105'
                    : 'bg-gray-100/80 backdrop-blur-sm text-gray-700 hover:bg-gray-200/80 hover:scale-105'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

