'use client';

import { useState, useRef, useEffect } from 'react';
import { FiImage } from 'react-icons/fi';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
}

export default function GifPicker({ onGifSelect }: GifPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [gifs, setGifs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Using Giphy API (you'll need to get a free API key from https://developers.giphy.com/)
  const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'demo_key';
  const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      loadTrendingGifs();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadTrendingGifs = async () => {
    try {
      setIsLoading(true);
      // Fallback to a demo API or you can use your backend to proxy Giphy requests
      const response = await fetch(`${GIPHY_API_URL}/trending?api_key=${GIPHY_API_KEY}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setGifs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load GIFs:', error);
      // Fallback: show message or use placeholder
    } finally {
      setIsLoading(false);
    }
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      loadTrendingGifs();
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `${GIPHY_API_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20`
      );
      if (response.ok) {
        const data = await response.json();
        setGifs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to search GIFs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGifClick = (gif: any) => {
    const gifUrl = gif.images?.downsized_medium?.url || gif.images?.original?.url;
    if (gifUrl) {
      onGifSelect(gifUrl);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        type="button"
      >
        <FiImage className="w-5 h-5" />
      </button>
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search GIFs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchGifs(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2">
            {isLoading ? (
              <div className="col-span-2 text-center py-4 text-gray-500 text-sm">Loading GIFs...</div>
            ) : gifs.length === 0 ? (
              <div className="col-span-2 text-center py-4 text-gray-500 text-sm">
                {searchQuery ? 'No GIFs found' : 'Load trending GIFs...'}
              </div>
            ) : (
              gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleGifClick(gif)}
                  className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 ring-purple-500 transition"
                >
                  <Image
                    src={gif.images?.preview_gif?.url || gif.images?.fixed_height_small?.url || ''}
                    alt={gif.title || 'GIF'}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}



