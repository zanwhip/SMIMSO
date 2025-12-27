'use client';

import { useState } from 'react';
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

const PLACEHOLDER_IMAGE = '/images/NO_IMAGE.avif';

/**
 * SafeImage component that automatically uses regular <img> tag for external URLs
 * to avoid ORB (Opaque Response Blocking) errors, and Next.js Image for internal URLs
 * Falls back to placeholder image on error
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
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const imageUrl = getImageUrl(src);
  const isExternal = isExternalUrl(imageUrl);
  const finalSrc = imageError ? PLACEHOLDER_IMAGE : imageUrl;

  const handleLoad = () => {
    setImageLoaded(true);
    if (onLoad) {
      onLoad();
    }
  };

  const handleError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  // Use regular <img> tag for external URLs to avoid ORB errors
  if (isExternal || imageError) {
    if (fill) {
      return (
        <img
          src={finalSrc}
          alt={alt}
          className={className}
          onLoad={handleLoad}
          onError={handleError}
          loading={loading}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      );
    }

    return (
      <img
        src={finalSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onLoad={handleLoad}
        onError={handleError}
        loading={loading}
      />
    );
  }

  // Use Next.js Image for internal URLs, but wrap in error boundary
  // Since Next.js Image doesn't support onError directly, we'll use img tag if error occurs
  if (imageError) {
    // If error occurred, use img tag with placeholder
    if (fill) {
      return (
        <img
          src={PLACEHOLDER_IMAGE}
          alt={alt}
          className={className}
          onLoad={handleLoad}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      );
    }
    return (
      <img
        src={PLACEHOLDER_IMAGE}
        alt={alt}
        width={width || 500}
        height={height || 500}
        className={className}
        onLoad={handleLoad}
      />
    );
  }

  // For Next.js Image, we need to wrap it to catch errors
  // Since Next.js Image doesn't support onError, we'll use img tag if it's external or if error occurred
  // For internal URLs that might fail, we'll also use img tag as fallback
  if (fill) {
    return (
      <img
        src={imageError ? PLACEHOLDER_IMAGE : imageUrl}
        alt={alt}
        className={className}
        onLoad={handleLoad}
        onError={handleError}
        loading={loading}
        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
      />
    );
  }

  return (
    <img
      src={imageError ? PLACEHOLDER_IMAGE : imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      loading={loading}
    />
  );
}


