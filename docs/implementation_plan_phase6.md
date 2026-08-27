# AURA — Phase 6 Implementation Plan
## Creator Mode + Shoot Styling + Shareable Looks

**Product:** AURA  
**Phase:** Phase 6 — Creator Mode + Shoot Styling + Shareable Looks  
**Status:** Implementation Plan  

---

## 1. Overview & Core Vision

Creator Mode is a visual, image-first extension of AURA for users managing campaigns, photo shoots, content days, and public fashion moments. It introduces:
1. **Lightweight Creator Profile & Toggle**: Users activate Creator Mode from Settings/Profile.
2. **Shoot Management & Concept Definition**: Plan shoots with concept, mood, location, notes, and attached Phase 4 inspiration images.
3. **Multi-Look Generation & Diversity Ranking**: Generate cohesive yet varied look sets (e.g. 5 distinct looks) from the creator's actual wardrobe.
4. **Shoot Capsule & Status Lifecycle**: Track status (`draft`, `selected`, `ready`, `shot`, `published`, `archived`) and bridge to AURA Mirror for VTO.
5. **Final Photo Ingestion & Garment Tagging**: Upload final shot photos with AI suggestions and creator confirmation.
6. **Shareable Look & Public Deep Links**: Generate sanitized public look pages (`/look/[shareId]`) with native share sheet support and Lookbook collections without exposing private user data.

---

## 2. Data Models & Type Architecture

### A. Core Types ([`src/types/creator.ts`](file:///d:/Personal%20projects/aura/src/types/creator.ts))

```typescript
export interface CreatorProfile {
  user_id: string;
  handle: string;
  display_name: string;
  bio?: string;
  profile_image_url?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  is_creator_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type ShootStatus = 'planning' | 'in_progress' | 'completed' | 'archived';
export type LookStatus = 'draft' | 'selected' | 'ready' | 'shot' | 'published' | 'archived';

export interface Shoot {
  id: string;
  user_id: string;
  name: string;
  date?: string;
  location?: string;
  concept: string;
  mood?: string;
  occasion?: string;
  notes?: string;
  inspiration_ids: string[];
  garment_capsule_ids: string[];
  look_ids: string[];
  status: ShootStatus;
  created_at: string;
  updated_at: string;
}

export interface ShootLook {
  id: string;
  shoot_id: string;
  user_id: string;
  outfit_id: string;
  name: string;
  status: LookStatus;
  final_photo_url?: string;
  tagged_garment_ids: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TaggedGarmentSummary {
  garment_id: string;
  name: string;
  category: string;
  primary_color?: string;
  fit?: string;
  brand?: string;
  image_url?: string;
}

export interface ShareableLook {
  id: string;
  public_share_id: string;
  user_id: string;
  creator_handle: string;
  creator_display_name: string;
  final_photo_url: string;
  title: string;
  caption?: string;
  concept?: string;
  tagged_garments: TaggedGarmentSummary[];
  is_published: boolean;
  views_count: number;
  saves_count: number;
  created_at: string;
  updated_at: string;
}

export interface Lookbook {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_photo_url?: string;
  look_ids: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## 3. Core Services Layer

1. **`CreatorService`** ([`src/services/creator/creatorService.ts`](file:///d:/Personal%20projects/aura/src/services/creator/creatorService.ts)):
   - Manages creator profile activation and updates.
   - Manages Shoot CRUD operations and shoot capsules.
   - Manages Lookbooks (collections of curated looks).
2. **`ShootStylingService`** ([`src/services/creator/shootStylingService.ts`](file:///d:/Personal%20projects/aura/src/services/creator/shootStylingService.ts)):
   - Multi-look generation algorithm optimizing for:
     - Theme cohesion with shoot concept/mood.
     - Silhouette and layering diversity across the generated set.
     - Balanced wardrobe utilization without excessive repetitive combinations.
3. **`GarmentTaggingService`** ([`src/services/creator/garmentTaggingService.ts`](file:///d:/Personal%20projects/aura/src/services/creator/garmentTaggingService.ts)):
   - Generates automatic piece tag suggestions based on look outfits and visual attributes.
   - Creator confirmation and manual adjustment workflow.
4. **`ShareableLookService`** ([`src/services/creator/shareableLookService.ts`](file:///d:/Personal%20projects/aura/src/services/creator/shareableLookService.ts)):
   - Generates and publishes shareable looks with unique public IDs (`public_share_id`).
   - Strict public data sanitization (removes private user IDs, internal paths, and unpublished drafts).
   - Platform native sharing integration.

---

## 4. UI Screens & Routing

1. **Profile Toggle & Entry**:
   - [`app/(tabs)/profile.tsx`](file:///d:/Personal%20projects/aura/app/(tabs)/profile.tsx): "Creator Mode" switch & quick entry button.
2. **Creator Dashboard / Home**:
   - [`app/creator/index.tsx`](file:///d:/Personal%20projects/aura/app/creator/index.tsx): Image-first work dashboard showing Upcoming Shoots, Active Capsules, Recent Looks, and Lookbooks.
3. **New Shoot Creation**:
   - [`app/creator/shoot/create.tsx`](file:///d:/Personal%20projects/aura/app/creator/shoot/create.tsx): Concept, mood, location, date, notes, and inspiration selection.
4. **Shoot Detail & Multi-Look Board**:
   - [`app/creator/shoot/[id].tsx`](file:///d:/Personal%20projects/aura/app/creator/shoot/%5Bid%5D.tsx): Visual board of looks with status badges, "Generate Looks", "Try On in Mirror", and "Add Final Photo".
5. **Multi-Look Generator Screen**:
   - [`app/creator/shoot/[id]/generate.tsx`](file:///d:/Personal%20projects/aura/app/creator/shoot/%5Bid%5D/generate.tsx): Interactive generation of diverse look sets with 1-tap addition to shoot.
6. **Final Photo & Garment Tagging**:
   - [`app/creator/shoot/[id]/tag.tsx`](file:///d:/Personal%20projects/aura/app/creator/shoot/%5Bid%5D/tag.tsx): Photo picker with AI suggestions and tag confirmation.
7. **Lookbooks Collection & Detail**:
   - [`app/creator/lookbook/index.tsx`](file:///d:/Personal%20projects/aura/app/creator/lookbook/index.tsx) & [`app/creator/lookbook/[id].tsx`](file:///d:/Personal%20projects/aura/app/creator/lookbook/%5Bid%5D.tsx).
8. **Public Shareable Look Page**:
   - [`app/look/[shareId].tsx`](file:///d:/Personal%20projects/aura/app/look/%5BshareId%5D.tsx): Clean, standalone public viewer highlighting creator handle, final photo, tagged garments, and native share action.

---

## 5. Security & User Isolation

- **Private Resources**: Shoots, shoot notes, draft looks, private reference photos, and unpublished lookbooks are strictly isolated by `userId`.
- **Public Surface**: Only explicitly published `ShareableLook` records are accessible via `public_share_id`.
- **Zero Secret Leaks**: No internal storage paths or private user identifiers are exposed on public routes.

---

## 6. Testing Strategy

1. **`__tests__/creatorService.test.ts`**:
   - Creator profile activation, shoot creation, capsule building, and status lifecycle.
2. **`__tests__/shootStylingService.test.ts`**:
   - Multi-look generation, look diversity, and wardrobe coverage.
3. **`__tests__/shareableLookService.test.ts`**:
   - Look publishing, unpublishing, public sanitization, and data isolation.
4. **Quality Gates**:
   - `npm run ts:check`
   - `npm test`
   - `npx expo export --platform web`
