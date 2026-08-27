import { supabase, isSupabaseConfigured } from '../auth/authService';

export type StorageBucket =
  | 'garments_original'
  | 'garments_processed'
  | 'user_model_photos'
  | 'inspiration_images'
  | 'creator_photos'
  | 'public_look_photos';

export const CloudStorageService = {
  /**
   * Uploads an image file to the designated Supabase Storage bucket.
   * If Supabase is offline or not configured, falls back seamlessly to the local URI.
   */
  async uploadImage(
    bucket: StorageBucket,
    userId: string,
    fileUri: string,
    fileName?: string
  ): Promise<string> {
    if (!isSupabaseConfigured || !supabase) {
      // Offline / local development fallback
      return fileUri;
    }

    try {
      const ext = fileUri.split('.').pop() || 'jpg';
      const cleanName = fileName || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = `${userId}/${cleanName}`;

      // In production React Native environment: upload ArrayBuffer or FormData
      // Supabase storage upload call
      const { data, error } = await supabase.storage.from(bucket).upload(filePath, {
        uri: fileUri,
        type: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        name: cleanName,
      } as any);

      if (error) {
        console.warn(`[CloudStorage] Upload failed to ${bucket}, using local URI fallback:`, error.message);
        return fileUri;
      }

      if (bucket === 'public_look_photos') {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return publicUrlData.publicUrl;
      }

      // Return signed URL for private buckets
      const { data: signedData, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600 * 24 * 7); // 7 days

      if (signError || !signedData?.signedUrl) {
        return fileUri;
      }

      return signedData.signedUrl;
    } catch (e) {
      console.warn('[CloudStorage] Error uploading image, fallback to local URI:', e);
      return fileUri;
    }
  },

  /**
   * Deletes an individual object from storage.
   */
  async deleteImage(bucket: StorageBucket, filePath: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.storage.from(bucket).remove([filePath]);
    } catch (e) {
      console.warn(`[CloudStorage] Could not delete ${filePath} from ${bucket}:`, e);
    }
  },

  /**
   * Purges all user-scoped storage objects across all private & public buckets during account deletion.
   */
  async deleteUserStorageObjects(userId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const buckets: StorageBucket[] = [
      'garments_original',
      'garments_processed',
      'user_model_photos',
      'inspiration_images',
      'creator_photos',
      'public_look_photos',
    ];

    for (const bucket of buckets) {
      try {
        const { data: files } = await supabase.storage.from(bucket).list(userId);
        if (files && files.length > 0) {
          const filePaths = files.map((f) => `${userId}/${f.name}`);
          await supabase.storage.from(bucket).remove(filePaths);
        }
      } catch (e) {
        console.warn(`[CloudStorage] Could not purge user folder in ${bucket}:`, e);
      }
    }
  },
};
