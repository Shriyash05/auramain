import { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '../services/database/databaseService';
import { Garment } from '../types/garment';
import { GarmentCategory } from '../constants/categories';
import { useAuth } from './useAuth';

export const useGarments = (selectedCategory?: GarmentCategory | 'all') => {
  const { user } = useAuth();
  const [garments, setGarments] = useState<Garment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGarments = useCallback(async () => {
    if (!user) {
      setGarments([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const all = await DatabaseService.getGarments(user.id);
      if (selectedCategory && selectedCategory !== 'all') {
        setGarments(all.filter((g) => g.category === selectedCategory));
      } else {
        setGarments(all);
      }
    } catch (e: any) {
      console.error('[useGarments] Failed to fetch garments:', e);
      setError(e.message || 'Failed to load wardrobe items');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedCategory]);

  useEffect(() => {
    fetchGarments();
  }, [fetchGarments]);

  const addGarment = async (item: Omit<Garment, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    if (!user) throw new Error('Must be logged in to add garments');
    const created = await DatabaseService.addGarment({
      ...item,
      user_id: user.id,
    });
    await fetchGarments();
    return created;
  };

  const toggleFavorite = async (garmentId: string, currentFavorite: boolean) => {
    if (!user) return;
    await DatabaseService.updateGarment(user.id, garmentId, { favorite: !currentFavorite });
    await fetchGarments();
  };

  const deleteGarment = async (garmentId: string) => {
    if (!user) return;
    await DatabaseService.deleteGarment(user.id, garmentId);
    await fetchGarments();
  };

  return {
    garments,
    isLoading,
    error,
    refresh: fetchGarments,
    addGarment,
    toggleFavorite,
    deleteGarment,
  };
};
