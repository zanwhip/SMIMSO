'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FiUser, FiSettings, FiBookmark, FiLogOut } from 'react-icons/fi';

interface ProfilePopoverProps {
  onLogout: () => void;
}

export default function ProfilePopover({ onLogout }: ProfilePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const menuItems = [
    {
      icon: FiUser,
      label: 'My Profile',
      href: '/profile',
    },
    {
      icon: FiSettings,
      label: 'Settings',
      href: '/settings',
    },
    {
      icon: FiBookmark,
      label: 'My Collection',
      href: '/collection',
    },
  ];

  return (
    <div className="relative" ref={popoverRef}>
      
      <div
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="cursor-pointer"
      >
        
        <div className="h-full flex items-center">
          
        </div>

        {isOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-fade-in"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-gray-700 hover:text-gray-900"
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}

            <div className="border-t border-gray-200 my-2" />

            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-red-600 hover:text-red-700"
            >
              <FiLogOut className="w-5 h-5" />
              <span className="font-medium">Log Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

