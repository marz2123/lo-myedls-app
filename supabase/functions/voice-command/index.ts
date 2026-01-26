import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceCommand {
  type: 'navigation' | 'description' | 'anomaly' | 'task' | 'status' | 'validation' | 'query' | 'unknown';
  action: string;
  data?: Record<string, unknown>;
  confidence: number;
  originalText: string;
}

// Command patterns for French voice commands
const COMMAND_PATTERNS: Array<{
  pattern: RegExp;
  type: VoiceCommand['type'];
  action: string;
  extractor?: (match: RegExpMatchArray, text: string) => Record<string, unknown>;
}> = [
  // Navigation
  { pattern: /^(suivant|élément suivant|prochain|passer)$/i, type: 'navigation', action: 'next_element' },
  { pattern: /^(pièce suivante|prochaine pièce|changer de pièce)$/i, type: 'navigation', action: 'next_room' },
  { pattern: /^(retour|précédent|revenir)$/i, type: 'navigation', action: 'back' },
  { pattern: /^ouvr[ei]r? (la )?checklist$/i, type: 'navigation', action: 'open_checklist' },
  { pattern: /^ouvr[ei]r? (la )?capture$/i, type: 'navigation', action: 'open_capture' },
  { pattern: /^ouvr[ei]r? (le )?mode capture$/i, type: 'navigation', action: 'open_capture' },
  { pattern: /^(prendre|faire) (une )?photo$/i, type: 'navigation', action: 'take_photo' },
  
  // Status changes
  { pattern: /^état (bon|correct|ok)$/i, type: 'status', action: 'set_status', extractor: () => ({ status: 'bon' }) },
  { pattern: /^(bon état|c'est bon|rien à signaler)$/i, type: 'status', action: 'set_status', extractor: () => ({ status: 'bon' }) },
  { pattern: /^état moyen$/i, type: 'status', action: 'set_status', extractor: () => ({ status: 'moyen' }) },
  { pattern: /^(moyen|état d'usage|usure normale)$/i, type: 'status', action: 'set_status', extractor: () => ({ status: 'moyen' }) },
  { pattern: /^état (mauvais|dégradé)$/i, type: 'status', action: 'set_status', extractor: () => ({ status: 'mauvais' }) },
  { pattern: /^(mauvais état|à refaire|dégradé)$/i, type: 'status', action: 'set_status', extractor: () => ({ status: 'mauvais' }) },
  
  // Room validation
  { pattern: /^(valide|valider|terminer|terminé) (cette )?(pièce|la pièce)$/i, type: 'validation', action: 'validate_room' },
  { pattern: /^(terminé|fini|complété) (pour )?(cette|la) pièce$/i, type: 'validation', action: 'validate_room' },
  { pattern: /^(c'est bon|on passe|pièce complète)$/i, type: 'validation', action: 'validate_room' },
  
  // Descriptions
  { 
    pattern: /^(note|noter|ajouter? remarque|remarque|description|ajouter? description)\s*:?\s*(.+)$/i, 
    type: 'description', 
    action: 'add_description',
    extractor: (match) => ({ text: match[2]?.trim() })
  },
  
  // Anomalies
  { 
    pattern: /^(anomalie|défaut|problème|signale[r]?|signaler une?)\s*:?\s*(.+)$/i, 
    type: 'anomaly', 
    action: 'add_anomaly',
    extractor: (match) => ({ description: match[2]?.trim() })
  },
  { 
    pattern: /^(fuite|fissure|moisissure|humidité|cassé|brisé)(.*)$/i, 
    type: 'anomaly', 
    action: 'add_anomaly',
    extractor: (match, text) => ({ description: text, anomalyType: match[1] })
  },
  
  // Tasks
  { 
    pattern: /^(ajouter? (une )?tâche|créer? (une )?tâche|tâche)\s*:?\s*(.+)$/i, 
    type: 'task', 
    action: 'add_task',
    extractor: (match) => ({ title: match[4]?.trim() })
  },
  { 
    pattern: /^(à faire|travaux?)\s*:?\s*(.+)$/i, 
    type: 'task', 
    action: 'add_task',
    extractor: (match) => ({ title: match[2]?.trim() })
  },
  
  // Queries
  { pattern: /^(qu'est[- ]ce qu'il reste|que reste[- ]t[- ]il|quoi faire)(.*)$/i, type: 'query', action: 'show_remaining' },
  { pattern: /^(montre|affiche|voir)( les)? anomalies$/i, type: 'query', action: 'show_anomalies' },
  { pattern: /^(liste|montre|affiche)( les)? tâches( générées)?$/i, type: 'query', action: 'show_tasks' },
  { pattern: /^(qu'est[- ]ce qu'il manque|éléments manquants)$/i, type: 'query', action: 'show_missing' },
  
  // Auto-fill toggle
  { pattern: /^(active|activer|désactive|désactiver) (l')?auto[- ]?(fill|remplissage)$/i, type: 'navigation', action: 'toggle_autofill' },
];

function classifyCommand(text: string): VoiceCommand {
  const normalizedText = text.trim().toLowerCase()
    .replace(/[.,!?;:]+$/, '')
    .replace(/\s+/g, ' ');

  for (const { pattern, type, action, extractor } of COMMAND_PATTERNS) {
    const match = normalizedText.match(pattern);
    if (match) {
      return {
        type,
        action,
        data: extractor ? extractor(match, text) : undefined,
        confidence: 0.9,
        originalText: text
      };
    }
  }

  // If no pattern matched, try to classify based on keywords
  const lowerText = normalizedText;
  
  // Check for anomaly-related keywords
  if (/fissure|fuite|moisissure|cassé|abîmé|défaut|dégradé/.test(lowerText)) {
    return {
      type: 'anomaly',
      action: 'add_anomaly',
      data: { description: text },
      confidence: 0.7,
      originalText: text
    };
  }
  
  // Check for task-related keywords
  if (/remplacer|réparer|refaire|installer|changer|peindre|nettoyer/.test(lowerText)) {
    return {
      type: 'task',
      action: 'add_task',
      data: { title: text },
      confidence: 0.7,
      originalText: text
    };
  }

  // Default to description if it's a statement
  if (text.length > 10) {
    return {
      type: 'description',
      action: 'add_description',
      data: { text },
      confidence: 0.5,
      originalText: text
    };
  }

  return {
    type: 'unknown',
    action: 'unknown',
    confidence: 0,
    originalText: text
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, context } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    console.log('Classifying voice command:', text);

    const command = classifyCommand(text);
    
    console.log('Command classified:', command);

    // If confidence is low, use AI for disambiguation
    if (command.confidence < 0.6 && command.type !== 'unknown') {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      if (LOVABLE_API_KEY) {
        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                  content: `Tu es un assistant qui classifie les commandes vocales pour une application d'état des lieux (EDL).
                  Réponds uniquement avec un JSON valide contenant: type, action, data.
                  Types possibles: navigation, description, anomaly, task, status, validation, query.
                  Actions: next_element, next_room, back, open_checklist, open_capture, take_photo, set_status, validate_room, add_description, add_anomaly, add_task, show_remaining, show_anomalies, show_tasks, show_missing.`
                },
                {
                  role: 'user',
                  content: `Classifie cette commande vocale: "${text}"\nContexte: ${JSON.stringify(context || {})}`
                }
              ],
              temperature: 0.3,
              max_tokens: 200
            }),
          });

          if (aiResponse.ok) {
            const aiResult = await aiResponse.json();
            const aiContent = aiResult.choices?.[0]?.message?.content;
            
            if (aiContent) {
              try {
                const aiCommand = JSON.parse(aiContent);
                if (aiCommand.type && aiCommand.action) {
                  command.type = aiCommand.type;
                  command.action = aiCommand.action;
                  command.data = aiCommand.data || command.data;
                  command.confidence = 0.85;
                }
              } catch {
                // Keep original classification
              }
            }
          }
        } catch (aiError) {
          console.error('AI disambiguation failed:', aiError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        command
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in voice-command:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
