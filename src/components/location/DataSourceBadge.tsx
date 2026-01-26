import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, HelpCircle, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DataSource = 
  | 'bdnb' 
  | 'rnc' 
  | 'ademe' 
  | 'georisques' 
  | 'gpu' 
  | 'merimee' 
  | 'insee' 
  | 'dvf' 
  | 'cadastre' 
  | 'ban'
  | 'open-meteo'
  | 'mapillary'
  | 'osm'
  | 'estimation'
  | 'unknown';

interface DataSourceBadgeProps {
  source: DataSource;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const SOURCE_CONFIG: Record<DataSource, {
  label: string;
  fullName: string;
  color: string;
  icon: React.ReactNode;
  isOfficial: boolean;
}> = {
  bdnb: {
    label: 'BDNB',
    fullName: 'Base de Données Nationale des Bâtiments',
    color: 'bg-emerald-500 hover:bg-emerald-600',
    icon: <CheckCircle className="w-3 h-3" />,
    isOfficial: true,
  },
  rnc: {
    label: 'RNC',
    fullName: 'Registre National des Copropriétés',
    color: 'bg-emerald-500 hover:bg-emerald-600',
    icon: <CheckCircle className="w-3 h-3" />,
    isOfficial: true,
  },
  ademe: {
    label: 'ADEME',
    fullName: 'Agence de la Transition Écologique',
    color: 'bg-green-500 hover:bg-green-600',
    icon: <CheckCircle className="w-3 h-3" />,
    isOfficial: true,
  },
  georisques: {
    label: 'Géorisques',
    fullName: 'Géorisques BRGM',
    color: 'bg-red-500 hover:bg-red-600',
    icon: <CheckCircle className="w-3 h-3" />,
    isOfficial: true,
  },
  gpu: {
    label: 'GPU',
    fullName: 'Géoportail de l\'Urbanisme',
    color: 'bg-purple-500 hover:bg-purple-600',
    icon: <CheckCircle className="w-3 h-3" />,
    isOfficial: true,
  },
  merimee: {
    label: 'Mérimée',
    fullName: 'Base Mérimée - Monuments Historiques',
    color: 'bg-amber-500 hover:bg-amber-600',
    icon: <CheckCircle className="w-3 h-3" />,
    isOfficial: true,
  },
  insee: {
    label: 'INSEE',
    fullName: 'Institut National de la Statistique',
    color: 'bg-blue-500 hover:bg-blue-600',
    icon: <CheckCircle className="w-3 h-3" />,
    isOfficial: true,
  },
  dvf: {
    label: 'DVF',
    fullName: 'Demandes de Valeurs Foncières',
    color: 'bg-green-600 hover:bg-green-700',
    icon: <CheckCircle className="w-3 h-3" />,
    isOfficial: true,
  },
  cadastre: {
    label: 'Cadastre',
    fullName: 'IGN API Carto Cadastre',
    color: 'bg-amber-600 hover:bg-amber-700',
    icon: <CheckCircle className="w-3 h-3" />,
    isOfficial: true,
  },
  ban: {
    label: 'BAN',
    fullName: 'Base Adresse Nationale',
    color: 'bg-blue-600 hover:bg-blue-700',
    icon: <CheckCircle className="w-3 h-3" />,
    isOfficial: true,
  },
  'open-meteo': {
    label: 'Open-Meteo',
    fullName: 'Open-Meteo API',
    color: 'bg-cyan-500 hover:bg-cyan-600',
    icon: <Database className="w-3 h-3" />,
    isOfficial: true,
  },
  mapillary: {
    label: 'Mapillary',
    fullName: 'Mapillary Street-Level Imagery',
    color: 'bg-indigo-500 hover:bg-indigo-600',
    icon: <Database className="w-3 h-3" />,
    isOfficial: true,
  },
  osm: {
    label: 'OSM',
    fullName: 'OpenStreetMap',
    color: 'bg-slate-500 hover:bg-slate-600',
    icon: <Database className="w-3 h-3" />,
    isOfficial: false,
  },
  estimation: {
    label: 'Estimation',
    fullName: 'Estimation IA',
    color: 'bg-amber-500 hover:bg-amber-600',
    icon: <AlertTriangle className="w-3 h-3" />,
    isOfficial: false,
  },
  unknown: {
    label: 'N/A',
    fullName: 'Source inconnue',
    color: 'bg-gray-400 hover:bg-gray-500',
    icon: <HelpCircle className="w-3 h-3" />,
    isOfficial: false,
  },
};

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({
  source,
  className,
  showLabel = true,
  size = 'sm',
}) => {
  const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.unknown;
  
  return (
    <Badge 
      className={cn(
        'text-white gap-1 font-medium',
        config.color,
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className
      )}
      title={config.fullName}
    >
      {config.icon}
      {showLabel && config.label}
    </Badge>
  );
};

export const OfficialDataIndicator: React.FC<{
  isOfficial: boolean;
  source?: DataSource;
  className?: string;
}> = ({ isOfficial, source, className }) => {
  if (isOfficial) {
    return (
      <div className={cn("flex items-center gap-1 text-emerald-600", className)}>
        <CheckCircle className="w-3 h-3" />
        <span className="text-[10px] font-medium">Officiel</span>
        {source && <DataSourceBadge source={source} size="sm" />}
      </div>
    );
  }
  
  return (
    <div className={cn("flex items-center gap-1 text-amber-600", className)}>
      <AlertTriangle className="w-3 h-3" />
      <span className="text-[10px] font-medium">À vérifier</span>
    </div>
  );
};
