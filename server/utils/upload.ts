import path from 'path';
import type { FileFilterCallback } from 'multer';

export type SupportedImageFormat = 'jpg' | 'png' | 'webp';

const IMAGE_SIGNATURES: Record<SupportedImageFormat, (buffer: Buffer) => boolean> = {
  jpg: (buffer) => (
    buffer.length >= 3
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
    && buffer[2] === 0xff
  ),
  png: (buffer) => (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
    && buffer[4] === 0x0d
    && buffer[5] === 0x0a
    && buffer[6] === 0x1a
    && buffer[7] === 0x0a
  ),
  webp: (buffer) => (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ),
};

const IMAGE_MIME_MAP: Record<SupportedImageFormat, Set<string>> = {
  jpg: new Set(['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/jfif']),
  png: new Set(['image/png', 'image/x-png']),
  webp: new Set(['image/webp']),
};

const IMAGE_EXTENSION_MAP: Record<SupportedImageFormat, Set<string>> = {
  jpg: new Set(['jpg', 'jpeg', 'jfif']),
  png: new Set(['png']),
  webp: new Set(['webp']),
};

const IMAGE_EXTENSION_BY_FORMAT: Record<SupportedImageFormat, string> = {
  jpg: '.jpg',
  png: '.png',
  webp: '.webp',
};

const normalizeExtension = (filename: string) => (
  path.extname(filename).replace(/^\./, '').trim().toLowerCase()
);

export const detectImageFormat = (buffer: Buffer): SupportedImageFormat | null => {
  const formats = Object.entries(IMAGE_SIGNATURES) as Array<[SupportedImageFormat, (buffer: Buffer) => boolean]>;

  for (const [format, matcher] of formats) {
    if (matcher(buffer)) {
      return format;
    }
  }

  return null;
};

export const getNormalizedImageExtension = (format: SupportedImageFormat) => (
  IMAGE_EXTENSION_BY_FORMAT[format]
);

export const getSafeImageFilename = (filename: string, format: SupportedImageFormat) => {
  const baseName = path.basename(filename, path.extname(filename))
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    || 'upload';

  return `${baseName}${getNormalizedImageExtension(format)}`;
};

export const isAllowedImageUpload = (file: Express.Multer.File) => {
  const extension = normalizeExtension(file.originalname || '');
  const mimeType = String(file.mimetype || '').trim().toLowerCase();

  // If filename extension is missing (e.g. from canvas or camera stream), validate by MIME type
  if (!extension) {
    return Object.values(IMAGE_MIME_MAP).some((set) => set.has(mimeType));
  }

  return (Object.keys(IMAGE_MIME_MAP) as SupportedImageFormat[]).some((format) => (
    IMAGE_EXTENSION_MAP[format].has(extension)
    && IMAGE_MIME_MAP[format].has(mimeType)
  ));
};

export const checkImageFile = (file: Express.Multer.File, cb: FileFilterCallback) => {
  if (isAllowedImageUpload(file)) {
    cb(null, true);
    return;
  }

  cb(new Error('Images only!'));
};
