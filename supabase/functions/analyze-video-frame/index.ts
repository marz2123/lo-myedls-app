import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Les 28 familles de tâches MyHome
const FT_FAMILLES = [
  { code: 'FT01', label: 'Démolition - Dépose' },
  { code: 'FT02', label: 'Gros œuvre - Maçonnerie' },
  { code: 'FT03', label: 'Charpente - Couverture' },
  { code: 'FT04', label: 'Étanchéité' },
  { code: 'FT05', label: 'Façades - Ravalement' },
  { code: 'FT06', label: 'Menuiseries extérieures' },
  { code: 'FT07', label: 'Menuiseries intérieures' },
  { code: 'FT08', label: 'Cloisons - Doublages' },
  { code: 'FT09', label: 'Plâtrerie - Staff' },
  { code: 'FT10', label: 'Revêtements de sols' },
  { code: 'FT11', label: 'Revêtements muraux' },
  { code: 'FT12', label: 'Peinture - Finitions' },
  { code: 'FT13', label: 'Électricité' },
  { code: 'FT14', label: 'Plomberie - Sanitaires' },
  { code: 'FT15', label: 'Chauffage' },
  { code: 'FT16', label: 'Ventilation - Climatisation' },
  { code: 'FT17', label: 'Isolation thermique' },
  { code: 'FT18', label: 'Isolation acoustique' },
  { code: 'FT19', label: 'Serrurerie - Métallerie' },
  { code: 'FT20', label: 'Vitrerie - Miroiterie' },
  { code: 'FT21', label: 'Ascenseurs - Monte-charges' },
  { code: 'FT22', label: 'Équipements de cuisine' },
  { code: 'FT23', label: 'Aménagements extérieurs' },
  { code: 'FT24', label: 'VRD - Assainissement' },
  { code: 'FT25', label: 'Espaces verts' },
  { code: 'FT26', label: 'Sécurité incendie' },
  { code: 'FT27', label: 'Contrôle d\'accès - Interphonie' },
  { code: 'FT28', label: 'Nettoyage - Remise en état' }
];

// Technical elements to auto-detect for EDL
const TECHNICAL_ELEMENTS = [
  { type: 'compteur_electricite', label: 'Compteur électrique', icon: 'zap', ft_code: 'FT13' },
  { type: 'compteur_eau', label: 'Compteur d\'eau', icon: 'droplet', ft_code: 'FT14' },
  { type: 'compteur_gaz', label: 'Compteur de gaz', icon: 'flame', ft_code: 'FT15' },
  { type: 'tableau_electrique', label: 'Tableau électrique', icon: 'circuit-board', ft_code: 'FT13' },
  { type: 'vmc', label: 'VMC', icon: 'wind', ft_code: 'FT16' },
  { type: 'radiateur', label: 'Radiateur / Chauffage', icon: 'thermometer', ft_code: 'FT15' },
  { type: 'ballon_eau_chaude', label: 'Ballon d\'eau chaude', icon: 'container', ft_code: 'FT14' },
  { type: 'fenetre', label: 'Fenêtre', icon: 'square', ft_code: 'FT06' },
  { type: 'porte_exterieure', label: 'Porte extérieure', icon: 'door-open', ft_code: 'FT06' },
  { type: 'detecteur_fumee', label: 'Détecteur de fumée (DAAF)', icon: 'alert-circle', ft_code: 'FT26' },
  { type: 'chaudiere', label: 'Chaudière', icon: 'flame', ft_code: 'FT15' },
  { type: 'climatisation', label: 'Climatisation', icon: 'snowflake', ft_code: 'FT16' },
  { type: 'interphone', label: 'Interphone / Digicode', icon: 'phone', ft_code: 'FT27' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const { imageUrl, imageBase64, previousContext, timestamp, mode, context } = await req.json();
    
    const imageData = imageUrl || imageBase64;
    if (!imageData) {
      throw new Error('imageUrl or imageBase64 is required');
    }

    // Super Conducteur mode - fast analysis for real-time guidance
    if (mode === 'super-conducteur' && LOVABLE_API_KEY) {
      console.log('Super Conducteur mode - fast analysis with Gemini Flash');
      
      const superConducteurPrompt = `Analyse rapide d'inspection. Pièce: ${context?.piece || 'inconnue'}.

Réponds en JSON:
{
  "detectedZone": "mur|sol|plafond|ouvertures|equipements|null",
  "elements": [{"name": string, "condition": "bon|moyen|mauvais"}],
  "confidence": 0-1,
  "risks": [{"type": "structural|humidity|electrical|safety", "description": string, "severity": "low|medium|high|critical"}],
  "budgetImpact": {"isSignificant": bool, "description": string},
  "suggestion": "prochaine action en français (max 10 mots)"
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: superConducteurPrompt },
            { role: 'user', content: [{ type: 'image_url', image_url: { url: imageData } }] }
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
          return new Response(JSON.stringify({ success: true, ...result, model: 'gemini-flash' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch {
          return new Response(JSON.stringify({ success: true, detectedZone: null, confidence: 0.5 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Analyzing frame with OpenAI GPT-4.1 Vision at timestamp:', timestamp);

    // Prompt optimisé pour OpenAI GPT-4.1 Vision avec détection d'éléments techniques
    const technicalElementsPrompt = TECHNICAL_ELEMENTS.map(te => `   - ${te.type}: ${te.label}`).join('\n');
    
    const systemPrompt = `Tu es un expert en inspection immobilière et état des lieux (EDL).
Analyse cette image et identifie TOUS les éléments du bâtiment visibles.

IMPORTANT: Détecte spécifiquement les ÉLÉMENTS TECHNIQUES OBLIGATOIRES pour l'EDL:
${technicalElementsPrompt}

Pour CHAQUE élément détecté, fournis:
1. Le nom de l'élément
2. Son état: "bon", "moyen", "mauvais" ou "absent"
3. Sa classification dans l'une des 28 familles de tâches (FT):
${FT_FAMILLES.map(ft => `   - ${ft.code}: ${ft.label}`).join('\n')}

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "room_type": "type de pièce détecté (cuisine, salle de bain, chambre, séjour, couloir, hall, cage d'escalier, façade, etc.)",
  "elements": [
    {
      "name": "nom de l'élément",
      "etat": "bon|moyen|mauvais|absent",
      "ft_code": "FT01-FT28",
      "ft_label": "label de la famille",
      "description": "description courte de l'état observé",
      "defauts": ["liste des défauts si état != bon"]
    }
  ],
  "technical_elements": [
    {
      "type": "compteur_electricite|compteur_eau|compteur_gaz|tableau_electrique|vmc|radiateur|ballon_eau_chaude|fenetre|porte_exterieure|detecteur_fumee|chaudiere|climatisation|interphone",
      "label": "nom affiché",
      "confidence": 0.0-1.0,
      "state": "bon|moyen|mauvais|absent",
      "reading": "relevé du compteur si visible (optionnel)"
    }
  ],
  "materials": ["liste des matériaux détectés"],
  "pathologies": [
    {
      "type": "type de pathologie (fissure, humidité, moisissure, etc.)",
      "severity": "légère|moyenne|grave",
      "location": "localisation sur l'image",
      "ft_code": "famille de tâches concernée"
    }
  ],
  "general_state": "bon|moyen|mauvais",
  "transition_detected": true/false,
  "confidence_score": 0.0-1.0,
  "has_key_technical_element": true/false
}`;

    // Appel à OpenAI GPT-4.1 Vision
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
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
                text: `Analyse cette image capturée pendant une visite immobilière.
Contexte précédent: ${previousContext || 'Début de visite'}
Timestamp: ${timestamp || 0} secondes`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requêtes OpenAI atteinte, veuillez réessayer.');
      }
      if (response.status === 402 || response.status === 401) {
        throw new Error('Problème d\'authentification OpenAI.');
      }
      
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    console.log('GPT-4.1 Vision analysis completed');

    // Parser le JSON retourné
    let analysisResult;
    try {
      let jsonText = analysisText;
      
      // Nettoyer les marqueurs markdown
      if (jsonText.includes('```json')) {
        const match = jsonText.match(/```json\s*\n?([\s\S]*?)\n?```/);
        if (match) jsonText = match[1];
      } else if (jsonText.includes('```')) {
        const match = jsonText.match(/```\s*\n?([\s\S]*?)\n?```/);
        if (match) jsonText = match[1];
      }
      
      // Extraire le JSON
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonText = jsonMatch[0];
      
      analysisResult = JSON.parse(jsonText.trim());
      
      // Valider et enrichir les éléments avec les codes FT
      if (analysisResult.elements) {
        analysisResult.elements = analysisResult.elements.map((el: any) => {
          const ft = FT_FAMILLES.find(f => f.code === el.ft_code);
          return {
            ...el,
            ft_label: ft?.label || el.ft_label || 'Non classifié'
          };
        });
      }
      
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      analysisResult = {
        room_type: 'unknown',
        elements: [],
        materials: [],
        pathologies: [],
        general_state: 'unknown',
        transition_detected: false,
        confidence_score: 0.5,
        raw_analysis: analysisText
      };
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: analysisResult,
        timestamp,
        model: 'gpt-4.1-vision'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-video-frame:', error);
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
