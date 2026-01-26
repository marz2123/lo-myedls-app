import { useState, useCallback } from 'react';

export interface ClimateData {
  // Current weather
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  weatherCode: number;
  
  // Annual averages
  annualPrecipitation?: number;
  annualTemperatureMax?: number;
  annualTemperatureMin?: number;
  annualSunshineHours?: number;
  
  // Dominant wind
  dominantWindDirection?: string;
  
  // Solar exposure
  solarExposure?: 'Faible' | 'Modérée' | 'Élevée';
}

export interface MeteoResponse {
  climate: ClimateData;
  lastUpdate: string;
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Ciel dégagé',
  1: 'Peu nuageux',
  2: 'Partiellement nuageux',
  3: 'Couvert',
  45: 'Brouillard',
  48: 'Brouillard givrant',
  51: 'Bruine légère',
  53: 'Bruine modérée',
  55: 'Bruine dense',
  61: 'Pluie légère',
  63: 'Pluie modérée',
  65: 'Pluie forte',
  71: 'Neige légère',
  73: 'Neige modérée',
  75: 'Neige forte',
  80: 'Averses légères',
  81: 'Averses modérées',
  82: 'Averses violentes',
  95: 'Orage',
  96: 'Orage avec grêle',
  99: 'Orage violent avec grêle',
};

const getWindDirectionLabel = (degrees: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

const getSolarExposure = (sunshineHours: number): 'Faible' | 'Modérée' | 'Élevée' => {
  if (sunshineHours < 1800) return 'Faible';
  if (sunshineHours < 2200) return 'Modérée';
  return 'Élevée';
};

export const useMeteoData = () => {
  const [meteoData, setMeteoData] = useState<MeteoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeteoData = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch current weather from Open-Meteo
      const currentResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m&timezone=Europe/Paris`
      );

      if (!currentResponse.ok) {
        throw new Error('Erreur lors de la récupération des données météo');
      }

      const currentData = await currentResponse.json();

      // Fetch historical climate data (last year's daily averages)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);

      const climateResponse = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration,wind_direction_10m_dominant&timezone=Europe/Paris`
      );

      let annualData: any = null;
      if (climateResponse.ok) {
        annualData = await climateResponse.json();
      }

      // Calculate annual statistics
      let annualPrecipitation = 0;
      let annualTemperatureMax = 0;
      let annualTemperatureMin = 0;
      let annualSunshineHours = 0;
      let dominantWindCounts: Record<string, number> = {};

      if (annualData?.daily) {
        const { temperature_2m_max, temperature_2m_min, precipitation_sum, sunshine_duration, wind_direction_10m_dominant } = annualData.daily;
        
        if (precipitation_sum) {
          annualPrecipitation = precipitation_sum.reduce((a: number, b: number) => a + (b || 0), 0);
        }
        
        if (temperature_2m_max && temperature_2m_min) {
          annualTemperatureMax = temperature_2m_max.reduce((a: number, b: number) => a + (b || 0), 0) / temperature_2m_max.length;
          annualTemperatureMin = temperature_2m_min.reduce((a: number, b: number) => a + (b || 0), 0) / temperature_2m_min.length;
        }
        
        if (sunshine_duration) {
          annualSunshineHours = sunshine_duration.reduce((a: number, b: number) => a + (b || 0), 0) / 3600; // Convert seconds to hours
        }
        
        if (wind_direction_10m_dominant) {
          wind_direction_10m_dominant.forEach((dir: number) => {
            if (dir !== null) {
              const label = getWindDirectionLabel(dir);
              dominantWindCounts[label] = (dominantWindCounts[label] || 0) + 1;
            }
          });
        }
      }

      const dominantWind = Object.entries(dominantWindCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      const climate: ClimateData = {
        temperature: currentData.current?.temperature_2m || 0,
        humidity: currentData.current?.relative_humidity_2m || 0,
        windSpeed: currentData.current?.wind_speed_10m || 0,
        windDirection: currentData.current?.wind_direction_10m || 0,
        precipitation: currentData.current?.precipitation || 0,
        weatherCode: currentData.current?.weather_code || 0,
        annualPrecipitation: Math.round(annualPrecipitation),
        annualTemperatureMax: Math.round(annualTemperatureMax * 10) / 10,
        annualTemperatureMin: Math.round(annualTemperatureMin * 10) / 10,
        annualSunshineHours: Math.round(annualSunshineHours),
        dominantWindDirection: dominantWind,
        solarExposure: getSolarExposure(annualSunshineHours),
      };

      setMeteoData({
        climate,
        lastUpdate: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Meteo fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getWeatherDescription = useCallback((code: number): string => {
    return WEATHER_CODES[code] || 'Inconnu';
  }, []);

  return {
    meteoData,
    isLoading,
    error,
    fetchMeteoData,
    getWeatherDescription,
  };
};
