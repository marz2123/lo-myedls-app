import { AlertTriangle, Shield, Droplets, Mountain, Flame, Wind, Factory, FileWarning, ExternalLink } from 'lucide-react';
import { SmartBlock, StatusBadge } from './SmartBlock';
import { GeorisquesResponse, RiskData } from '@/hooks/useGeorisques';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RisksBlockProps {
  riskData?: GeorisquesResponse | null;
  isLoading?: boolean;
  latitude?: number;
  longitude?: number;
  codeInsee?: string;
  smartFillerData?: Record<string, any> | null;
}

export const RisksBlock = ({
  riskData,
  isLoading,
  latitude,
  longitude,
  codeInsee,
  smartFillerData,
}: RisksBlockProps) => {
  // Merge smartFillerData if original data is missing
  const fillerRisks = smartFillerData?.risks?.data;
  const mergedRiskData = riskData || (fillerRisks ? { risks: fillerRisks } as GeorisquesResponse : null);
  const getRiskLevel = (data: RiskData): 'low' | 'medium' | 'high' => {
    let score = 0;
    if (data.naturels.inondation) score += 2;
    if (data.naturels.seisme >= 3) score += 2;
    if (data.naturels.seisme >= 4) score += 2;
    if (data.naturels.feuForet) score += 1;
    if (data.technologiques.nucleaire) score += 3;
    if (data.technologiques.icpe) score += 1;
    if (data.autres.catnat > 5) score += 2;
    
    if (score >= 5) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  };

  const level = mergedRiskData ? getRiskLevel(mergedRiskData.risks) : 'low';
  const levelConfig = {
    low: { status: 'success' as const, label: 'Risque faible' },
    medium: { status: 'warning' as const, label: 'Risque modéré' },
    high: { status: 'danger' as const, label: 'Risque élevé' },
  };

  const openGeorisques = () => {
    const url = codeInsee 
      ? `https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi/rapport?form-commune=true&codeInsee=${codeInsee}`
      : `https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi`;
    window.open(url, '_blank');
  };

  return (
    <SmartBlock
      icon={<AlertTriangle className="h-5 w-5" />}
      title="Risques & Environnement"
      subtitle="Risques naturels et technologiques"
      isLoading={isLoading}
      badge={mergedRiskData ? <StatusBadge {...levelConfig[level]} /> : undefined}
      headerAction={
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={openGeorisques}>
          <ExternalLink className="h-3 w-3" />
          Géorisques
        </Button>
      }
    >
      {mergedRiskData ? (
        <div className="space-y-6">
          {/* Natural risks */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Risques naturels
            </p>
            <div className="grid grid-cols-2 gap-2">
              <RiskItem
                icon={<Droplets className="h-4 w-4" />}
                label="Inondation"
                active={mergedRiskData.risks.naturels.inondation}
              />
              <RiskItem
                icon={<Mountain className="h-4 w-4" />}
                label={`Sismicité (zone ${mergedRiskData.risks.naturels.seisme}/5)`}
                active={mergedRiskData.risks.naturels.seisme >= 3}
                warning={mergedRiskData.risks.naturels.seisme >= 2}
              />
              <RiskItem
                icon={<Flame className="h-4 w-4" />}
                label="Feu de forêt"
                active={mergedRiskData.risks.naturels.feuForet}
              />
              <RiskItem
                icon={<Wind className="h-4 w-4" />}
                label={`Radon (${mergedRiskData.risks.naturels.radon}/3)`}
                active={mergedRiskData.risks.naturels.radon >= 2}
                warning={mergedRiskData.risks.naturels.radon >= 2}
              />
              <RiskItem
                icon={<Mountain className="h-4 w-4" />}
                label="Avalanche"
                active={mergedRiskData.risks.naturels.avalanche}
              />
              <RiskItem
                icon={<Mountain className="h-4 w-4" />}
                label="Volcan"
                active={mergedRiskData.risks.naturels.volcan}
              />
            </div>
            
            {/* Argiles */}
            <div className="mt-3 p-3 bg-muted/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mountain className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Argiles (retrait-gonflement)</span>
                </div>
                <span className="text-sm font-medium">{mergedRiskData.risks.naturels.argiles}</span>
              </div>
            </div>
          </div>

          {/* Technological risks */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Risques technologiques
            </p>
            <div className="grid grid-cols-2 gap-2">
              <RiskItem
                icon={<Factory className="h-4 w-4" />}
                label="ICPE / SEVESO"
                active={mergedRiskData.risks.technologiques.icpe}
              />
              <RiskItem
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Nucléaire"
                active={mergedRiskData.risks.technologiques.nucleaire}
              />
              <RiskItem
                icon={<Wind className="h-4 w-4" />}
                label="Canalisations"
                active={mergedRiskData.risks.technologiques.canalisations}
              />
            </div>
          </div>

          {/* Prevention plans */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Plans de prévention
            </p>
            <div className="grid grid-cols-2 gap-2">
              <RiskItem
                icon={<FileWarning className="h-4 w-4" />}
                label="PPRN"
                active={mergedRiskData.risks.autres.pprn}
                tooltip="Plan de Prévention des Risques Naturels"
              />
              <RiskItem
                icon={<FileWarning className="h-4 w-4" />}
                label="PPRT"
                active={mergedRiskData.risks.autres.pprt}
                tooltip="Plan de Prévention des Risques Technologiques"
              />
            </div>
            
            {mergedRiskData.risks.autres.catnat > 0 && (
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">
                    {mergedRiskData.risks.autres.catnat} arrêté(s) de catastrophe naturelle
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Données de risques non disponibles</p>
        </div>
      )}
    </SmartBlock>
  );
};

interface RiskItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  warning?: boolean;
  tooltip?: string;
}

const RiskItem = ({ icon, label, active, warning, tooltip }: RiskItemProps) => (
  <div
    className={cn(
      "flex items-center gap-2 p-3 rounded-xl transition-colors",
      active 
        ? "bg-red-500/10 border border-red-500/20" 
        : warning 
          ? "bg-amber-500/10 border border-amber-500/20"
          : "bg-muted/30"
    )}
    title={tooltip}
  >
    <span className={cn(
      active ? "text-red-500" : warning ? "text-amber-500" : "text-muted-foreground"
    )}>
      {icon}
    </span>
    <span className={cn(
      "text-sm",
      active ? "text-red-700 dark:text-red-400 font-medium" : warning ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
    )}>
      {label}
    </span>
    {active && (
      <span className="ml-auto text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">
        OUI
      </span>
    )}
  </div>
);
