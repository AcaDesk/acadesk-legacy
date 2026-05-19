-- Migration: Add total copies to textbooks for lending inventory tracking

ALTER TABLE public.textbooks
  ADD COLUMN IF NOT EXISTS total_copies integer NOT NULL DEFAULT 1;

ALTER TABLE public.textbooks
  DROP CONSTRAINT IF EXISTS textbooks_total_copies_check;

ALTER TABLE public.textbooks
  ADD CONSTRAINT textbooks_total_copies_check CHECK (total_copies >= 1);

