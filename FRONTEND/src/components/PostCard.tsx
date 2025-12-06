'use client';

import { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Post } from '@/types';
import { getImageUrl, formatNumber } from '@/lib/utils';
import { FiHeart, FiMessageCircle, FiDownload, FiBookmark } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface PostCardProps {
  post: Post;
}

function PostCard({ post: initialPost }: PostCardProps) {
  const [post, setPost] = useState(initialPost);
  const [isLiking, setIsLiking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLiking) return;

    setIsLiking(true);
    const wasLiked = post.isLiked;

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
  const userName = post.user ? `${post.user.first_name} ${post.user.last_name}` : 'Unknown';

  if (!imageUrl) return null;

  return (
    <div 
      className="post-card-item group relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/post/${post.id}`} className="block">
        <div className="relative overflow-hidden rounded-lg bg-gray-100">
          
          {!imageLoaded && (
            <div className="absolute inset-0 skeleton" />
          )}

          <Image
            src={getImageUrl(imageUrl)}
            alt={post.title || 'Post image'}
            width={500}
            height={500}
            className={`w-full h-auto object-cover transition-all duration-700 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            } ${isHovered ? 'scale-105 brightness-75' : 'scale-100'}`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          <div 
            className={`absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <div 
            className={`absolute top-3 right-3 flex space-x-2 transition-all duration-300 ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
          >
            <button
              onClick={handleLike}
              className={`p-2.5 rounded-full backdrop-blur-md transition-all duration-200 active-scale ${
                post.isLiked 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/90 text-gray-700 hover:bg-white'
              }`}
              title={post.isLiked ? 'Unlike' : 'Like'}
            >
              {post.isLiked ? (
                <FaHeart className="w-4 h-4" />
              ) : (
                <FiHeart className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toast.success('Bookmark feature coming soon!');
              }}
              className="p-2.5 rounded-full bg-white/90 backdrop-blur-md text-gray-700 hover:bg-white transition-all duration-200 active-scale"
              title="Bookmark"
            >
              <FiBookmark className="w-4 h-4" />
            </button>
          </div>

          <div 
            className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            
            <div className="flex items-center justify-between mb-3">
              <Link
                href={`/profile/${post.user_id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center space-x-2 group/user"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
                  {post.user?.avatar_url ? (
                    <Image
                      src={getImageUrl(post.user.avatar_url)}
                      alt={userName}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    userName.split(' ').map(n => n[0]).join('')
                  )}
                </div>
                <span className="text-white text-sm font-medium group-hover/user:underline">
                  {userName}
                </span>
              </Link>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toast.success('Download feature coming soon!');
                }}
                className="p-2 rounded-lg bg-white/90 backdrop-blur-md text-gray-700 hover:bg-white transition-all duration-200 active-scale"
                title="Download"
              >
                <FiDownload className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-4 text-white text-sm">
              <div className="flex items-center space-x-1.5">
                <FiHeart className="w-4 h-4" />
                <span className="font-medium">{formatNumber(post.like_count)}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <FiMessageCircle className="w-4 h-4" />
                <span className="font-medium">{formatNumber(post.comment_count)}</span>
              </div>
            </div>

            {post.title && (
              <p className="text-white text-sm mt-2 line-clamp-2 font-medium">
                {post.title}
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export default memo(PostCard);

