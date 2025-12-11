'use client';

import { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Post } from '@/types';
import { getImageUrl, formatNumber } from '@/lib/utils';
import { FiHeart, FiMessageCircle, FiDownload, FiBookmark } from 'react-icons/fi';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import PostDetailModal from '@/components/PostDetailModal';

interface PostCardProps {
  post: Post;
  onPostUpdate?: (post: Post) => void;
}

function PostCard({ post: initialPost, onPostUpdate }: PostCardProps) {
  const [post, setPost] = useState(initialPost);
  const [isLiking, setIsLiking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="button"]')
    ) {
      return;
    }
    setIsModalOpen(true);
  };

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
    <>
      <div 
        className="post-card-item group relative cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
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

          {/* Avatar - Top Left */}
          <div 
            className={`absolute top-3 left-3 transition-all duration-300 ${
              isHovered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'
            }`}
          >
            <Link
              href={`/profile/${post.user_id}`}
              onClick={(e) => e.stopPropagation()}
              className="block"
            >
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xl border-2 border-white/30 shadow-lg overflow-hidden ring-2 ring-white/20 hover:ring-white/40 transition-all duration-300 hover:scale-110">
                {post.user?.avatar_url ? (
                  <Image
                    src={getImageUrl(post.user.avatar_url)}
                    alt={userName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-xs font-semibold">
                    {userName.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
              </div>
            </Link>
          </div>

          {/* Action Icons - Bottom Right - All in one row */}
          <div 
            className={`absolute bottom-3 right-3 flex items-center space-x-2 transition-all duration-300 ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            {/* Like Button */}
            <button
              onClick={handleLike}
              className={`p-2.5 rounded-full backdrop-blur-xl transition-all duration-200 active-scale shadow-lg border border-white/20 ${
                post.isLiked 
                  ? 'bg-white/40 text-red-500 hover:bg-white/50' 
                  : 'bg-white/40 text-gray-700 hover:bg-white/50'
              }`}
              title={post.isLiked ? 'Unlike' : 'Like'}
            >
              <FiHeart className={`w-4 h-4 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            </button>

            {/* Comment Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="p-2.5 rounded-full bg-white/40 backdrop-blur-xl text-gray-700 hover:bg-white/50 transition-all duration-200 active-scale shadow-lg border border-white/20"
              title="Comment"
            >
              <FiMessageCircle className="w-4 h-4" />
            </button>

            {/* Download Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toast.success('Download feature coming soon!');
              }}
              className="p-2.5 rounded-full bg-white/40 backdrop-blur-xl text-gray-700 hover:bg-white/50 transition-all duration-200 active-scale shadow-lg border border-white/20"
              title="Download"
            >
              <FiDownload className="w-4 h-4" />
            </button>

            {/* Bookmark Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toast.success('Bookmark feature coming soon!');
              }}
              className="p-2.5 rounded-full bg-white/40 backdrop-blur-xl text-gray-700 hover:bg-white/50 transition-all duration-200 active-scale shadow-lg border border-white/20"
              title="Bookmark"
            >
              <FiBookmark className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <PostDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        postId={post.id}
        onPostUpdate={(updatedPost) => {
          setPost(updatedPost);
          if (onPostUpdate) {
            onPostUpdate(updatedPost);
          }
        }}
      />
    </>
  );
}

export default memo(PostCard);

