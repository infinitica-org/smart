export const SCHOOL_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const SCHOOL_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const SCHOOL_BANNER_MAX_BYTES = 3 * 1024 * 1024;

export function validateSchoolImageFile(file: File, maxBytes: number): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return 'Only JPEG, PNG, and WebP images are supported.';
  }
  if (file.size > maxBytes) {
    return `Image must be ${Math.round(maxBytes / (1024 * 1024))}MB or smaller.`;
  }
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    image.src = url;
  });
}

/** Resize then encode as JPEG data URL so localStorage stays within quota. */
export async function imageFileToDataUrl(
  file: File,
  maxWidth: number,
  maxHeight: number,
): Promise<string> {
  const image = await loadImage(file);
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process that image.');
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.86);
}
