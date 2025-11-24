'use client';

import { useState } from 'react';
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
      <div className="post-card-item bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition cursor-pointer relative group w-full">
        {/* Image */}
        {imageUrl && (
          <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
            <Image
              src={getImageUrl(imageUrl)}
              alt={post.title || 'Post image'}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        {/* Overlay with Like and Comment Icons */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center space-x-6 text-white">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 transition ${
                post.isLiked ? 'text-red-500' : 'text-white hover:text-red-400'
              }`}
            >
              {post.isLiked ? (
                <FaHeart className="text-2xl text-red-500" />
              ) : (
                <FiHeart className="text-2xl" />
              )}
              <span className="font-semibold text-lg">{formatNumber(post.like_count)}</span>
            </button>

            <Link
              href={`/post/${post.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center space-x-2 text-white hover:text-blue-300 transition"
            >
              <FiMessageCircle className="text-2xl" />
              <span className="font-semibold text-lg">{formatNumber(post.comment_count)}</span>
            </Link>
          </div>
        </div>
      </div>
    </Link>
  );
}

