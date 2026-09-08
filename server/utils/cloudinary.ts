import crypto from 'crypto';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { getCloudinaryConfig, isDevelopmentEnv } from './env.ts';
import { detectImageFormat, getNormalizedImageExtension, getSafeImageFilename } from './upload.ts';

const buildSignature = (params: Record<string, string>, apiSecret: string) => {
  const signatureBase = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto.createHash('sha1').update(`${signatureBase}${apiSecret}`).digest('hex');
};

const saveImageLocally = async (buffer: Buffer, filename: string, folderSuffix: string) => {
  const uploadsRoot = path.join(process.cwd(), 'uploads', folderSuffix);
  await mkdir(uploadsRoot, { recursive: true });

  const format = detectImageFormat(buffer, filename) || 'jpg';

  const extension = getNormalizedImageExtension(format);
  const safeName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const filePath = path.join(uploadsRoot, safeName);

  await writeFile(filePath, buffer);

  return `/uploads/${folderSuffix}/${safeName}`;
};

export const uploadImageBuffer = async (
  buffer: Buffer,
  filename: string,
  folderSuffix: string,
) => {
  const format = detectImageFormat(buffer, filename) || 'jpg';

  const safeFilename = getSafeImageFilename(filename, format);
  let cloudinaryConfig: ReturnType<typeof getCloudinaryConfig> | null = null;

  try {
    cloudinaryConfig = getCloudinaryConfig();
  } catch (error) {
    console.warn('[upload] Falling back to local storage.', {
      folderSuffix,
      reason: error instanceof Error ? error.message : 'Cloudinary config unavailable',
    });
    return saveImageLocally(buffer, filename, folderSuffix);
  }

  const { cloudName, apiKey, apiSecret, folder } = cloudinaryConfig;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const uploadFolder = `${folder}/${folderSuffix}`;
  const safePublicIdBase = path.basename(safeFilename, path.extname(safeFilename));
  const paramsToSign = {
    folder: uploadFolder,
    public_id: `${Date.now()}-${safePublicIdBase}`,
    timestamp,
  };

  const signature = buildSignature(paramsToSign, apiSecret);
  const formData = new FormData();
  const blob = new Blob([buffer]);

  formData.append('file', blob, safeFilename);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('folder', uploadFolder);
  formData.append('public_id', paramsToSign.public_id);
  formData.append('signature', signature);

  let response: globalThis.Response;

  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    console.warn('[upload] Cloudinary request failed, saving locally instead.', {
      folderSuffix,
      reason: error instanceof Error ? error.message : 'unknown network error',
    });
    return saveImageLocally(buffer, filename, folderSuffix);
  }

  const responseText = await response.text();
  let data: any = null;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = null;
  }

  if (isDevelopmentEnv()) {
    console.log('Cloudinary upload response:', {
      ok: response.ok,
      status: response.status,
      secure_url: data?.secure_url,
      error: data?.error,
    });
  }

  if (!response.ok || !data.secure_url) {
    const cloudinaryMessage = data?.error?.message;

    if (typeof cloudinaryMessage === 'string' && /invalid api[_ ]key/i.test(cloudinaryMessage)) {
      throw new Error(
        'Cloudinary rejected CLOUDINARY_API_KEY. Check the value loaded from .env and restart the server.',
      );
    }

    if (typeof cloudinaryMessage === 'string' && /invalid signature/i.test(cloudinaryMessage)) {
      throw new Error(
        'Cloudinary rejected CLOUDINARY_API_SECRET. Check the value loaded from .env and restart the server.',
      );
    }

    console.warn('[upload] Cloudinary upload failed, saving locally instead.', {
      folderSuffix,
      reason: cloudinaryMessage || responseText || 'Image upload failed',
    });

    return saveImageLocally(buffer, filename, folderSuffix);
  }

  return data.secure_url as string;
};
