import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valeurs autorisées pour zone_type
const ZONE_TYPES = [
  'mur', 'sol', 'plafond', 'cloison', 'facade', 'toiture', 'couverture',
  'menuiserie_ext', 'menuiserie_int', 'plomberie', 'electricite',
  'chauffage_clim', 'vmc_ventilation', 'structure', 'vrd_exterieurs', 'divers'
];

// Valeurs autorisées pour corps_metier
const CORPS_METIERS = [
  'gros_oeuvre', 'maconnerie', 'demolition_curetage', 'terrassement_vrd',
  'charpente_couverture', 'etancheite', 'facade_enduits_ite', 'bardage',
  'menuiserie_ext', 'menuiserie_int', 'serrurerie_metallerie',
  'isolation_doublages', 'cloisons_plaques', 'plafonds_suspendus',
  'plomberie_cvc', 'electricite_cf_cfa', 'chauffage_clim',
  'peinture_finitions', 'sols', 'amenagements_exterieurs', 'pilotage_coordination'
];

// Valeurs autorisées pour phase_chantier
const PHASES_CHANTIER = [
  'etudes', 'preparation_chantier', 'curetage_demolition', 'gros_oeuvre',
  'second_oeuvre', 'finitions', 'reception_levée_reserves', 'sav_garantie'
];

// Valeurs autorisées pour pieces_typiques
const PIECES_TYPIQUES = [
  'sejour', 'cuisine', 'chambre', 'sdb', 'wc', 'couloir', 'cellier',
  'balcon_terrasse', 'garage', 'cage_escalier', 'hall', 'local_technique',
  'combles', 'toiture_terrasse', 'parties_communes_generales', 'facade', 'exterieur'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { batchSize = 50, offset = 0 } = await req.json();

    // Fetch sous-categories to enrich (those without keywords_ia)
    const { data: sousCategories, error: scError } = await supabase
      .from('sc_sous_categories')
      .select('id, sc_code, sc_label, ft_code, ct_code')
      .is('keywords_ia', null)
      .range(offset, offset + batchSize - 1);

    if (scError) {
      throw new Error(`Erreur récupération SC: ${scError.message}`);
    }

    if (!sousCategories || sousCategories.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Aucune sous-catégorie à enrichir',
          processed: 0,
          remaining: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${sousCategories.length} sous-categories from offset ${offset}`);

    // Get related data for context
    const scCodes = sousCategories.map(sc => sc.sc_code);
    const { data: taches } = await supabase
      .from('t_taches')
      .select('t_label, description_detaillee, sc_code')
      .in('sc_code', scCodes)
      .limit(500);

    // Group taches by sc_code
    const tachesBySC = new Map<string, string[]>();
    taches?.forEach(t => {
      if (!tachesBySC.has(t.sc_code)) tachesBySC.set(t.sc_code, []);
      tachesBySC.get(t.sc_code)?.push(`${t.t_label}: ${t.description_detaillee || ''}`);
    });

    // Get familles and categories for context
    const ftCodes = [...new Set(sousCategories.map(sc => sc.ft_code))];
    const ctCodes = [...new Set(sousCategories.map(sc => sc.ct_code))];
    
    const { data: familles } = await supabase
      .from('ft_familles')
      .select('ft_code, ft_label')
      .in('ft_code', ftCodes);
    
    const { data: categories } = await supabase
      .from('ct_categories')
      .select('ct_code, ct_label')
      .in('ct_code', ctCodes);

    const familleMap = new Map(familles?.map(f => [f.ft_code, f.ft_label]) || []);
    const categorieMap = new Map(categories?.map(c => [c.ct_code, c.ct_label]) || []);

    // Prepare enrichment prompt
    const scDataForAI = sousCategories.map(sc => ({
      sc_code: sc.sc_code,
      sc_label: sc.sc_label,
      famille: familleMap.get(sc.ft_code) || '',
      categorie: categorieMap.get(sc.ct_code) || '',
      taches_exemples: (tachesBySC.get(sc.sc_code) || []).slice(0, 3)
    }));

    const prompt = `Tu es un expert BTP. Analyse ces sous-catégories de tâches chantier et génère des métadonnées pour chacune.

Pour chaque sous-catégorie, renvoie un objet JSON avec:
- zone_type: une valeur parmi ${JSON.stringify(ZONE_TYPES)}
- contexte: tableau parmi ["interieur", "exterieur", "parties_communes", "parties_privatives"]
- corps_metier: une valeur parmi ${JSON.stringify(CORPS_METIERS)}
- phase_chantier: une valeur parmi ${JSON.stringify(PHASES_CHANTIER)}
- pieces_typiques: tableau de 1-3 valeurs parmi ${JSON.stringify(PIECES_TYPIQUES)}
- keywords_ia: chaîne avec 5-10 mots/expressions parlées terrain (ex: "fissure mur, mur fissuré, lézarde")

Sous-catégories à analyser:
${JSON.stringify(scDataForAI, null, 2)}

Renvoie UNIQUEMENT un tableau JSON avec un objet par sous-catégorie, dans le même ordre.
Format: [{"sc_code": "...", "zone_type": "...", "contexte": [...], "corps_metier": "...", "phase_chantier": "...", "pieces_typiques": [...], "keywords_ia": "..."}]`;

    console.log('Calling AI for enrichment...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un expert BTP qui analyse des données de chantier. Réponds uniquement en JSON valide.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 8000
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI error:', errText);
      throw new Error(`Erreur AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let enrichedData: any[] = [];
    
    try {
      const content = aiData.choices[0].message.content;
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        enrichedData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr);
      throw new Error('Erreur parsing réponse AI');
    }

    console.log(`AI returned ${enrichedData.length} enrichments`);

    // Update sous-categories with enriched data
    let updated = 0;
    for (const enrichment of enrichedData) {
      if (!enrichment.sc_code) continue;

      const updateData: any = {};
      
      if (enrichment.zone_type && ZONE_TYPES.includes(enrichment.zone_type)) {
        updateData.zone_type = enrichment.zone_type;
      }
      if (enrichment.contexte && Array.isArray(enrichment.contexte)) {
        updateData.contexte = enrichment.contexte;
      }
      if (enrichment.corps_metier && CORPS_METIERS.includes(enrichment.corps_metier)) {
        updateData.corps_metier = enrichment.corps_metier;
      }
      if (enrichment.phase_chantier && PHASES_CHANTIER.includes(enrichment.phase_chantier)) {
        updateData.phase_chantier = enrichment.phase_chantier;
      }
      if (enrichment.pieces_typiques && Array.isArray(enrichment.pieces_typiques)) {
        updateData.pieces_typiques = enrichment.pieces_typiques.filter((p: string) => PIECES_TYPIQUES.includes(p));
      }
      if (enrichment.keywords_ia) {
        updateData.keywords_ia = enrichment.keywords_ia;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('sc_sous_categories')
          .update(updateData)
          .eq('sc_code', enrichment.sc_code);

        if (!updateError) updated++;
      }
    }

    // Count remaining
    const { count: remaining } = await supabase
      .from('sc_sous_categories')
      .select('id', { count: 'exact', head: true })
      .is('keywords_ia', null);

    console.log(`Updated ${updated} sous-categories, ${remaining} remaining`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: updated,
        remaining: remaining || 0,
        nextOffset: offset + batchSize
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('DSC enrichment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'enrichissement DSC';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
