

export interface ImageResponse {
  image?: string;
  url?: string;
  data?: any;
  output?: any;
  images?: any[];
  b64_json?: string;
  b64?: string;
}

export function extractImageUrl(response: any): string | null {
  if (!response) return null;

  const result = response.data || response;

  if (typeof result === 'string') {
    if (result.startsWith('http') || result.startsWith('data:')) {
      return result;
    }
  }

  if (result?.image) {
    if (typeof result.image === 'string') {
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

  if (result?.url && typeof result.url === 'string') {
    return result.url;
  }

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

  if (result?.images && Array.isArray(result.images) && result.images.length > 0) {
    const firstImage = result.images[0];
    if (typeof firstImage === 'string') {
      return firstImage;
    }
    return firstImage?.url || firstImage?.image || extractImageUrl(firstImage);
  }

  if (result?.b64_json || result?.b64) {
    return `data:image/png;base64,${result.b64_json || result.b64}`;
  }

  if (Array.isArray(result) && result.length > 0) {
    return extractImageUrl(result[0]);
  }

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

export function extractVideoUrl(response: any): string | null {
  if (!response) return null;

  let result = response;
  if (response.data && typeof response.data === 'object' && response.success !== undefined) {
    result = response.data;
  } else if (response.data) {
    result = response.data;
  }

  if (typeof result === 'string') {
    if (result.startsWith('http') || result.startsWith('data:') || result.endsWith('.mp4')) {
      return result;
    }
  }

  if (result?.video) {
    if (typeof result.video === 'string') {
      if (result.video.startsWith('data:') || result.video.startsWith('http') || result.video.endsWith('.mp4')) {
        return result.video;
      }
    }
    if (result.video.url) {
      return result.video.url;
    }
    if (Array.isArray(result.video) && result.video[0]) {
      return extractVideoUrl(result.video[0]);
    }
  }

  if (result?.url && typeof result.url === 'string') {
    if (result.url.startsWith('http') || result.url.startsWith('data:') || result.url.endsWith('.mp4')) {
      return result.url;
    }
  }

  if (result?.data) {
    if (Array.isArray(result.data) && result.data.length > 0) {
      return extractVideoUrl(result.data[0]);
    }
    if (typeof result.data === 'string') {
      if (result.data.startsWith('http') || result.data.startsWith('data:') || result.data.endsWith('.mp4')) {
        return result.data;
      }
    }
    if (result.data.url) {
      return result.data.url;
    }
    if (result.data.video) {
      return result.data.video;
    }
  }

  if (result?.output) {
    if (Array.isArray(result.output) && result.output.length > 0) {
      return extractVideoUrl(result.output[0]);
    }
    if (typeof result.output === 'string') {
      if (result.output.startsWith('http') || result.output.startsWith('data:') || result.output.endsWith('.mp4')) {
        return result.output;
      }
    }
    if (result.output.url) {
      return result.output.url;
    }
    if (result.output.video) {
      return result.output.video;
    }
  }

  if (result?.videos && Array.isArray(result.videos) && result.videos.length > 0) {
    const firstVideo = result.videos[0];
    if (typeof firstVideo === 'string') {
      return firstVideo;
    }
    return firstVideo?.url || firstVideo?.video || extractVideoUrl(firstVideo);
  }

  if (Array.isArray(result) && result.length > 0) {
    return extractVideoUrl(result[0]);
  }

  if (typeof result === 'object') {
    for (const key in result) {
      const value = result[key];
      if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:') || value.endsWith('.mp4'))) {
        return value;
      }
      if (typeof value === 'object' && value !== null) {
        const nested = extractVideoUrl(value);
        if (nested) return nested;
      }
    }
  }

  const imageUrl = extractImageUrl(response);
  if (imageUrl && (imageUrl.endsWith('.mp4') || imageUrl.startsWith('data:video/'))) {
    return imageUrl;
  }

  return null;
}