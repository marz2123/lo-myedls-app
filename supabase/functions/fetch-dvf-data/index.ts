import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, codeInsee } = await req.json();
    
    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: 'lat and lon are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching DVF data for lat=${lat}, lon=${lon}, codeInsee=${codeInsee}`);

    const transactions: any[] = [];
    let actualCodeInsee = codeInsee;

    // Step 1: Get codeInsee via reverse geocoding if not provided
    if (!actualCodeInsee) {
      try {
        const reverseUrl = `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`;
        console.log('Reverse geocoding:', reverseUrl);
        
        const reverseResp = await fetch(reverseUrl, {
          headers: { 'User-Agent': 'MyEDLS/1.0' }
        });
        
        if (reverseResp.ok) {
          const reverseData = await reverseResp.json();
          actualCodeInsee = reverseData?.features?.[0]?.properties?.citycode;
          console.log('Got codeInsee from reverse geocoding:', actualCodeInsee);
        } else {
          console.log('Reverse geocoding failed:', reverseResp.status);
        }
      } catch (e: any) {
        console.log('Reverse geocoding error:', e?.message || e);
      }
    }

    if (!actualCodeInsee) {
      console.log('No codeInsee available, cannot fetch DVF data');
      return new Response(
        JSON.stringify({ transactions: [], error: 'Could not determine commune code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const departement = actualCodeInsee.substring(0, 2);
    console.log(`Using codeInsee=${actualCodeInsee}, departement=${departement}`);

    // Method 1: Try data.gouv.fr CSV files for the specific commune
    const years = [2024, 2023, 2022, 2021, 2020, 2019];
    
    for (const year of years) {
      // Continue fetching all years for complete data
      
      try {
        const communeUrl = `https://files.data.gouv.fr/geo-dvf/latest/csv/${year}/communes/${departement}/${actualCodeInsee}.csv`;
        console.log('Trying commune CSV:', communeUrl);
        
        const response = await fetch(communeUrl, {
          headers: { 'User-Agent': 'MyEDLS/1.0' }
        });
        
        if (response.ok) {
          const csvText = await response.text();
          const lines = csvText.split('\n');
          
          if (lines.length > 1) {
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
            
            const dateIdx = headers.indexOf('date_mutation');
            const valeurIdx = headers.indexOf('valeur_fonciere');
            const typeIdx = headers.indexOf('type_local');
            const surfaceIdx = headers.indexOf('surface_reelle_bati');
            const piecesIdx = headers.indexOf('nombre_pieces_principales');
            const voieIdx = headers.indexOf('adresse_nom_voie');
            const numIdx = headers.indexOf('adresse_numero');
            const cpIdx = headers.indexOf('code_postal');
            const communeIdx = headers.indexOf('nom_commune');
            
            console.log(`Parsing ${year} CSV with ${lines.length - 1} rows`);
            
            for (let i = 1; i < lines.length; i++) {
              const values = parseCSVLine(lines[i]);
              if (values.length > Math.max(valeurIdx, dateIdx)) {
                const valeur = parseFloat(values[valeurIdx]?.replace(/"/g, '') || '0');
                if (valeur > 0) {
                  transactions.push({
                    date_mutation: values[dateIdx]?.replace(/"/g, ''),
                    valeur_fonciere: valeur,
                    type_local: values[typeIdx]?.replace(/"/g, '') || 'Bien immobilier',
                    surface_reelle_bati: parseFloat(values[surfaceIdx]?.replace(/"/g, '') || '0') || null,
                    nombre_pieces_principales: parseInt(values[piecesIdx]?.replace(/"/g, '') || '0') || null,
                    adresse: `${values[numIdx]?.replace(/"/g, '') || ''} ${values[voieIdx]?.replace(/"/g, '') || ''}`.trim(),
                    code_postal: values[cpIdx]?.replace(/"/g, ''),
                    commune: values[communeIdx]?.replace(/"/g, ''),
                  });
                }
              }
            }
            console.log(`Found ${transactions.length} transactions after ${year}`);
          }
        } else {
          console.log(`${year} CSV status:`, response.status);
        }
      } catch (e: any) {
        console.log(`${year} error:`, e?.message || e);
      }
    }

    // Filter and deduplicate
    const seenKeys = new Set<string>();
    const validTransactions = transactions.filter(t => {
      if (!t.valeur_fonciere || t.valeur_fonciere <= 0 || !t.date_mutation) return false;
      const key = `${t.date_mutation}-${t.valeur_fonciere}-${t.adresse}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    // Sort by date descending
    validTransactions.sort((a, b) => 
      new Date(b.date_mutation).getTime() - new Date(a.date_mutation).getTime()
    );

    console.log(`Returning ${validTransactions.length} valid DVF transactions`);

    // Return up to 500 transactions for comprehensive filtering
    return new Response(
      JSON.stringify({ transactions: validTransactions.slice(0, 500) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to parse CSV lines with quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
