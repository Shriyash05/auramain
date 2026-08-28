-- ============================================================
-- AURA — Production Migration: Research Contributor Program
-- Migration ID: 20260828000001_contributor_schema.sql
-- ============================================================

-- 1. Contributor Program Profiles
CREATE TABLE IF NOT EXISTS public.contributor_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_enrolled' CHECK (status IN ('not_enrolled', 'active', 'revoked')),
  consent_version TEXT NOT NULL DEFAULT 'AURA_RESEARCH_CONSENT_V1',
  consented_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  allowed_purposes TEXT[] NOT NULL DEFAULT ARRAY['garment_understanding_research', 'open_weight_training'],
  training_eligible BOOLEAN NOT NULL DEFAULT true,
  research_eligible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.contributor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contributor profile"
  ON public.contributor_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contributor profile"
  ON public.contributor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contributor profile"
  ON public.contributor_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Research Contributions
CREATE TABLE IF NOT EXISTS public.research_contributions (
  id TEXT PRIMARY KEY,
  contributor_sample_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_garment_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'sanitized', 'awaiting_review', 'approved', 'rejected', 'withdrawn')),
  consent_version TEXT NOT NULL DEFAULT 'AURA_RESEARCH_CONSENT_V1',
  difficulty TEXT NOT NULL DEFAULT 'normal' CHECK (difficulty IN ('easy', 'normal', 'hard', 'adversarial')),
  capture_context TEXT NOT NULL DEFAULT 'flat_lay' CHECK (capture_context IN ('studio', 'flat_lay', 'on_body', 'folded', 'wrinkled', 'ambient_light', 'low_light', 'occluded')),
  challenge_notes TEXT,
  sanitized_image_uri TEXT NOT NULL,
  submitted_labels JSONB NOT NULL,
  reviewed_labels JSONB,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  sanitized_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  reviewed_at TIMESTAMPTZ,
  reviewer_status TEXT CHECK (reviewer_status IN ('CORRECT', 'INCORRECT', 'AMBIGUOUS', 'UNKNOWN', 'REJECTED')),
  reviewer_notes TEXT,
  withdrawn_at TIMESTAMPTZ,
  dataset_version TEXT,
  license_status TEXT NOT NULL DEFAULT 'AURA_CONTRIBUTOR_OPT_IN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.research_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contributions"
  ON public.research_contributions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contributions"
  ON public.research_contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contributions"
  ON public.research_contributions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_research_contributions_user_id ON public.research_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_research_contributions_status ON public.research_contributions(status);
CREATE INDEX IF NOT EXISTS idx_research_contributions_sample_id ON public.research_contributions(contributor_sample_id);
