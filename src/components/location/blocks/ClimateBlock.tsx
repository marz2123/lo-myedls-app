import { Cloud, Sun, Thermometer, Droplets, Wind, Compass } from 'lucide-react';
import { SmartBlock, InfoGrid, InfoRow, StatusBadge } from './SmartBlock';
import { MeteoResponse } from '@/hooks/useMeteoData';

interface ClimateBlockProps {
  meteoData?: MeteoResponse | null;
  isLoading?: boolean;
  getWeatherDescription?: (code: number) => string;
}

export const ClimateBlock = ({
  meteoData,
  isLoading,
  getWeatherDescription,
}: ClimateBlockProps) => {
  const climate = meteoData?.climate;

  const getExposureStatus = (exposure?: string): 'success' | 'warning' | 'info' => {
    if (exposure === 'Élevée') return 'success';
    if (exposure === 'Modérée') return 'info';
    return 'warning';
  };

  return (
    <SmartBlock
      icon={<Sun className="h-5 w-5" />}
      title="Données climatiques"
      subtitle="Météo actuelle et moyennes annuelles"
      isLoading={isLoading}
      badge={climate?.solarExposure ? (
        <StatusBadge 
          status={getExposureStatus(climate.solarExposure)} 
          label={`Exposition ${climate.solarExposure.toLowerCase()}`} 
        />
      ) : undefined}
      defaultOpen={false}
    >
      {climate ? (
        <div className="space-y-6">
          {/* Current weather */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Météo actuelle
            </p>
            
            <div className="bg-gradient-to-br from-blue-500/10 to-sky-500/10 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/50 dark:bg-white/10 flex items-center justify-center">
                    <Thermometer className="h-7 w-7 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{climate.temperature}°C</p>
                    <p className="text-sm text-muted-foreground">
                      {getWeatherDescription?.(climate.weatherCode) || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Humidité</p>
                  <p className="text-lg font-semibold">{climate.humidity}%</p>
                </div>
              </div>
            </div>

            <InfoGrid
              items={[
                { 
                  label: 'Vent', 
                  value: `${climate.windSpeed} km/h`,
                  icon: <Wind className="h-4 w-4" />
                },
                { 
                  label: 'Direction', 
                  value: getWindDirection(climate.windDirection),
                  icon: <Compass className="h-4 w-4" />
                },
                { 
                  label: 'Précipitations', 
                  value: `${climate.precipitation} mm`,
                  icon: <Droplets className="h-4 w-4" />
                },
                { 
                  label: 'Humidité', 
                  value: `${climate.humidity}%`,
                  icon: <Cloud className="h-4 w-4" />
                },
              ]}
            />
          </div>

          {/* Annual averages */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Moyennes annuelles
            </p>
            <div className="space-y-1">
              <InfoRow
                label="Température max moyenne"
                value={climate.annualTemperatureMax ? `${climate.annualTemperatureMax}°C` : 'N/A'}
                icon={<Thermometer className="h-4 w-4" />}
              />
              <InfoRow
                label="Température min moyenne"
                value={climate.annualTemperatureMin ? `${climate.annualTemperatureMin}°C` : 'N/A'}
                icon={<Thermometer className="h-4 w-4" />}
              />
              <InfoRow
                label="Précipitations annuelles"
                value={climate.annualPrecipitation ? `${climate.annualPrecipitation} mm` : 'N/A'}
                icon={<Droplets className="h-4 w-4" />}
              />
              <InfoRow
                label="Ensoleillement annuel"
                value={climate.annualSunshineHours ? `${climate.annualSunshineHours} h` : 'N/A'}
                icon={<Sun className="h-4 w-4" />}
              />
              <InfoRow
                label="Vent dominant"
                value={climate.dominantWindDirection || 'N/A'}
                icon={<Wind className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* Solar exposure */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <Sun className="h-6 w-6 text-amber-500" />
              <div>
                <p className="font-medium">Exposition solaire</p>
                <p className="text-sm text-muted-foreground">
                  {climate.solarExposure === 'Élevée' && 'Zone très ensoleillée (>2200h/an)'}
                  {climate.solarExposure === 'Modérée' && 'Ensoleillement moyen (1800-2200h/an)'}
                  {climate.solarExposure === 'Faible' && 'Zone peu ensoleillée (<1800h/an)'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Cloud className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Données climatiques non disponibles</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Source : Open-Meteo
          </p>
        </div>
      )}
    </SmartBlock>
  );
};

const getWindDirection = (degrees: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};
