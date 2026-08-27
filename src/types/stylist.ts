import { Garment } from './garment';
import { Occasion, Season } from '../constants/categories';

export type MoodVibe = 'Relaxed' | 'Minimal' | 'Bold' | 'Elegant' | 'Confident' | 'Cool' | 'Effortless';

export interface StylingContext {
  occasion: Occasion | string;
  mood?: MoodVibe;
  weather?: {
    tempF: number;
    condition: 'warm' | 'mild' | 'cool' | 'cold' | 'rainy';
  };
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  customNotes?: string;
}

export type CandidateArchetype = 'curated_signature' | 'relaxed_contemporary' | 'trend_forward';

export interface OutfitCandidate {
  id: string;
  name: string;
  archetype: CandidateArchetype;
  archetypeLabel: string;
  garments: {
    top: Garment;
    bottom: Garment;
    shoes: Garment;
    outerwear?: Garment;
    accessory?: Garment;
  };
  rationale: string; // Concise editorial "Why this works"
  compatibilityScore: number;
  highlightedAttributes: string[];
}

export interface PreferenceSignals {
  fitWeights: Record<string, number>;
  colorWeights: Record<string, number>;
  occasionWeights: Record<string, number>;
  silhouetteWeights: Record<string, number>;
  monochromePreference: number;
  unwornPieceBoost: number;
  lastUpdated: string;
}

export interface TrendSnapshot {
  id: string;
  title: string;
  description: string;
  keyAesthetics: string[];
  recommendedSilhouettes: string[];
  keyColorPalettes: string[];
}
