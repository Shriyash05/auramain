import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useGarments } from './useGarments';
import { StylingEngine } from '../services/stylist/stylingEngine';
import { ContextService } from '../services/stylist/contextService';
import { PreferenceLearningService } from '../services/stylist/preferenceLearningService';
import { FeedbackService } from '../services/feedback/feedbackService';
import { DatabaseService } from '../services/database/databaseService';
import { OutfitCandidate, StylingContext, MoodVibe } from '../types/stylist';
import { Outfit } from '../types/outfit';
import { Occasion } from '../constants/categories';

export const useStylist = () => {
  const { user } = useAuth();
  const { garments } = useGarments('all');

  const [context, setContext] = useState<StylingContext>(ContextService.getDefaultContext());
  const [candidates, setCandidates] = useState<OutfitCandidate[]>([]);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const generateLooks = useCallback(
    async (customContext?: Partial<StylingContext>) => {
      if (!user) {
        setCandidates([]);
        setIsGenerating(false);
        return;
      }

      const activeCtx: StylingContext = {
        ...context,
        ...customContext,
      };

      try {
        setIsGenerating(true);
        const recs = await StylingEngine.generateRecommendations(user.id, garments, activeCtx);
        setCandidates(recs);
        setActiveCandidateIndex(0);
        setContext(activeCtx);
      } catch (e) {
        console.error('[useStylist] Generation error:', e);
        setCandidates([]);
      } finally {
        setIsGenerating(false);
      }
    },
    [user, garments, context]
  );

  useEffect(() => {
    if (garments.length > 0) {
      generateLooks();
    } else {
      setIsGenerating(false);
    }
  }, [garments.length]);

  const setOccasion = (occasion: Occasion | string) => {
    generateLooks({ occasion });
  };

  const setMood = (mood: MoodVibe) => {
    generateLooks({ mood });
  };

  const activeCandidate = candidates[activeCandidateIndex] || null;

  const saveCandidateOutfit = async (): Promise<Outfit | null> => {
    if (!user || !activeCandidate) return null;

    try {
      setIsSaving(true);
      const { top, bottom, shoes, outerwear, accessory } = activeCandidate.garments;
      const garmentIds = [top.id, bottom.id, shoes.id];
      if (outerwear) garmentIds.push(outerwear.id);
      if (accessory) garmentIds.push(accessory.id);

      const saved = await DatabaseService.saveOutfit({
        user_id: user.id,
        name: activeCandidate.name,
        source: 'aura_stylist',
        garment_ids: garmentIds,
        garments_map: {
          top_id: top.id,
          bottom_id: bottom.id,
          shoes_id: shoes.id,
          outerwear_id: outerwear?.id,
          accessory_ids: accessory ? [accessory.id] : [],
        },
        occasion: typeof context.occasion === 'string' ? (context.occasion as Occasion) : undefined,
        favorite: true,
      });

      const allPieces = [top, bottom, shoes, outerwear, accessory].filter(Boolean) as any[];
      const event = await FeedbackService.recordEvent(user.id, 'save', saved.id, {
        candidate_archetype: activeCandidate.archetype,
        occasion: context.occasion,
      });

      await PreferenceLearningService.recordFeedbackLearning(user.id, event, allPieces);
      return saved;
    } catch (e) {
      console.error('[useStylist] Save outfit error:', e);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const recordFeedback = async (action: 'like' | 'dislike') => {
    if (!user || !activeCandidate) return;
    const { top, bottom, shoes, outerwear, accessory } = activeCandidate.garments;
    const allPieces = [top, bottom, shoes, outerwear, accessory].filter(Boolean) as any[];

    const event = await FeedbackService.recordEvent(user.id, action, undefined, {
      candidate_archetype: activeCandidate.archetype,
      top_id: top.id,
      bottom_id: bottom.id,
    });

    await PreferenceLearningService.recordFeedbackLearning(user.id, event, allPieces);
  };

  return {
    context,
    candidates,
    activeCandidate,
    activeCandidateIndex,
    setActiveCandidateIndex,
    isGenerating,
    isSaving,
    setOccasion,
    setMood,
    refreshRecommendations: generateLooks,
    saveCandidateOutfit,
    recordFeedback,
  };
};
