import { supabase } from './supabase.js';

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB — a logo, not a photo library.

export function validateLogoFile(file) {
  if (!file) throw new Error('Choose a logo file first.');
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    throw new Error('Logo must be a PNG, JPEG, WebP, or SVG file.');
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error('Logo must be smaller than 2MB.');
  }
}

/**
 * Uploads a new logo to a stable per-user folder (storage RLS in
 * policies.sql keys off this same `${userId}/...` prefix). The filename
 * itself is still unique per upload (timestamped) rather than a fixed
 * `logo.png` -- that's what lets the caller upload the replacement BEFORE
 * touching the old object, so a failed upload never puts a user's existing
 * logo at risk (see removeLogoAsset below, called only after the profile
 * row is confirmed saved with the new URL).
 */
export async function uploadLogoFile(userId, file) {
  validateLogoFile(file);
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${userId}/logo-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (uploadError) throw new Error(uploadError.message || 'Logo upload failed.');

  const { data } = supabase.storage.from('logos').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export function getLogoPathFromUrl(url) {
  if (!url) return null;
  const marker = '/logos/';
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

// Best-effort cleanup -- only ever called after the new state (a replacement
// URL, or null) has already been confirmed saved to the profile row, so a
// failure here just leaves a harmless orphaned object instead of a broken
// reference.
export async function deleteLogoAsset(path) {
  if (!path) return;
  await supabase.storage.from('logos').remove([path]);
}
