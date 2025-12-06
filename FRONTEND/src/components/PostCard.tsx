'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Post } from '@/types';
import { getImageUrl, formatNumber } from '@/lib/utils';
import { FiHeart, FiMessageCircle } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post: initialPost }: PostCardProps) {
  const [post, setPost] = useState(initialPost);
  const [isLiking, setIsLiking] = useState(false);

  // Sync state when prop changes
  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLiking) return;

    setIsLiking(true);
    const wasLiked = post.isLiked;

    // Optimistic update
    setPost((prev) => ({
      ...prev,
      isLiked: !wasLiked,
      like_count: wasLiked ? prev.like_count - 1 : prev.like_count + 1,
    }));

    try {
      if (wasLiked) {
        await api.delete(`/posts/${post.id}/like`);
      } else {
        await api.post(`/posts/${post.id}/like`);
      }
    } catch (error) {
      // Revert on error
      setPost((prev) => ({
        ...prev,
        isLiked: wasLiked,
        like_count: wasLiked ? prev.like_count + 1 : prev.like_count - 1,
      }));
      toast.error('An error occurred');
    } finally {
      setIsLiking(false);
    }
  };

  const imageUrl = post.image?.image_url || post.images?.[0]?.image_url;

  return (
    <Link href={`/post/${post.id}`} className="block">
      <div className="post-card-item bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-large transition-all duration-500 cursor-pointer relative group w-full card-hover">
        {/* Image */}
        {imageUrl && (
          <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
            <Image
              src={getImageUrl(imageUrl)}
              alt={post.title || 'Post image'}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              unoptimized
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {/* Gradient overlay at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
        )}

        {/* Like and Comment Icons at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 md:p-4 flex items-center justify-center space-x-4 sm:space-x-5 md:space-x-6 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1.5 sm:space-x-2 transition-all duration-300 transform hover:scale-110 ${
              post.isLiked ? 'text-red-500 hover:text-red-600' : 'text-white hover:text-red-200'
            }`}
            title={post.isLiked ? 'Unlike' : 'Like'}
          >
            {post.isLiked ? (
              <FaHeart className="text-lg sm:text-xl md:text-2xl text-red-500" />
            ) : (
              <FiHeart className="text-lg sm:text-xl md:text-2xl" />
            )}
            <span className="font-bold text-sm sm:text-base md:text-lg drop-shadow-lg">{formatNumber(post.like_count)}</span>
          </button>

          <Link
            href={`/post/${post.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center space-x-1.5 sm:space-x-2 text-white hover:text-blue-300 transition-all duration-300 transform hover:scale-110"
          >
            <FiMessageCircle className="text-lg sm:text-xl md:text-2xl" />
            <span className="font-bold text-sm sm:text-base md:text-lg drop-shadow-lg">{formatNumber(post.comment_count)}</span>
          </Link>
        </div>
      </div>
    </Link>
  );
}

