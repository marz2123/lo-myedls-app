import { useState, useCallback, useRef } from 'react';

export interface AddressSuggestion {
  id: string;
  label: string;
  housenumber?: string;
  street?: string;
  postcode: string;
  city: string;
  citycode: string; // INSEE code
  context: string;
  score: number;
  lat: number;
  lon: number;
  source: 'ban' | 'nominatim';
}

interface AddressFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    label: string;
    score: number;
    housenumber?: string;
    id: string;
    type: string;
    name: string;
    postcode: string;
    citycode: string;
    x: number;
    y: number;
    city: string;
    context: string;
    importance: number;
    street?: string;
  };
}

interface AddressAPIResponse {
  type: string;
  version: string;
  features: AddressFeature[];
  attribution: string;
  licence: string;
  query: string;
  limit: number;
}

interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  class: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    ISO3166_2_lvl6?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

// Search BAN API (Base Adresse Nationale)
const searchBAN = async (query: string, signal: AbortSignal): Promise<AddressSuggestion[]> => {
  const encodedQuery = encodeURIComponent(query);
  const response = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodedQuery}&limit=5&autocomplete=1`,
    { signal }
  );

  if (!response.ok) {
    throw new Error('Erreur BAN API');
  }

  const data: AddressAPIResponse = await response.json();

  return data.features.map((feature) => ({
    id: feature.properties.id,
    label: feature.properties.label,
    housenumber: feature.properties.housenumber,
    street: feature.properties.street || feature.properties.name,
    postcode: feature.properties.postcode,
    city: feature.properties.city,
    citycode: feature.properties.citycode,
    context: feature.properties.context,
    score: feature.properties.score,
    lat: feature.geometry.coordinates[1],
    lon: feature.geometry.coordinates[0],
    source: 'ban' as const,
  }));
};

// Search Nominatim (OpenStreetMap) - better for bis/ter addresses
const searchNominatim = async (query: string, signal: AbortSignal): Promise<AddressSuggestion[]> => {
  const encodedQuery = encodeURIComponent(query + ', France');
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&countrycodes=fr&limit=5`,
    { 
      signal,
      headers: {
        'Accept-Language': 'fr',
        'User-Agent': 'MyEDLS-App/1.0'
      }
    }
  );

  if (!response.ok) {
    throw new Error('Erreur Nominatim API');
  }

  const data: NominatimResult[] = await response.json();

  return data
    .filter(result => result.address?.postcode) // Only results with postcode
    .map((result) => {
      const city = result.address.city || result.address.town || result.address.village || result.address.municipality || '';
      const street = result.address.road || '';
      const housenumber = result.address.house_number;
      
      // Build label
      let label = '';
      if (housenumber) label += housenumber + ' ';
      if (street) label += street + ' ';
      if (result.address.postcode) label += result.address.postcode + ' ';
      if (city) label += city;

      return {
        id: `nominatim-${result.place_id}`,
        label: label.trim() || result.display_name,
        housenumber,
        street,
        postcode: result.address.postcode || '',
        city,
        citycode: '', // Nominatim doesn't provide INSEE code
        context: result.address.county || result.address.state || '',
        score: result.importance,
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        source: 'nominatim' as const,
      };
    });
};

// Check if query contains bis/ter/quater suffix
const hasSuffix = (query: string): boolean => {
  return /\d+\s*(bis|ter|quater|[a-d])\b/i.test(query);
};

export const useFrenchAddressSearch = () => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchAddresses = useCallback(async (query: string) => {
    // Clear previous suggestions if query is too short
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the API call
    debounceTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        // Check if query has bis/ter suffix - prioritize Nominatim
        const queryHasSuffix = hasSuffix(query);
        
        let allResults: AddressSuggestion[] = [];

        if (queryHasSuffix) {
          // For bis/ter addresses, try Nominatim first (better support)
          // then BAN as fallback
          const [nominatimResults, banResults] = await Promise.allSettled([
            searchNominatim(query, signal),
            searchBAN(query, signal)
          ]);

          // Prioritize Nominatim results for bis/ter
          if (nominatimResults.status === 'fulfilled' && nominatimResults.value.length > 0) {
            allResults = nominatimResults.value;
          }
          
          // Add BAN results if they have the exact house number
          if (banResults.status === 'fulfilled') {
            const banWithHousenumber = banResults.value.filter(r => r.housenumber);
            // Add BAN results that aren't duplicates
            for (const banResult of banWithHousenumber) {
              const isDuplicate = allResults.some(r => 
                Math.abs(r.lat - banResult.lat) < 0.0001 && 
                Math.abs(r.lon - banResult.lon) < 0.0001
              );
              if (!isDuplicate) {
                allResults.push(banResult);
              }
            }
          }

          // If still no results, use BAN street-level results
          if (allResults.length === 0 && banResults.status === 'fulfilled') {
            allResults = banResults.value;
          }
        } else {
          // For regular addresses, use BAN (faster and official)
          const banResults = await searchBAN(query, signal);
          allResults = banResults;

          // If no BAN results, try Nominatim as fallback
          if (allResults.length === 0) {
            const nominatimResults = await searchNominatim(query, signal);
            allResults = nominatimResults;
          }
        }

        // Sort by score/importance
        allResults.sort((a, b) => b.score - a.score);

        setSuggestions(allResults.slice(0, 6));
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    searchAddresses,
    clearSuggestions,
  };
};
