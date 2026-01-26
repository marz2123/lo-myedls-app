import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scriptId, videoId, narrationText, style } = await req.json();

    if (!scriptId || !narrationText) {
      return new Response(
        JSON.stringify({ error: "Script ID and narration text are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Voice configuration based on style
    const voiceConfig: Record<string, { voice_id: string; speed: number }> = {
      professional: { voice_id: "CwhRBWXzGAHq8TQ4Fs17", speed: 1.0 }, // Roger
      calm: { voice_id: "EXAVITQu4vr4xnSDxMaL", speed: 0.95 }, // Sarah
      expert: { voice_id: "JBFqnCBsd6RMkjVDRZzb", speed: 1.0 }, // George
      friendly: { voice_id: "pFZP5JQG7iQjIQuC4Bku", speed: 1.05 } // Lily
    };

    const selectedVoice = voiceConfig[style] || voiceConfig.professional;

    // Check for ElevenLabs API key
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    let audioUrl: string | null = null;
    let duration = 0;

    if (ELEVENLABS_API_KEY) {
      try {
        // Generate audio using ElevenLabs
        const elevenLabsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.voice_id}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: narrationText,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                speed: selectedVoice.speed
              }
            }),
          }
        );

        if (elevenLabsResponse.ok) {
          const audioBlob = await elevenLabsResponse.blob();
          const audioBuffer = await audioBlob.arrayBuffer();
          
          // Upload to Supabase Storage
          const fileName = `autostory/${videoId}/narration.mp3`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("visit-audio")
            .upload(fileName, audioBuffer, {
              contentType: "audio/mpeg",
              upsert: true
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("visit-audio")
              .getPublicUrl(fileName);
            
            audioUrl = urlData.publicUrl;
            
            // Estimate duration (rough calculation: ~150 words per minute)
            const wordCount = narrationText.split(/\s+/).length;
            duration = Math.ceil((wordCount / 150) * 60);
          }
        }
      } catch (elevenLabsError) {
        console.warn("ElevenLabs audio generation failed:", elevenLabsError);
      }
    }

    // Update script with audio URL
    await supabase
      .from("autostory_scripts")
      .update({
        audio_url: audioUrl,
        duration_seconds: duration,
        status: audioUrl ? "narrated" : "ready"
      })
      .eq("id", scriptId);

    // Update video progress
    if (videoId) {
      await supabase
        .from("autostory_videos")
        .update({
          status: "generating_video",
          generation_progress: 70
        })
        .eq("id", videoId);
    }

    console.log("Audio generation completed:", { audioUrl, duration });

    return new Response(
      JSON.stringify({
        success: true,
        audioUrl,
        duration,
        message: audioUrl ? "Audio generated successfully" : "Audio generation skipped (no API key)"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-autostory-audio:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
