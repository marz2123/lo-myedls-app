import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaxonomyRow {
  familyCode: string;
  familyName: string;
  categoryCode: string;
  categoryName: string;
  subcategoryCode: string;
  subcategoryName: string;
  taskCount?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Note: This function uses service role key, no user auth required
    // It's called internally by import-taxonomy which handles user auth
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { newTaxonomyData } = await req.json();

    // Fetch existing taxonomy data
    const { data: existingFamilies } = await supabase
      .from('task_families')
      .select('*');

    const { data: existingCategories } = await supabase
      .from('task_categories')
      .select('*, task_families(code, name)');

    const { data: existingSubcategories } = await supabase
      .from('task_subcategories')
      .select('*, task_categories(code, name, task_families(code, name))');

    // Build existing taxonomy structure
    const existingTaxonomy: TaxonomyRow[] = [];
    
    if (existingSubcategories) {
      for (const sub of existingSubcategories) {
        const category = sub.task_categories as any;
        const family = category?.task_families as any;
        
        if (family && category) {
          existingTaxonomy.push({
            familyCode: family.code,
            familyName: family.name,
            categoryCode: category.code,
            categoryName: category.name,
            subcategoryCode: sub.code,
            subcategoryName: sub.name,
            taskCount: sub.task_count?.toString() || '0'
          });
        }
      }
    }

    console.log(`Existing taxonomy: ${existingTaxonomy.length} entries`);
    console.log(`New taxonomy: ${newTaxonomyData.length} entries`);

    // Use AI to merge taxonomies intelligently
    const aiPrompt = `Tu es un expert en fusion de structures taxonomiques DSC (Descriptif Standard de Classification).

CONTEXTE:
- Structure DSC existante: ${existingTaxonomy.length} entrées
- Nouvelle structure DSC: ${newTaxonomyData.length} entrées

DONNÉES EXISTANTES (extrait):
${JSON.stringify(existingTaxonomy.slice(0, 50), null, 2)}

NOUVELLES DONNÉES (extrait):
${JSON.stringify(newTaxonomyData.slice(0, 50), null, 2)}

OBJECTIF:
Créer une structure DSC fusionnée qui:
1. Élimine tous les doublons (même code = doublon)
2. Conserve les libellés les plus descriptifs (évite "Poste XX", "Compléments XX")
3. Résout les incohérences de nommage
4. Préserve la hiérarchie Family -> Category -> Subcategory
5. Combine les taskCount intelligemment

RÈGLES DE FUSION:
- Si même code avec libellés différents: garde le plus descriptif
- Si "Poste XX" ou "Compléments XX" dans existant et libellé descriptif dans nouveau: utilise le nouveau
- Si taskCount différent pour même code: utilise le plus récent (nouveau)
- Conserve TOUS les codes uniques des deux structures

RÉPONSE ATTENDUE:
Retourne UNIQUEMENT un JSON valide (sans markdown):
{
  "mergedTaxonomy": [
    {
      "familyCode": "...",
      "familyName": "...",
      "categoryCode": "...",
      "categoryName": "...",
      "subcategoryCode": "...",
      "subcategoryName": "...",
      "taskCount": "..."
    }
  ],
  "stats": {
    "totalMerged": 0,
    "duplicatesRemoved": 0,
    "genericLabelsReplaced": 0,
    "inconsistenciesResolved": 0
  }
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 100000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    console.log('AI response received:', aiContent.substring(0, 200));

    // Parse AI response
    let mergeResult;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = aiContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      mergeResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
      throw new Error('Erreur de parsing de la réponse IA: ' + errorMessage);
    }

    console.log('Merge complete:', mergeResult.stats);

    return new Response(
      JSON.stringify({
        success: true,
        mergedTaxonomy: mergeResult.mergedTaxonomy,
        stats: mergeResult.stats
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in merge-taxonomy:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
