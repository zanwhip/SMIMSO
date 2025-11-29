/**
 * Utility functions for handling Imagine API responses
 */

export interface ImageResponse {
  image?: string;
  url?: string;
  data?: any;
  output?: any;
  images?: any[];
  b64_json?: string;
  b64?: string;
}

/**
 * Extract image URL from various response formats
 */
export function extractImageUrl(response: any): string | null {
  if (!response) return null;

  // Handle if response is wrapped in data property
  const result = response.data || response;

  // 1. Direct string URL
  if (typeof result === 'string') {
    if (result.startsWith('http') || result.startsWith('data:')) {
      return result;
    }
  }

  // 2. result.image (priority - often comes from our backend conversion)
  if (result?.image) {
    if (typeof result.image === 'string') {
      // Check if it's a data URL or regular URL
      if (result.image.startsWith('data:') || result.image.startsWith('http')) {
        return result.image;
      }
    }
    if (result.image.url) {
      return result.image.url;
    }
    if (Array.isArray(result.image) && result.image[0]) {
      return extractImageUrl(result.image[0]);
    }
  }

  // 3. result.url
  if (result?.url && typeof result.url === 'string') {
    return result.url;
  }

  // 4. result.data array
  if (result?.data) {
    if (Array.isArray(result.data) && result.data.length > 0) {
      return extractImageUrl(result.data[0]);
    }
    if (result.data.url) {
      return result.data.url;
    }
    if (result.data.image) {
      return result.data.image;
    }
  }

  // 5. result.output
  if (result?.output) {
    if (Array.isArray(result.output) && result.output.length > 0) {
      return extractImageUrl(result.output[0]);
    }
    if (typeof result.output === 'string') {
      return result.output;
    }
    if (result.output.url) {
      return result.output.url;
    }
    if (result.output.image) {
      return result.output.image;
    }
  }

  // 6. result.images array
  if (result?.images && Array.isArray(result.images) && result.images.length > 0) {
    const firstImage = result.images[0];
    if (typeof firstImage === 'string') {
      return firstImage;
    }
    return firstImage?.url || firstImage?.image || extractImageUrl(firstImage);
  }

  // 7. Base64 data
  if (result?.b64_json || result?.b64) {
    return `data:image/png;base64,${result.b64_json || result.b64}`;
  }

  // 8. If result is an array
  if (Array.isArray(result) && result.length > 0) {
    return extractImageUrl(result[0]);
  }

  // 9. Try to find any URL-like property recursively
  if (typeof result === 'object') {
    for (const key in result) {
      const value = result[key];
      if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:'))) {
        return value;
      }
      if (typeof value === 'object') {
        const nested = extractImageUrl(value);
        if (nested) return nested;
      }
    }
  }

  return null;
}

/**
 * Extract video URL from various response formats
 */
export function extractVideoUrl(response: any): string | null {
  if (!response) return null;

  // Handle if response is wrapped in data property
  const result = response.data || response;

  // 1. Direct string URL
  if (typeof result === 'string') {
    if (result.startsWith('http') || result.startsWith('data:') || result.endsWith('.mp4')) {
      return result;
    }
  }

  // 2. result.video
  if (result?.video) {
    if (typeof result.video === 'string') {
      return result.video;
    }
    if (result.video.url) {
      return result.video.url;
    }
    if (Array.isArray(result.video) && result.video[0]) {
      return extractVideoUrl(result.video[0]);
    }
  }

  // 3. result.url
  if (result?.url && typeof result.url === 'string') {
    return result.url;
  }

  // 4. result.data array
  if (result?.data) {
    if (Array.isArray(result.data) && result.data.length > 0) {
      return extractVideoUrl(result.data[0]);
    }
    if (result.data.url) {
      return result.data.url;
    }
    if (result.data.video) {
      return result.data.video;
    }
  }

  // 5. result.output
  if (result?.output) {
    if (Array.isArray(result.output) && result.output.length > 0) {
      return extractVideoUrl(result.output[0]);
    }
    if (typeof result.output === 'string') {
      return result.output;
    }
    if (result.output.url) {
      return result.output.url;
    }
    if (result.output.video) {
      return result.output.video;
    }
  }

  // 6. result.videos array
  if (result?.videos && Array.isArray(result.videos) && result.videos.length > 0) {
    const firstVideo = result.videos[0];
    if (typeof firstVideo === 'string') {
      return firstVideo;
    }
    return firstVideo?.url || firstVideo?.video || extractVideoUrl(firstVideo);
  }

  // 7. If result is an array
  if (Array.isArray(result) && result.length > 0) {
    return extractVideoUrl(result[0]);
  }

  // 8. Try to find any URL-like property recursively
  if (typeof result === 'object') {
    for (const key in result) {
      const value = result[key];
      if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:') || value.endsWith('.mp4'))) {
        return value;
      }
      if (typeof value === 'object') {
        const nested = extractVideoUrl(value);
        if (nested) return nested;
      }
    }
  }

  // 9. Reuse image extraction logic as fallback
  return extractImageUrl(response);
}

