import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();
    console.log('Analyzing project structure for:', projectId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('address, postal_code, city, property_type, number_of_units, project_documents, additional_info')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Project fetch error:', projectError);
      throw new Error('Projet introuvable');
    }

    console.log('Project data:', { 
      address: project.address, 
      type: project.property_type,
      units: project.number_of_units,
      documentsCount: project.project_documents?.length || 0 
    });

    // Prepare context for AI
    let documentContext = '';
    if (project.project_documents && Array.isArray(project.project_documents)) {
      documentContext = `Documents disponibles:\n`;
      project.project_documents.forEach((doc: any) => {
        documentContext += `- ${doc.name} (${doc.type})\n`;
      });
    }

    const systemPrompt = `Tu es un expert en analyse immobilière et en structure de bâtiments. Ta mission est d'analyser les informations d'un projet immobilier et de suggérer une composition détaillée et réaliste du bâtiment.

Règles importantes:
- Propose des suggestions RÉALISTES et PERTINENTES basées sur le type de bien, l'adresse et les documents disponibles
- Pour un immeuble, suggère des éléments typiques: hall d'entrée, escaliers, ascenseur, local poubelles, local vélos, etc.
- Pour les appartements, base-toi sur le nombre de logements indiqué
- Pour les caves/parkings, propose des numéros cohérents
- Utilise la nomenclature française standard
- Sois précis et concret (ex: "Hall d'entrée principal" plutôt que "Entrée")`;

    const userPrompt = `Analyse ce projet immobilier et suggère une composition de bâtiment détaillée:

Type de bien: ${project.property_type}
Adresse: ${project.address}, ${project.postal_code || ''} ${project.city || ''}
Nombre de logements: ${project.number_of_units || 'Non spécifié'}
${documentContext}
Informations complémentaires: ${project.additional_info || 'Aucune'}

IMPORTANT: Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte (pas de markdown, pas de texte avant/après):
{
  "commonAreas": ["suggestion1", "suggestion2"],
  "apartments": ["suggestion1", "suggestion2"],
  "basements": ["suggestion1", "suggestion2"],
  "parking": ["suggestion1", "suggestion2"],
  "gardens": ["suggestion1", "suggestion2"],
  "others": ["suggestion1", "suggestion2"]
}

Adapte les suggestions selon le type de bien:
- Pour un immeuble: propose des parties communes, appartements numérotés, caves, parkings
- Pour une maison: focus sur jardins, garage, cave si applicable
- Pour un appartement: focus sur parties communes de l'immeuble
- Pour un local commercial: propose des zones spécifiques (réserve, bureau, vitrine, etc.)`;

    console.log('Calling Lovable AI...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`Erreur API IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');
    
    const content = aiData.choices[0].message.content;
    console.log('AI content:', content.substring(0, 200));

    // Parse JSON from AI response (handle markdown code blocks)
    let suggestions;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      suggestions = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Content to parse:', content);
      throw new Error('Format de réponse IA invalide');
    }

    // Validate structure
    const requiredKeys = ['commonAreas', 'apartments', 'basements', 'parking', 'gardens', 'others'];
    const isValid = requiredKeys.every(key => Array.isArray(suggestions[key]));
    
    if (!isValid) {
      console.error('Invalid suggestion structure:', suggestions);
      throw new Error('Structure de suggestions invalide');
    }

    console.log('Suggestions generated successfully:', {
      commonAreas: suggestions.commonAreas.length,
      apartments: suggestions.apartments.length,
      basements: suggestions.basements.length,
      parking: suggestions.parking.length,
      gardens: suggestions.gardens.length,
      others: suggestions.others.length,
    });

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-building-structure:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
