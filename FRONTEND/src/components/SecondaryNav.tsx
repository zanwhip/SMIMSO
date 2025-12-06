'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiHome, FiTrendingUp, FiHeart, FiZap } from 'react-icons/fi';

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
  ];

  return (
    <div className="bg-white">
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
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

