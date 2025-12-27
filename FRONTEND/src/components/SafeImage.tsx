'use client';

import Image from 'next/image';
import { getImageUrl, isExternalUrl } from '@/lib/utils';

interface SafeImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  onLoad?: () => void;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  priority?: boolean;
}

/**
 * SafeImage component that automatically uses regular <img> tag for external URLs
 * to avoid ORB (Opaque Response Blocking) errors, and Next.js Image for internal URLs
 */
export default function SafeImage({
  src,
  alt,
  width,
  height,
  fill,
  className = '',
  onLoad,
  loading = 'lazy',
  sizes,
  priority = false,
}: SafeImageProps) {
  const imageUrl = getImageUrl(src);
  const isExternal = isExternalUrl(imageUrl);

  // Use regular <img> tag for external URLs to avoid ORB errors
  if (isExternal) {
    if (fill) {
      return (
        <img
          src={imageUrl}
          alt={alt}
          className={className}
          onLoad={onLoad}
          loading={loading}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      );
    }

    return (
      <img
        src={imageUrl}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onLoad={onLoad}
        loading={loading}
      />
    );
  }

  // Use Next.js Image for internal URLs
  if (fill) {
    return (
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className={className}
        onLoad={onLoad}
        loading={loading}
        sizes={sizes}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width || 500}
      height={height || 500}
      className={className}
      onLoad={onLoad}
      loading={loading}
      sizes={sizes}
      priority={priority}
    />
  );
}


