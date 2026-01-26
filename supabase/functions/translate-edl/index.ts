import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranslationRequest {
  edlId?: string;
  projectId?: string;
  sessionId?: string;
  sourceLanguage: string;
  targetLanguage: string;
  translationType: 'full' | 'summary' | 'tasks' | 'anomalies' | 'descriptions';
  content: {
    title?: string;
    summary?: string;
    descriptions?: string[];
    tasks?: Array<{ title: string; description?: string }>;
    anomalies?: Array<{ type: string; description: string }>;
    rooms?: Array<{ name: string; description?: string }>;
  };
}

const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'French',
  en: 'English',
  de: 'German',
  nl: 'Dutch',
  it: 'Italian',
  es: 'Spanish',
  pt: 'Portuguese',
  lb: 'Luxembourgish',
  ca: 'Catalan'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'Translation service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const request: TranslationRequest = await req.json();
    const { sourceLanguage, targetLanguage, translationType, content, edlId, projectId, sessionId } = request;

    console.log(`Translating EDL from ${sourceLanguage} to ${targetLanguage}, type: ${translationType}`);

    const sourceLang = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
    const targetLang = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

    // Build translation prompt based on type
    let contentToTranslate = '';
    
    switch (translationType) {
      case 'full':
        contentToTranslate = JSON.stringify(content, null, 2);
        break;
      case 'summary':
        contentToTranslate = content.summary || '';
        break;
      case 'tasks':
        contentToTranslate = JSON.stringify(content.tasks || [], null, 2);
        break;
      case 'anomalies':
        contentToTranslate = JSON.stringify(content.anomalies || [], null, 2);
        break;
      case 'descriptions':
        contentToTranslate = (content.descriptions || []).join('\n\n');
        break;
    }

    const systemPrompt = `You are a professional translator specializing in real estate and property inspection documents (EDL - État des Lieux).
Translate the following content from ${sourceLang} to ${targetLang}.

IMPORTANT RULES:
1. Maintain professional, formal tone appropriate for legal documents
2. Keep technical terms accurate (electrical, plumbing, construction vocabulary)
3. Preserve JSON structure if input is JSON
4. Do not add interpretations or explanations
5. Use standard terminology for the target country
6. Preserve any measurements, numbers, and dates exactly as written`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Translate this ${translationType} content:\n\n${contentToTranslate}` }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Translation API error:', errorText);
      return new Response(JSON.stringify({ error: 'Translation service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await response.json();
    const translatedText = aiData.choices?.[0]?.message?.content || '';

    // Parse translated content back to structured format if needed
    let translatedContent: any;
    
    if (translationType === 'full' || translationType === 'tasks' || translationType === 'anomalies') {
      try {
        // Try to extract JSON from the response
        const jsonMatch = translatedText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          translatedContent = JSON.parse(jsonMatch[0]);
        } else {
          translatedContent = translatedText;
        }
      } catch {
        translatedContent = translatedText;
      }
    } else {
      translatedContent = translatedText;
    }

    // Save translation
    const { data: translation, error: saveError } = await supabase
      .from('edl_translations')
      .insert({
        edl_id: edlId || null,
        project_id: projectId || null,
        session_id: sessionId || null,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        translation_type: translationType,
        original_content: content,
        translated_content: typeof translatedContent === 'string' 
          ? { text: translatedContent } 
          : translatedContent,
        translator_model: 'google/gemini-2.5-flash',
        user_id: user.id,
        metadata: {
          source_language_name: sourceLang,
          target_language_name: targetLang
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving translation:', saveError);
    }

    return new Response(JSON.stringify({
      success: true,
      translation_id: translation?.id,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      translation_type: translationType,
      translated_content: translatedContent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in translate-edl:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
