-- AutoStory EDL Engine tables

-- Main videos table
CREATE TABLE public.autostory_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  edl_id UUID REFERENCES public.edls(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  script_id UUID,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  resolution TEXT DEFAULT '1080p',
  format TEXT DEFAULT 'horizontal',
  style TEXT DEFAULT 'professional',
  music_track TEXT,
  status TEXT DEFAULT 'pending',
  generation_progress INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  chapters JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scripts table for AI-generated narration
CREATE TABLE public.autostory_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  edl_id UUID REFERENCES public.edls(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  sections JSONB DEFAULT '[]'::jsonb,
  narration_text TEXT,
  narration_style TEXT DEFAULT 'professional',
  voice_settings JSONB DEFAULT '{}'::jsonb,
  audio_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Video chapters for interactive timeline
CREATE TABLE public.autostory_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.autostory_videos(id) ON DELETE CASCADE,
  script_id UUID REFERENCES public.autostory_scripts(id) ON DELETE SET NULL,
  chapter_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time_seconds NUMERIC DEFAULT 0,
  end_time_seconds NUMERIC DEFAULT 0,
  chapter_type TEXT DEFAULT 'room',
  room_id UUID,
  zone_id UUID,
  anomaly_ids JSONB DEFAULT '[]'::jsonb,
  media_urls JSONB DEFAULT '[]'::jsonb,
  narration_segment TEXT,
  animations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Video shares for distribution
CREATE TABLE public.autostory_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.autostory_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  share_type TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  share_url TEXT,
  access_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for script_id in videos
ALTER TABLE public.autostory_videos 
ADD CONSTRAINT autostory_videos_script_id_fkey 
FOREIGN KEY (script_id) REFERENCES public.autostory_scripts(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.autostory_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autostory_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autostory_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autostory_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for autostory_videos
CREATE POLICY "Users can view their own videos" ON public.autostory_videos
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own videos" ON public.autostory_videos
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own videos" ON public.autostory_videos
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own videos" ON public.autostory_videos
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for autostory_scripts
CREATE POLICY "Users can view their own scripts" ON public.autostory_scripts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own scripts" ON public.autostory_scripts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own scripts" ON public.autostory_scripts
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own scripts" ON public.autostory_scripts
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for autostory_chapters
CREATE POLICY "Users can manage chapters via video" ON public.autostory_chapters
  FOR ALL USING (EXISTS (
    SELECT 1 FROM autostory_videos v WHERE v.id = autostory_chapters.video_id AND v.user_id = auth.uid()
  ));

-- RLS Policies for autostory_shares
CREATE POLICY "Users can manage their shares" ON public.autostory_shares
  FOR ALL USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_autostory_videos_project ON public.autostory_videos(project_id);
CREATE INDEX idx_autostory_videos_user ON public.autostory_videos(user_id);
CREATE INDEX idx_autostory_videos_status ON public.autostory_videos(status);
CREATE INDEX idx_autostory_scripts_project ON public.autostory_scripts(project_id);
CREATE INDEX idx_autostory_chapters_video ON public.autostory_chapters(video_id);
CREATE INDEX idx_autostory_shares_video ON public.autostory_shares(video_id);