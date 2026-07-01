/**
 * services/storage/cloud/photoCloud.ts
 *
 * Uploads transformation photos to the private "transformation-photos" Supabase
 * Storage bucket (see supabase/schema.sql). Premium/ultra only — free-tier photos
 * never call anything in this file, so they never leave the device.
 *
 * Restore-on-new-device (re-downloading a listed cloud photo into a local file so
 * it can render before the user re-picks it) is not implemented yet — listCloudPhotos
 * only returns which files exist remotely. TODO: fetch + expo-file-system write for
 * a real "restore my photos" flow.
 */

import { supabase } from './client';

const BUCKET = 'transformation-photos';

export async function uploadPhoto(localUri: string, userId: string, photoId: string): Promise<string | null> {
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const ext = localUri.split('.').pop()?.split('?')[0] || 'jpg';
    const path = `${userId}/${photoId}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: true,
    });
    if (error) {
      console.warn('[photoCloud] upload failed', error.message);
      return null;
    }
    return path;
  } catch (err) {
    console.warn('[photoCloud] upload failed', err);
    return null;
  }
}

export async function deleteCloudPhoto(cloudPath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([cloudPath]);
}

/** Lists cloud paths for a user's uploaded photos — used to detect what's missing locally. */
export async function listCloudPhotos(userId: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(userId);
  if (error || !data) return [];
  return data.map(file => `${userId}/${file.name}`);
}
