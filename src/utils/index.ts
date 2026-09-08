import { API_ORIGIN } from '../config/env';

export const FALLBACK_IMAGE_URL = '/images/fallback.jpg';
export const DEFAULT_AVATAR_URL = '/images/fallback.jpg';
export const DEFAULT_SERVICE_TITLE = 'Service Title';
export const DEFAULT_SERVICE_DESCRIPTION = 'No description available';
export const DEFAULT_SERVICE_PRICE_TEXT = 'Contact for pricing';
export const DEFAULT_SERVICE_LOCATION = 'Location on request';
export const DEFAULT_USER_NAME = 'Guest User';
export const DEFAULT_USER_BIO = 'No bio added yet';

const isNonEmptyImage = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isNonEmptyText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export const getSafeText = (value: unknown, fallback: string) => (
  isNonEmptyText(value) ? value.trim() : fallback
);

export const withCacheBust = (url?: string | null, timestamp?: number) => {
  if (!isNonEmptyImage(url)) return url || '';
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  // Clean existing timestamp if present
  const cleanUrl = url.replace(/([?&])t=\d+(&?)/, (_match, prefix, suffix) => {
    return suffix ? prefix : '';
  }).replace(/[?&]$/, '');

  const ts = timestamp || Date.now();
  return `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}t=${ts}`;
};

export const getImageUrl = (url?: string | null) => {
  if (!isNonEmptyImage(url)) return FALLBACK_IMAGE_URL;

  const trimmedUrl = url.trim();
  if (/^(?:https?:)?\/\//i.test(trimmedUrl) || trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('blob:')) {
    return trimmedUrl;
  }

  const normalizedPath = trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`;

  if (normalizedPath.startsWith('/uploads/')) {
    return `${API_ORIGIN}${normalizedPath}`;
  }

  return normalizedPath;
};

export const resolveImageList = (...sources: unknown[]) => {
  const flattened = sources.flatMap((source) => Array.isArray(source) ? source : [source]);
  const uniqueImages = new Set<string>();

  flattened.forEach((candidate) => {
    if (isNonEmptyImage(candidate)) {
      uniqueImages.add(getImageUrl(candidate));
    }
  });

  return uniqueImages.size > 0 ? Array.from(uniqueImages) : [FALLBACK_IMAGE_URL];
};

export const getServiceImageUrls = (service: any) => resolveImageList(
  service?.images,
  service?.image,
  service?.imageUrl,
).map((image) => withCacheBust(image) || image);

export const getProfileImageUrl = (user: any) => {
  const candidate = user?.profilePicture || user?.profileImage || user?.image || user?.imageUrl;
  if (!isNonEmptyImage(candidate)) {
    return '';
  }

  const resolved = getImageUrl(candidate);
  return withCacheBust(resolved) || resolved;
};

export const getServiceTitle = (service?: { title?: string } | null) => getSafeText(service?.title, DEFAULT_SERVICE_TITLE);
export const getServiceDescription = (service?: { description?: string } | null) => getSafeText(service?.description, DEFAULT_SERVICE_DESCRIPTION);
export const getServiceLocation = (service?: { location?: string } | null) => getSafeText(service?.location, DEFAULT_SERVICE_LOCATION);
export const getUserDisplayName = (user?: { name?: string } | null) => getSafeText(user?.name, DEFAULT_USER_NAME);
export const getUserBio = (user?: { bio?: string } | null) => getSafeText(user?.bio, DEFAULT_USER_BIO);

export const logImageDebug = (scope: string, item: Record<string, unknown>) => {
  if (!import.meta.env.DEV) return;

  console.log(`[image-debug:${scope}]`, {
    id: item._id ?? item.id ?? item.slug,
    title: item.title ?? item.name,
    images: item.images,
    image: item.image,
    imageUrl: item.imageUrl,
    profileImage: item.profileImage,
    profilePicture: item.profilePicture,
  });
};

export const getErrorMessage = (error: any, fallback = 'Something went wrong') => {
  const candidates = [
    error?.response?.data?.error,
    error?.response?.data?.message,
    error?.message,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }

    if (candidate && typeof candidate === 'object') {
      if (typeof candidate.message === 'string' && candidate.message.trim()) {
        return candidate.message;
      }

      if (typeof candidate.code === 'string' && candidate.code.trim()) {
        return candidate.code;
      }
    }
  }

  return fallback;
};

export const formatDate = (dateString: string) => {
  if (!dateString) return 'Not scheduled';

  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString: string, time?: string) => {
  return `${formatDate(dateString)}${time ? ` at ${time}` : ''}`;
};

export const formatCoordinates = (location?: { lat?: number; lng?: number } | null, fractionDigits = 5) => {
  if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) {
    return 'Location unavailable';
  }

  return `${Number(location.lat).toFixed(fractionDigits)}, ${Number(location.lng).toFixed(fractionDigits)}`;
};

export const buildDirectionsLink = (location?: { lat?: number; lng?: number } | null) => {
  if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) {
    return '';
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${Number(location.lat)},${Number(location.lng)}`;
};

export const formatCurrency = (amount: number) => `INR ${Number(amount || 0).toLocaleString('en-IN')}`;
export const formatServicePrice = (amount?: number) => {
  const normalizedAmount = Number(amount ?? 0);
  return normalizedAmount > 0 ? formatCurrency(normalizedAmount) : DEFAULT_SERVICE_PRICE_TEXT;
};
export const formatPriceLabel = (price?: number, priceLabel?: string) => {
  if (typeof priceLabel === 'string' && priceLabel.trim()) {
    return priceLabel.trim();
  }

  const normalizedPrice = Number(price || 0);
  return normalizedPrice > 0
    ? `Starting from ${formatCurrency(normalizedPrice)}`
    : DEFAULT_SERVICE_PRICE_TEXT;
};

export const formatBookingStatus = (status?: string) => {
  if (!status) {
    return 'Pending';
  }

  return status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
};

export const formatVerificationStatus = (status?: string) => {
  if (!status) {
    return 'Unverified';
  }

  return status.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
};

export const formatResponseTime = (hours?: number) => {
  const normalized = Number(hours);

  if (!Number.isFinite(normalized) || normalized <= 0) {
    return 'Response time not set';
  }

  if (normalized < 24) {
    return `Replies within ${normalized}h`;
  }

  const days = Math.round(normalized / 24);
  return `Replies within ${days} day${days === 1 ? '' : 's'}`;
};

export const formatRelativeDate = (dateString?: string) => {
  if (!dateString) return '';

  const target = new Date(dateString).getTime();
  const now = Date.now();
  const diffMinutes = Math.round((target - now) / (1000 * 60));

  if (Math.abs(diffMinutes) < 60) {
    return `${Math.abs(diffMinutes)}m ${diffMinutes < 0 ? 'ago' : 'from now'}`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return `${Math.abs(diffHours)}h ${diffHours < 0 ? 'ago' : 'from now'}`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${Math.abs(diffDays)}d ${diffDays < 0 ? 'ago' : 'from now'}`;
};

export const buildUpiLink = (upiId: string, name: string, amount: number) => (
  `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`
);
