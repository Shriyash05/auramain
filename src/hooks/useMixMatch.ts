import { useState, useEffect, useMemo } from 'react';
import { Garment } from '../types/garment';
import { Outfit } from '../types/outfit';
import { GarmentCategory } from '../constants/categories';
import { DatabaseService } from '../services/database/databaseService';
import { FeedbackService } from '../services/feedback/feedbackService';
import { useAuth } from './useAuth';
import { useGarments } from './useGarments';

export interface SelectedOutfitSlots {
  tops?: Garment;
  bottoms?: Garment;
  shoes?: Garment;
  outerwear?: Garment;
  accessories?: Garment;
}

export const useMixMatch = () => {
  const { user } = useAuth();
  const { garments, refresh } = useGarments('all');
  
  const [selectedSlots, setSelectedSlots] = useState<SelectedOutfitSlots>({});
  const [activeCategory, setActiveCategory] = useState<GarmentCategory>('tops');
  const [outfitName, setOutfitName] = useState<string>('Curated Look');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Group wardrobe garments by category
  const categorizedGarments = useMemo(() => {
    const map: Record<GarmentCategory, Garment[]> = {
      tops: [],
      bottoms: [],
      shoes: [],
      outerwear: [],
      accessories: [],
    };
    garments.forEach((g) => {
      if (map[g.category]) {
        map[g.category].push(g);
      }
    });
    return map;
  }, [garments]);

  // Set initial selected slots from available wardrobe items
  useEffect(() => {
    if (garments.length > 0) {
      setSelectedSlots((prev) => {
        const next = { ...prev };
        if (!next.tops && categorizedGarments.tops.length > 0) next.tops = categorizedGarments.tops[0];
        if (!next.bottoms && categorizedGarments.bottoms.length > 0) next.bottoms = categorizedGarments.bottoms[0];
        if (!next.shoes && categorizedGarments.shoes.length > 0) next.shoes = categorizedGarments.shoes[0];
        return next;
      });
    }
  }, [categorizedGarments, garments]);

  const selectGarmentForCategory = (category: GarmentCategory, garment: Garment) => {
    const previous = selectedSlots[category];
    setSelectedSlots((prev) => ({
      ...prev,
      [category]: garment,
    }));

    if (user && previous && previous.id !== garment.id) {
      FeedbackService.recordEvent(user.id, 'modify_garment', undefined, {
        category,
        replaced_garment_id: previous.id,
        new_garment_id: garment.id,
      });
    }
  };

  const removeCategorySlot = (category: GarmentCategory) => {
    setSelectedSlots((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  };

  const saveCurrentOutfit = async (): Promise<Outfit | null> => {
    if (!user) return null;
    try {
      setIsSaving(true);
      const activeGarmentList = Object.values(selectedSlots).filter(Boolean) as Garment[];
      if (activeGarmentList.length === 0) return null;

      const garmentIds = activeGarmentList.map((g) => g.id);

      const saved = await DatabaseService.saveOutfit({
        user_id: user.id,
        name: outfitName || 'Editorial Fit',
        source: 'mix_match',
        garment_ids: garmentIds,
        garments_map: {
          top_id: selectedSlots.tops?.id,
          bottom_id: selectedSlots.bottoms?.id,
          shoes_id: selectedSlots.shoes?.id,
          outerwear_id: selectedSlots.outerwear?.id,
          accessory_ids: selectedSlots.accessories ? [selectedSlots.accessories.id] : [],
        },
        favorite: false,
      });

      await FeedbackService.recordEvent(user.id, 'save', saved.id, {
        garment_count: garmentIds.length,
      });

      return saved;
    } catch (e) {
      console.error('[useMixMatch] Failed to save outfit:', e);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const recordFeedback = async (action: 'like' | 'dislike') => {
    if (!user) return;
    await FeedbackService.recordEvent(user.id, action, undefined, {
      top_id: selectedSlots.tops?.id,
      bottom_id: selectedSlots.bottoms?.id,
      shoes_id: selectedSlots.shoes?.id,
    });
  };

  return {
    garments,
    categorizedGarments,
    selectedSlots,
    activeCategory,
    setActiveCategory,
    selectGarmentForCategory,
    removeCategorySlot,
    outfitName,
    setOutfitName,
    saveCurrentOutfit,
    recordFeedback,
    isSaving,
    refreshGarments: refresh,
  };
};
