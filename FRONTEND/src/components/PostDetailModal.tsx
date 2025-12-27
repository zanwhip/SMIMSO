'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { Post, Comment } from '@/types';
import { getImageUrl, formatDate, formatNumber, isExternalUrl } from '@/lib/utils';
import { FiHeart, FiMessageCircle, FiBookmark, FiShare2, FiEdit2, FiDownload, FiX, FiInfo, FiSend } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import EditPostModal from '@/components/EditPostModal';

interface PostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onPostUpdate?: (post: Post) => void;
}

export default function PostDetailModal({
  isOpen,
  onClose,
  postId,
  onPostUpdate,
}: PostDetailModalProps) {
  const { user } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      fetchPost();
      fetchComments();
    } else {
      setPost(null);
      setComments([]);
      setNewComment('');
      setRelatedPosts([]);
    }
  }, [isOpen, postId]);

  useEffect(() => {
    if (post && isOpen) {
      fetchRelatedPosts();
    }
  }, [post?.id, isOpen]);

  // Handle ESC key and body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      
      // Handle ESC key
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      window.addEventListener('keydown', handleEsc);
      
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isOpen, onClose]);

  const fetchPost = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/posts/${postId}`);
      const postData = response.data.data;
      setPost({
        ...postData,
        isLiked: postData.isLiked !== undefined ? postData.isLiked : false,
      });
    } catch (error) {
      toast.error('Post not found');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await api.get(`/posts/${postId}/comments`);
      setComments(response.data.data);
    } catch (error) {
      // Silent fail
    }
  };

  const fetchRelatedPosts = async () => {
    if (!post) return;
    try {
      setIsLoadingRelated(true);
      // Fetch posts from same category or with similar tags
      const categoryId = post.category_id;
      if (categoryId) {
        const response = await api.get('/posts', {
          params: {
            category_id: categoryId,
            limit: 12,
            page: 1,
          },
        });
        const posts = response.data.data || [];
        // Filter out current post
        setRelatedPosts(posts.filter((p: Post) => p.id !== postId).slice(0, 8));
      }
    } catch (error) {
      // Silent fail
    } finally {
      setIsLoadingRelated(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;

    const wasLiked = post.isLiked;
    
    // Optimistic update
    setPost({
      ...post,
      isLiked: !wasLiked,
      like_count: wasLiked ? post.like_count - 1 : post.like_count + 1,
    });

    try {
      if (wasLiked) {
        await api.delete(`/posts/${post.id}/like`);
      } else {
        await api.post(`/posts/${post.id}/like`);
      }
    } catch (error: any) {
      // Revert on error
      setPost({
        ...post,
        isLiked: wasLiked,
        like_count: wasLiked ? post.like_count + 1 : post.like_count - 1,
      });
      toast.error(error.response?.data?.message || 'An error occurred');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post) return;

    setIsSubmitting(true);
    try {
      const response = await api.post(`/posts/${post.id}/comments`, {
        content: newComment,
      });

      setComments([...comments, response.data.data]);
      setNewComment('');
      setPost({ ...post, comment_count: post.comment_count + 1 });
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!post) return;
    try {
      const imageUrl = post.images?.[0]?.image_url || post.image?.image_url;
      if (imageUrl) {
        const fullUrl = getImageUrl(imageUrl);
        const link = document.createElement('a');
        link.href = fullUrl;
        link.download = `${post.title || 'image'}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started');
      }
    } catch (error) {
      toast.error('Failed to download');
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      const url = `${window.location.origin}/post/${post.id}`;
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.description || post.title,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
    } catch (error) {
      // User cancelled or error
    }
  };

  const handleBookmark = async () => {
    if (!post) return;
    toast.success('Bookmark feature coming soon!');
  };

  const handleFollow = async () => {
    if (!post?.user) return;
    try {
      await api.post(`/users/${post.user.id}/follow`);
      toast.success(`Following ${post.user.first_name} ${post.user.last_name}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to follow');
    }
  };

  if (!isOpen) return null;

  const userName = post?.user ? `${post.user.first_name} ${post.user.last_name}` : 'Unknown';
  const userInitials = userName.split(' ').map(n => n[0]).join('');

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        style={{ minHeight: '100dvh' } as React.CSSProperties}
      >
        <div className="h-full w-full overflow-y-auto" style={{ minHeight: '100dvh' }}>
          <div className="min-h-screen flex items-start justify-center py-8 px-4 pb-12">
            <div 
              className="relative w-full max-w-7xl my-8 mb-12 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-3 bg-white/90 backdrop-blur-md rounded-full hover:bg-white transition-all duration-200 shadow-lg hover:scale-110"
            >
              <FiX size={24} className="text-gray-800" />
            </button>

            {isLoading ? (
              <div className="flex items-center justify-center h-96 bg-white rounded-2xl">
                <div className="spinner"></div>
              </div>
            ) : post ? (
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                {/* Main content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                  {/* Left side - Image */}
                  <div className="lg:col-span-2 bg-gray-900 flex items-center justify-center min-h-[500px] max-h-[90vh] overflow-hidden">
                    {post.images && post.images.length > 0 && (
                      <div className="relative w-full h-full">
                        {post.images.map((image, index) => (
                          <div key={image.id} className="relative w-full h-full">
                            <Image
                              src={getImageUrl(image.image_url)}
                              alt={`${post.title} - ${index + 1}`}
                              width={1200}
                              height={800}
                              className="w-full h-full object-contain"
                              unoptimized
                              priority={index === 0}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right side - Details */}
                  <div className="lg:col-span-1 bg-white flex flex-col max-h-[90vh] overflow-hidden">
                    {/* Header with user info and actions */}
                    <div className="p-6 border-b border-gray-200">
                      {/* User info */}
                      {post.user && (
                        <div className="flex items-center justify-between mb-4">
                          <Link
                            href={`/profile/${post.user.id}`}
                            className="flex items-center space-x-3 hover:opacity-80 transition"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
                              {post.user.avatar_url ? (
                                <Image
                                  src={getImageUrl(post.user.avatar_url)}
                                  alt={userName}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                  unoptimized={isExternalUrl(getImageUrl(post.user.avatar_url))}
                                />
                              ) : (
                                userInitials
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{userName}</p>
                              <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
                            </div>
                          </Link>

                          {/* Action buttons */}
                          <div className="flex items-center space-x-2">
                            {user && post.user_id === user.id && (
                              <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                title="Edit post"
                              >
                                <FiEdit2 size={20} />
                              </button>
                            )}
                            <button
                              onClick={handleBookmark}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Save"
                            >
                              <FiBookmark size={20} />
                            </button>
                            <button
                              onClick={handleLike}
                              className={`p-2 rounded-lg transition ${
                                post.isLiked
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                              }`}
                              title={post.isLiked ? 'Unlike' : 'Like'}
                            >
                              {post.isLiked ? (
                                <FaHeart size={20} />
                              ) : (
                                <FiHeart size={20} />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Follow and Donate buttons */}
                      {post.user && user && post.user_id !== user.id && (
                        <div className="flex items-center space-x-2 mb-4">
                          <button
                            onClick={handleFollow}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                          >
                            Follow
                          </button>
                          <button
                            onClick={() => toast('Donate feature coming soon!')}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                          >
                            Donate
                          </button>
                        </div>
                      )}

                      {/* Title */}
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {post.title}
                      </h1>

                      {/* Category and tags */}
                      {post.category && (
                        <div className="mb-2">
                          <span className="inline-block px-3 py-1 text-sm font-medium text-primary-600 bg-primary-50 rounded-full">
                            {post.category.name}
                          </span>
                        </div>
                      )}

                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {post.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Description */}
                      {post.description && (
                        <p className="text-gray-700 mb-4">{post.description}</p>
                      )}


                      {/* Stats */}
                      <div className="flex items-center space-x-6 pt-4 border-t border-gray-200">
                        <button
                          onClick={handleLike}
                          className={`flex items-center space-x-2 transition-all ${
                            post.isLiked ? 'text-red-500' : 'text-gray-700'
                          }`}
                        >
                          {post.isLiked ? (
                            <FaHeart size={20} />
                          ) : (
                            <FiHeart size={20} />
                          )}
                          <span className="font-semibold">{formatNumber(post.like_count)}</span>
                        </button>

                        <div className="flex items-center space-x-2 text-gray-700">
                          <FiMessageCircle size={20} />
                          <span className="font-semibold">{formatNumber(post.comment_count)}</span>
                        </div>

                        <div className="text-sm text-gray-500">
                          {formatNumber(post.view_count)} views
                        </div>
                      </div>
                    </div>

                    {/* Comments section */}
                    <div className="flex-1 overflow-y-auto p-6">
                      <h3 className="text-lg font-bold mb-4 text-gray-900">
                        Comments ({post.comment_count})
                      </h3>

                      <form onSubmit={handleComment} className="mb-6">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-300 bg-white transition-all"
                        />
                        <button
                          type="submit"
                          disabled={isSubmitting || !newComment.trim()}
                          className="mt-3 p-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 transition-all flex items-center justify-center"
                          title="Post Comment"
                        >
                          {isSubmitting ? (
                            <div className="spinner w-5 h-5 border-2 border-white border-t-transparent"></div>
                          ) : (
                            <FiSend size={20} />
                          )}
                        </button>
                      </form>

                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex space-x-3">
                            <Link
                              href={`/profile/${comment.user?.id}`}
                              className="flex-shrink-0 hover:opacity-80 transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {comment.user?.avatar_url ? (
                                <Image
                                  src={getImageUrl(comment.user.avatar_url)}
                                  alt={comment.user.first_name}
                                  width={40}
                                  height={40}
                                  className="rounded-full"
                                  unoptimized={isExternalUrl(getImageUrl(comment.user.avatar_url))}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                                  {comment.user ? `${comment.user.first_name[0]}${comment.user.last_name[0]}` : 'U'}
                                </div>
                              )}
                            </Link>
                            <div className="flex-1">
                              <div className="bg-gray-100 rounded-lg p-3">
                                <Link
                                  href={`/profile/${comment.user?.id}`}
                                  className="font-medium text-sm hover:text-primary-600 transition"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {comment.user?.first_name} {comment.user?.last_name}
                                </Link>
                                <p className="text-gray-700 mt-1">{comment.content}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 ml-3">
                                {formatDate(comment.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer actions */}
                    <div className="p-6 border-t border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => toast('More info coming soon!')}
                          className="p-3 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                          title="More info"
                        >
                          <FiInfo size={20} />
                        </button>
                        <button
                          onClick={handleShare}
                          className="p-3 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                          title="Share"
                        >
                          <FiShare2 size={20} />
                        </button>
                        <button
                          onClick={handleDownload}
                          className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                          title="Free download"
                        >
                          <FiDownload size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* More like this section */}
                {(post.tags && post.tags.length > 0) || relatedPosts.length > 0 ? (
                  <div className="p-6 bg-gray-50 border-t border-gray-200">
                    <h3 className="text-xl font-bold mb-4 text-gray-900">More like this</h3>
                    
                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
                        {post.tags.map((tag, index) => (
                          <button
                            key={index}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition whitespace-nowrap"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Related posts grid */}
                    {relatedPosts.length > 0 && (
                      <div className="grid grid-cols-4 gap-4">
                        {relatedPosts.map((relatedPost) => {
                          const relatedImageUrl = relatedPost.images?.[0]?.image_url || relatedPost.image?.image_url;
                          if (!relatedImageUrl) return null;
                          return (
                            <div
                              key={relatedPost.id}
                              className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                // User can click on the post card to open modal for related post
                              }}
                            >
                              <Image
                                src={getImageUrl(relatedImageUrl)}
                                alt={relatedPost.title || 'Related post'}
                                fill
                                unoptimized={isExternalUrl(getImageUrl(relatedImageUrl))}
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                sizes="(max-width: 768px) 50vw, 25vw"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
            </div>
          </div>
        </div>
      </div>

      {post && (
        <EditPostModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          post={post}
          onUpdate={(updatedPost) => {
            setPost(updatedPost);
            if (onPostUpdate) {
              onPostUpdate(updatedPost);
            }
            setIsEditModalOpen(false);
          }}
        />
      )}
    </>
  );
}

