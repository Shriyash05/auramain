# AURA — Production Launch Checklist

**Product:** AURA  
**Document:** Production Launch Checklist  
**Version:** 1.0  
**Status:** Pre-Launch Operational Plan  

---

## 1. Backend & Cloud Infrastructure

- [ ] **Supabase Production Project Setup**
  - [ ] Create production instance in primary region.
  - [ ] Run full database migration (`garments`, `outfits`, `feedback_events`, `wear_logs`, `planned_events`, `shoots`, `shoot_looks`, `lookbooks`, `shareable_looks`, `profiles`).
  - [ ] Enable and verify Row Level Security (RLS) policies on all tables.
- [ ] **Cloud Storage Buckets**
  - [ ] `garments_original` (Private, user-authenticated access only).
  - [ ] `garments_processed` (Private, user-authenticated access only).
  - [ ] `user_model_photos` (Private, user-authenticated access only).
  - [ ] `public_look_photos` (Public read, authenticated write).
- [ ] **AURA Self-Hosted Model Server & Edge Gateway**
  - [ ] Deploy Edge Function `/vto-generate` pointing to AURA Self-Hosted VTO GPU container (`aura-vto-v1` / IDM-VTON).
  - [ ] Deploy Edge Function `/segment-garment` pointing to AURA Segmentation container (`aura-segment-v1` / BiRefNet Apache 2.0).
  - [ ] Deploy Edge Function `/analyze-inspiration` pointing to AURA Inspiration VLM container (`aura-inspire-v1` / Florence-2-Large MIT).
  - [ ] Configure internal container authorization tokens in Supabase Vault (zero third-party AI APIs).

---

## 2. Security & Privacy Hardening

- [ ] **Client Bundle Verification**
  - [ ] Audit `.env.production` — ensure only `EXPO_PUBLIC_` variables are included.
  - [ ] Verify zero private keys, service-role secrets, or internal server paths are compiled into `dist/`.
- [ ] **Data Deletion & Privacy Testing**
  - [ ] Test `DatabaseService.deleteUserAccountData(userId)` against live Supabase instance.
  - [ ] Verify that deleting an account purges database records and removes storage objects.
  - [ ] Publish Privacy Policy URL explaining camera and wardrobe photo handling.

---

## 3. Monitoring & Operations

- [ ] **Error & Crash Monitoring**
  - [ ] Install `@sentry/react-native`.
  - [ ] Initialize Sentry DSN in `app/_layout.tsx`.
- [ ] **Rate Limiting & Abuse Protection**
  - [ ] Configure Cloudflare / Supabase Edge Function rate limits on `/vto-generate` (e.g. max 5 try-ons / 10 mins).
  - [ ] Configure request debouncing on client to prevent accidental double-submits.

---

## 4. Mobile Platforms (iOS & Android)

- [ ] **App Store (iOS)**
  - [ ] Verify `bundleIdentifier: "com.aura.fashion"` in `app.json`.
  - [ ] Configure Apple Developer account and certificates.
  - [ ] Verify Info.plist permission strings for Camera and Photo Library.
  - [ ] Upload 1024x1024 App Store icon and iPad/iPhone screenshots.
- [ ] **Google Play Store (Android)**
  - [ ] Verify `package: "com.aura.fashion"` in `app.json`.
  - [ ] Generate release keystore and configure EAS Build credentials.
  - [ ] Prepare Google Play Store listing, feature graphics, and content rating questionnaire.
- [ ] **Deep Linking & Universal Links**
  - [ ] Configure Apple App Site Association (`AASA`) for `aura.app/look/*`.
  - [ ] Configure Android Asset Links for deep linking into public looks.

---

## 5. Pre-Launch Quality Gates

- [ ] `npm run ts:check` (0 TypeScript errors).
- [ ] `npm test` (All 19 test suites and 39 tests pass).
- [ ] `npx expo export --platform web` (All 40 static routes export cleanly).
- [ ] Test end-to-end user journey on physical iPhone and Android devices via EAS TestFlight / Internal Testing.
