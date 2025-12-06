'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import SecondaryNav from '@/components/SecondaryNav';
import PostCard from '@/components/PostCard';
import api from '@/lib/api';
import { Post } from '@/types';
import { useInView } from 'react-intersection-observer';
import { FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';

export default function CategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { ref, inView } = useInView();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      fetchCategoryInfo();
      fetchPosts(1, true);
    }
  }, [isAuthenticated, categoryId]);

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      fetchPosts(page + 1);
    }
  }, [inView]);

  const fetchCategoryInfo = async () => {
    try {
      const response = await api.get('/options/categories');
      const categories = response.data.data;
      const category = categories.find((c: any) => c.id === categoryId);
      if (category) {
        setCategoryName(category.name);
        setCategoryDescription(
          category.description ||
            `Explore amazing ${category.name.toLowerCase()} photos from our community.`
        );
      }
    } catch (error) {
    }
  };

  const fetchPosts = async (pageNum: number, reset = false) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await api.get('/posts', {
        params: {
          page: pageNum,
          limit: 30,
          categoryId: categoryId,
        },
      });

      const newPosts = response.data.data;
      const pagination = response.data.pagination;

      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setPage(pageNum);
      setHasMore(pageNum < pagination.totalPages);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <SecondaryNav />

      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {categoryName || 'Category'}
          </h1>
          {categoryDescription && (
            <p className="text-lg text-gray-600 max-w-3xl">
              {categoryDescription}
            </p>
          )}
        </div>

        {posts.length === 0 && !isLoading ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">
              No posts in this category yet
            </p>
          </div>
        ) : (
          <>
            <div className="masonry-grid">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {isLoading && (
              <div className="flex justify-center py-12">
                <div className="spinner"></div>
              </div>
            )}

            {hasMore && !isLoading && <div ref={ref} className="h-10" />}

            {!hasMore && posts.length > 0 && (
              <div className="text-center py-12 text-gray-500">
                <p className="font-medium">You've reached the end</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


