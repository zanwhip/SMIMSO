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
      toast.error('An error occurred');
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
          <div className="relative w-full aspect-auto max-h-[500px] overflow-hidden">
            <Image
              src={getImageUrl(imageUrl)}
              alt={post.title}
              width={400}
              height={300}
              className="w-full h-auto object-cover max-h-[500px]"
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

          {/* Caption (AI-generated) */}
          {post.caption && (
            <p className="text-xs text-purple-600 italic mb-2 line-clamp-1">
              🤖 {post.caption}
            </p>
          )}

          {/* Description */}
          {post.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {post.description}
            </p>
          )}

          {/* User Info */}
          {post.user && (
            <Link
              href={`/profile/${post.user.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center space-x-2 mb-3 hover:opacity-80 transition"
            >
              {post.user.avatar_url ? (
                <Image
                  src={getImageUrl(post.user.avatar_url)}
                  alt={post.user.first_name}
                  width={24}
                  height={24}
                  className="rounded-full"
                  unoptimized
                />
              ) : (
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  {post.user.first_name[0]}{post.user.last_name[0]}
                </div>
              )}
              <span className="text-sm text-gray-700 font-medium">
                {post.user.first_name} {post.user.last_name}
              </span>
            </Link>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLike}
                className={`flex items-center space-x-1 transition ${
                  post.isLiked ? 'text-purple-600' : 'text-gray-600 hover:text-purple-500'
                }`}
              >
                {post.isLiked ? (
                  <FaHeart className="text-purple-600" />
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

