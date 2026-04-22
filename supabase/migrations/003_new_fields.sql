-- ============================================================
-- SAAS GPC — Innolive
-- Migration 003 : Nouveaux champs projets + profils clients
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PROJETS : catégorie, couleur accent, code court, budget, progression, tags
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS category    text CHECK (category IN ('creation', 'publicite', 'communication', 'acquisition')),
  ADD COLUMN IF NOT EXISTS color       text DEFAULT '#1E5FFF',
  ADD COLUMN IF NOT EXISTS code        text,
  ADD COLUMN IF NOT EXISTS budget      numeric(12, 2),
  ADD COLUMN IF NOT EXISTS progress    integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  ADD COLUMN IF NOT EXISTS tags        text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lead_id     uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- ──────────────────────────────────────────────────────────
-- UTILISATEURS (clients) : secteur, ville, MRR, portail activé, contacts
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sector          text,
  ADD COLUMN IF NOT EXISTS city            text,
  ADD COLUMN IF NOT EXISTS mrr             numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS portal_enabled  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_email   text,
  ADD COLUMN IF NOT EXISTS contact_phone   text;
