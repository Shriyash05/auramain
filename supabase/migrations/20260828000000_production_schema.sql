-- ============================================================
-- AURA PRODUCTION POSTGRESQL SCHEMA & ROW LEVEL SECURITY (RLS)
-- Migration: 20260828000000_production_schema.sql
-- Description: Complete production schema for AURA fashion engine
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'AURA Member',
  avatar_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_styles TEXT[] DEFAULT ARRAY[]::TEXT[],
  preferred_colors TEXT[] DEFAULT ARRAY[]::TEXT[],
  avoided_colors TEXT[] DEFAULT ARRAY[]::TEXT[],
  fit_preference TEXT DEFAULT 'Relaxed',
  budget_preference TEXT DEFAULT 'Contemporary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. GARMENTS TABLE
CREATE TABLE IF NOT EXISTS public.garments (
  id TEXT PRIMARY KEY DEFAULT ('garm_' || substr(md5(random()::text), 1, 10)),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tops', 'bottoms', 'outerwear', 'shoes', 'accessories')),
  original_image TEXT NOT NULL,
  processed_image TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  pattern TEXT,
  material TEXT,
  season TEXT[] DEFAULT ARRAY['All Season']::TEXT[],
  occasion TEXT[] DEFAULT ARRAY['Casual']::TEXT[],
  fit TEXT DEFAULT 'Regular',
  status TEXT DEFAULT 'active',
  wear_count INTEGER NOT NULL DEFAULT 0,
  last_worn TIMESTAMPTZ,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  user_verified BOOLEAN NOT NULL DEFAULT TRUE,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. OUTFITS TABLE
CREATE TABLE IF NOT EXISTS public.outfits (
  id TEXT PRIMARY KEY DEFAULT ('outfit_' || substr(md5(random()::text), 1, 10)),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('user_created', 'aura_stylist', 'inspiration', 'creator_shoot')),
  garment_ids TEXT[] NOT NULL,
  occasion TEXT DEFAULT 'Casual',
  vibe TEXT,
  notes TEXT,
  worn_count INTEGER NOT NULL DEFAULT 0,
  last_worn TIMESTAMPTZ,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. FEEDBACK EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.feedback_events (
  id TEXT PRIMARY KEY DEFAULT ('fb_' || substr(md5(random()::text), 1, 10)),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outfit_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('like', 'dislike', 'save', 'wear', 'reject', 'substitute', 'publish')),
  garment_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  context JSONB DEFAULT '{}'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. WEAR LOGS TABLE
CREATE TABLE IF NOT EXISTS public.wear_logs (
  id TEXT PRIMARY KEY DEFAULT ('wear_' || substr(md5(random()::text), 1, 10)),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outfit_id TEXT REFERENCES public.outfits(id) ON DELETE SET NULL,
  garment_ids TEXT[] NOT NULL,
  occasion TEXT DEFAULT 'Casual',
  weather TEXT,
  worn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PLANNED EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.planned_events (
  id TEXT PRIMARY KEY DEFAULT ('evt_' || substr(md5(random()::text), 1, 10)),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  time_of_day TEXT DEFAULT 'afternoon',
  occasion TEXT NOT NULL DEFAULT 'Casual',
  location TEXT,
  outfit_id TEXT REFERENCES public.outfits(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INSPIRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.inspirations (
  id TEXT PRIMARY KEY DEFAULT ('insp_' || substr(md5(random()::text), 1, 10)),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pinterest', 'instagram', 'gallery', 'camera', 'creator_feed')),
  title TEXT,
  detected_aesthetic TEXT,
  detected_pieces JSONB NOT NULL DEFAULT '[]'::JSONB,
  color_palette TEXT[] DEFAULT ARRAY[]::TEXT[],
  formality_score NUMERIC DEFAULT 0.5,
  silhouette_profile TEXT,
  aura_match_outfit_id TEXT,
  match_confidence NUMERIC DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. CREATOR SHOOTS TABLE
CREATE TABLE IF NOT EXISTS public.shoots (
  id TEXT PRIMARY KEY DEFAULT ('shoot_' || substr(md5(random()::text), 1, 10)),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  concept TEXT NOT NULL,
  mood TEXT,
  occasion TEXT,
  shoot_date DATE,
  location TEXT,
  inspiration_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  garment_capsule_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  look_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. SHOOT LOOKS TABLE
CREATE TABLE IF NOT EXISTS public.shoot_looks (
  id TEXT PRIMARY KEY DEFAULT ('slook_' || substr(md5(random()::text), 1, 10)),
  shoot_id TEXT NOT NULL REFERENCES public.shoots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outfit_id TEXT REFERENCES public.outfits(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'selected', 'ready', 'shot', 'published', 'archived')),
  final_photo_url TEXT,
  tagged_garment_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. LOOKBOOKS TABLE
CREATE TABLE IF NOT EXISTS public.lookbooks (
  id TEXT PRIMARY KEY DEFAULT ('lb_' || substr(md5(random()::text), 1, 10)),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  shoot_look_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SHAREABLE LOOKS (PUBLIC LOOK PAGES)
CREATE TABLE IF NOT EXISTS public.shareable_looks (
  id TEXT PRIMARY KEY DEFAULT ('publook_' || substr(md5(random()::text), 1, 10)),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shoot_look_id TEXT,
  public_share_id TEXT NOT NULL UNIQUE,
  creator_handle TEXT NOT NULL,
  creator_display_name TEXT NOT NULL,
  title TEXT NOT NULL,
  caption TEXT,
  photo_url TEXT NOT NULL,
  tagged_garments JSONB NOT NULL DEFAULT '[]'::JSONB,
  view_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. VTO SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.vto_sessions (
  id TEXT PRIMARY KEY DEFAULT ('vto_' || substr(md5(random()::text), 1, 10)),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outfit_id TEXT NOT NULL,
  model_photo_url TEXT NOT NULL,
  generated_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('idle', 'preparing', 'processing', 'generating', 'completed', 'failed')),
  error_message TEXT,
  execution_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_garments_user_id ON public.garments(user_id);
CREATE INDEX IF NOT EXISTS idx_outfits_user_id ON public.outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback_events(user_id);
CREATE INDEX IF NOT EXISTS idx_wear_logs_user_id ON public.wear_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_shoots_user_id ON public.shoots(user_id);
CREATE INDEX IF NOT EXISTS idx_shoot_looks_shoot_id ON public.shoot_looks(shoot_id);
CREATE INDEX IF NOT EXISTS idx_shareable_looks_public_id ON public.shareable_looks(public_share_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wear_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspirations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoot_looks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shareable_looks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vto_sessions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Garments RLS
CREATE POLICY "Users can manage own garments" ON public.garments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Outfits RLS
CREATE POLICY "Users can manage own outfits" ON public.outfits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Feedback Events RLS
CREATE POLICY "Users can manage own feedback" ON public.feedback_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Wear Logs RLS
CREATE POLICY "Users can manage own wear logs" ON public.wear_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Planned Events RLS
CREATE POLICY "Users can manage own planner events" ON public.planned_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Inspirations RLS
CREATE POLICY "Users can manage own inspirations" ON public.inspirations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Shoots RLS
CREATE POLICY "Users can manage own shoots" ON public.shoots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. Shoot Looks RLS
CREATE POLICY "Users can manage own shoot looks" ON public.shoot_looks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. Lookbooks RLS
CREATE POLICY "Users can manage own lookbooks" ON public.lookbooks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 11. Shareable Looks RLS (Deliberate Public vs Private Policy)
CREATE POLICY "Public read for published shareable looks" ON public.shareable_looks
  FOR SELECT USING (is_published = TRUE OR auth.uid() = user_id);

CREATE POLICY "Owners can manage own shareable looks" ON public.shareable_looks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 12. VTO Sessions RLS (Strict Private Policy)
CREATE POLICY "Users can manage own VTO sessions" ON public.vto_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS CONFIGURATION (METADATA REFERENCE)
-- ============================================================
-- Buckets to provision in Supabase Storage dashboard:
-- 1. garments_original (Private, authenticated user read/write)
-- 2. garments_processed (Private, authenticated user read/write)
-- 3. user_model_photos (Private, authenticated user read/write)
-- 4. inspiration_images (Private, authenticated user read/write)
-- 5. creator_photos (Private, authenticated user read/write)
-- 6. public_look_photos (Public read, authenticated user write)
