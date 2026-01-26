-- Add interface customization columns to myaladin_preferences table
ALTER TABLE public.myaladin_preferences
ADD COLUMN IF NOT EXISTS custom_logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '214 85% 35%',
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '25 95% 53%';