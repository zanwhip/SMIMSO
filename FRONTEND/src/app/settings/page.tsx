'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import { FiSettings, FiUser, FiBell, FiLock, FiGlobe } from 'react-icons/fi';

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
            <FiSettings className="w-10 h-10 mr-3" />
            Settings
          </h1>
          <p className="text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-6">
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <FiUser className="w-6 h-6 text-gray-700 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">
                Account Settings
              </h2>
            </div>
            <div className="space-y-4">
              <button className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="font-medium text-gray-900">Edit Profile</div>
                <div className="text-sm text-gray-600">
                  Update your profile information
                </div>
              </button>
              <button className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="font-medium text-gray-900">Change Email</div>
                <div className="text-sm text-gray-600">
                  Update your email address
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <FiLock className="w-6 h-6 text-gray-700 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">
                Privacy & Security
              </h2>
            </div>
            <div className="space-y-4">
              <button className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="font-medium text-gray-900">
                  Change Password
                </div>
                <div className="text-sm text-gray-600">
                  Update your password regularly
                </div>
              </button>
              <button className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="font-medium text-gray-900">
                  Two-Factor Authentication
                </div>
                <div className="text-sm text-gray-600">
                  Add an extra layer of security
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <FiBell className="w-6 h-6 text-gray-700 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">
                Notifications
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium text-gray-900">
                    Push Notifications
                  </div>
                  <div className="text-sm text-gray-600">
                    Receive notifications on your device
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium text-gray-900">
                    Email Notifications
                  </div>
                  <div className="text-sm text-gray-600">
                    Receive updates via email
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <FiGlobe className="w-6 h-6 text-gray-700 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">
                Language & Region
              </h2>
            </div>
            <div className="space-y-4">
              <button className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="font-medium text-gray-900">Language</div>
                <div className="text-sm text-gray-600">
                  English (Default)
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

