export interface StyleEvolution {
  dominantSilhouettes: string[];
  topColors: string[];
  mostWornGarmentIds: string[];
  underusedGarmentIds: string[];
  observedShifts: string[];
}

export type GapCategory = 'outerwear' | 'tops' | 'bottoms' | 'shoes' | 'accessories';

export interface WardrobeGap {
  id: string;
  category: GapCategory;
  title: string;
  description: string;
  potentialOutfitsUnlocked: number;
  recommendedAttributes: {
    fit: string;
    colors: string[];
    suggestedStyles: string[];
  };
  priorityScore: number;
  whyThisWorks: string;
}

export interface ProductItem {
  id: string;
  title: string;
  brand: string;
  category: string;
  color: string;
  priceFormatted?: string;
  productUrl: string;
  imageUrl: string;
  matchScore: number;
  matchReason: string;
}

export interface ProactiveInsight {
  id: string;
  type: 'trend' | 'gap' | 'unworn' | 'inspiration_match';
  title: string;
  subtitle: string;
  actionRoute: string;
  actionLabel: string;
}
