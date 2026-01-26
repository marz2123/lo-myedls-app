import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  AutoStoryVideo, 
  AutoStoryScript, 
  AutoStoryChapter,
  VideoFormat,
  VideoResolution,
  NarrationStyle
} from '@/types/autostory';

interface GenerateOptions {
  projectId: string;
  edlId?: string;
  title: string;
  format?: VideoFormat;
  resolution?: VideoResolution;
  style?: NarrationStyle;
  musicTrack?: string;
}

export function useAutoStory(projectId?: string) {
  const [videos, setVideos] = useState<AutoStoryVideo[]>([]);
  const [scripts, setScripts] = useState<AutoStoryScript[]>([]);
  const [currentVideo, setCurrentVideo] = useState<AutoStoryVideo | null>(null);
  const [currentScript, setCurrentScript] = useState<AutoStoryScript | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const { toast } = useToast();

  const fetchVideos = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('autostory_videos')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos((data || []) as unknown as AutoStoryVideo[]);
    } catch (error) {
      console.error('Error fetching AutoStory videos:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les vidéos AutoStory',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  const fetchScripts = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const { data, error } = await supabase
        .from('autostory_scripts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScripts((data || []) as unknown as AutoStoryScript[]);
    } catch (error) {
      console.error('Error fetching AutoStory scripts:', error);
    }
  }, [projectId]);

  const generateScript = useCallback(async (options: GenerateOptions): Promise<AutoStoryScript | null> => {
    setIsGenerating(true);
    setGenerationProgress(10);

    try {
      // Call edge function to generate script
      const { data, error } = await supabase.functions.invoke('generate-autostory-script', {
        body: {
          projectId: options.projectId,
          edlId: options.edlId,
          title: options.title,
          style: options.style || 'professional'
        }
      });

      if (error) throw error;

      setGenerationProgress(50);

      // Save script to database
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: scriptData, error: insertError } = await supabase
        .from('autostory_scripts')
        .insert({
          project_id: options.projectId,
          edl_id: options.edlId,
          user_id: user.user.id,
          title: options.title,
          sections: data.sections,
          narration_text: data.narrationText,
          narration_style: options.style || 'professional',
          word_count: data.wordCount || 0,
          status: 'ready'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setGenerationProgress(100);
      toast({
        title: 'Script généré',
        description: 'Le script de narration a été créé avec succès'
      });

      return scriptData as unknown as AutoStoryScript;
    } catch (error) {
      console.error('Error generating script:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le script',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  const generateVideo = useCallback(async (options: GenerateOptions): Promise<AutoStoryVideo | null> => {
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Step 1: Generate script
      setGenerationProgress(10);
      const script = await generateScript(options);
      if (!script) throw new Error('Failed to generate script');

      // Step 2: Create video record
      setGenerationProgress(30);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: videoData, error: videoError } = await supabase
        .from('autostory_videos')
        .insert({
          project_id: options.projectId,
          edl_id: options.edlId,
          user_id: user.user.id,
          title: options.title,
          script_id: script.id,
          format: options.format || 'horizontal',
          resolution: options.resolution || '1080p',
          style: options.style || 'professional',
          music_track: options.musicTrack,
          status: 'generating_audio'
        })
        .select()
        .single();

      if (videoError) throw videoError;

      // Step 3: Generate audio narration (via edge function)
      setGenerationProgress(50);
      const { data: audioData, error: audioError } = await supabase.functions.invoke('generate-autostory-audio', {
        body: {
          scriptId: script.id,
          videoId: videoData.id,
          narrationText: script.narration_text,
          style: options.style || 'professional'
        }
      });

      if (audioError) {
        console.warn('Audio generation skipped:', audioError);
      }

      // Step 4: Update video status
      setGenerationProgress(80);
      const { data: updatedVideo, error: updateError } = await supabase
        .from('autostory_videos')
        .update({
          status: 'completed',
          generation_progress: 100,
          duration_seconds: audioData?.duration || script.duration_seconds || 120
        })
        .eq('id', videoData.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setGenerationProgress(100);
      toast({
        title: 'Vidéo AutoStory créée',
        description: 'Votre film EDL est prêt à être visionné'
      });

      setCurrentVideo(updatedVideo as unknown as AutoStoryVideo);
      return updatedVideo as unknown as AutoStoryVideo;
    } catch (error) {
      console.error('Error generating video:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer la vidéo AutoStory',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [generateScript, toast]);

  const shareVideo = useCallback(async (
    videoId: string, 
    shareType: 'email' | 'sms' | 'whatsapp' | 'link',
    recipient?: string
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const accessToken = crypto.randomUUID();
      const shareUrl = `${window.location.origin}/autostory/view/${videoId}?token=${accessToken}`;

      const { data, error } = await supabase
        .from('autostory_shares')
        .insert({
          video_id: videoId,
          user_id: user.user.id,
          share_type: shareType,
          recipient_email: shareType === 'email' ? recipient : null,
          recipient_phone: ['sms', 'whatsapp'].includes(shareType) ? recipient : null,
          share_url: shareUrl,
          access_token: accessToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .select()
        .single();

      if (error) throw error;

      // Handle share action based on type
      switch (shareType) {
        case 'whatsapp':
          window.open(`https://wa.me/${recipient}?text=Voici mon EDL AutoStory: ${shareUrl}`, '_blank');
          break;
        case 'email':
          window.location.href = `mailto:${recipient}?subject=EDL AutoStory&body=Voici mon EDL AutoStory: ${shareUrl}`;
          break;
        case 'sms':
          window.location.href = `sms:${recipient}?body=Voici mon EDL AutoStory: ${shareUrl}`;
          break;
        case 'link':
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: 'Lien copié',
            description: 'Le lien de partage a été copié dans le presse-papiers'
          });
          break;
      }

      return data;
    } catch (error) {
      console.error('Error sharing video:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de partager la vidéo',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);

  const deleteVideo = useCallback(async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('autostory_videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      setVideos(prev => prev.filter(v => v.id !== videoId));
      toast({
        title: 'Vidéo supprimée',
        description: 'La vidéo AutoStory a été supprimée'
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la vidéo',
        variant: 'destructive'
      });
    }
  }, [toast]);

  return {
    videos,
    scripts,
    currentVideo,
    currentScript,
    isLoading,
    isGenerating,
    generationProgress,
    fetchVideos,
    fetchScripts,
    generateScript,
    generateVideo,
    shareVideo,
    deleteVideo,
    setCurrentVideo,
    setCurrentScript
  };
}
