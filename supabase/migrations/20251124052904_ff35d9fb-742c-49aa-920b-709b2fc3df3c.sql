-- Add clock display mode column to myaladin_preferences table
ALTER TABLE public.myaladin_preferences
ADD COLUMN IF NOT EXISTS clock_display_mode text NOT NULL DEFAULT 'extended';