-- Add timezone column to myaladin_preferences table
ALTER TABLE public.myaladin_preferences
ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Paris';