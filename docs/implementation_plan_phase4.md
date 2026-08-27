# AURA — Phase 4 Implementation Plan
## Inspiration Intelligence & Visual Transformation

**Product:** AURA  
**Phase:** Phase 4 — Inspiration Intelligence & Visual Transformation  
**Status:** Implementation Plan  

---

## 1. What Already Exists

1. **Phase 1 Foundation**:
   - Camera & Gallery image picker integration with permissions (`expo-image-picker`).
   - Image display with crisp aspect ratios and editorial theme tokens.
   - Garment persistent storage and category definitions.
2. **Phase 2 AI Stylist & Personalization**:
   - `StylingEngine` combinatorial builder using owned closet pieces.
   - `PreferenceLearningService` for updating style signals from user actions.
   - Replaceable AI provider boundaries (`IStylingProvider`, `ITrendProvider`).
3. **Phase 3 Outfit Memory**:
   - `OutfitMemoryService` and `PlannerService` lifecycle tracking.
4. **Existing Inspiration Feed**:
   - Curated moodboard feed in [`app/(tabs)/inspiration.tsx`](file:///d:/Personal%20projects/aura/app/(tabs)/inspiration.tsx).

---

## 2. What Can Be Reused

- `expo-image-picker` gallery and camera ingestion utilities.
- `DatabaseService` and `LocalStorage` key-value persistence.
- `OutfitStack` and `GarmentCard` design primitives.
- `Mix & Match` studio canvas for user-customization of the recreated look.
- `FeedbackService` and `PreferenceLearningService` for capturing inspiration recreation feedback.

---

## 3. What Needs to Change

- Upgrade [`app/(tabs)/inspiration.tsx`](file:///d:/Personal%20projects/aura/app/(tabs)/inspiration.tsx) from static curated cards to an interactive Inspiration Studio & Library.
- Introduce direct photo upload/camera capture for user inspiration images.
- Provide a side-by-side visual transformation interface: **Original Inspiration Photo → AURA Version (User's Clothes)**.
- Add garment matching algorithm that honest evaluates piece compatibility without fake precision percentages.

---

## 4. AI Capabilities Required

- **Inspiration Understanding & Extraction**:
  - Detects dominant silhouettes, color palettes, fit styles, aesthetic mood, and garment breakdown (`tops`, `bottoms`, `shoes`, `outerwear`, `accessories`).
  - Distills the **Style Formula** (e.g. *Oversized top + relaxed tailored trousers + minimal low sneakers*).
- **Wardrobe Match Quality Assessment**:
  - Compares extracted pieces with user's owned garments based on category, silhouette, fit, and color family.
  - Categorizes match quality into natural tiers: `Exact match`, `Very close`, `Similar silhouette`, `Alternative piece`, `Missing piece`.
- **Deterministic Offline Fallback**:
  - If AI vision analysis fails or is offline, gracefully extracts base attributes and allows manual wardrobe piece assignment in Mix & Match without crashing.

---

## 5. New Data Structures

### `InspirationItem`
```typescript
export interface ExtractedPiece {
  category: 'tops' | 'bottoms' | 'shoes' | 'outerwear' | 'accessories';
  item_description: string;
  color: string;
  fit?: string;
  pattern?: string;
}

export interface MatchedPiece {
  target_piece_category: string;
  user_garment_id?: string;
  match_quality: 'exact' | 'close' | 'similar' | 'alternative' | 'missing';
  match_label: string; // e.g. "Exact match", "Very close", "Similar silhouette", "Missing piece"
  user_garment?: Garment;
}

export interface InspirationItem {
  id: string;
  user_id: string;
  image_url: string;
  source_type: 'gallery' | 'camera' | 'curated' | 'import';
  title: string;
  style_formula: string;
  aesthetic: string;
  mood: string;
  occasion?: string;
  extracted_pieces: ExtractedPiece[];
  matched_pieces: MatchedPiece[];
  aura_version_outfit_id?: string;
  created_at: string;
  updated_at: string;
}
```

---

## 6. New Database Keys & Storage

- Storage Key: `aura_inspirations_{userId}`
- Preserves original inspiration image URL and metadata without overwriting.

---

## 7. New UI Screens

1. **Inspiration Feed & Library** ([`app/(tabs)/inspiration.tsx`](file:///d:/Personal%20projects/aura/app/(tabs)/inspiration.tsx)):
   - "Upload Inspiration" button (Gallery & Camera).
   - Saved Inspirations library + Curated editorial looks.
2. **Add / Analyze Inspiration Screen** ([`app/inspiration/add.tsx`](file:///d:/Personal%20projects/aura/app/inspiration/add.tsx)):
   - Image selector & animated visual analysis scanner.
3. **Inspiration Detail & Visual Transformation** ([`app/inspiration/[id].tsx`](file:///d:/Personal%20projects/aura/app/inspiration/[id].tsx)):
   - Side-by-side comparison: Original photo vs AURA Version.
   - Match quality breakdown (`Exact match`, `Very close`, `Similar`, `Missing piece`).
   - "Customize in Studio" (opens Mix & Match) & "Save as Outfit" action.

---

## 8. Privacy & Performance Considerations

- Inspiration images are stored locally/securely per user ID; user isolation is strictly enforced.
- Fast processing with optimistic local previews and asynchronous structured vision parsing.
- User can delete any saved inspiration with 1 tap.

---

## 9. Testing Strategy

- `__tests__/inspirationAnalysis.test.ts`:
  - Validates extraction of structured style formula, silhouettes, and pieces.
  - Tests deterministic fallback on network or parsing errors.
- `__tests__/inspirationMatching.test.ts`:
  - Tests closet piece matching against inspiration pieces.
  - Tests honest match quality classification (`exact`, `close`, `similar`, `missing`).
  - Tests recreation of AURA Version using actual owned garments.
  - Tests user data isolation.
- Quality verification: `npm run ts:check`, `npm test`, `npx expo export --platform web`.
