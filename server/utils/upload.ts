import path from 'path';
import type { FileFilterCallback } from 'multer';

export type SupportedImageFormat = 'jpg' | 'png' | 'webp' | 'gif' | 'avif' | 'bmp' | 'svg';

const IMAGE_SIGNATURES: Record<SupportedImageFormat, (buffer: Buffer) => boolean> = {
  jpg: (buffer) => (
    buffer.length >= 2
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
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
  gif: (buffer) => (
    buffer.length >= 4
    && buffer.subarray(0, 4).toString('ascii') === 'GIF8'
  ),
  avif: (buffer) => (
    buffer.length >= 12
    && buffer.subarray(4, 8).toString('ascii') === 'ftyp'
    && (
      buffer.subarray(8, 12).toString('ascii').startsWith('av')
      || buffer.subarray(8, 12).toString('ascii').startsWith('mi')
    )
  ),
  bmp: (buffer) => (
    buffer.length >= 2
    && buffer[0] === 0x42
    && buffer[1] === 0x4d
  ),
  svg: (buffer) => {
    if (buffer.length < 4) return false;
    const sample = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf8').trim().toLowerCase();
    return sample.startsWith('<?xml') || sample.includes('<svg');
  },
};

const IMAGE_MIME_MAP: Record<SupportedImageFormat, Set<string>> = {
  jpg: new Set(['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/jfif', 'image/x-citrix-jpeg']),
  png: new Set(['image/png', 'image/x-png']),
  webp: new Set(['image/webp']),
  gif: new Set(['image/gif']),
  avif: new Set(['image/avif']),
  bmp: new Set(['image/bmp', 'image/x-windows-bmp', 'image/x-ms-bmp']),
  svg: new Set(['image/svg+xml', 'image/svg']),
};

const IMAGE_EXTENSION_MAP: Record<SupportedImageFormat, Set<string>> = {
  jpg: new Set(['jpg', 'jpeg', 'jfif', 'pjpeg', 'jpe']),
  png: new Set(['png']),
  webp: new Set(['webp']),
  gif: new Set(['gif']),
  avif: new Set(['avif']),
  bmp: new Set(['bmp']),
  svg: new Set(['svg']),
};

const IMAGE_EXTENSION_BY_FORMAT: Record<SupportedImageFormat, string> = {
  jpg: '.jpg',
  png: '.png',
  webp: '.webp',
  gif: '.gif',
  avif: '.avif',
  bmp: '.bmp',
  svg: '.svg',
};

const DISALLOWED_EXTENSIONS = new Set([
  'html', 'htm', 'php', 'phtml', 'exe', 'bat', 'cmd', 'sh', 'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx',
  'py', 'rb', 'pl', 'jar', 'vbs', 'scr', 'dll', 'bin', 'msi', 'com', 'ps1', 'jsp', 'asp', 'aspx', 'cgi',
]);

const normalizeExtension = (filename: string) => (
  path.extname(filename).replace(/^\./, '').trim().toLowerCase()
);

export const detectImageFormat = (buffer: Buffer, fallbackFilename?: string): SupportedImageFormat | null => {
  const formats = Object.entries(IMAGE_SIGNATURES) as Array<[SupportedImageFormat, (buffer: Buffer) => boolean]>;

  for (const [format, matcher] of formats) {
    if (matcher(buffer)) {
      return format;
    }
  }

  if (fallbackFilename) {
    const ext = normalizeExtension(fallbackFilename);
    for (const [format, extSet] of Object.entries(IMAGE_EXTENSION_MAP) as Array<[SupportedImageFormat, Set<string>]>) {
      if (extSet.has(ext)) {
        return format;
      }
    }
  }

  return null;
};

export const getNormalizedImageExtension = (format: SupportedImageFormat) => (
  IMAGE_EXTENSION_BY_FORMAT[format] || '.jpg'
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
  const rawMime = String(file.mimetype || '').trim().toLowerCase();
  const mimeType = rawMime.split(';')[0].trim();
  const extension = normalizeExtension(file.originalname || '');

  // Reject explicitly dangerous extensions
  if (extension && DISALLOWED_EXTENSIONS.has(extension)) {
    return false;
  }

  // Reject non-image MIME types
  if (
    mimeType
    && !mimeType.startsWith('image/')
    && !['application/octet-stream', 'binary/octet-stream'].includes(mimeType)
  ) {
    return false;
  }

  const isKnownImageExt = (Object.keys(IMAGE_EXTENSION_MAP) as SupportedImageFormat[]).some((format) => (
    IMAGE_EXTENSION_MAP[format].has(extension)
  ));

  const isKnownImageMime = (
    mimeType.startsWith('image/')
    || Object.values(IMAGE_MIME_MAP).some((set) => set.has(mimeType))
  );

  if (extension && !isKnownImageExt) {
    return false;
  }

  return isKnownImageExt || isKnownImageMime;
};

export const checkImageFile = (file: Express.Multer.File, cb: FileFilterCallback) => {
  if (isAllowedImageUpload(file)) {
    cb(null, true);
    return;
  }

  cb(new Error('Images only!'));
};
