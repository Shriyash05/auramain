# AURA — Phase 3 Implementation Plan
## Behavioral Personalization & Outfit Memory

**Product:** AURA  
**Phase:** Phase 3 — Behavioral Personalization & Outfit Memory  
**Status:** Implementation Plan  

---

## 1. What Already Exists

1. **Authentication & Session Foundation** ([`src/services/auth/authService.ts`](file:///d:/Personal%20projects/aura/src/services/auth/authService.ts), [`src/hooks/useAuth.tsx`](file:///d:/Personal%20projects/aura/src/hooks/useAuth.tsx)).
2. **Persistent Wardrobe & Garment Data Model** ([`src/services/database/databaseService.ts`](file:///d:/Personal%20projects/aura/src/services/database/databaseService.ts), [`src/types/garment.ts`](file:///d:/Personal%20projects/aura/src/types/garment.ts)) with category filtering and user data isolation.
3. **Mix & Match Active Styling Studio** ([`app/(tabs)/create.tsx`](file:///d:/Personal%20projects/aura/app/(tabs)/create.tsx), [`src/hooks/useMixMatch.ts`](file:///d:/Personal%20projects/aura/src/hooks/useMixMatch.ts)).
4. **Outfit Model & Persistence** ([`src/types/outfit.ts`](file:///d:/Personal%20projects/aura/src/types/outfit.ts)) referencing actual garment IDs.
5. **Feedback Foundation & Preference Learning** ([`src/services/feedback/feedbackService.ts`](file:///d:/Personal%20projects/aura/src/services/feedback/feedbackService.ts), [`src/services/stylist/preferenceLearningService.ts`](file:///d:/Personal%20projects/aura/src/services/stylist/preferenceLearningService.ts)).
6. **AI Styling Engine & Context Engine** ([`src/services/stylist/stylingEngine.ts`](file:///d:/Personal%20projects/aura/src/services/stylist/stylingEngine.ts), [`src/services/stylist/contextService.ts`](file:///d:/Personal%20projects/aura/src/services/stylist/contextService.ts)).
7. **Approved Figma Light Editorial Design System** ([`src/constants/theme.ts`](file:///d:/Personal%20projects/aura/src/constants/theme.ts), [`src/constants/assets.ts`](file:///d:/Personal%20projects/aura/src/constants/assets.ts)).

---

## 2. What Can Be Reused

- Existing `DatabaseService` garment & outfit CRUD infrastructure.
- Existing `PreferenceLearningService` for updating weights based on behavioral signals.
- Existing `OutfitStack`, `GarmentCard`, `Button`, `Chip`, and `GlassSurface` design system primitives.
- Existing `StylingEngine` combinatorial candidate generator.

---

## 3. What Needs to Change

- **Outfit Lifecycle Management**: Extend `Outfit` state machine to support states: `created`, `saved`, `planned`, `worn`, `archived`.
- **Wear Tracking**: Support lightweight "Mark as worn" actions from Outfit Detail, Home, and Planner.
- **Ranking Engine**: Incorporate recency penalty (e.g. don't recommend what was worn yesterday), frequency signals, and planned event look matching.
- **Home Contextual Memory**: Surface planned looks and wardrobe utilization insights dynamically on Home.

---

## 4. New Entities Required

### `WearLog`
```typescript
export interface WearLog {
  id: string;
  user_id: string;
  outfit_id: string;
  worn_date: string; // YYYY-MM-DD or ISO string
  occasion?: string;
  notes?: string;
  created_at: string;
}
```

### `PlannedEvent`
```typescript
export interface PlannedEvent {
  id: string;
  user_id: string;
  title: string;
  event_date: string; // YYYY-MM-DD
  event_time?: string; // HH:mm
  occasion: string;
  location?: string;
  outfit_id?: string;
  status: 'planned' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

---

## 5. New Database Fields & Storage Keys

1. **Storage Keys**:
   - `aura_wear_logs_{userId}`: Persistent collection of wear logs.
   - `aura_planned_events_{userId}`: Persistent collection of scheduled events and planned outfits.
2. **Updated Fields in Garment**:
   - `wear_count?: number`
   - `last_worn?: string`
3. **Updated Fields in Outfit**:
   - `status?: 'created' | 'saved' | 'planned' | 'worn' | 'archived'`
   - `worn_count: number`
   - `last_worn?: string`

---

## 6. New Services Required

1. **`OutfitMemoryService`** ([`src/services/memory/outfitMemoryService.ts`](file:///d:/Personal%20projects/aura/src/services/memory/outfitMemoryService.ts)):
   - `markOutfitAsWorn(userId, outfitId, options)`: Updates outfit wear count, constituent garments' wear counts, logs a `WearLog`, and records feedback learning.
   - `getWearHistory(userId)`: Returns all wear logs.
   - `getWornOutfits(userId)` & `getUnwornOutfits(userId)`.
   - `deleteWearLog(userId, logId)`.
2. **`PlannerService`** ([`src/services/memory/plannerService.ts`](file:///d:/Personal%20projects/aura/src/services/memory/plannerService.ts)):
   - `createEvent(userId, event)`: Creates a planned calendar event.
   - `getUpcomingEvents(userId)`: Returns events sorted by date.
   - `assignOutfitToEvent(userId, eventId, outfitId)`.
   - `completeEvent(userId, eventId)`: Marks event as completed and marks associated outfit as worn.
   - `deleteEvent(userId, eventId)`.

---

## 7. UI Screens Required

1. **Outfit History Screen** ([`app/history/index.tsx`](file:///d:/Personal%20projects/aura/app/history/index.tsx)):
   - Visual timeline of worn and saved looks.
   - Filters: `All Worn`, `Frequently Worn`, `Underused Garments`.
2. **Event & Look Planner Screen** ([`app/planner/index.tsx`](file:///d:/Personal%20projects/aura/app/planner/index.tsx)):
   - Upcoming schedule view showing planned looks per event.
3. **Create Event / Plan Look Screen** ([`app/planner/create.tsx`](file:///d:/Personal%20projects/aura/app/planner/create.tsx)):
   - Date picker, title, occasion selector, and outfit selection modal.
4. **Enhanced Home Screen** ([`app/(tabs)/index.tsx`](file:///d:/Personal%20projects/aura/app/(tabs)/index.tsx)):
   - Contextual prompt for planned events today.
   - "Mark as Worn" 1-tap interaction.
   - Wardrobe discovery and wear history badges.
5. **Enhanced Outfit Detail Screen** ([`app/outfit/[id].tsx`](file:///d:/Personal%20projects/aura/app/outfit/[id].tsx)):
   - "Mark as Worn" button.
   - Display wear count and last worn badge.
   - "Plan for Event" button.
6. **Enhanced Profile Screen** ([`app/(tabs)/profile.tsx`](file:///d:/Personal%20projects/aura/app/(tabs)/profile.tsx)):
   - Direct access to Outfit History and Event Planner.
   - Style Evolution insights based on real wear data.

---

## 8. How the Learning System Will Use New Signals

- **Wear Multiplier**: When an outfit is worn, constituent garment fits and colors receive a higher positive weight multiplier (`1.25x`) than simple likes (`1.1x`).
- **Recency Decay & Re-wear Timing**: Garments worn within the past 48 hours receive an intentional ranking damping factor (`0.65x`) to avoid recommending the same clothes on consecutive days, unless the user specifically requests their frequent favorites.
- **Occasion Reinforcement**: When a user wears an outfit for a specific occasion (e.g. *Dinner* or *Work / Office*), that outfit's association with that occasion increases.

---

## 9. Testing Strategy

Unit and integration tests:
- `__tests__/outfitMemoryService.test.ts`:
  - Test marking outfit as worn and verifying garment wear count updates.
  - Test retrieving wear logs and history.
  - Test user data isolation.
- `__tests__/plannerService.test.ts`:
  - Test creating events and assigning planned outfits.
  - Test completing events and cascading wear status.
  - Test user data isolation.
- `__tests__/rankingRecency.test.ts`:
  - Test that recently worn garments receive a recency penalty in recommendations.
  - Test occasion-specific wear reinforcement.

---

## 10. Migration Strategy

- Non-destructive schema extensions: all new fields (`worn_count`, `last_worn`, `status`) default to sensible initial values (`0`, `undefined`, `'saved'`).
- Fully backward compatible with Phase 1 and Phase 2 stored objects.
- Transparent offline/local AsyncStorage storage with clean Supabase schema sync support.
