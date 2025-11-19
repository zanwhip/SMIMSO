'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { Post, Comment } from '@/types';
import { getImageUrl, formatDate, formatNumber } from '@/lib/utils';
import { FiHeart, FiMessageCircle, FiBookmark, FiShare2 } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPost();
      fetchComments();
    }
  }, [params.id]);

  const fetchPost = async () => {
    try {
      const response = await api.get(`/posts/${params.id}`);
      setPost(response.data.data);
    } catch (error) {
      toast.error('Không tìm thấy bài đăng');
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
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleLike = async () => {
    if (!post) return;

    const wasLiked = post.isLiked;
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
    } catch (error) {
      setPost({
        ...post,
        isLiked: wasLiked,
        like_count: wasLiked ? post.like_count + 1 : post.like_count - 1,
      });
      toast.error('Có lỗi xảy ra');
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
      toast.success('Đã thêm bình luận');
    } catch (error) {
      toast.error('Không thể thêm bình luận');
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Images */}
            <div className="bg-white rounded-lg overflow-hidden shadow-md mb-6">
              {post.images && post.images.length > 0 && (
                <div className="space-y-2">
                  {post.images.map((image, index) => (
                    <Image
                      key={image.id}
                      src={getImageUrl(image.image_url)}
                      alt={`${post.title} - ${index + 1}`}
                      width={800}
                      height={600}
                      className="w-full h-auto"
                      unoptimized
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Bình luận ({post.comment_count})
              </h3>

              {/* Comment Form */}
              <form onSubmit={handleComment} className="mb-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Viết bình luận..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi bình luận'}
                </button>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    {comment.user?.avatar_url ? (
                      <Image
                        src={getImageUrl(comment.user.avatar_url)}
                        alt={comment.user.first_name}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full" />
                    )}
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <p className="font-medium text-sm">
                          {comment.user?.first_name} {comment.user?.last_name}
                        </p>
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

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
              {/* User Info */}
              {post.user && (
                <Link
                  href={`/user/${post.user.id}`}
                  className="flex items-center space-x-3 mb-6"
                >
                  {post.user.avatar_url ? (
                    <Image
                      src={getImageUrl(post.user.avatar_url)}
                      alt={post.user.first_name}
                      width={48}
                      height={48}
                      className="rounded-full"
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
              )}

              {/* Title & Description */}
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {post.title}
              </h1>
              {post.description && (
                <p className="text-gray-700 mb-4">{post.description}</p>
              )}

              {/* Category */}
              {post.category && (
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 text-sm font-medium text-primary-600 bg-primary-50 rounded-full">
                    {post.category.name}
                  </span>
                </div>
              )}

              {/* Tags */}
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

              {/* Actions */}
              <div className="flex items-center space-x-4 py-4 border-t border-b border-gray-200">
                <button
                  onClick={handleLike}
                  className="flex items-center space-x-2 text-gray-700 hover:text-red-500 transition"
                >
                  {post.isLiked ? (
                    <FaHeart className="text-red-500" size={24} />
                  ) : (
                    <FiHeart size={24} />
                  )}
                  <span className="font-medium">{formatNumber(post.like_count)}</span>
                </button>

                <div className="flex items-center space-x-2 text-gray-700">
                  <FiMessageCircle size={24} />
                  <span className="font-medium">{formatNumber(post.comment_count)}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 text-sm text-gray-600">
                <p>{formatNumber(post.view_count)} lượt xem</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

