import { useState, useEffect, useMemo, useCallback } from 'react';
import { Garment } from '../types/garment';
import { Outfit } from '../types/outfit';
import { GarmentCategory } from '../constants/categories';
import { DatabaseService } from '../services/database/databaseService';
import { FeedbackService } from '../services/feedback/feedbackService';
import { ContextService } from '../services/stylist/contextService';
import {
  OutfitCompatibilityService,
  OutfitSlots,
  OutfitEvaluationResult,
  WardrobeSufficiencyResult,
} from '../services/stylist/outfitCompatibilityService';
import { OutfitCandidate, StylingContext } from '../types/stylist';
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
  const { garments, isLoading: isGarmentsLoading, refresh } = useGarments('all');


  const [context, setContext] = useState<StylingContext>(ContextService.getDefaultContext());
  const [candidates, setCandidates] = useState<OutfitCandidate[]>([]);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState<number>(0);
  const [selectedSlots, setSelectedSlots] = useState<SelectedOutfitSlots>({});
  const [activeCategory, setActiveCategory] = useState<GarmentCategory>('tops');
  const [outfitName, setOutfitName] = useState<string>('Editorial Minimal');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Group wardrobe garments strictly by category
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

  // Check wardrobe sufficiency
  const wardrobeSufficiency: WardrobeSufficiencyResult = useMemo(() => {
    return OutfitCompatibilityService.checkWardrobeSufficiency(garments);
  }, [garments]);

  // Convert SelectedOutfitSlots to OutfitSlots for compatibility evaluation
  const currentOutfitSlots: OutfitSlots = useMemo(() => {
    return {
      top: selectedSlots.tops,
      bottom: selectedSlots.bottoms,
      shoes: selectedSlots.shoes,
      outerwear: selectedSlots.outerwear,
      accessory: selectedSlots.accessories,
    };
  }, [selectedSlots]);

  // Live evaluation of current slots
  const evaluation: OutfitEvaluationResult = useMemo(() => {
    return OutfitCompatibilityService.evaluateOutfit(currentOutfitSlots, context);
  }, [currentOutfitSlots, context]);

  // Initialize and generate candidate looks from wardrobe
  const initializeLooks = useCallback(() => {
    setIsGenerating(true);
    try {
      if (!wardrobeSufficiency.isSufficient) {
        setCandidates([]);
        setSelectedSlots({});
        return;
      }

      const generated = OutfitCompatibilityService.generateLookCandidates(garments, context);
      setCandidates(generated);

      if (generated.length > 0) {
        const first = generated[0];
        setActiveCandidateIndex(0);
        setOutfitName(first.name);
        setSelectedSlots({
          tops: first.garments.top,
          bottoms: first.garments.bottom,
          shoes: first.garments.shoes,
          outerwear: first.garments.outerwear,
          accessories: first.garments.accessory,
        });
      }
    } catch (e) {
      console.error('[useMixMatch] Look generation error:', e);
      setCandidates([]);
    } finally {
      setIsGenerating(false);
    }
  }, [garments, context, wardrobeSufficiency.isSufficient]);

  useEffect(() => {
    initializeLooks();
  }, [initializeLooks]);

  // Switch between candidates (LOOK 01, LOOK 02, LOOK 03)
  const selectCandidate = useCallback(
    (index: number) => {
      if (index >= 0 && index < candidates.length) {
        setActiveCandidateIndex(index);
        const cand = candidates[index];
        setOutfitName(cand.name);
        setSelectedSlots({
          tops: cand.garments.top,
          bottoms: cand.garments.bottom,
          shoes: cand.garments.shoes,
          outerwear: cand.garments.outerwear,
          accessories: cand.garments.accessory,
        });
      }
    },
    [candidates]
  );

  // Swap a single component while preserving context and updating rationale
  const swapGarment = useCallback(
    (category: GarmentCategory, garment: Garment) => {
      const previous = selectedSlots[category];

      setSelectedSlots((prev) => {
        const next = {
          ...prev,
          [category]: garment,
        };

        // Re-evaluate updated slots immediately
        const updatedSlots: OutfitSlots = {
          top: next.tops,
          bottom: next.bottoms,
          shoes: next.shoes,
          outerwear: next.outerwear,
          accessory: next.accessories,
        };

        const recomputed = OutfitCompatibilityService.evaluateOutfit(updatedSlots, context);

        // Update the active candidate in-place so UI remains synchronized
        setCandidates((prevCands) => {
          if (prevCands.length === 0) return prevCands;
          const nextCands = [...prevCands];
          const curr = nextCands[activeCandidateIndex];
          if (curr) {
            nextCands[activeCandidateIndex] = {
              ...curr,
              garments: {
                ...curr.garments,
                top: next.tops || curr.garments.top,
                bottom: next.bottoms || curr.garments.bottom,
                shoes: next.shoes || curr.garments.shoes,
                outerwear: next.outerwear,
                accessory: next.accessories,
              },
              rationale: recomputed.rationale,
              highlightedAttributes: recomputed.highlights,
            };
          }
          return nextCands;
        });

        return next;
      });

      // Record swap telemetry
      if (user && previous && previous.id !== garment.id) {
        FeedbackService.recordEvent(user.id, 'modify_garment', undefined, {
          category,
          replaced_garment_id: previous.id,
          new_garment_id: garment.id,
        });
      }
    },
    [selectedSlots, context, activeCandidateIndex, user]
  );

  const removeCategorySlot = useCallback((category: GarmentCategory) => {
    setSelectedSlots((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  }, []);

  // Save the customized or recommended outfit
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
        has_outerwear: Boolean(selectedSlots.outerwear),
        has_accessory: Boolean(selectedSlots.accessories),
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
      outerwear_id: selectedSlots.outerwear?.id,
    });
  };

  const activeCandidate = candidates[activeCandidateIndex] || null;

  return {
    garments,
    categorizedGarments,
    selectedSlots,
    activeCategory,
    setActiveCategory,
    selectGarmentForCategory: swapGarment, // Backward compatibility alias
    swapGarment,
    removeCategorySlot,
    outfitName,
    setOutfitName,
    saveCurrentOutfit,
    recordFeedback,
    isSaving,
    isGenerating: isGenerating || isGarmentsLoading,
    refreshGarments: refresh,
    context,
    candidates,
    activeCandidate,
    activeCandidateIndex,
    setActiveCandidateIndex: selectCandidate,
    evaluation,
    wardrobeSufficiency,
  };
};
