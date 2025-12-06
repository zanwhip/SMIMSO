'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

interface CategoryShowcaseItem {
  id: string;
  name: string;
  description: string;
  images: string[];
}

export default function CategoryShowcase() {
  const [categories, setCategories] = useState<CategoryShowcaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategoriesWithImages();
  }, []);

  const fetchCategoriesWithImages = async () => {
    try {
      const categoriesRes = await api.get('/options/categories');
      const categoriesData = categoriesRes.data.data;

      const categoriesWithImages = await Promise.all(
        categoriesData.slice(0, 6).map(async (category: any) => {
          try {
            const postsRes = await api.get('/posts', {
              params: {
                categoryId: category.id,
                limit: 15,
              },
            });
            
            const posts = postsRes.data.data || [];
            let images = posts
              .map((post: any) => post.image?.image_url || post.images?.[0]?.image_url)
              .filter((url: string | undefined) => url)
              .slice(0, 10);

            while (images.length < 10) {
              images.push('/images/NO_IMAGE.avif');
            }

            return {
              id: category.id,
              name: category.name,
              description: category.description || `Explore amazing ${category.name.toLowerCase()} photos from our community. Discover inspiration and creativity through stunning visual content.`,
              images,
            };
          } catch (error) {
            return null;
          }
        })
      );

      setCategories(categoriesWithImages.filter(Boolean) as CategoryShowcaseItem[]);
    } catch (error) {
      } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || categories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-16 mb-16">
      {categories.map((category, index) => {
        const isOdd = index % 2 === 0;
        
        return (
          <CategoryShowcaseItem
            key={category.id}
            category={category}
            isOdd={isOdd}
          />
        );
      })}
    </div>
  );
}

interface CategoryShowcaseItemProps {
  category: CategoryShowcaseItem;
  isOdd: boolean;
}

function CategoryShowcaseItem({ category, isOdd }: CategoryShowcaseItemProps) {
  const { name, description, images, id } = category;

  const InfoSection = (
    <div className="flex flex-col justify-start">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
          {name}
        </h2>
        <Link
          href={`/category/${id}`}
          className="group flex items-center space-x-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-full font-medium transition-all hover:scale-105 flex-shrink-0"
        >
          <span className="text-sm">Watch More</span>
          <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
      
      <p className="text-gray-600 text-base leading-relaxed">
        {description.length > 200 ? description.substring(0, 200) + '...' : description}
      </p>
    </div>
  );

  const ImagesSection = ({ reverse = false }: { reverse?: boolean }) => {
    const getImageSrc = (img: string) => {
      if (img === '/images/NO_IMAGE.avif') {
        return img;
      }
      return getImageUrl(img);
    };
    
    return (
      <div className="flex gap-[5px]">
        <div className="flex flex-col gap-[5px]">
          <div className="relative w-[165px] h-[165px] rounded-lg overflow-hidden group">
            <Image
              src={getImageSrc(images[0])}
              alt={`${name} 1`}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized={images[0] === '/images/NO_IMAGE.avif'}
            />
          </div>
          <div className="relative w-[165px] h-[165px] rounded-lg overflow-hidden group">
            <Image
              src={getImageSrc(images[5])}
              alt={`${name} 6`}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized={images[5] === '/images/NO_IMAGE.avif'}
            />
          </div>
        </div>

        <div className="flex flex-col gap-[5px]">
          <div className="relative w-[80px] h-[80px] rounded-lg overflow-hidden group">
            <Image
              src={getImageSrc(images[1])}
              alt={`${name} 2`}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized={images[1] === '/images/NO_IMAGE.avif'}
            />
          </div>
          
          <div className="relative w-[80px] h-[80px] rounded-lg overflow-hidden group">
            <Image
              src={getImageSrc(images[2])}
              alt={`${name} 3`}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized={images[2] === '/images/NO_IMAGE.avif'}
            />
          </div>
          
          <div className="relative w-[80px] h-[80px] rounded-lg overflow-hidden group">
            <Image
              src={getImageSrc(images[6])}
              alt={`${name} 7`}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized={images[6] === '/images/NO_IMAGE.avif'}
            />
          </div>
          
          <div className="relative w-[80px] h-[80px] rounded-lg overflow-hidden group">
            <Image
              src={getImageSrc(images[7])}
              alt={`${name} 8`}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized={images[7] === '/images/NO_IMAGE.avif'}
            />
          </div>
        </div>

        <div className="flex flex-col gap-[5px]">
          
          <div className="relative w-[80px] h-[80px] rounded-lg overflow-hidden group">
            <Image
              src={getImageSrc(images[3])}
              alt={`${name} 4`}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized={images[3] === '/images/NO_IMAGE.avif'}
            />
          </div>
          
          <div className="relative w-[80px] h-[80px] rounded-lg overflow-hidden group">
            <Image
              src={getImageSrc(images[4])}
              alt={`${name} 5`}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized={images[4] === '/images/NO_IMAGE.avif'}
            />
          </div>
          
          <div className="relative w-[80px] h-[80px] rounded-lg overflow-hidden group">
            <Image
              src={getImageSrc(images[8])}
              alt={`${name} 9`}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized={images[8] === '/images/NO_IMAGE.avif'}
            />
          </div>
          
          <div className="relative w-[80px] h-[80px] rounded-lg overflow-hidden group">
            <Image
              src={getImageSrc(images[9])}
              alt={`${name} 10`}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized={images[9] === '/images/NO_IMAGE.avif'}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-start gap-8">
      {isOdd ? (
        <>
          
          <div className="flex-shrink-0">
            <ImagesSection reverse={false} />
          </div>
          <div className="flex-1 min-w-0">
            {InfoSection}
          </div>
        </>
      ) : (
        <>
          
          <div className="flex-1 min-w-0">
            {InfoSection}
          </div>
          <div className="flex-shrink-0">
            <ImagesSection reverse={true} />
          </div>
        </>
      )}
    </div>
  );
}

