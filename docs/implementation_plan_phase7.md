# AURA — Phase 7 Implementation Plan
## Intelligence, Wardrobe Gaps & Commerce Foundation

**Product:** AURA  
**Phase:** Phase 7 — Intelligence, Wardrobe Gaps & Commerce Foundation  
**Status:** Implementation Plan  

---

## 1. Core Vision & Architectural Objectives

Phase 7 elevates AURA from an AI wardrobe stylist into an intelligent **Personal Fashion Intelligence** layer:
1. **Unified Personal Style Model**: Merges signals from onboarding, owned garments, outfit feedback, wear history, saved inspirations, and creator activity into a coherent, dynamic profile.
2. **Style Evolution Tracking**: Identifies shifts in the user's behavior (e.g. increasing preference for relaxed silhouettes, neutral tones, or seasonal layering).
3. **Personalized Trend Intelligence**: Evaluates external fashion trends against the user's closet (*"You already own the pieces to style this trend"*).
4. **Wardrobe Gap Engine**: Identifies high-utility missing pieces based on outfit unlocking potential while strictly enforcing the *"You already own it"* rule.
5. **Product Discovery Abstraction**: Clean, replaceable provider boundary (`IProductDiscoveryProvider`) for finding real garments to fill wardrobe gaps without premature checkout or marketplace clutter.
6. **Universal Search & Natural Intent Routing**: Structured query engine for wardrobe, outfits, and styling occasions.

---

## 2. Data Models & Type Architecture

### Types ([`src/types/intelligence.ts`](file:///d:/Personal%20projects/aura/src/types/intelligence.ts))

```typescript
export interface StyleEvolution {
  dominantSilhouettes: string[];
  topColors: string[];
  mostWornGarmentIds: string[];
  underusedGarmentIds: string[];
  observedShifts: string[]; // e.g. "Shifting towards relaxed tailoring and warm neutrals"
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
```

---

## 3. Core Services Layer

1. **`PersonalStyleIntelligenceService`** ([`src/services/intelligence/styleIntelligenceService.ts`](file:///d:/Personal%20projects/aura/src/services/intelligence/styleIntelligenceService.ts)):
   - Aggregates wear logs, outfit saves, and preferences into a dynamic `StyleEvolution` model.
2. **`WardrobeGapService`** ([`src/services/intelligence/wardrobeGapService.ts`](file:///d:/Personal%20projects/aura/src/services/intelligence/wardrobeGapService.ts)):
   - Evaluates closet composition.
   - Verifies if the user already owns an equivalent piece before suggesting a gap.
   - Calculates how many new outfits a missing layer or piece would unlock.
3. **`TrendIntelligenceService`** ([`src/services/intelligence/trendIntelligenceService.ts`](file:///d:/Personal%20projects/aura/src/services/intelligence/trendIntelligenceService.ts)):
   - Matches trending silhouettes/fabrics against the user's closet and flags pieces that enable the look.
4. **`ProductDiscoveryProvider`** ([`src/services/commerce/productDiscoveryProvider.ts`](file:///d:/Personal%20projects/aura/src/services/commerce/productDiscoveryProvider.ts)):
   - Replaceable boundary returning validated product items for wardrobe gaps.
5. **`UniversalSearchService`** ([`src/services/intelligence/searchService.ts`](file:///d:/Personal%20projects/aura/src/services/intelligence/searchService.ts)):
   - Multi-attribute search across garments, saved looks, occasions, and colors.

---

## 4. UI Screens & User Experience

1. **Style Insights Screen** ([`app/insights/index.tsx`](file:///d:/Personal%20projects/aura/app/insights/index.tsx)):
   - Evolution metrics, top silhouettes, favorite color palettes, and most/least worn pieces.
2. **Wardrobe Gaps Screen** ([`app/gaps/index.tsx`](file:///d:/Personal%20projects/aura/app/gaps/index.tsx)):
   - Ranked gaps with "Why This Works" rationale and "Outfits Unlocked" count.
3. **Gap Product Discovery Screen** ([`app/gaps/[id].tsx`](file:///d:/Personal%20projects/aura/app/gaps/%5Bid%5D.tsx)):
   - Curated product discovery matching the exact gap attributes.
4. **Universal Search Screen** ([`app/search/index.tsx`](file:///d:/Personal%20projects/aura/app/search/index.tsx)):
   - Quick natural filters and instant garment/outfit search.
5. **Proactive Home Intelligence**:
   - Smart insight banner in [`app/(tabs)/index.tsx`](file:///d:/Personal%20projects/aura/app/(tabs)/index.tsx).

---

## 5. Verification Plan

### Automated Tests
- `__tests__/wardrobeGapService.test.ts`:
  - Wardrobe gap detection, outfit unlocking calculations, and strict "You already own it" prevention.
- `__tests__/trendIntelligence.test.ts`:
  - Trend matching against user closet and fallback behavior.
- `__tests__/searchService.test.ts`:
  - Search query filtering across categories, colors, occasions, and outfits.
- Quality Gates: `npm run ts:check`, `npm test`, `npx expo export --platform web`.
