'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Post } from '@/types';
import { getImageUrl, formatDate, formatNumber } from '@/lib/utils';
import { FiHeart, FiMessageCircle, FiBookmark } from 'react-icons/fi';
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
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsLiking(false);
    }
  };

  const imageUrl = post.image?.image_url || post.images?.[0]?.image_url;

  return (
    <Link href={`/post/${post.id}`}>
      <div className="masonry-item bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer image-hover-effect">
        {/* Image */}
        {imageUrl && (
          <div className="relative w-full aspect-auto">
            <Image
              src={getImageUrl(imageUrl)}
              alt={post.title}
              width={400}
              height={300}
              className="w-full h-auto object-cover"
              unoptimized
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
            {post.title}
          </h3>

          {/* Description */}
          {post.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {post.description}
            </p>
          )}

          {/* User Info */}
          {post.user && (
            <div className="flex items-center space-x-2 mb-3">
              {post.user.avatar_url ? (
                <Image
                  src={getImageUrl(post.user.avatar_url)}
                  alt={post.user.first_name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="w-6 h-6 bg-gray-300 rounded-full" />
              )}
              <span className="text-sm text-gray-700">
                {post.user.first_name} {post.user.last_name}
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLike}
                className="flex items-center space-x-1 hover:text-red-500 transition"
              >
                {post.isLiked ? (
                  <FaHeart className="text-red-500" />
                ) : (
                  <FiHeart />
                )}
                <span>{formatNumber(post.like_count)}</span>
              </button>

              <div className="flex items-center space-x-1">
                <FiMessageCircle />
                <span>{formatNumber(post.comment_count)}</span>
              </div>
            </div>

            <span className="text-xs text-gray-500">
              {formatDate(post.created_at)}
            </span>
          </div>

          {/* Category */}
          {post.category && (
            <div className="mt-3">
              <span className="inline-block px-2 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded">
                {post.category.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

