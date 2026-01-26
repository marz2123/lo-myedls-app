// AutoStory EDL Types

export interface AutoStoryVideo {
  id: string;
  project_id?: string;
  edl_id?: string;
  user_id: string;
  title: string;
  description?: string;
  script_id?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds: number;
  resolution: VideoResolution;
  format: VideoFormat;
  style: NarrationStyle;
  music_track?: string;
  status: VideoStatus;
  generation_progress: number;
  metadata: Record<string, any>;
  chapters: AutoStoryChapter[];
  created_at: string;
  updated_at: string;
}

export interface AutoStoryScript {
  id: string;
  project_id?: string;
  edl_id?: string;
  user_id: string;
  title: string;
  sections: ScriptSection[];
  narration_text?: string;
  narration_style: NarrationStyle;
  voice_settings: VoiceSettings;
  audio_url?: string;
  duration_seconds: number;
  word_count: number;
  status: ScriptStatus;
  ai_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AutoStoryChapter {
  id: string;
  video_id: string;
  script_id?: string;
  chapter_index: number;
  title: string;
  description?: string;
  start_time_seconds: number;
  end_time_seconds: number;
  chapter_type: ChapterType;
  room_id?: string;
  zone_id?: string;
  anomaly_ids: string[];
  media_urls: string[];
  narration_segment?: string;
  animations: ChapterAnimations;
  created_at: string;
}

export interface AutoStoryShare {
  id: string;
  video_id: string;
  user_id: string;
  share_type: ShareType;
  recipient_email?: string;
  recipient_phone?: string;
  share_url?: string;
  access_token?: string;
  expires_at?: string;
  view_count: number;
  last_viewed_at?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ScriptSection {
  id: string;
  type: SectionType;
  title: string;
  content: string;
  room_id?: string;
  zone_id?: string;
  anomalies?: string[];
  media_urls?: string[];
  duration_estimate: number;
  order: number;
}

export interface VoiceSettings {
  voice_id?: string;
  speed: number;
  pitch: number;
  language: string;
}

export interface ChapterAnimations {
  transition_in?: AnimationType;
  transition_out?: AnimationType;
  zoom_targets?: ZoomTarget[];
  highlights?: Highlight[];
  parallax?: boolean;
}

export interface ZoomTarget {
  timestamp: number;
  x: number;
  y: number;
  scale: number;
  duration: number;
}

export interface Highlight {
  timestamp: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  duration: number;
}

export type VideoResolution = '720p' | '1080p' | '4k';
export type VideoFormat = 'horizontal' | 'vertical' | 'square';
export type NarrationStyle = 'professional' | 'calm' | 'expert' | 'friendly';
export type VideoStatus = 'pending' | 'generating_script' | 'generating_audio' | 'generating_video' | 'completed' | 'error';
export type ScriptStatus = 'draft' | 'generating' | 'ready' | 'narrated' | 'error';
export type ChapterType = 'intro' | 'room' | 'zone' | 'anomaly' | 'comparison' | 'energy' | 'audio' | 'summary' | 'outro';
export type SectionType = 'intro' | 'room_overview' | 'anomaly_detail' | 'comparison' | 'energy_summary' | 'audio_analysis' | 'conclusion';
export type ShareType = 'email' | 'sms' | 'whatsapp' | 'link' | 'download';
export type AnimationType = 'fade' | 'slide' | 'zoom' | 'blur' | 'parallax';

export const NARRATION_STYLES: Record<NarrationStyle, { label: string; description: string }> = {
  professional: { label: 'Professionnel', description: 'Ton formel et précis' },
  calm: { label: 'Calme', description: 'Ton neutre et posé' },
  expert: { label: 'Expert bâtiment', description: 'Ton technique et détaillé' },
  friendly: { label: 'Convivial', description: 'Ton accessible et chaleureux' }
};

export const VIDEO_FORMATS: Record<VideoFormat, { label: string; aspectRatio: string; icon: string }> = {
  horizontal: { label: 'Horizontal (16:9)', aspectRatio: '16/9', icon: 'Monitor' },
  vertical: { label: 'Vertical (9:16)', aspectRatio: '9/16', icon: 'Smartphone' },
  square: { label: 'Carré (1:1)', aspectRatio: '1/1', icon: 'Square' }
};

export const VIDEO_RESOLUTIONS: Record<VideoResolution, { label: string; dimensions: string }> = {
  '720p': { label: 'HD (720p)', dimensions: '1280x720' },
  '1080p': { label: 'Full HD (1080p)', dimensions: '1920x1080' },
  '4k': { label: '4K Ultra HD', dimensions: '3840x2160' }
};
