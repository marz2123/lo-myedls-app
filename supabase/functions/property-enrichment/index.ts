import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface EnrichmentRequest {
  address?: string;
  latitude?: number;
  longitude?: number;
  projectId?: string;
  refresh?: boolean;
}

interface SourceStatus {
  ban: 'OK' | 'ERROR';
  altitude: 'OK' | 'ERROR' | 'SKIPPED';
  cadastre: 'OK' | 'ERROR' | 'EMPTY';
  dvf: 'OK' | 'ERROR' | 'EMPTY';
  pappers: 'OK' | 'ERROR' | 'EMPTY' | 'SKIPPED';
  georisques: 'OK' | 'ERROR';
  urbanism: 'OK' | 'ERROR' | 'EMPTY';
  osm: 'OK' | 'ERROR';
  climate: 'OK' | 'ERROR';
  imagery: 'OK' | 'ERROR' | 'EMPTY';
  ai: 'OK' | 'ERROR' | 'SKIPPED';
}

interface EnrichmentContext {
  address: any;
  altitude: number | null;
  cadastre: any;
  market: any;
  owners: any;
  risks: any;
  urbanism: any;
  district: any;
  climate: any;
  imagery: any;
}

// Helper: fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// ============================================================
// STEP 1: BAN / Nominatim Geocoding (MANDATORY)
// ============================================================
async function callBANorNominatim(address: string): Promise<any> {
  // Try BAN API first
  const banUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`;
  const banResponse = await fetchWithTimeout(banUrl);
  
  if (banResponse.ok) {
    const data = await banResponse.json();
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      return {
        input: address,
        normalized: props.label || address,
        lat: coords[1],
        lng: coords[0],
        codeInsee: props.citycode,
        postalCode: props.postcode,
        city: props.city,
        country: 'France',
        formattedGps: `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}`,
        source: 'BAN'
      };
    }
  }

  // Fallback to Nominatim
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;
  const nominatimResponse = await fetchWithTimeout(nominatimUrl, {
    headers: { 'User-Agent': 'MyEDLS/1.0' }
  });

  if (nominatimResponse.ok) {
    const data = await nominatimResponse.json();
    if (data && data.length > 0) {
      const result = data[0];
      return {
        input: address,
        normalized: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        codeInsee: result.address?.postcode,
        postalCode: result.address?.postcode,
        city: result.address?.city || result.address?.town || result.address?.village,
        country: result.address?.country || 'France',
        formattedGps: `${result.lat}, ${result.lon}`,
        source: 'Nominatim'
      };
    }
  }

  throw new Error('Geocoding failed: no results from BAN or Nominatim');
}

// ============================================================
// STEP 2: Open Elevation API
// ============================================================
async function callOpenElevation(lat: number, lng: number): Promise<number | null> {
  const url = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`;
  const response = await fetchWithTimeout(url, {}, 5000);
  
  if (response.ok) {
    const data = await response.json();
    return data.results?.[0]?.elevation || null;
  }
  throw new Error('Elevation API failed');
}

// ============================================================
// STEP 3: Cadastre API (IGN)
// ============================================================
async function callCadastre(address: any): Promise<any> {
  const url = `https://apicarto.ign.fr/api/cadastre/parcelle?geom={"type":"Point","coordinates":[${address.lng},${address.lat}]}`;
  const response = await fetchWithTimeout(url);
  
  if (!response.ok) throw new Error('Cadastre API error');
  
  const data = await response.json();
  if (!data.features || data.features.length === 0) {
    return null;
  }

  const parcel = data.features[0];
  const props = parcel.properties;

  return {
    section: props.section,
    parcelle: props.numero,
    surfaceM2: props.contenance,
    commune: props.commune,
    codeCommune: props.code_commune,
    geometry: parcel.geometry,
    planUrl: `https://www.cadastre.gouv.fr/scpc/rechercherPlan.do?commune=${props.code_commune || ''}`,
    wmsUrl: `https://inspire.cadastre.gouv.fr/scpc/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=CP.CadastralParcel`
  };
}

// ============================================================
// STEP 4: DVF (Demandes de Valeurs Foncières)
// ============================================================
async function callDVF(address: any, cadastre: any): Promise<any> {
  // Use cadastre parcel if available, otherwise use coordinates
  const lat = address.lat;
  const lng = address.lng;
  
  // Create bounding box (500m radius)
  const radius = 0.005;
  const bbox = `${lng - radius},${lat - radius},${lng + radius},${lat + radius}`;
  
  const url = `https://api.dvf.etalab.gouv.fr/mutations?bbox=${bbox}`;
  const response = await fetchWithTimeout(url);
  
  if (!response.ok) throw new Error('DVF API error');
  
  const data = await response.json();
  if (!data.mutations || data.mutations.length === 0) {
    return null;
  }

  const transactions = data.mutations.slice(0, 30).map((m: any) => ({
    date: m.date_mutation,
    type: m.type_local || 'Inconnu',
    surfaceM2: m.surface_reelle_bati || m.surface_terrain,
    price: m.valeur_fonciere,
    pricePerM2: m.surface_reelle_bati ? Math.round(m.valeur_fonciere / m.surface_reelle_bati) : null,
    address: m.adresse_nom_voie,
    source: 'DVF Etalab'
  })).filter((t: any) => t.price && t.surfaceM2);

  // Calculate stats
  const pricesPerM2 = transactions
    .filter((t: any) => t.pricePerM2)
    .map((t: any) => t.pricePerM2);
  
  const avgPrice = pricesPerM2.length > 0 
    ? Math.round(pricesPerM2.reduce((a: number, b: number) => a + b, 0) / pricesPerM2.length)
    : undefined;

  const sortedPrices = [...pricesPerM2].sort((a, b) => a - b);
  const medianPrice = sortedPrices.length > 0 
    ? sortedPrices[Math.floor(sortedPrices.length / 2)]
    : undefined;

  // Price trend by year
  const byYear: Record<number, number[]> = {};
  transactions.forEach((t: any) => {
    if (t.date && t.pricePerM2) {
      const year = new Date(t.date).getFullYear();
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(t.pricePerM2);
    }
  });

  const priceTrend = Object.entries(byYear)
    .map(([year, prices]) => ({
      year: parseInt(year),
      pricePerM2: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    }))
    .sort((a, b) => a.year - b.year);

  // Calculate evolution
  let priceEvolution: string | undefined;
  if (priceTrend.length >= 2) {
    const oldest = priceTrend[0].pricePerM2;
    const newest = priceTrend[priceTrend.length - 1].pricePerM2;
    const change = ((newest - oldest) / oldest) * 100;
    priceEvolution = `${change > 0 ? '+' : ''}${change.toFixed(1)}% depuis ${priceTrend[0].year}`;
  }

  return {
    lastTransactions: transactions,
    pricePerM2Estimated: avgPrice,
    avgPricePerM2Local: avgPrice,
    medianPricePerM2Local: medianPrice,
    priceTrend,
    priceEvolution,
    transactionCount: transactions.length,
    lastUpdate: new Date().toISOString()
  };
}

// ============================================================
// STEP 5: Pappers API (if key available)
// ============================================================
function hasPappersApiKey(): boolean {
  return !!Deno.env.get('PAPPERS_API_KEY');
}

async function callPappers(address: any, cadastre: any, siren?: string): Promise<any> {
  const PAPPERS_API_KEY = Deno.env.get('PAPPERS_API_KEY');
  
  if (!PAPPERS_API_KEY) {
    return null;
  }

  let companyData: any = null;
  
  if (siren) {
    // Direct lookup by SIREN
    const url = `https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_API_KEY}&siren=${siren}`;
    const response = await fetchWithTimeout(url);
    if (response.ok) {
      companyData = await response.json();
    }
  } else {
    // Search by address
    const searchAddress = address.normalized || address.input;
    const searchUrl = `https://api.pappers.fr/v2/recherche?api_token=${PAPPERS_API_KEY}&q=${encodeURIComponent(searchAddress)}&siege=true`;
    const searchResponse = await fetchWithTimeout(searchUrl);
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.resultats && searchData.resultats.length > 0) {
        companyData = searchData.resultats[0];
      }
    }
  }

  if (!companyData) {
    return null;
  }

  const companies = [{
    name: companyData.denomination || companyData.nom_complet,
    siren: companyData.siren,
    siret: companyData.siege?.siret,
    legalForm: companyData.forme_juridique,
    representative: companyData.representants?.[0] 
      ? `${companyData.representants[0].prenom || ''} ${companyData.representants[0].nom || ''}`.trim()
      : undefined,
    registeredAddress: [
      companyData.siege?.adresse_ligne_1,
      companyData.siege?.code_postal,
      companyData.siege?.ville
    ].filter(Boolean).join(' '),
    pappersUrl: `https://www.pappers.fr/entreprise/${companyData.siren}`,
    creationDate: companyData.date_creation,
    activity: companyData.objet_social || companyData.activite_principale,
    nafCode: companyData.code_naf,
    capital: companyData.capital
  }];

  // Determine owner type
  const legalForm = companyData.forme_juridique?.toLowerCase() || '';
  let ownerType: string = 'company';
  if (legalForm.includes('sci')) ownerType = 'SCI';
  else if (legalForm.includes('copropriété')) ownerType = 'coownership';
  else if (legalForm.includes('association')) ownerType = 'association';

  return {
    type: 'company' as const,
    companies,
    estimationType: ownerType,
    source: 'Pappers'
  };
}

// ============================================================
// STEP 6: Géorisques API
// ============================================================
async function callGeorisques(address: any): Promise<any> {
  const lat = address.lat;
  const lng = address.lng;
  const codeInsee = address.codeInsee;

  const riskData: any = {
    flood: { level: 'unknown', description: 'Non évalué' },
    clay: { level: 'unknown', exposure: 'Non évalué' },
    seismic: { zone: 0, level: 'Non évalué' },
    radon: { level: 'unknown', category: null },
    industrial: { seveso: false, icpe: false, sites: [] },
    forestFire: { level: 'unknown' },
    coastalErosion: { level: 'unknown' },
    globalRiskLevel: 'low' as const
  };

  // Try coordinates-based API
  const url = codeInsee 
    ? `https://www.georisques.gouv.fr/api/v1/resultats_rapport_risques?code_insee=${codeInsee}`
    : `https://www.georisques.gouv.fr/api/v1/gaspar/risques?latlon=${lat},${lng}&rayon=1000`;
  
  const response = await fetchWithTimeout(url);
  
  if (response.ok) {
    const data = await response.json();
    const risques = data.data || data.risques_naturels || [];

    if (Array.isArray(risques)) {
      risques.forEach((r: any) => {
        const code = (r.libelle_risque_jo || r.code_risque || '').toLowerCase();
        if (code.includes('inondation')) {
          riskData.flood = { level: 'present', description: r.libelle_risque_jo };
        }
        if (code.includes('argile') || code.includes('retrait')) {
          riskData.clay = { level: 'present', exposure: r.libelle_risque_jo };
        }
        if (code.includes('sism')) {
          riskData.seismic = { zone: parseInt(r.zone) || 1, level: r.libelle_risque_jo };
        }
        if (code.includes('radon')) {
          riskData.radon = { level: r.zone || 'present', category: parseInt(r.zone) || null };
        }
        if (code.includes('feu') || code.includes('forêt')) {
          riskData.forestFire = { level: 'present' };
        }
        if (code.includes('seveso')) {
          riskData.industrial.seveso = true;
        }
      });
    }
  }

  // Fetch ICPE/industrial sites
  try {
    const icpeUrl = `https://www.georisques.gouv.fr/api/v1/installations_classees?latlon=${lat},${lng}&rayon=2000`;
    const icpeResponse = await fetchWithTimeout(icpeUrl, {}, 5000);
    if (icpeResponse.ok) {
      const icpeData = await icpeResponse.json();
      if (icpeData.data && icpeData.data.length > 0) {
        riskData.industrial.icpe = true;
        riskData.industrial.sites = icpeData.data.slice(0, 5).map((s: any) => ({
          name: s.raisonSociale || s.nom,
          distance: s.distance,
          type: s.regime || 'ICPE'
        }));
      }
    }
  } catch (e) {
    console.log('ICPE fetch error:', e);
  }

  // Calculate global risk level
  const hasHighRisk = riskData.flood?.level === 'present' || 
                      riskData.seismic?.zone >= 3 ||
                      riskData.industrial?.seveso;
  const hasMediumRisk = riskData.clay?.level === 'present' ||
                        riskData.radon?.level === 'present' ||
                        riskData.forestFire?.level === 'present' ||
                        riskData.industrial?.icpe;
  
  riskData.globalRiskLevel = hasHighRisk ? 'high' : hasMediumRisk ? 'medium' : 'low';

  return riskData;
}

// ============================================================
// STEP 7: Urbanisme / PLU (API Carto GPU)
// ============================================================
async function callGpuUrbanism(address: any): Promise<any> {
  const lat = address.lat;
  const lng = address.lng;
  
  // Geometry for requests (Point)
  const geomPoint = {
    type: "Point",
    coordinates: [lng, lat]
  };
  const geomParam = encodeURIComponent(JSON.stringify(geomPoint));
  
  const urbanismData: any = {
    communeCovered: false,
    isRNU: true,
    documents: [],
    zones: [],
    prescriptionsSurf: [],
    prescriptionsLin: [],
    prescriptionsPct: [],
    servitudes: [],
    servitudesCount: 0,
    hasServitudes: false,
    infoSurf: [],
    infoLin: [],
    infoPct: [],
    source: 'API Carto GPU'
  };

  try {
    // 1️⃣ Municipality check - commune couverte?
    try {
      const munUrl = `https://apicarto.ign.fr/api/gpu/municipality?geom=${geomParam}`;
      const munResponse = await fetchWithTimeout(munUrl, {}, 8000);
      if (munResponse.ok) {
        const munData = await munResponse.json();
        if (munData.features && munData.features.length > 0) {
          const commune = munData.features[0].properties;
          urbanismData.communeCovered = true;
          urbanismData.isRNU = commune.partition === 'RNU';
        }
      }
    } catch (e) {
      console.log('GPU municipality error:', e);
    }

    // 2️⃣ Documents d'urbanisme applicables
    try {
      const docUrl = `https://apicarto.ign.fr/api/gpu/document?geom=${geomParam}`;
      const docResponse = await fetchWithTimeout(docUrl, {}, 8000);
      if (docResponse.ok) {
        const docData = await docResponse.json();
        if (docData.features && docData.features.length > 0) {
          urbanismData.documents = docData.features.map((f: any) => f.properties);
          urbanismData.mainDocument = urbanismData.documents[0];
          urbanismData.pluAvailable = urbanismData.documents.some((d: any) => 
            d.typedoc && (d.typedoc.includes('PLU') || d.typedoc.includes('POS'))
          );
        }
      }
    } catch (e) {
      console.log('GPU document error:', e);
    }

    // 3️⃣ Zonage PLU/PLUi
    try {
      const zoneUrl = `https://apicarto.ign.fr/api/gpu/zone-urba?geom=${geomParam}`;
      const zoneResponse = await fetchWithTimeout(zoneUrl, {}, 8000);
      if (zoneResponse.ok) {
        const zoneData = await zoneResponse.json();
        if (zoneData.features && zoneData.features.length > 0) {
          urbanismData.zones = zoneData.features.map((f: any) => f.properties);
          const mainZone = urbanismData.zones[0];
          
          // Zone descriptions
          const zoneDescriptions: Record<string, string> = {
            'U': 'Zone Urbaine - constructible',
            'AU': 'Zone À Urbaniser - urbanisation future',
            'A': 'Zone Agricole - protégée',
            'N': 'Zone Naturelle - protégée',
            'UA': 'Zone Urbaine Dense',
            'UB': 'Zone Urbaine Moyenne Densité',
            'UC': 'Zone Urbaine Faible Densité'
          };
          
          const zoneCode = mainZone.libelle || mainZone.typezone || '';
          const zonePrefix = zoneCode.substring(0, 2).toUpperCase();
          
          urbanismData.zone = zoneCode;
          urbanismData.zoneDescription = zoneDescriptions[zonePrefix] || mainZone.libelong || mainZone.destdomi || 'Zone non classifiée';
          urbanismData.buildingDestination = mainZone.destdomi;
          urbanismData.regulationsPdfUrl = mainZone.urlfic;
        }
      }
    } catch (e) {
      console.log('GPU zone-urba error:', e);
    }

    // 4️⃣ Informations surfaciques, linéaires, ponctuelles
    try {
      const infoSurfUrl = `https://apicarto.ign.fr/api/gpu/info-surf?geom=${geomParam}`;
      const infoSurfResponse = await fetchWithTimeout(infoSurfUrl, {}, 8000);
      if (infoSurfResponse.ok) {
        const data = await infoSurfResponse.json();
        if (data.features && data.features.length > 0) {
          urbanismData.infoSurf = data.features.map((f: any) => f.properties);
        }
      }
    } catch (e) {
      console.log('GPU info-surf error:', e);
    }

    try {
      const infoLinUrl = `https://apicarto.ign.fr/api/gpu/info-lin?geom=${geomParam}`;
      const infoLinResponse = await fetchWithTimeout(infoLinUrl, {}, 8000);
      if (infoLinResponse.ok) {
        const data = await infoLinResponse.json();
        if (data.features && data.features.length > 0) {
          urbanismData.infoLin = data.features.map((f: any) => f.properties);
        }
      }
    } catch (e) {
      console.log('GPU info-lin error:', e);
    }

    try {
      const infoPctUrl = `https://apicarto.ign.fr/api/gpu/info-pct?geom=${geomParam}`;
      const infoPctResponse = await fetchWithTimeout(infoPctUrl, {}, 8000);
      if (infoPctResponse.ok) {
        const data = await infoPctResponse.json();
        if (data.features && data.features.length > 0) {
          urbanismData.infoPct = data.features.map((f: any) => f.properties);
        }
      }
    } catch (e) {
      console.log('GPU info-pct error:', e);
    }

    // 5️⃣ Prescriptions surfaciques, linéaires, ponctuelles
    try {
      const prescSurfUrl = `https://apicarto.ign.fr/api/gpu/prescription-surf?geom=${geomParam}`;
      const prescSurfResponse = await fetchWithTimeout(prescSurfUrl, {}, 8000);
      if (prescSurfResponse.ok) {
        const data = await prescSurfResponse.json();
        if (data.features && data.features.length > 0) {
          urbanismData.prescriptionsSurf = data.features.map((f: any) => f.properties);
        }
      }
    } catch (e) {
      console.log('GPU prescription-surf error:', e);
    }

    try {
      const prescLinUrl = `https://apicarto.ign.fr/api/gpu/prescription-lin?geom=${geomParam}`;
      const prescLinResponse = await fetchWithTimeout(prescLinUrl, {}, 8000);
      if (prescLinResponse.ok) {
        const data = await prescLinResponse.json();
        if (data.features && data.features.length > 0) {
          urbanismData.prescriptionsLin = data.features.map((f: any) => f.properties);
        }
      }
    } catch (e) {
      console.log('GPU prescription-lin error:', e);
    }

    try {
      const prescPctUrl = `https://apicarto.ign.fr/api/gpu/prescription-pct?geom=${geomParam}`;
      const prescPctResponse = await fetchWithTimeout(prescPctUrl, {}, 8000);
      if (prescPctResponse.ok) {
        const data = await prescPctResponse.json();
        if (data.features && data.features.length > 0) {
          urbanismData.prescriptionsPct = data.features.map((f: any) => f.properties);
        }
      }
    } catch (e) {
      console.log('GPU prescription-pct error:', e);
    }

    // 6️⃣ Servitudes d'utilité publique (SUP)
    try {
      const supUrl = `https://apicarto.ign.fr/api/gpu/assiette-sup-s?geom=${geomParam}`;
      const supResponse = await fetchWithTimeout(supUrl, {}, 8000);
      if (supResponse.ok) {
        const data = await supResponse.json();
        if (data.features && data.features.length > 0) {
          urbanismData.servitudes = data.features.map((f: any) => f.properties);
          urbanismData.servitudesCount = urbanismData.servitudes.length;
          urbanismData.hasServitudes = true;
        }
      }
    } catch (e) {
      console.log('GPU SUP error:', e);
    }

    // 7️⃣ Check ABF perimeter (monuments historiques) via Overpass
    try {
      const abfQuery = `[out:json][timeout:5];(way["historic"](around:500,${lat},${lng});node["historic"="monument"](around:500,${lat},${lng}););out count;`;
      const abfUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(abfQuery)}`;
      const abfResponse = await fetchWithTimeout(abfUrl, {}, 5000);
      if (abfResponse.ok) {
        const abfData = await abfResponse.json();
        urbanismData.abfZone = (abfData.elements?.length || 0) > 0;
        if (urbanismData.abfZone) urbanismData.abfDistance = 500;
      }
    } catch (e) {
      console.log('ABF check error:', e);
    }

  } catch (error) {
    console.error('GPU Urbanism global error:', error);
  }

  return urbanismData;
}

// ============================================================
// STEP 8: OSM + ORS (District / Quartier)
// ============================================================
async function callOSMAndORS(address: any): Promise<any> {
  const lat = address.lat;
  const lng = address.lng;
  const radius = 1000;

  // Overpass query for POIs
  const query = `[out:json][timeout:15];
(
  node["amenity"~"school|kindergarten|university|hospital|pharmacy|clinic|doctors|supermarket|convenience|bakery|restaurant|cafe|bar|bank|post_office|police|fire_station|library|cinema|theatre"](around:${radius},${lat},${lng});
  node["shop"](around:${radius},${lat},${lng});
  node["public_transport"~"station|stop_position"](around:${radius},${lat},${lng});
  node["railway"="station"](around:${radius},${lat},${lng});
  node["leisure"~"park|garden|playground|sports_centre|fitness_centre"](around:${radius},${lat},${lng});
  node["healthcare"](around:${radius},${lat},${lng});
);
out body 150;`;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const response = await fetchWithTimeout(url, {}, 15000);
  
  if (!response.ok) throw new Error('Overpass API error');
  
  const data = await response.json();
  const elements = data.elements || [];

  // Categorize POIs
  const categories: Record<string, number> = {
    shops: 0,
    schools: 0,
    health: 0,
    transport: 0,
    greenAreas: 0,
    restaurants: 0,
    culture: 0,
    services: 0
  };

  const pois = elements.slice(0, 80).map((el: any) => {
    const tags = el.tags || {};
    const type = tags.amenity || tags.shop || tags.leisure || tags.public_transport || tags.railway || 'other';
    
    // Categorize
    if (['school', 'kindergarten', 'university'].includes(tags.amenity)) categories.schools++;
    if (tags.shop) categories.shops++;
    if (['hospital', 'pharmacy', 'clinic', 'doctors'].includes(tags.amenity) || tags.healthcare) categories.health++;
    if (tags.public_transport || tags.railway) categories.transport++;
    if (['park', 'garden', 'playground'].includes(tags.leisure)) categories.greenAreas++;
    if (['restaurant', 'cafe', 'bar', 'bakery'].includes(tags.amenity)) categories.restaurants++;
    if (['cinema', 'theatre', 'library'].includes(tags.amenity)) categories.culture++;
    if (['bank', 'post_office', 'police'].includes(tags.amenity)) categories.services++;

    return {
      type,
      name: tags.name,
      category: Object.keys(tags)[0]
    };
  });

  // Calculate walk score (simplified)
  const totalPois = elements.length;
  const walkScore = Math.min(100, Math.round(totalPois * 1.5 + 
    categories.transport * 5 + 
    categories.shops * 3 + 
    categories.greenAreas * 2));

  // Calculate scores per category
  const scores = {
    shops: Math.min(100, categories.shops * 8),
    schools: Math.min(100, categories.schools * 15),
    health: Math.min(100, categories.health * 20),
    transport: Math.min(100, categories.transport * 12),
    greenAreas: Math.min(100, categories.greenAreas * 15),
    culture: Math.min(100, categories.culture * 20),
    overall: walkScore
  };

  // Get air quality from Open-Meteo
  let airQuality: any;
  try {
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5,pm10,ozone,european_aqi`;
    const aqResponse = await fetchWithTimeout(aqUrl, {}, 5000);
    if (aqResponse.ok) {
      const aqData = await aqResponse.json();
      airQuality = {
        index: aqData.current?.european_aqi || 0,
        pm25: aqData.current?.pm2_5,
        pm10: aqData.current?.pm10,
        o3: aqData.current?.ozone,
        quality: aqData.current?.european_aqi < 50 ? 'Bon' : 
                 aqData.current?.european_aqi < 100 ? 'Modéré' : 'Mauvais'
      };
    }
  } catch (e) {
    console.log('Air quality error:', e);
  }

  return {
    scores,
    pois,
    walkScore,
    airQuality,
    totalAmenities: totalPois,
    source: 'OpenStreetMap'
  };
}

// ============================================================
// STEP 9: Climate (Open-Meteo)
// ============================================================
async function callOpenMeteo(address: any): Promise<any> {
  const lat = address.lat;
  const lng = address.lng;

  // Current weather
  const currentUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,uv_index`;
  const currentResponse = await fetchWithTimeout(currentUrl);
  
  // Historical climate data (last year)
  const historicalUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=2023-01-01&end_date=2023-12-31&daily=temperature_2m_mean,precipitation_sum,sunshine_duration`;
  const historicalResponse = await fetchWithTimeout(historicalUrl);

  const currentData = currentResponse.ok ? await currentResponse.json() : null;
  const historicalData = historicalResponse.ok ? await historicalResponse.json() : null;

  // Weather code descriptions
  const weatherCodes: Record<number, string> = {
    0: 'Dégagé',
    1: 'Principalement dégagé',
    2: 'Partiellement nuageux',
    3: 'Nuageux',
    45: 'Brouillard',
    48: 'Brouillard givrant',
    51: 'Bruine légère',
    53: 'Bruine modérée',
    55: 'Bruine dense',
    61: 'Pluie légère',
    63: 'Pluie modérée',
    65: 'Pluie forte',
    66: 'Pluie verglaçante légère',
    67: 'Pluie verglaçante forte',
    71: 'Neige légère',
    73: 'Neige modérée',
    75: 'Neige forte',
    80: 'Averses légères',
    81: 'Averses modérées',
    82: 'Averses violentes',
    95: 'Orage',
    96: 'Orage avec grêle légère',
    99: 'Orage avec grêle forte'
  };

  // Calculate yearly averages
  let avgTempYear, avgRainMmYear, sunHoursYear;
  if (historicalData?.daily) {
    const temps = historicalData.daily.temperature_2m_mean?.filter((t: number) => t !== null) || [];
    const precips = historicalData.daily.precipitation_sum?.filter((p: number) => p !== null) || [];
    const sunshine = historicalData.daily.sunshine_duration?.filter((s: number) => s !== null) || [];
    
    avgTempYear = temps.length > 0 ? Math.round(temps.reduce((a: number, b: number) => a + b, 0) / temps.length * 10) / 10 : undefined;
    avgRainMmYear = precips.length > 0 ? Math.round(precips.reduce((a: number, b: number) => a + b, 0)) : undefined;
    sunHoursYear = sunshine.length > 0 ? Math.round(sunshine.reduce((a: number, b: number) => a + b, 0) / 3600) : undefined;
  }

  // Wind direction to text
  const windDir = currentData?.current?.wind_direction_10m;
  const windDirections = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const prevailingWind = windDir !== undefined 
    ? windDirections[Math.round(windDir / 45) % 8]
    : undefined;

  // Solar exposure classification
  const solarExposure = sunHoursYear 
    ? (sunHoursYear > 2000 ? 'high' : sunHoursYear > 1500 ? 'medium' : 'low')
    : undefined;

  return {
    sunHoursYear,
    avgTempYear,
    avgRainMmYear,
    prevailingWind,
    avgHumidity: currentData?.current?.relative_humidity_2m,
    uvIndex: currentData?.current?.uv_index,
    solarExposure,
    currentWeather: currentData?.current ? {
      temperature: currentData.current.temperature_2m,
      description: weatherCodes[currentData.current.weather_code] || 'Inconnu',
      humidity: currentData.current.relative_humidity_2m,
      windSpeed: currentData.current.wind_speed_10m,
      windDirection: prevailingWind
    } : undefined,
    source: 'Open-Meteo'
  };
}

// ============================================================
// STEP 10: Imagery (Mapillary + Panoramax fallback)
// ============================================================
async function callImageryProviders(address: any): Promise<any> {
  const lat = address.lat;
  const lng = address.lng;

  let streetViewUrl: string | undefined;
  let streetViewImageId: string | undefined;
  let streetViewProvider: string | undefined;
  let aerialImageUrl: string | undefined;
  const images: any[] = [];

  // 1. Try Mapillary first with user's configured token
  const mapillaryToken = Deno.env.get('MAPILLARY_ACCESS_TOKEN');
  if (mapillaryToken) {
    try {
      const bbox = `${lng - 0.001},${lat - 0.001},${lng + 0.001},${lat + 0.001}`;
      const mapillaryResponse = await fetchWithTimeout(
        `https://graph.mapillary.com/images?access_token=${mapillaryToken}&fields=id,thumb_256_url,thumb_1024_url,thumb_2048_url,captured_at,compass_angle,geometry,is_pano&bbox=${bbox}&limit=5`,
        { headers: { 'Authorization': `OAuth ${mapillaryToken}` } },
        8000
      );
      if (mapillaryResponse.ok) {
        const mapillaryData = await mapillaryResponse.json();
        if (mapillaryData.data && mapillaryData.data.length > 0) {
          streetViewUrl = mapillaryData.data[0].thumb_1024_url || mapillaryData.data[0].thumb_2048_url;
          streetViewImageId = mapillaryData.data[0].id;
          streetViewProvider = 'mapillary';
          mapillaryData.data.forEach((img: any) => {
            images.push({
              id: img.id,
              thumbnailUrl: img.thumb_256_url,
              fullUrl: img.thumb_1024_url || img.thumb_2048_url,
              source: 'mapillary',
              capturedAt: img.captured_at,
              isPanorama: img.is_pano
            });
          });
          console.log(`Mapillary: ${images.length} images found`);
        }
      }
    } catch (e) {
      console.log('Mapillary error:', e);
    }
  }

  // 2. Fallback to Panoramax (IGN France) if no Mapillary images
  if (images.length === 0) {
    try {
      const panoramaxResponse = await fetchWithTimeout(
        `https://api.panoramax.xyz/api/search?lat=${lat}&lon=${lng}&radius=100&limit=5`,
        {},
        5000
      );
      if (panoramaxResponse.ok) {
        const panoramaxData = await panoramaxResponse.json();
        if (panoramaxData.features && panoramaxData.features.length > 0) {
          const firstImg = panoramaxData.features[0];
          streetViewUrl = firstImg.assets?.hd?.href || firstImg.assets?.sd?.href;
          streetViewImageId = firstImg.id;
          streetViewProvider = 'panoramax';
          panoramaxData.features.forEach((feature: any) => {
            images.push({
              id: feature.id,
              thumbnailUrl: feature.assets?.thumb?.href,
              fullUrl: feature.assets?.hd?.href || feature.assets?.sd?.href,
              source: 'panoramax',
              capturedAt: feature.properties?.datetime
            });
          });
          console.log(`Panoramax: ${images.length} images found`);
        }
      }
    } catch (e) {
      console.log('Panoramax error:', e);
    }
  }

  // 3. Aerial via ArcGIS World Imagery
  const zoom = 18;
  const tileX = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
  const tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  aerialImageUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`;

  // 4. OSM Static Map URL
  const osmMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.005},${lng+0.005},${lat+0.005}&layer=mapnik&marker=${lat},${lng}`;

  // 5. Generate viewer URL based on provider
  let viewerUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  if (streetViewProvider === 'mapillary' && streetViewImageId) {
    viewerUrl = `https://www.mapillary.com/app/?pKey=${streetViewImageId}&focus=photo`;
  } else if (streetViewProvider === 'panoramax' && streetViewImageId) {
    viewerUrl = `https://panoramax.fr/#focus=pic&pic=${streetViewImageId}`;
  }

  return {
    streetViewUrl,
    streetViewProvider: streetViewProvider as 'mapillary' | 'panoramax' | undefined,
    streetViewImageId,
    images,
    imagesCount: images.length,
    aerialImageUrl,
    aerialProvider: 'arcgis' as const,
    satelliteUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,
    osmMapUrl,
    viewerUrl,
    googleMapsUrl: `https://www.google.com/maps/@${lat},${lng},18z`
  };
}

// ============================================================
// STEP 11: AI Summary (Fusion) - callAISummary avec prompts pro
// ============================================================
async function callAISummary(context: EnrichmentContext, sourceStatus: SourceStatus): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.log('LOVABLE_API_KEY not found, skipping AI summary');
    return null;
  }

  // Construire le contexte JSON pour l'IA
  const propertyContextJson = JSON.stringify({
    address: context.address,
    altitude: context.altitude,
    cadastre: context.cadastre,
    market: context.market,
    risks: context.risks,
    urbanism: context.urbanism,
    owners: context.owners,
    district: context.district,
    climate: context.climate,
    imagery: context.imagery
  }, null, 2);

  const sourceStatusJson = JSON.stringify(sourceStatus, null, 2);

  // Prompt SYSTÈME (expert immobilier / conducteur de travaux)
  const systemPrompt = `Tu es un expert immobilier, foncier, urbanisme ET conducteur de travaux. 
Tu travailles pour une application professionnelle appelée MyEDLS, utilisée par des économistes de la construction, des chefs de chantier et des maîtres d'ouvrage.

Ton rôle : analyser un objet JSON décrivant un bien immobilier (données foncières, DVF, cadastre, risques, urbanisme, quartier, climat, imagerie) et produire un résumé EXCLUSIVEMENT au format JSON, structuré, exploitable directement par une application. 
Aucune phrase d'introduction, aucune explication hors JSON.`;

  // Prompt UTILISATEUR avec toutes les règles métier
  const userPrompt = `Voici les données brutes du bien (en JSON) :

${propertyContextJson}

Et voici l'état des sources (certaines peuvent être en erreur) :

${sourceStatusJson}

À partir de ces données, produis un JSON strictement au format suivant :

{
  "headline": "string",
  "bulletPoints": ["string", "string", "string", "string", "string"],
  "riskLevelGlobal": "low" | "medium" | "high",
  "renovationPotential": "low" | "medium" | "high",
  "commentsForTechnicalVisit": "string",
  "buildingAnalysis": {
    "estimatedType": "string",
    "estimatedYear": number | null,
    "estimatedFloors": number | null,
    "facadeMaterial": "string",
    "visiblePathologies": ["string"],
    "roofCondition": "string",
    "potentialDPE": "string",
    "elevatorProbable": boolean
  },
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string"],
  "opportunities": ["string", "string"],
  "recommendations": ["string", "string", "string"]
}

Règles métier :

1. "headline" doit tenir en une seule phrase courte (max 120 caractères), type accroche pour un rapport ("Immeuble ancien en centre-ville avec bon potentiel de valorisation", etc.).

2. "bulletPoints" doit contenir 5 points clés, orientés PRO :
   - 1 point sur la localisation / quartier
   - 1 point sur la situation foncière / marché (DVF / prix/m² si dispo)
   - 1 point sur les risques / urbanisme (Géorisques, PLU, ABF…)
   - 1 point sur l'état supposé du bâti (façade, toiture, âge probable)
   - 1 point sur le potentiel travaux / valorisation

   Si une donnée est absente (par exemple DVF), ne l'invente pas : dis "Données de marché non disponibles mais… [analyse prudente]".

3. "riskLevelGlobal" :
   - "low" si pas de risques majeurs (peu ou pas d'aléas inondation/argiles/seisme, pas de SEVESO, etc.)
   - "medium" si un ou plusieurs risques modérés (inondation faible/moyen, argiles, bruit, etc.)
   - "high" si au moins un risque fort (inondation forte, SEVESO zone proche, sismicité forte, etc.)

4. "renovationPotential" :
   - "low" si bien récent, peu de pathologies visibles, peu de potentiel d'amélioration
   - "medium" si quelques travaux classiques sont à prévoir (façades moyennement vieillies, toiture à surveiller, etc.)
   - "high" si l'état apparent, l'âge du bâti et le marché laissent envisager un fort potentiel de travaux (rénovation lourde, changement d'usage, reconfiguration, etc.)

5. "commentsForTechnicalVisit" :
   - doit être rédigé comme un message interne à un chef de chantier / conducteur de travaux
   - en 5–10 phrases courtes, actionnables
   - orienté VISITE TECHNIQUE : quelles zones inspecter en priorité, quels risques à vérifier, quels points structurels ou d'enveloppe contrôler, quels ordres d'idées sur la complexité probable du chantier.

6. "buildingAnalysis" doit contenir des estimations sur le type de bâtiment basées sur les indices disponibles (adresse, quartier, données cadastrales, photos si disponibles).

7. "strengths" liste 3 points forts du bien (localisation, potentiel, état, marché...).

8. "weaknesses" liste 2 points faibles ou points de vigilance.

9. "opportunities" liste 2 opportunités d'amélioration ou de valorisation.

10. "recommendations" liste 3 recommandations concrètes pour la suite.

IMPORTANT :
- Ne fais AUCUNE phrase hors du JSON demandé.
- N'invente jamais de données précises (prix exact, surface précise, date exacte) si elles n'apparaissent pas dans le JSON d'entrée. Tu peux faire des estimations qualitatives (faible/moyen/fort, récent/ancien, etc.) mais pas inventer de chiffres.

Renvoie UNIQUEMENT le JSON final, rien d'autre.`;

  console.log('Calling Lovable AI Gateway for property analysis...');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  let content = aiResponse.choices?.[0]?.message?.content || '';
  
  console.log('AI Response received, parsing JSON...');
  
  // Nettoyer et parser le JSON
  // Enlever les éventuels blocs markdown ```json ... ```
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  // Trouver le JSON dans la réponse
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('AI Summary parsed successfully');
      return parsed;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Could not parse AI response JSON');
    }
  }

  throw new Error('Could not find JSON in AI response');
}

// ============================================================
// STEP 12 & 13: Save Snapshot to Database
// ============================================================
async function saveSnapshotToDb(
  supabase: any,
  context: EnrichmentContext,
  sourceStatus: SourceStatus,
  aiSummary: any,
  projectId?: string
): Promise<any> {
  const { data, error } = await supabase
    .from('property_enrichment_snapshots')
    .insert({
      project_id: projectId || null,
      address_input: context.address.input,
      address_normalized: context.address.normalized,
      latitude: context.address.lat,
      longitude: context.address.lng,
      altitude: context.altitude,
      code_insee: context.address.codeInsee,
      postal_code: context.address.postalCode,
      city: context.address.city,
      country: context.address.country || 'France',
      cadastre_section: context.cadastre?.section,
      cadastre_parcelle: context.cadastre?.parcelle,
      cadastre_surface_m2: context.cadastre?.surfaceM2,
      cadastre_geom: context.cadastre?.geometry,
      market_json: context.market || {},
      risks_json: context.risks || {},
      urbanism_json: context.urbanism || {},
      owners_json: context.owners || {},
      district_json: context.district || {},
      climate_json: context.climate || {},
      imagery_json: context.imagery || {},
      ai_summary_json: aiSummary || {},
      ai_confidence: aiSummary ? 0.85 : null,
      source_status_json: sourceStatus
    })
    .select()
    .single();

  if (error) {
    console.error('Database insert error:', error);
    return null;
  }

  return data;
}

// ============================================================
// MAIN HANDLER
// ============================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EnrichmentRequest = await req.json();
    const { address, latitude, longitude, projectId, refresh } = body;

    console.log('=== Property Enrichment Request ===');
    console.log({ address, latitude, longitude, projectId, refresh });

    // Validate input
    if (!address && (latitude === undefined || longitude === undefined)) {
      return new Response(
        JSON.stringify({ error: 'Address or coordinates required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache if not forcing refresh
    if (!refresh && address) {
      const { data: cached } = await supabase
        .from('property_enrichment_snapshots')
        .select('*')
        .eq('address_input', address)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.created_at).getTime();
        if (cacheAge < 24 * 60 * 60 * 1000) { // 24 hours
          console.log('Returning cached result (age: ' + Math.round(cacheAge / 1000 / 60) + ' minutes)');
          return new Response(
            JSON.stringify({
              id: cached.id,
              projectId: cached.project_id,
              address: {
                input: cached.address_input,
                normalized: cached.address_normalized,
                lat: cached.latitude,
                lng: cached.longitude,
                altitude: cached.altitude,
                codeInsee: cached.code_insee,
                postalCode: cached.postal_code,
                city: cached.city,
                country: cached.country
              },
              cadastre: {
                section: cached.cadastre_section,
                parcelle: cached.cadastre_parcelle,
                surfaceM2: cached.cadastre_surface_m2,
                geometry: cached.cadastre_geom
              },
              market: cached.market_json,
              risks: cached.risks_json,
              urbanism: cached.urbanism_json,
              owners: cached.owners_json,
              district: cached.district_json,
              climate: cached.climate_json,
              imagery: cached.imagery_json,
              aiSummary: cached.ai_summary_json,
              sourceStatus: cached.source_status_json,
              createdAt: cached.created_at,
              updatedAt: cached.updated_at,
              cached: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Initialize source status and context
    const sourceStatus: SourceStatus = {
      ban: 'ERROR',
      altitude: 'SKIPPED',
      cadastre: 'ERROR',
      dvf: 'ERROR',
      pappers: 'SKIPPED',
      georisques: 'ERROR',
      urbanism: 'ERROR',
      osm: 'ERROR',
      climate: 'ERROR',
      imagery: 'ERROR',
      ai: 'SKIPPED'
    };

    const context: EnrichmentContext = {
      address: null,
      altitude: null,
      cadastre: null,
      market: null,
      owners: null,
      risks: null,
      urbanism: null,
      district: null,
      climate: null,
      imagery: null
    };

    // ========== STEP 1: Geocoding (MANDATORY) ==========
    console.log('Step 1: Geocoding...');
    try {
      if (address) {
        context.address = await callBANorNominatim(address);
      } else {
        context.address = {
          input: `${latitude},${longitude}`,
          normalized: `${latitude},${longitude}`,
          lat: latitude,
          lng: longitude,
          country: 'France'
        };
      }
      sourceStatus.ban = 'OK';
      console.log('  ✓ Geocoding OK:', context.address.normalized);
    } catch (e) {
      console.error('  ✗ Geocoding FAILED:', e);
      sourceStatus.ban = 'ERROR';
      return new Response(
        JSON.stringify({ error: 'Geocoding failed - BAN is mandatory', sourceStatus }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== STEP 2: Altitude ==========
    console.log('Step 2: Altitude...');
    try {
      context.altitude = await callOpenElevation(context.address.lat, context.address.lng);
      sourceStatus.altitude = 'OK';
      console.log('  ✓ Altitude:', context.altitude, 'm');
    } catch (e) {
      console.log('  ✗ Altitude error:', e);
      sourceStatus.altitude = 'ERROR';
    }

    // ========== PARALLEL STEPS 3-10 ==========
    console.log('Steps 3-10: Parallel data fetching...');
    const [
      cadastreResult,
      dvfResult,
      pappersResult,
      georisquesResult,
      urbanismResult,
      districtResult,
      climateResult,
      imageryResult
    ] = await Promise.allSettled([
      // Step 3: Cadastre
      callCadastre(context.address),
      // Step 4: DVF
      callDVF(context.address, null),
      // Step 5: Pappers
      hasPappersApiKey() ? callPappers(context.address, null) : Promise.resolve(null),
      // Step 6: Georisques
      callGeorisques(context.address),
      // Step 7: Urbanism
      callGpuUrbanism(context.address),
      // Step 8: District/OSM
      callOSMAndORS(context.address),
      // Step 9: Climate
      callOpenMeteo(context.address),
      // Step 10: Imagery
      callImageryProviders(context.address)
    ]);

    // Process results
    if (cadastreResult.status === 'fulfilled') {
      context.cadastre = cadastreResult.value;
      sourceStatus.cadastre = context.cadastre ? 'OK' : 'EMPTY';
      console.log('  ✓ Cadastre:', context.cadastre ? 'OK' : 'EMPTY');
    } else {
      sourceStatus.cadastre = 'ERROR';
      console.log('  ✗ Cadastre:', cadastreResult.reason);
    }

    if (dvfResult.status === 'fulfilled') {
      context.market = dvfResult.value;
      sourceStatus.dvf = context.market ? 'OK' : 'EMPTY';
      console.log('  ✓ DVF:', context.market ? `${context.market.transactionCount} transactions` : 'EMPTY');
    } else {
      sourceStatus.dvf = 'ERROR';
      console.log('  ✗ DVF:', dvfResult.reason);
    }

    if (!hasPappersApiKey()) {
      sourceStatus.pappers = 'SKIPPED';
      console.log('  - Pappers: SKIPPED (no API key)');
    } else if (pappersResult.status === 'fulfilled') {
      context.owners = pappersResult.value;
      sourceStatus.pappers = context.owners ? 'OK' : 'EMPTY';
      console.log('  ✓ Pappers:', context.owners ? 'OK' : 'EMPTY');
    } else {
      sourceStatus.pappers = 'ERROR';
      console.log('  ✗ Pappers:', pappersResult.reason);
    }

    if (georisquesResult.status === 'fulfilled') {
      context.risks = georisquesResult.value;
      sourceStatus.georisques = 'OK';
      console.log('  ✓ Georisques: OK (risk level:', context.risks?.globalRiskLevel, ')');
    } else {
      sourceStatus.georisques = 'ERROR';
      console.log('  ✗ Georisques:', georisquesResult.reason);
    }

    if (urbanismResult.status === 'fulfilled') {
      context.urbanism = urbanismResult.value;
      sourceStatus.urbanism = context.urbanism ? 'OK' : 'EMPTY';
      console.log('  ✓ Urbanism:', context.urbanism ? context.urbanism.zone : 'EMPTY');
    } else {
      sourceStatus.urbanism = 'ERROR';
      console.log('  ✗ Urbanism:', urbanismResult.reason);
    }

    if (districtResult.status === 'fulfilled') {
      context.district = districtResult.value;
      sourceStatus.osm = 'OK';
      console.log('  ✓ OSM/District: OK (walk score:', context.district?.walkScore, ')');
    } else {
      sourceStatus.osm = 'ERROR';
      console.log('  ✗ OSM/District:', districtResult.reason);
    }

    if (climateResult.status === 'fulfilled') {
      context.climate = climateResult.value;
      sourceStatus.climate = 'OK';
      console.log('  ✓ Climate: OK (temp:', context.climate?.avgTempYear, '°C)');
    } else {
      sourceStatus.climate = 'ERROR';
      console.log('  ✗ Climate:', climateResult.reason);
    }

    if (imageryResult.status === 'fulfilled') {
      context.imagery = imageryResult.value;
      sourceStatus.imagery = context.imagery?.streetViewUrl || context.imagery?.aerialImageUrl ? 'OK' : 'EMPTY';
      console.log('  ✓ Imagery:', sourceStatus.imagery);
    } else {
      sourceStatus.imagery = 'ERROR';
      console.log('  ✗ Imagery:', imageryResult.reason);
    }

    // ========== STEP 11: AI Summary ==========
    console.log('Step 11: AI Summary...');
    let aiSummary: any = null;
    try {
      aiSummary = await callAISummary(context, sourceStatus);
      sourceStatus.ai = aiSummary ? 'OK' : 'ERROR';
      console.log('  ✓ AI Summary:', aiSummary ? 'OK' : 'FAILED');
    } catch (e) {
      sourceStatus.ai = 'ERROR';
      console.log('  ✗ AI Summary:', e);
    }

    // ========== STEP 12 & 13: Assemble & Save ==========
    console.log('Steps 12-13: Assembling response and saving snapshot...');
    
    const snapshot = await saveSnapshotToDb(supabase, context, sourceStatus, aiSummary, projectId);

    const response = {
      id: snapshot?.id,
      snapshotId: snapshot?.id,
      projectId: snapshot?.project_id || projectId,
      address: {
        input: context.address.input,
        normalized: context.address.normalized,
        latitude: context.address.lat,
        longitude: context.address.lng,
        altitude: context.altitude,
        codeInsee: context.address.codeInsee,
        postalCode: context.address.postalCode,
        city: context.address.city,
        country: context.address.country,
        formattedGps: context.address.formattedGps
      },
      cadastre: context.cadastre,
      market: context.market,
      risks: context.risks,
      urbanism: context.urbanism,
      owners: context.owners,
      district: context.district,
      climate: context.climate,
      imagery: context.imagery,
      aiSummary,
      sourceStatus,
      createdAt: snapshot?.created_at,
      cached: false
    };

    console.log('=== Enrichment Complete ===');
    console.log('Source Status:', sourceStatus);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Property enrichment error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
