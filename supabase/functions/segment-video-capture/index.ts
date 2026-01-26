import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate basic coverage from segments if AI didn't return it
function generateBasicCoverage(segments: any[], projectContext: any) {
  const seenParties = new Map<string, { name: string; type: string; confidence: number }>();
  const seenLieux = new Map<string, { partie: string; name: string; confidence: number }>();
  const seenZones = new Map<string, { lieu: string; name: string; confidence: number }>();
  
  for (const seg of segments) {
    if (seg.partie && seg.lieu) {
      const partieKey = seg.lieu;
      if (!seenParties.has(partieKey) || seenParties.get(partieKey)!.confidence < seg.confidence) {
        seenParties.set(partieKey, { 
          name: seg.lieu, 
          type: seg.partie, 
          confidence: seg.confidence || 0.8 
        });
      }
      
      if (seg.endroit) {
        const lieuKey = `${seg.lieu}:${seg.endroit}`;
        if (!seenLieux.has(lieuKey) || seenLieux.get(lieuKey)!.confidence < seg.confidence) {
          seenLieux.set(lieuKey, {
            partie: seg.lieu,
            name: seg.endroit,
            confidence: seg.confidence || 0.8
          });
        }
      }
      
      if (seg.zone && seg.endroit) {
        const zoneKey = `${seg.endroit}:${seg.zone}`;
        if (!seenZones.has(zoneKey) || seenZones.get(zoneKey)!.confidence < seg.confidence) {
          seenZones.set(zoneKey, {
            lieu: seg.endroit,
            name: seg.zone,
            confidence: seg.confidence || 0.8
          });
        }
      }
    }
  }
  
  const expectedParties: any[] = [];
  const expectedZones: string[] = ['mur', 'sol', 'plafond', 'fenetre', 'porte', 'equipement'];
  
  (projectContext?.partiesCommunes || []).forEach((p: any) => {
    const name = typeof p === 'string' ? p : p.name || p;
    expectedParties.push({ name, type: 'commune' });
  });
  
  (projectContext?.partiesPrivatives || []).forEach((p: any) => {
    const name = typeof p === 'string' ? p : p.name || p;
    expectedParties.push({ name, type: 'privative' });
  });
  
  const parties = expectedParties.map(p => {
    const seen = seenParties.has(p.name);
    return {
      name: p.name,
      type: p.type,
      seen,
      confidence: seen ? seenParties.get(p.name)!.confidence : 0
    };
  });
  
  const lieux = Array.from(seenLieux.values()).map(l => ({
    partie: l.partie,
    name: l.name,
    seen: true,
    confidence: l.confidence
  }));
  
  const zones = Array.from(seenZones.values()).map(z => ({
    lieu: z.lieu,
    name: z.name,
    seen: true,
    confidence: z.confidence
  }));
  
  const totalExpected = Math.max(expectedParties.length, 1);
  const totalSeen = parties.filter(p => p.seen).length;
  const completionPercent = Math.round((totalSeen / totalExpected) * 100);
  
  return { parties, lieux, zones, completionPercent };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { videoUrl, audioBase64, projectContext, duration, sequenceId, projectId } = body;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client for database operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log('Processing video capture with Gemini');
    console.log('Duration:', duration, 'seconds');
    console.log('Sequence ID:', sequenceId);
    console.log('Project ID:', projectId);
    console.log('Video URL:', videoUrl);

    // If we have a sequenceId, this is a background processing request
    // We should NOT create multiple random sequences. We will:
    // - use the recorded audio (if provided) to extract location + problems
    // - update the parent visit_sequence (single row)
    // - create identified_problems linked to that location
    if (sequenceId && videoUrl) {
      console.log('Background processing mode - analyzing audio + updating single sequence');

      // Update status to processing
      await supabase
        .from('visit_sequences')
        .update({ status: 'processing' })
        .eq('id', sequenceId);

      const { data: parentSeq } = await supabase
        .from('visit_sequences')
        .select('user_id, project_id')
        .eq('id', sequenceId)
        .single();

      if (!parentSeq) {
        throw new Error('Parent sequence not found');
      }

      // Get property locations for this project (for matching)
      const { data: propertyLocations } = await supabase
        .from('property_locations')
        .select('id, name, location_type, part_id')
        .eq('project_id', parentSeq.project_id);

      // If we have no audio, we cannot extract the spoken location/problems.
      if (!audioBase64) {
        console.warn('Background mode: no audioBase64 provided, skipping AI extraction.');

        await supabase
          .from('visit_sequences')
          .update({
            status: 'completed',
            metadata: {
              no_audio: true,
              note: 'Audio not provided; kept single sequence without auto-splitting.'
            }
          })
          .eq('id', sequenceId);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'No audio provided; kept single sequence.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const lieuxContext = `
Parties/lieux disponibles: ${(propertyLocations || []).map((l: any) => l.name).join(', ') || 'Aucun'}
      `.trim();

      const systemPrompt = `Tu es un expert en transcription et extraction pour des états des lieux immobiliers en France.

MISSION: À partir d'un enregistrement audio d'un inspecteur filmant un bien immobilier:
1. TRANSCRIRE fidèlement tout ce qui est dit en français
2. DÉDUIRE la PIÈCE PRINCIPALE (endroit) visitée si elle est mentionnée (ex: \"chambre\", \"cuisine\").
3. EXTRAIRE les PROBLÈMES / actions à faire (peindre, remplacer, réparer...) SANS créer plusieurs segments si on reste dans la même pièce.

IMPORTANT:
- Ne crée un nouveau segment QUE si l'inspecteur dit clairement qu'il change de pièce/lieu.
- Dans une même pièce, regroupe les problèmes dans le même segment (liste dans problem).

Pour chaque segment détecté, extrais:
- partie: "commune" ou "privative" (si inconnu, null)
- lieu: lieu global si mentionné (ex: \"Appartement 201\")
- endroit: la pièce (ex: \"Chambre\")
- zone: optionnel (mur, sol, plafond, porte...)
- problem: une description claire des problèmes / travaux à faire (peut contenir plusieurs items)
- transcript: la transcription originale de ce segment
- startTime / endTime: estimation en secondes
- confidence: 0.0 à 1.0

CONTEXTE DU PROJET:
${lieuxContext}

RÉPONDS UNIQUEMENT en JSON valide (pas de markdown):
{
  "fullTranscript": "...",
  "segments": [
    {
      "startTime": 0,
      "endTime": ${duration || 60},
      "partie": "privative",
      "lieu": "Appartement ...",
      "endroit": "Chambre",
      "zone": null,
      "problem": "Reprendre peinture du mur. Remplacer la porte. Vérifier/remplacer le climatiseur.",
      "transcript": "...",
      "confidence": 0.9
    }
  ]
}`;

      console.log('Calling Gemini 2.5 Flash with audio (background mode)...');

      const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Transcris et extrais la pièce et les problèmes de cet enregistrement:' },
                {
                  type: 'input_audio',
                  input_audio: {
                    data: audioBase64,
                    format: 'webm'
                  }
                }
              ]
            }
          ],
        }),
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API error (background):', geminiResponse.status, errorText);

        await supabase
          .from('visit_sequences')
          .update({
            status: 'completed',
            metadata: {
              ai_error: true,
              ai_status: geminiResponse.status,
            }
          })
          .eq('id', sequenceId);

        return new Response(
          JSON.stringify({
            success: false,
            error: `AI error ${geminiResponse.status}`,
          }),
          { status: geminiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const geminiData = await geminiResponse.json();
      const content = geminiData.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Pas de réponse de l\'IA. L\'audio était peut-être inaudible.');
      }

      let parsed: any;
      try {
        let jsonStr = String(content).trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '').trim();
        }
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('JSON parse error (background):', parseError);
        parsed = {
          fullTranscript: String(content),
          segments: [
            {
              startTime: 0,
              endTime: duration || 60,
              partie: null,
              lieu: null,
              endroit: null,
              zone: null,
              problem: String(content).slice(0, 500),
              transcript: String(content),
              confidence: 0.3,
            }
          ],
        };
      }

      const segments = Array.isArray(parsed.segments) ? parsed.segments : [];
      const fullTranscript = parsed.fullTranscript || segments.map((s: any) => s.transcript).join(' ') || '';
      const coverage = parsed.coverage || generateBasicCoverage(segments, projectContext);

      // Try to match the primary location (piece)
      const primary = segments[0] || {};
      const hint = (primary.endroit || primary.lieu || '').toString().toLowerCase();
      const matchedLocation = (propertyLocations || []).find((l: any) =>
        hint && l?.name?.toLowerCase?.().includes(hint)
      );

      const matchedLocationId: string | null = matchedLocation?.id || null;

      // Update the parent sequence (single sequence)
      const descriptionParts: string[] = [];
      if (primary.endroit) descriptionParts.push(String(primary.endroit));
      if (primary.problem) descriptionParts.push(String(primary.problem));
      const nextDescription = descriptionParts.join(' — ').slice(0, 240) || 'Vidéo de visite EDL (transcrite)';

      await supabase
        .from('visit_sequences')
        .update({
          status: 'completed',
          location_id: matchedLocationId,
          location_confidence: primary.confidence ?? null,
          transcription: fullTranscript,
          description: nextDescription,
          metadata: {
            ai: {
              segments,
              coverage,
              extracted_at: new Date().toISOString(),
              model: 'google/gemini-2.5-flash'
            }
          }
        })
        .eq('id', sequenceId);

      // Create problems (still one sequence; problems stored separately)
      // Only insert problems if we successfully matched a location.
      if (!matchedLocationId) {
        console.warn('No location matched from audio; skipping identified_problems inserts');
      } else {
        for (const seg of segments) {
          const problemText = (seg?.problem || '').toString().trim();
          if (!problemText) continue;

          const zoneType = (seg?.zone || 'autre') as string;

          const { error: probErr } = await supabase
            .from('identified_problems')
            .insert({
              project_id: parentSeq.project_id,
              location_id: matchedLocationId,
              title: problemText.slice(0, 100),
              description: problemText,
              zone_type: zoneType,
              ai_detected: true,
              detection_confidence: seg?.confidence ?? null,
              video_timestamp_start: seg?.startTime ?? null,
              video_timestamp_end: seg?.endTime ?? null,
            });

          if (probErr) {
            console.error('Error inserting identified_problems:', probErr);
          }
        }
      }

      console.log('Background audio extraction complete (single sequence updated)');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Sequence updated with transcript and extracted problems',
          locationMatched: matchedLocation?.name || null,
          problemsCount: segments.filter((s: any) => (s?.problem || '').toString().trim()).length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Original audio-based processing flow
    if (!audioBase64) {
      console.error('No audio data provided');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Aucune donnée audio reçue. Assurez-vous que le micro est activé.',
          segments: [],
          fullTranscript: ''
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lieuxContext = `
Parties Communes disponibles: ${projectContext?.partiesCommunes?.map((p: any) => p.name || p).join(', ') || 'Aucune'}
Parties Privatives disponibles: ${projectContext?.partiesPrivatives?.map((p: any) => p.name || p).join(', ') || 'Aucune'}
    `.trim();

    const systemPrompt = `Tu es un expert en transcription et segmentation pour des états des lieux immobiliers en France.

MISSION: À partir d'un enregistrement audio d'un inspecteur filmant un bien immobilier:
1. TRANSCRIRE fidèlement tout ce qui est dit en français
2. SEGMENTER par zone/pièce visitée (chaque changement de lieu = nouveau segment)
3. EXTRAIRE les informations structurées
4. CALCULER la couverture de visite (quelles parties/lieux/zones ont été visitées)

Pour chaque segment détecté, extrais:
- partie: "commune" (façade, escalier, hall, toiture, parking) ou "privative" (appartement, logement, cave privée)
- lieu: le lieu spécifique mentionné (ex: "Appartement 201", "Cage A", "Façade rue")
- endroit: la pièce ou zone (ex: "Cuisine", "Séjour", "Chambre 1", "SDB")
- zone: l'élément précis observé (mur, sol, plafond, fenetre, porte, radiateur, prise, etc.)
- problem: description professionnelle du problème/observation
- transcript: la transcription originale de ce segment
- startTime: temps estimé de début (en secondes)
- endTime: temps estimé de fin (en secondes)  
- confidence: score de confiance (0.0 à 1.0)

CONTEXTE DU PROJET:
${lieuxContext}

DURÉE TOTALE: ${duration} secondes

INDICES DE CHANGEMENT DE SEGMENT:
- "maintenant", "on passe à", "ici c'est", "dans le/la", "je suis dans"
- Changement de numéro d'appartement
- Nouvelle pièce mentionnée

RÉPONDS UNIQUEMENT en JSON valide (pas de markdown):
{
  "fullTranscript": "transcription complète...",
  "segments": [
    {
      "startTime": 0,
      "endTime": 15,
      "partie": "privative",
      "lieu": "Appartement 201", 
      "endroit": "Cuisine",
      "zone": "mur",
      "problem": "Fissure horizontale de 50cm sur le mur côté fenêtre, probablement due à un mouvement de structure",
      "transcript": "On est dans la cuisine de l'appart 201...",
      "confidence": 0.9
    }
  ],
  "coverage": {
    "parties": [
      { "name": "Appartement 201", "type": "privative", "seen": true, "confidence": 0.9 }
    ],
    "lieux": [
      { "partie": "Appartement 201", "name": "Cuisine", "seen": true, "confidence": 0.9 }
    ],
    "zones": [
      { "lieu": "Cuisine", "name": "mur", "seen": true, "confidence": 0.9 },
      { "lieu": "Cuisine", "name": "sol", "seen": false, "confidence": 0 }
    ],
    "completionPercent": 45
  }
}`;

    console.log('Calling Gemini 2.5 Flash with audio...');
    
    const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt 
          },
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: 'Transcris et segmente cet enregistrement audio d\'inspection immobilière:'
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: audioBase64,
                  format: 'webm'
                }
              }
            ]
          }
        ],
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      
      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Trop de requêtes. Veuillez réessayer dans quelques secondes.',
            segments: [],
            fullTranscript: ''
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (geminiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Crédits Lovable AI épuisés. Veuillez recharger votre compte.',
            segments: [],
            fullTranscript: ''
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.choices?.[0]?.message?.content;
    
    console.log('Gemini response received, content length:', content?.length || 0);
    
    if (!content) {
      console.error('No content in Gemini response:', geminiData);
      throw new Error('Pas de réponse de l\'IA. L\'audio était peut-être inaudible.');
    }

    let parsed;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '').trim();
      }
      parsed = JSON.parse(jsonStr);
      console.log('Parsed successfully, segments:', parsed.segments?.length || 0);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw content:', content.slice(0, 500));
      
      const fullTranscript = content.replace(/[{}\[\]"]/g, '').trim();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          segments: [{
            startTime: 0,
            endTime: duration,
            partie: null,
            lieu: null,
            endroit: null,
            zone: null,
            problem: fullTranscript.slice(0, 500),
            transcript: fullTranscript,
            confidence: 0.3
          }],
          fullTranscript
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fullTranscript = parsed.fullTranscript || parsed.segments?.map((s: any) => s.transcript).join(' ') || '';
    console.log('Full transcript:', fullTranscript.slice(0, 200) + '...');
    
    const coverage = parsed.coverage || generateBasicCoverage(parsed.segments || [], projectContext);
    console.log('Coverage:', JSON.stringify(coverage).slice(0, 200) + '...');

    return new Response(
      JSON.stringify({ 
        success: true, 
        segments: parsed.segments || [],
        fullTranscript,
        coverage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in segment-video-capture:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        segments: [],
        fullTranscript: ''
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
