'use client';

import { useState, useRef, useEffect } from 'react';
import { FiImage } from 'react-icons/fi';
import Image from 'next/image';

interface StickerPickerProps {
  onStickerSelect: (stickerUrl: string) => void;
}

// Common sticker URLs - you can replace these with your own sticker pack URLs
const STICKER_PACKS = {
  'Emoji': [
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f600.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f601.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f602.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f603.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f604.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f605.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f606.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f607.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f608.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f609.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f60a.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f60b.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f60c.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f60d.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f60e.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f60f.png',
  ],
  'Love': [
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/2764.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f496.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f497.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f498.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f499.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f49a.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f49b.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f49c.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f49d.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f49e.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f49f.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f5a4.png',
  ],
  'Reactions': [
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f44d.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f44e.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f44f.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f64c.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f64f.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f91d.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f91e.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f91f.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f932.png',
    'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f933.png',
  ],
};

export default function StickerPicker({ onStickerSelect }: StickerPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<string>('Emoji');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
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

  const handleStickerClick = (stickerUrl: string) => {
    onStickerSelect(stickerUrl);
    setIsOpen(false);
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
          <div className="flex border-b border-gray-200 p-2 overflow-x-auto">
            {Object.keys(STICKER_PACKS).map((pack) => (
              <button
                key={pack}
                onClick={() => setSelectedPack(pack)}
                className={`px-3 py-1 text-xs rounded transition whitespace-nowrap mr-2 ${
                  selectedPack === pack
                    ? 'bg-purple-100 text-purple-600'
                    : 'hover:bg-gray-100'
                }`}
              >
                {pack}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-4 gap-2">
              {STICKER_PACKS[selectedPack as keyof typeof STICKER_PACKS]?.map((stickerUrl, index) => (
                <button
                  key={index}
                  onClick={() => handleStickerClick(stickerUrl)}
                  className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 ring-purple-500 transition p-1"
                >
                  <Image
                    src={stickerUrl}
                    alt={`Sticker ${index + 1}`}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}









