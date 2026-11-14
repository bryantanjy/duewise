import { z } from 'zod';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_ITEM = 5;
export const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;
// Scan linearly: repeating regex groups can overflow the JS stack on multi-MB files.
function validBase64(value: string) {
  if (!value.length || value.length % 4 !== 0) return false;
  const end = value.length - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0);
  for (let i = 0; i < end; i++) {
    const code = value.charCodeAt(i);
    if (!((code >= 65 && code <= 90) || (code >= 97 && code <= 122) ||
      (code >= 48 && code <= 57) || code === 43 || code === 47)) return false;
  }
  return true;
}

export const attachmentSchema = z.object({
  name: z.string().min(1).max(180).refine(value => !/[\\/\u0000-\u001f]/.test(value), 'Invalid filename'),
  mimeType: z.enum(ATTACHMENT_TYPES),
  size: z.number().int().min(1).max(MAX_ATTACHMENT_BYTES),
  base64: z.string().min(4).max(4 * Math.ceil(MAX_ATTACHMENT_BYTES / 3))
    .refine(validBase64, 'Invalid attachment encoding'),
}).refine(value => value.base64.length / 4 * 3 - (value.base64.endsWith('==') ? 2 : value.base64.endsWith('=') ? 1 : 0) === value.size,
  'Attachment size does not match its contents');
export type AttachmentData = z.infer<typeof attachmentSchema>;

export function attachmentName(value: string) {
  return value.replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 180).trim() || 'Document';
}

export function attachmentCacheName(id: number, mimeType: string) {
  const extensions: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };
  return `duewise-attachment-${id}.${extensions[mimeType] ?? 'bin'}`;
}

export function attachmentMimeType(name: string, reportedType?: string) {
  const extensions: Record<string, typeof ATTACHMENT_TYPES[number]> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };
  const inferred = extensions[name.split('.').pop()?.toLowerCase() ?? ''];
  const mimeType = ATTACHMENT_TYPES.find(type => type === reportedType) ?? inferred;
  if (!mimeType) throw new Error('Choose a PDF, JPEG, PNG, WebP, or HEIC file.');
  return mimeType;
}
