import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

// Clean transcription text
function cleanTranscription(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/euh+/gi, '')
    .replace(/hum+/gi, '')
    .replace(/ben+/gi, '')
    .replace(/bah+/gi, '')
    .replace(/alors,?\s*/gi, '')
    .replace(/donc,?\s*/gi, ' ')
    .replace(/voilà,?\s*/gi, '')
    .replace(/quoi,?\s*/gi, '')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

// Detect location from vocabulary
function detectLocation(text: string): { partie?: string; lieu?: string; endroit?: string; zone?: string } {
  const lowerText = text.toLowerCase();
  
  // Partie detection
  let partie: string | undefined;
  if (lowerText.includes('parties communes') || lowerText.includes('partie commune') || 
      lowerText.includes('hall') || lowerText.includes('escalier') || lowerText.includes('couloir commun')) {
    partie = 'Parties Communes';
  } else if (lowerText.includes('appartement') || lowerText.includes('appart') || 
             lowerText.includes('logement') || lowerText.includes('studio')) {
    partie = 'Parties Privatives';
  }
  
  // Lieu detection
  let lieu: string | undefined;
  const lieuPatterns: Record<string, RegExp[]> = {
    'Cuisine': [/cuisine/i, /coin cuisine/i],
    'Salon': [/salon/i, /séjour/i, /living/i, /pièce de vie/i],
    'Chambre': [/chambre/i, /chambre \d+/i],
    'Salle de bain': [/salle de bain/i, /sdb/i, /salle d'eau/i],
    'WC': [/wc/i, /toilettes?/i, /cabinet/i],
    'Entrée': [/entrée/i, /hall d'entrée/i, /vestibule/i],
    'Couloir': [/couloir/i, /dégagement/i],
    'Cave': [/cave/i, /sous-sol/i],
    'Garage': [/garage/i, /box/i, /parking/i],
    'Balcon': [/balcon/i, /terrasse/i, /loggia/i],
    'Buanderie': [/buanderie/i, /cellier/i],
    'Bureau': [/bureau/i],
  };
  
  for (const [name, patterns] of Object.entries(lieuPatterns)) {
    if (patterns.some(p => p.test(lowerText))) {
      lieu = name;
      break;
    }
  }
  
  // Zone detection
  let zone: string | undefined;
  const zonePatterns: Record<string, RegExp[]> = {
    'Mur': [/mur/i, /cloison/i, /paroi/i],
    'Sol': [/sol/i, /plancher/i, /parquet/i, /carrelage/i],
    'Plafond': [/plafond/i],
    'Fenêtre': [/fenêtre/i, /vitrage/i, /châssis/i],
    'Porte': [/porte/i, /huisserie/i],
    'Électricité': [/prise/i, /interrupteur/i, /électrique/i, /lumière/i],
    'Plomberie': [/robinet/i, /tuyau/i, /évacuation/i, /siphon/i],
    'Radiateur': [/radiateur/i, /chauffage/i],
    'Menuiserie': [/menuiserie/i, /placard/i, /rangement/i],
  };
  
  for (const [name, patterns] of Object.entries(zonePatterns)) {
    if (patterns.some(p => p.test(lowerText))) {
      zone = name;
      break;
    }
  }
  
  return { partie, lieu, zone };
}

// Detect potential anomalies
function detectAnomalies(text: string): Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> {
  const lowerText = text.toLowerCase();
  const anomalies: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];
  
  const anomalyPatterns: Array<{ pattern: RegExp; type: string; severity: 'low' | 'medium' | 'high' }> = [
    // High severity
    { pattern: /fissure|fissuré|lézarde/i, type: 'Fissure', severity: 'high' },
    { pattern: /fuite|fuit|dégât des eaux/i, type: 'Fuite', severity: 'high' },
    { pattern: /moisissure|moisi|champignon/i, type: 'Moisissure', severity: 'high' },
    { pattern: /effondrement|effondré|affaissement/i, type: 'Structure', severity: 'high' },
    { pattern: /danger|dangereux/i, type: 'Danger', severity: 'high' },
    
    // Medium severity
    { pattern: /humidité|humide|tache d'eau/i, type: 'Humidité', severity: 'medium' },
    { pattern: /défaut|défectueux/i, type: 'Défaut', severity: 'medium' },
    { pattern: /cassé|brisé|abîmé/i, type: 'Dégradation', severity: 'medium' },
    { pattern: /peinture écaillée|écaillé/i, type: 'Peinture', severity: 'medium' },
    { pattern: /ne fonctionne pas|marche pas|hs/i, type: 'Dysfonctionnement', severity: 'medium' },
    
    // Low severity
    { pattern: /usure|usé|vétuste/i, type: 'Usure', severity: 'low' },
    { pattern: /sale|saleté|nettoyage/i, type: 'Propreté', severity: 'low' },
    { pattern: /rayure|rayé/i, type: 'Rayure', severity: 'low' },
    { pattern: /jauni|jaunissement/i, type: 'Jaunissement', severity: 'low' },
  ];
  
  for (const { pattern, type, severity } of anomalyPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      // Extract context around the match
      const matchIndex = lowerText.indexOf(match[0]);
      const start = Math.max(0, matchIndex - 30);
      const end = Math.min(text.length, matchIndex + match[0].length + 50);
      const context = text.substring(start, end).trim();
      
      anomalies.push({
        type,
        description: context,
        severity
      });
    }
  }
  
  return anomalies;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { audio, language = 'fr', enhanceWithAI = false } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log('Processing audio transcription with OpenAI Whisper...');
    
    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Prepare form data for Whisper API
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('temperature', '0');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    // Call OpenAI Whisper API
    console.log('Calling OpenAI Whisper API...');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Whisper API error:', response.status, errorText);
      throw new Error(`Whisper API error: ${errorText}`);
    }

    const result = await response.json();
    console.log('Transcription completed successfully');

    const rawText = result.text || '';
    
    // Clean and enhance the transcription
    const textCleaned = cleanTranscription(rawText);
    const detectedLocation = detectLocation(rawText);
    const detectedAnomalies = detectAnomalies(rawText);

    console.log('Location detected:', detectedLocation);
    console.log('Anomalies detected:', detectedAnomalies.length);

    return new Response(
      JSON.stringify({ 
        success: true,
        text: rawText,
        text_cleaned: textCleaned,
        segments: result.segments || [],
        language: result.language || language,
        duration: result.duration,
        method: 'openai-whisper',
        // Enhanced fields
        partie: detectedLocation.partie,
        lieu: detectedLocation.lieu,
        endroit: detectedLocation.endroit,
        zone: detectedLocation.zone,
        anomalies: detectedAnomalies
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in transcribe-visit-audio:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
