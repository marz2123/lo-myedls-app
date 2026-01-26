import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DataGap {
  field: string;
  category: string;
  description: string;
  currentValue: any;
}

interface AlternativeSource {
  name: string;
  url: string;
  method: 'GET' | 'POST';
  params?: Record<string, string>;
  headers?: Record<string, string>;
  responseParser: string; // JSONPath-like expression
  confidence: number;
}

// Known alternative APIs for French property data
const ALTERNATIVE_SOURCES: Record<string, AlternativeSource[]> = {
  'altitude': [
    {
      name: 'OpenTopoData SRTM',
      url: 'https://api.opentopodata.org/v1/srtm30m',
      method: 'GET',
      responseParser: 'results[0].elevation',
      confidence: 0.9
    },
    {
      name: 'OpenTopoData EU-DEM',
      url: 'https://api.opentopodata.org/v1/eudem25m',
      method: 'GET',
      responseParser: 'results[0].elevation',
      confidence: 0.85
    }
  ],
  'streetImages': [
    {
      name: 'Panoramax IGN',
      url: 'https://api.panoramax.xyz/api/search',
      method: 'GET',
      responseParser: 'features',
      confidence: 0.95
    },
    {
      name: 'KartaView',
      url: 'https://api.openstreetcam.org/2.0/photo',
      method: 'GET',
      responseParser: 'result.data',
      confidence: 0.8
    },
    {
      name: 'Wikimedia Commons Geo',
      url: 'https://commons.wikimedia.org/w/api.php',
      method: 'GET',
      responseParser: 'query.geosearch',
      confidence: 0.7
    }
  ],
  'buildingInfo': [
    {
      name: 'BDNB Open',
      url: 'https://api-open.bdnb.io/v1/bdnb/donnees/batiment_groupe_complet',
      method: 'GET',
      responseParser: 'data',
      confidence: 0.95
    },
    {
      name: 'OpenStreetMap Overpass Buildings',
      url: 'https://overpass-api.de/api/interpreter',
      method: 'POST',
      responseParser: 'elements',
      confidence: 0.8
    }
  ],
  'cadastre': [
    {
      name: 'API Carto IGN Cadastre',
      url: 'https://apicarto.ign.fr/api/cadastre/parcelle',
      method: 'GET',
      responseParser: 'features',
      confidence: 0.95
    },
    {
      name: 'cadastre.data.gouv.fr',
      url: 'https://cadastre.data.gouv.fr/bundler/cadastre-etalab/communes',
      method: 'GET',
      responseParser: 'data',
      confidence: 0.85
    }
  ],
  'risks': [
    {
      name: 'Géorisques API',
      url: 'https://georisques.gouv.fr/api/v1/gaspar/risques',
      method: 'GET',
      responseParser: 'data',
      confidence: 0.95
    }
  ],
  'climate': [
    {
      name: 'Open-Meteo Current',
      url: 'https://api.open-meteo.com/v1/forecast',
      method: 'GET',
      responseParser: 'current_weather',
      confidence: 0.95
    },
    {
      name: 'Open-Meteo Climate History',
      url: 'https://archive-api.open-meteo.com/v1/archive',
      method: 'GET',
      responseParser: 'daily',
      confidence: 0.9
    }
  ],
  'urbanisme': [
    {
      name: 'GPU Urbanisme IGN',
      url: 'https://apicarto.ign.fr/api/gpu/document',
      method: 'GET',
      responseParser: 'features',
      confidence: 0.95
    },
    {
      name: 'GPU Zone Urbanisme',
      url: 'https://apicarto.ign.fr/api/gpu/zone-urba',
      method: 'GET',
      responseParser: 'features',
      confidence: 0.9
    }
  ],
  'transactions': [
    {
      name: 'DVF Etalab',
      url: 'https://api.cquest.org/dvf',
      method: 'GET',
      responseParser: 'resultats',
      confidence: 0.95
    },
    {
      name: 'DVF data.gouv',
      url: 'https://files.data.gouv.fr/geo-dvf/latest/csv',
      method: 'GET',
      responseParser: 'data',
      confidence: 0.85
    }
  ],
  'neighborhood': [
    {
      name: 'OpenStreetMap Overpass POIs',
      url: 'https://overpass-api.de/api/interpreter',
      method: 'POST',
      responseParser: 'elements',
      confidence: 0.9
    }
  ],
  'aerialImages': [
    {
      name: 'IGN Orthophotos WMS',
      url: 'https://wxs.ign.fr/essentiels/geoportail/wmts',
      method: 'GET',
      responseParser: 'tiles',
      confidence: 0.95
    },
    {
      name: 'OpenAerialMap',
      url: 'https://api.openaerialmap.org/meta',
      method: 'GET',
      responseParser: 'results',
      confidence: 0.8
    }
  ],
  'owners': [
    {
      name: 'Pappers Entreprises',
      url: 'https://api.pappers.fr/v2/entreprise',
      method: 'GET',
      responseParser: 'data',
      confidence: 0.95
    }
  ]
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gaps, latitude, longitude, address, codeInsee, existingData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`🔍 Smart Data Filler: Analyzing ${gaps?.length || 0} data gaps`);

    const filledData: Record<string, any> = {};
    const sourcesUsed: Array<{ field: string; source: string; success: boolean }> = [];
    const aiSuggestions: string[] = [];

    // Process each gap in parallel for speed
    const gapPromises = (gaps || []).map(async (gap: DataGap) => {
      console.log(`📊 Processing gap: ${gap.field} (${gap.category})`);
      
      const alternatives = ALTERNATIVE_SOURCES[gap.category] || [];
      let filled = false;
      let filledResult: any = null;
      const gapSourcesUsed: Array<{ field: string; source: string; success: boolean }> = [];

      // Try known alternatives
      for (const alt of alternatives) {
        if (filled) break;
        
        try {
          let url = alt.url;
          let fetchOptions: RequestInit = {
            method: alt.method,
            headers: { 'Accept': 'application/json', ...(alt.headers || {}) }
          };
          
          // Build URL/body with params based on category
          if (gap.category === 'altitude') {
            url = `${alt.url}?locations=${latitude},${longitude}`;
          } else if (gap.category === 'streetImages') {
            if (alt.name.includes('Panoramax')) {
              url = `${alt.url}?lat=${latitude}&lon=${longitude}&radius=200&limit=10`;
            } else if (alt.name.includes('KartaView')) {
              url = `${alt.url}/?bbTopLeft=${latitude + 0.002},${longitude - 0.002}&bbBottomRight=${latitude - 0.002},${longitude + 0.002}&limit=10`;
            } else if (alt.name.includes('Wikimedia')) {
              url = `${alt.url}?action=query&list=geosearch&gscoord=${latitude}|${longitude}&gsradius=500&gslimit=20&format=json&origin=*`;
            }
          } else if (gap.category === 'climate') {
            if (alt.name.includes('Current')) {
              url = `${alt.url}?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=Europe/Paris`;
            } else {
              const endDate = new Date().toISOString().split('T')[0];
              const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              url = `${alt.url}?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum`;
            }
          } else if (gap.category === 'transactions') {
            url = `${alt.url}?lat=${latitude}&lon=${longitude}&dist=1000`;
          } else if (gap.category === 'cadastre') {
            url = `${alt.url}?geom={"type":"Point","coordinates":[${longitude},${latitude}]}`;
          } else if (gap.category === 'risks' && codeInsee) {
            url = `${alt.url}?code_insee=${codeInsee}&rayon=1000`;
          } else if (gap.category === 'urbanisme') {
            url = `${alt.url}?geom={"type":"Point","coordinates":[${longitude},${latitude}]}`;
          } else if (gap.category === 'buildingInfo') {
            if (alt.name.includes('BDNB')) {
              url = `${alt.url}?code_departement_insee=${codeInsee?.substring(0, 2) || ''}&distance=${longitude},${latitude},100`;
            } else if (alt.name.includes('Overpass')) {
              const radius = 50;
              const overpassQuery = `[out:json][timeout:25];way["building"](around:${radius},${latitude},${longitude});out body;>;out skel qt;`;
              fetchOptions.method = 'POST';
              fetchOptions.body = `data=${encodeURIComponent(overpassQuery)}`;
              fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
            }
          } else if (gap.category === 'neighborhood') {
            // Special Overpass query for POIs
            const radius = 1000;
            const overpassQuery = `[out:json][timeout:25];(node["amenity"~"bus_station|train_station|subway_entrance|parking"](around:${radius},${latitude},${longitude});node["shop"](around:${radius},${latitude},${longitude});node["leisure"](around:${radius},${latitude},${longitude});node["amenity"~"school|college|university|kindergarten"](around:${radius},${latitude},${longitude});node["amenity"~"hospital|clinic|pharmacy|doctors"](around:${radius},${latitude},${longitude});node["amenity"~"townhall|post_office|police|fire_station|bank"](around:${radius},${latitude},${longitude}););out body;`;
            fetchOptions.method = 'POST';
            fetchOptions.body = `data=${encodeURIComponent(overpassQuery)}`;
            fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
          } else if (gap.category === 'aerialImages') {
            if (alt.name.includes('OpenAerialMap')) {
              url = `${alt.url}?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&limit=5`;
            }
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          fetchOptions.signal = controller.signal;
          
          const response = await fetch(url, fetchOptions);
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            
            // Parse response based on category
            let parsedData = data;
            
            // Special parsing for neighborhood POIs
            if (gap.category === 'neighborhood' && data.elements) {
              const elements = data.elements || [];
              parsedData = {
                amenities: {
                  transport: { count: elements.filter((e: any) => e.tags?.amenity?.match(/bus_station|train_station|subway_entrance|parking/) || e.tags?.public_transport).length, items: [] },
                  commerce: { count: elements.filter((e: any) => e.tags?.shop).length, items: [] },
                  loisirs: { count: elements.filter((e: any) => e.tags?.leisure).length, items: [] },
                  education: { count: elements.filter((e: any) => e.tags?.amenity?.match(/school|college|university|kindergarten/)).length, items: [] },
                  sante: { count: elements.filter((e: any) => e.tags?.amenity?.match(/hospital|clinic|pharmacy|doctors/)).length, items: [] },
                  services: { count: elements.filter((e: any) => e.tags?.amenity?.match(/townhall|post_office|police|fire_station|bank/)).length, items: [] }
                },
                rawElements: elements.length
              };
            }
            
            // Special parsing for altitude
            if (gap.category === 'altitude' && data.results?.[0]?.elevation) {
              parsedData = { altitude: data.results[0].elevation };
            }

            // Special parsing for building info from Overpass
            if (gap.category === 'buildingInfo' && data.elements?.length > 0) {
              const building = data.elements.find((e: any) => e.tags?.building);
              if (building) {
                parsedData = {
                  buildingType: building.tags?.building || 'yes',
                  buildingLevels: parseInt(building.tags?.['building:levels']) || null,
                  buildingYear: building.tags?.start_date || null,
                  buildingMaterial: building.tags?.['building:material'] || null,
                  buildingRoof: building.tags?.['roof:shape'] || null
                };
              }
            }
            
            // Check if data is not empty
            const hasData = parsedData && (
              (Array.isArray(parsedData) && parsedData.length > 0) ||
              (typeof parsedData === 'object' && Object.keys(parsedData).length > 0)
            );

            if (hasData) {
              filledResult = {
                data: parsedData,
                source: alt.name,
                confidence: alt.confidence,
                fetchedAt: new Date().toISOString()
              };
              gapSourcesUsed.push({ field: gap.field, source: alt.name, success: true });
              filled = true;
              console.log(`✅ Filled ${gap.field} from ${alt.name}`);
            }
          }
        } catch (error) {
          console.log(`⚠️ Failed to fetch from ${alt.name}: ${error}`);
          gapSourcesUsed.push({ field: gap.field, source: alt.name, success: false });
        }
      }

      // If still not filled, ask AI for suggestions
      if (!filled) {
        console.log(`🤖 Asking AI for alternative sources for ${gap.field}`);
        
        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: `Tu es un expert en APIs françaises de données immobilières et géographiques. Suggère des APIs alternatives gratuites. Réponds uniquement en JSON: {"suggestions": [{"name": "Nom", "url": "URL", "description": "Description"}], "fallbackStrategy": "Stratégie"}`
                },
                {
                  role: "user",
                  content: `Champ manquant: "${gap.field}" (${gap.category}) pour ${address} (${latitude}, ${longitude}). APIs échouées: ${alternatives.map((a: AlternativeSource) => a.name).join(', ')}`
                }
              ],
              temperature: 0.3,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content || "";
            try {
              const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
              const suggestions = JSON.parse(jsonMatch[1] || content);
              if (suggestions.suggestions?.length > 0) {
                filledResult = { aiSuggestions: suggestions.suggestions, source: 'AI Suggestions', confidence: 0.5, fetchedAt: new Date().toISOString() };
              }
            } catch { /* ignore parse errors */ }
          }
        } catch (aiError) {
          console.log(`AI suggestion request failed: ${aiError}`);
        }
      }

      return { gap, filled, filledResult, gapSourcesUsed };
    });

    // Wait for all gaps to be processed
    const results = await Promise.all(gapPromises);
    
    // Collect results
    for (const result of results) {
      if (result.filledResult) {
        filledData[result.gap.field] = result.filledResult;
        if (result.filledResult.aiSuggestions) {
          aiSuggestions.push(...result.filledResult.aiSuggestions.map((s: any) => 
            `${result.gap.field}: ${s.name} - ${s.description}`
          ));
        }
      }
      sourcesUsed.push(...result.gapSourcesUsed);
    }

    // Generate learning data for future improvements
    const learningData = {
      timestamp: new Date().toISOString(),
      location: { latitude, longitude, address, codeInsee },
      gapsAnalyzed: gaps?.length || 0,
      gapsFilled: Object.keys(filledData).filter(k => !k.includes('_suggestions') && !k.includes('_fallback')).length,
      sourcesUsed,
      successRate: sourcesUsed.length > 0 
        ? sourcesUsed.filter(s => s.success).length / sourcesUsed.length 
        : 0
    };

    console.log(`📈 Learning data: ${JSON.stringify(learningData)}`);

    return new Response(JSON.stringify({
      success: true,
      filledData,
      sourcesUsed,
      aiSuggestions,
      learningData,
      message: `Rempli ${Object.keys(filledData).filter(k => !k.includes('_')).length}/${gaps?.length || 0} champs manquants`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in smart-data-filler:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
