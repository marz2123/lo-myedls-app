import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PappersEntrepriseData {
  siren?: string;
  siret?: string;
  denomination?: string;
  forme_juridique?: string;
  date_creation?: string;
  siege?: {
    adresse_ligne_1?: string;
    code_postal?: string;
    ville?: string;
  };
  dirigeants?: Array<{
    nom?: string;
    prenom?: string;
    fonction?: string;
  }>;
  activite?: string;
  code_naf?: string;
  capital_social?: number;
}

interface ProprietaireData {
  type?: string;
  nom?: string;
  prenom?: string;
  denomination?: string;
  siren?: string;
  siret?: string;
  date_acquisition?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  forme_juridique?: string;
  source?: string;
}

interface PappersImmobilierData {
  proprietaires?: ProprietaireData[];
  surface_cadastrale?: number;
  reference_cadastrale?: string;
  historique_parcelle?: Array<{
    date?: string;
    nature?: string;
    prix?: number;
  }>;
}

interface MAJICData {
  proprietaires_moraux?: Array<{
    denomination: string;
    siren?: string;
    type_personne_morale: string;
    droit_propriete: string;
  }>;
  source: 'majic';
}

interface AIOwnerEstimation {
  probable_owner_type: 'particulier' | 'sci' | 'fonciere' | 'copropriete' | 'collectivite' | 'inconnu';
  confidence: number;
  estimated_acquisition_year?: number;
  estimated_acquisition_price?: number;
  property_profile: string;
  market_context: string;
  reasoning: string;
  source: 'ai_estimation';
}

interface CadastreEnrichedData {
  section?: string;
  numero?: string;
  surface?: number;
  code_commune?: string;
  code_departement?: string;
  prefixe?: string;
  id_parcelle?: string;
  contenance?: number;
  arpente?: boolean;
  commune?: string;
  feuille?: string;
}

interface DVFEnrichedData {
  derniere_vente?: {
    date: string;
    prix: number;
    prix_m2: number;
    type_local?: string;
    nature_mutation?: string;
  };
  historique_ventes?: Array<{
    date: string;
    prix: number;
    surface: number;
    type_local?: string;
    nature_mutation?: string;
  }>;
  nb_transactions?: number;
  prix_moyen_m2?: number;
}

interface PropertyOwnerResponse {
  pappers_entreprise?: PappersEntrepriseData;
  pappers_immobilier?: PappersImmobilierData;
  majic_data?: MAJICData;
  dvf_data?: DVFEnrichedData;
  cadastre_data?: CadastreEnrichedData;
  ai_estimation?: AIOwnerEstimation;
  data_sources: string[];
  data_source: 'pappers' | 'majic' | 'cadastre_only' | 'mixed' | 'ai_estimation';
  last_updated: string;
  api_status: {
    pappers: 'success' | 'error' | 'no_key' | 'no_data';
    dvf: 'success' | 'error' | 'no_data';
    cadastre: 'success' | 'error' | 'no_data';
    majic: 'success' | 'error' | 'no_data';
    ai: 'success' | 'error' | 'no_data';
  };
}

// Fetch Pappers Entreprise data
async function fetchPappersEntreprise(siren: string, apiKey: string): Promise<PappersEntrepriseData | null> {
  try {
    console.log(`Fetching Pappers Entreprise for SIREN: ${siren}`);
    const response = await fetch(
      `https://api.pappers.fr/v2/entreprise?siren=${siren}&api_token=${apiKey}`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      console.log('Pappers Entreprise API error:', response.status, await response.text());
      return null;
    }
    
    const data = await response.json();
    return {
      siren: data.siren,
      siret: data.siege?.siret,
      denomination: data.denomination || data.nom_entreprise,
      forme_juridique: data.forme_juridique,
      date_creation: data.date_creation,
      siege: data.siege ? {
        adresse_ligne_1: data.siege.adresse_ligne_1,
        code_postal: data.siege.code_postal,
        ville: data.siege.ville,
      } : undefined,
      dirigeants: data.representants?.slice(0, 3).map((r: any) => ({
        nom: r.nom,
        prenom: r.prenom,
        fonction: r.qualite,
      })),
      activite: data.objet_social || data.libelle_code_naf,
      code_naf: data.code_naf,
      capital_social: data.capital,
    };
  } catch (error) {
    console.error('Error fetching Pappers Entreprise:', error);
    return null;
  }
}

// Fetch Pappers Immobilier data (requires Pappers Immobilier subscription)
async function fetchPappersImmobilier(
  lat: number, 
  lon: number, 
  address: string,
  apiKey: string
): Promise<PappersImmobilierData | null> {
  try {
    console.log(`Fetching Pappers Immobilier for: ${lat}, ${lon}`);
    
    // Try by coordinates first
    let response = await fetch(
      `https://api.pappers.fr/v2/immobilier/parcelle?latitude=${lat}&longitude=${lon}&api_token=${apiKey}`,
      { method: 'GET' }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Pappers Immobilier API error:', response.status, errorText);
      
      // If coordinates fail, try by address search
      if (response.status === 404 || response.status === 400) {
        console.log('Trying Pappers Immobilier by address search...');
        const encodedAddress = encodeURIComponent(address);
        response = await fetch(
          `https://api.pappers.fr/v2/immobilier/recherche?q=${encodedAddress}&api_token=${apiKey}`,
          { method: 'GET' }
        );
        
        if (!response.ok) {
          console.log('Pappers Immobilier address search also failed:', response.status);
          return null;
        }
      } else {
        return null;
      }
    }
    
    const data = await response.json();
    console.log('Pappers Immobilier response:', JSON.stringify(data).slice(0, 500));
    
    // Handle both parcelle and recherche response formats
    const parcelle = data.parcelle || data.parcelles?.[0] || data;
    
    return {
      proprietaires: parcelle.proprietaires?.map((p: any) => ({
        type: p.type_personne || (p.siren ? 'morale' : 'physique'),
        nom: p.type_personne === 'morale' 
          ? (p.denomination || p.nom_entreprise || p.nom) 
          : (p.nom || ''),
        prenom: p.prenom || '',
        denomination: p.denomination || p.nom_entreprise,
        siren: p.siren,
        siret: p.siret,
        date_acquisition: p.date_acte || p.date_acquisition || p.date_mutation,
        adresse: p.adresse || p.adresse_ligne_1,
        code_postal: p.code_postal,
        ville: p.ville,
        forme_juridique: p.forme_juridique,
        source: 'pappers',
      })),
      surface_cadastrale: parcelle.contenance || parcelle.surface,
      reference_cadastrale: parcelle.id_parcelle || parcelle.reference_cadastrale,
      historique_parcelle: parcelle.mutations?.map((m: any) => ({
        date: m.date_mutation,
        nature: m.nature_mutation,
        prix: m.valeur_fonciere,
      })),
    };
  } catch (error) {
    console.error('Error fetching Pappers Immobilier:', error);
    return null;
  }
}

// Fetch DVF data with multiple fallback APIs and progressive radius
async function fetchDVFData(lat: number, lon: number, codeInsee?: string): Promise<DVFEnrichedData | null> {
  const results: any[] = [];
  
  // Strategy 1: DVF Etalab API via bbox with progressive radius
  const radiuses = [0.002, 0.005, 0.01]; // ~200m, ~500m, ~1km
  
  for (const delta of radiuses) {
    if (results.length > 0) break;
    
    try {
      const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
      console.log(`Fetching DVF data with bbox radius ${Math.round(delta * 111)}km: ${bbox}`);
      const response = await fetch(
        `https://api.cquest.org/dvf?bbox=${bbox}&limit=20`,
        { signal: AbortSignal.timeout(10000) }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.resultats?.length > 0) {
          results.push(...data.resultats);
          console.log(`DVF API returned ${data.resultats.length} results at radius ${Math.round(delta * 111)}km`);
        }
      }
    } catch (error) {
      console.log('DVF bbox API error:', error);
    }
  }

  // Strategy 2: DVF via data.gouv API with code INSEE - take commune stats without proximity filter
  if (results.length === 0 && codeInsee) {
    try {
      console.log(`Trying DVF with code INSEE: ${codeInsee}`);
      const response = await fetch(
        `https://api.cquest.org/dvf?code_commune=${codeInsee}&limit=100`,
        { signal: AbortSignal.timeout(15000) }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.resultats?.length > 0) {
          // Take all results from the commune for market stats
          results.push(...data.resultats);
          console.log(`DVF INSEE API returned ${data.resultats.length} results for commune`);
        }
      }
    } catch (error) {
      console.log('DVF INSEE API error:', error);
    }
  }

  if (results.length === 0) {
    return null;
  }

  // Process results
  const ventes = results
    .filter((v: any) => v.valeur_fonciere && v.valeur_fonciere > 0)
    .sort((a: any, b: any) => new Date(b.date_mutation).getTime() - new Date(a.date_mutation).getTime());

  if (ventes.length === 0) return null;

  const derniereVente = ventes[0];
  const surface = derniereVente.surface_reelle_bati || derniereVente.surface_terrain || 1;
  
  // Calculate average price per m2
  const ventesAvecSurface = ventes.filter((v: any) => v.surface_reelle_bati > 0);
  const prixMoyenM2 = ventesAvecSurface.length > 0
    ? Math.round(ventesAvecSurface.reduce((sum: number, v: any) => sum + (v.valeur_fonciere / v.surface_reelle_bati), 0) / ventesAvecSurface.length)
    : null;

  return {
    derniere_vente: {
      date: derniereVente.date_mutation,
      prix: derniereVente.valeur_fonciere,
      prix_m2: Math.round(derniereVente.valeur_fonciere / surface),
      type_local: derniereVente.type_local,
      nature_mutation: derniereVente.nature_mutation,
    },
    historique_ventes: ventes.slice(0, 10).map((v: any) => ({
      date: v.date_mutation,
      prix: v.valeur_fonciere,
      surface: v.surface_reelle_bati || v.surface_terrain,
      type_local: v.type_local,
      nature_mutation: v.nature_mutation,
    })),
    nb_transactions: ventes.length,
    prix_moyen_m2: prixMoyenM2 || undefined,
  };
}

// Fetch enriched cadastre data from API Carto IGN
async function fetchCadastreData(lat: number, lon: number): Promise<CadastreEnrichedData | null> {
  try {
    console.log(`Fetching cadastre data for: ${lat}, ${lon}`);
    const geom = JSON.stringify({
      type: "Point",
      coordinates: [lon, lat]
    });
    
    const response = await fetch(
      `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(geom)}`,
      { signal: AbortSignal.timeout(15000) }
    );
    
    if (!response.ok) {
      console.log('Cadastre API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    if (!data.features || data.features.length === 0) {
      console.log('No cadastre parcelle found');
      return null;
    }
    
    const parcelle = data.features[0].properties;
    console.log('Cadastre parcelle found:', parcelle.id);
    
    return {
      section: parcelle.section,
      numero: parcelle.numero,
      surface: parcelle.contenance,
      code_commune: parcelle.code_dep + parcelle.code_com,
      code_departement: parcelle.code_dep,
      prefixe: parcelle.com_abs || parcelle.prefixe,
      id_parcelle: parcelle.id,
      contenance: parcelle.contenance,
      arpente: parcelle.arpente,
      commune: parcelle.nom_com,
      feuille: parcelle.feuille,
    };
  } catch (error) {
    console.error('Error fetching cadastre data:', error);
    return null;
  }
}

// Fetch MAJIC data for legal entities (personnes morales) from open data
async function fetchMAJICData(codeCommune: string, section?: string, numero?: string): Promise<MAJICData | null> {
  try {
    if (!codeCommune) {
      console.log('No code commune for MAJIC lookup');
      return null;
    }
    
    console.log(`Fetching MAJIC data for commune: ${codeCommune}, section: ${section}, numero: ${numero}`);
    
    // MAJIC data is available as open data files on data.gouv.fr
    // We'll query the files des locaux et parcelles des personnes morales
    // This is a simplified approach - in production you'd want a dedicated API or database
    
    const departement = codeCommune.substring(0, 2);
    
    // Try to fetch from MAJIC files API (if available)
    // Note: This is a placeholder - the actual MAJIC API requires specific setup
    // For now, return null and rely on other sources
    
    console.log('MAJIC direct API not available - would need data.gouv.fr files integration');
    return null;
    
  } catch (error) {
    console.error('Error fetching MAJIC data:', error);
    return null;
  }
}

// AI-powered owner estimation based on available data
async function generateAIOwnerEstimation(
  address: string,
  cadastreData: CadastreEnrichedData | null,
  dvfData: DVFEnrichedData | null,
  commune: string
): Promise<AIOwnerEstimation | null> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.log('LOVABLE_API_KEY not configured for AI estimation');
      return null;
    }

    console.log('Generating AI owner estimation...');

    const contextData = {
      address,
      commune,
      parcelle: cadastreData ? {
        section: cadastreData.section,
        numero: cadastreData.numero,
        surface: cadastreData.contenance || cadastreData.surface,
      } : null,
      transactions: dvfData ? {
        derniere_vente: dvfData.derniere_vente,
        nb_transactions: dvfData.nb_transactions,
        prix_moyen_m2: dvfData.prix_moyen_m2,
      } : null,
    };

    const prompt = `Analyse ces données immobilières et estime le profil propriétaire probable.

Données disponibles:
${JSON.stringify(contextData, null, 2)}

Réponds en JSON avec ce format exact:
{
  "probable_owner_type": "particulier" | "sci" | "fonciere" | "copropriete" | "collectivite" | "inconnu",
  "confidence": 0.1 à 1.0,
  "estimated_acquisition_year": année si transaction trouvée ou null,
  "estimated_acquisition_price": prix si transaction trouvée ou null,
  "property_profile": "description courte du type de bien (ex: Appartement centre-ville, Maison individuelle...)",
  "market_context": "contexte marché local basé sur prix/m2",
  "reasoning": "explication courte du raisonnement"
}

Indices pour déterminer le type:
- Prix > 500k€ ou surface > 200m² → probablement SCI ou foncière
- Centre-ville historique + petit appartement → souvent particulier
- Immeuble entier (surface > 500m²) → foncière ou copropriété
- Dépendances multiples → investisseur ou SCI`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un expert immobilier français. Réponds uniquement en JSON valide.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.log('AI API error:', response.status);
      return null;
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      console.log('No AI response content');
      return null;
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('Could not parse AI JSON response');
      return null;
    }

    const estimation = JSON.parse(jsonMatch[0]);
    console.log('AI estimation generated:', estimation.probable_owner_type, 'confidence:', estimation.confidence);

    return {
      ...estimation,
      source: 'ai_estimation',
    };
  } catch (error) {
    console.error('Error generating AI estimation:', error);
    return null;
  }
}

// Extract commune code from address using BAN API
async function getCodeInsee(address: string, lat: number, lon: number): Promise<string | null> {
  try {
    // Try reverse geocoding first (more accurate)
    const reverseResponse = await fetch(
      `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`,
      { signal: AbortSignal.timeout(5000) }
    );
    
    if (reverseResponse.ok) {
      const reverseData = await reverseResponse.json();
      if (reverseData.features?.[0]?.properties?.citycode) {
        return reverseData.features[0].properties.citycode;
      }
    }
    
    // Fallback to address search
    const searchResponse = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.features?.[0]?.properties?.citycode) {
        return searchData.features[0].properties.citycode;
      }
    }
    
    return null;
  } catch (error) {
    console.log('Error getting code INSEE:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, lat, lon, siren, codeInsee: providedCodeInsee } = await req.json();

    if (!address || lat === undefined || lon === undefined) {
      return new Response(
        JSON.stringify({ error: 'Address, lat and lon are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`=== Fetching property owner data for: ${address} (${lat}, ${lon}) ===`);

    const PAPPERS_API_KEY = Deno.env.get('PAPPERS_API_KEY');
    // Some keys can be short depending on environment/provider; presence is enough here.
    const hasPappersKey = Boolean(PAPPERS_API_KEY);
    
    console.log('Pappers API key configured:', hasPappersKey);

    // Get code INSEE if not provided
    const codeInsee = providedCodeInsee || await getCodeInsee(address, lat, lon);
    console.log('Code INSEE:', codeInsee);

    // Initialize API status
    const apiStatus: PropertyOwnerResponse['api_status'] = {
      pappers: hasPappersKey ? 'no_data' : 'no_key',
      dvf: 'no_data',
      cadastre: 'no_data',
      majic: 'no_data',
      ai: 'no_data',
    };

    // Fetch all data sources in parallel
    const [dvfData, cadastreData] = await Promise.all([
      fetchDVFData(lat, lon, codeInsee || undefined),
      fetchCadastreData(lat, lon),
    ]);

    // Update status
    if (dvfData) apiStatus.dvf = 'success';
    if (cadastreData) apiStatus.cadastre = 'success';

    let pappersEntreprise: PappersEntrepriseData | null = null;
    let pappersImmobilier: PappersImmobilierData | null = null;
    let majicData: MAJICData | null = null;
    const dataSources: string[] = [];

    // Try Pappers APIs if key is available
    if (hasPappersKey) {
      console.log('Attempting Pappers API calls...');
      
      const pappersPromises: Promise<any>[] = [
        fetchPappersImmobilier(lat, lon, address, PAPPERS_API_KEY!)
      ];
      
      if (siren) {
        pappersPromises.push(fetchPappersEntreprise(siren, PAPPERS_API_KEY!));
      }
      
      const pappersResults = await Promise.all(pappersPromises);
      
      pappersImmobilier = pappersResults[0];
      if (siren) {
        pappersEntreprise = pappersResults[1];
      }
      
      if (pappersImmobilier?.proprietaires?.length) {
        apiStatus.pappers = 'success';
        dataSources.push('Pappers Immobilier');
      } else if (pappersEntreprise) {
        apiStatus.pappers = 'success';
        dataSources.push('Pappers Entreprise');
      }
    }

    // Try MAJIC for legal entities if no Pappers data
    if (!pappersImmobilier?.proprietaires?.length && cadastreData?.code_commune) {
      majicData = await fetchMAJICData(
        cadastreData.code_commune,
        cadastreData.section,
        cadastreData.numero
      );
      
      if (majicData?.proprietaires_moraux?.length) {
        apiStatus.majic = 'success';
        dataSources.push('MAJIC (personnes morales)');
      }
    }

    // AI estimation when no owner data available
    let aiEstimation: AIOwnerEstimation | null = null;
    const hasOwnerData = !!(pappersImmobilier?.proprietaires?.length || majicData?.proprietaires_moraux?.length);
    
    if (!hasOwnerData) {
      aiEstimation = await generateAIOwnerEstimation(
        address,
        cadastreData,
        dvfData,
        cadastreData?.commune || ''
      );
      
      if (aiEstimation) {
        apiStatus.ai = 'success';
        dataSources.push('Estimation IA');
      }
    }

    // Add other data sources
    if (dvfData) dataSources.push('DVF');
    if (cadastreData) dataSources.push('Cadastre IGN');

    // Determine primary data source
    let dataSource: PropertyOwnerResponse['data_source'] = 'cadastre_only';
    if (pappersImmobilier?.proprietaires?.length || pappersEntreprise) {
      dataSource = 'pappers';
    } else if (majicData?.proprietaires_moraux?.length) {
      dataSource = 'majic';
    } else if (aiEstimation) {
      dataSource = 'ai_estimation';
    } else if (dataSources.length > 1) {
      dataSource = 'mixed';
    }

    const response: PropertyOwnerResponse = {
      pappers_entreprise: pappersEntreprise || undefined,
      pappers_immobilier: pappersImmobilier || undefined,
      majic_data: majicData || undefined,
      dvf_data: dvfData || undefined,
      cadastre_data: cadastreData || undefined,
      ai_estimation: aiEstimation || undefined,
      data_sources: dataSources,
      data_source: dataSource,
      last_updated: new Date().toISOString(),
      api_status: apiStatus,
    };

    console.log('=== Property owner response summary ===');
    console.log('Data sources:', dataSources);
    console.log('API status:', apiStatus);
    console.log('Has proprietaires:', hasOwnerData);
    console.log('Has AI estimation:', !!aiEstimation);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-property-owners:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
