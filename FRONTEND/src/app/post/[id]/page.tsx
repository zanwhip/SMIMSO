'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { Post, Comment } from '@/types';
import { getImageUrl, formatDate, formatNumber, isExternalUrl } from '@/lib/utils';
import { FiHeart, FiMessageCircle, FiBookmark, FiShare2, FiEdit2 } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import EditPostModal from '@/components/EditPostModal';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPost();
      fetchComments();
    }
  }, [params.id]);

  // Sync post state when post prop changes
  useEffect(() => {
    if (post) {
      // Ensure isLiked state is correct
      // This will be set from API response
    }
  }, [post?.id]);

  const fetchPost = async () => {
    try {
      const response = await api.get(`/posts/${params.id}`);
      const postData = response.data.data;
      // Ensure isLiked is properly set
      setPost({
        ...postData,
        isLiked: postData.isLiked !== undefined ? postData.isLiked : false,
      });
    } catch (error) {
      toast.error('Post not found');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await api.get(`/posts/${params.id}/comments`);
      setComments(response.data.data);
    } catch (error) {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          <div className="lg:col-span-2 animate-fade-in">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-large mb-6">
              {post.images && post.images.length > 0 && (
                <div className="space-y-2">
                  {post.images.map((image, index) => (
                    <div key={image.id} className="relative w-full max-h-[700px] overflow-hidden">
                      <Image
                        src={getImageUrl(image.image_url)}
                        alt={`${post.title} - ${index + 1}`}
                        width={800}
                        height={600}
                        className="w-full h-auto object-contain max-h-[700px]"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-large p-6">
              <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Comments ({post.comment_count})
              </h3>

              <form onSubmit={handleComment} className="mb-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-300 bg-white/80 backdrop-blur-sm transition-all duration-300 shadow-soft hover:shadow-medium"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="mt-3 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 transition-all duration-300 shadow-medium hover:shadow-large font-semibold ripple"
                >
                  {isSubmitting ? 'Submitting...' : 'Post Comment'}
                </button>
              </form>

              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <Link
                      href={`/profile/${comment.user?.id}`}
                      className="flex-shrink-0 hover:opacity-80 transition"
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
                        <div className="w-10 h-10 bg-gray-300 rounded-full" />
                      )}
                    </Link>
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <Link
                          href={`/profile/${comment.user?.id}`}
                          className="font-medium text-sm hover:text-primary-600 transition"
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
          </div>

          <div className="lg:col-span-1 animate-fade-in">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-large p-6 sticky top-20">
              {post.user && (
                <div className="flex items-center justify-between mb-6">
                  <Link
                    href={`/profile/${post.user.id}`}
                    className="flex items-center space-x-3 hover:opacity-80 transition"
                  >
                    {post.user.avatar_url ? (
                      <Image
                        src={getImageUrl(post.user.avatar_url)}
                        alt={post.user.first_name}
                        width={48}
                        height={48}
                        className="rounded-full"
                        unoptimized={isExternalUrl(getImageUrl(post.user.avatar_url))}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-300 rounded-full" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {post.user.first_name} {post.user.last_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(post.created_at)}
                      </p>
                    </div>
                  </Link>
                  
                  {user && post.user_id === user.id && (
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                      title="Edit post"
                    >
                      <FiEdit2 size={20} />
                    </button>
                  )}
                </div>
              )}

              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {post.title}
              </h1>


              {post.description && (
                <p className="text-gray-700 mb-4">{post.description}</p>
              )}

              {post.category && (
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 text-sm font-medium text-primary-600 bg-primary-50 rounded-full">
                    {post.category.name}
                  </span>
                </div>
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center space-x-6 py-5 border-t border-b border-gray-200">
                <button
                  onClick={handleLike}
                  className={`flex items-center space-x-2 transition-all duration-300 transform hover:scale-110 ${
                    post.isLiked ? 'text-red-500 hover:text-red-600' : 'text-gray-700 hover:text-red-500'
                  }`}
                >
                  {post.isLiked ? (
                    <FaHeart className="text-red-500" size={26} />
                  ) : (
                    <FiHeart size={26} />
                  )}
                  <span className="font-semibold text-lg">{formatNumber(post.like_count)}</span>
                </button>

                <div className="flex items-center space-x-2 text-gray-700">
                  <FiMessageCircle size={26} />
                  <span className="font-semibold text-lg">{formatNumber(post.comment_count)}</span>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p>{formatNumber(post.view_count)} views</p>
              </div>
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
            setIsEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

