'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useRef } from 'react';
import { FiImage } from 'react-icons/fi';

export default function HeroBanner() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

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
    <div className="relative bg-gradient-to-br from-gray-50 via-white to-blue-50/30 overflow-hidden">
      <div className="absolute inset-0 overflow-visible pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-br from-blue-500/15 to-blue-600/15 rounded-full blur-3xl animate-float-1" 
             style={{ animationDelay: '0s', willChange: 'transform' }} />
        <div className="absolute top-10 right-1/4 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-orange-500/20 rounded-full blur-2xl animate-float-2" 
             style={{ animationDelay: '0.3s', willChange: 'transform' }} />
        <div className="absolute top-32 right-1/3 w-16 h-16 bg-gradient-to-br from-yellow-400/25 to-yellow-500/25 rounded-full blur-xl animate-float-3" 
             style={{ animationDelay: '0.6s', willChange: 'transform' }} />
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-br from-yellow-300/17 to-yellow-400/17 rounded-full blur-2xl animate-float-4" 
             style={{ animationDelay: '0.5s', willChange: 'transform' }} />
        <div className="absolute bottom-32 right-1/3 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-xl animate-float-5" 
             style={{ animationDelay: '1s', willChange: 'transform' }} />
        <div className="absolute top-1/2 left-1/3 w-12 h-12 bg-gradient-to-br from-pink-400/15 to-purple-400/15 rounded-full blur-lg animate-float-6" 
             style={{ animationDelay: '0.8s', willChange: 'transform' }} />
        <div className="absolute bottom-1/3 right-1/4 w-20 h-20 bg-gradient-to-br from-green-400/15 to-emerald-400/15 rounded-full blur-xl animate-float-7" 
             style={{ animationDelay: '0.2s', willChange: 'transform' }} />
        <div className="absolute top-1/4 left-1/2 w-28 h-28 bg-gradient-to-br from-indigo-400/17 to-blue-500/17 rounded-full blur-2xl animate-float-3" 
             style={{ animationDelay: '1.3s', willChange: 'transform' }} />
        <div className="absolute top-2/3 left-1/4 w-36 h-36 bg-gradient-to-br from-rose-400/15 to-pink-500/15 rounded-full blur-3xl animate-float-6" 
             style={{ animationDelay: '1.2s', willChange: 'transform' }} />
        <div className="absolute top-1/3 right-1/2 w-20 h-20 bg-gradient-to-br from-teal-400/20 to-cyan-500/20 rounded-full blur-xl animate-float-2" 
             style={{ animationDelay: '0.9s', willChange: 'transform' }} />
      </div>

      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 relative" style={{ zIndex: 10 }}>
        <div className="grid lg:grid-cols-2 gap-12 items-center pt-8 md:pt-12 lg:pt-16 pb-16 md:pb-20 lg:pb-24">
          <div className="space-y-8 animate-fade-in-up">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
                DESIGNS THAT{' '}
                <span className="text-blue-600 bg-clip-text bg-gradient-to-r from-blue-500 to-blue-700">
                  SPEAK
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-xl">
                Bringing your vision to life with creativity and precision.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  const event = new CustomEvent('openUploadModal');
                  window.dispatchEvent(event);
                }}
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 flex items-center space-x-2 backdrop-blur-sm"
              >
                <svg 
                  className="w-5 h-5 transform group-hover:scale-110 transition-transform" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Upload</span>
              </button>
            </div>

            <div className="pt-4" data-hero-search>
              <div className="relative max-w-md group">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="w-full px-6 py-3.5 pl-12 pr-14 rounded-full border-2 border-gray-200 bg-white/90 backdrop-blur-md hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-all text-gray-900 placeholder-gray-500 shadow-lg"
                  onFocus={(e) => {
                    const value = e.target.value;
                    if (value.trim()) {
                      router.push(`/search?q=${encodeURIComponent(value)}`);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = (e.target as HTMLInputElement).value;
                      if (value.trim()) {
                        router.push(`/search?q=${encodeURIComponent(value)}`);
                      }
                    }
                  }}
                />
                <svg 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                  title="Tìm kiếm bằng ảnh"
                >
                  <FiImage className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative w-full aspect-square lg:aspect-auto lg:h-[600px]">
              <div className="relative overflow-visible hover:scale-105 transition-transform duration-500" style={{ zIndex: 10 }}>
                <Image
                  src="/images/banner.svg"
                  alt="Creative Design Banner"
                  width={800}
                  height={800}
                  className="w-full h-full object-contain relative z-10 scale-[0.85]"
                  priority
                />
                
                <div className="absolute top-8 right-8 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse opacity-80 z-20 shadow-lg"></div>
                <div className="absolute bottom-8 left-8 w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full animate-bounce opacity-80 z-20 shadow-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

