import React, { useState, useEffect } from 'react';
import { 
  Bot, MapPin, FileText, Users, Euro, AlertTriangle, Book, 
  Building2, Cloud, Image, ChevronDown, ExternalLink, Loader2, 
  RefreshCw, Check, Copy, Info, Shield, Thermometer, Wind, 
  Sun, Droplets, Trees, Train, ShoppingCart, GraduationCap,
  Heart, Eye, Map, Layers, Home, Car, Plane, Waves, Mountain,
  MessageSquare, ScanLine, HardHat, Hammer, Wrench, Calculator,
  Ruler, Banknote, ClipboardList, ArrowUpRight, ListTodo, FolderTree
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { usePropertyEnrichment } from '@/hooks/usePropertyEnrichment';
import { useExternalBuildingAnalysis } from '@/hooks/useExternalBuildingAnalysis';
import { useExteriorWorkEstimation } from '@/hooks/useExteriorWorkEstimation';
import { useExteriorFtCtStTasks } from '@/hooks/useExteriorFtCtStTasks';
import { UrbanismBlock } from '@/components/location/blocks/UrbanismBlock';
import type { PropertyEnrichmentResponse, AISummary } from '@/types/propertyEnrichment';

interface PropertyEnrichmentViewProps {
  address: string;
  postalCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  projectId?: string;
  className?: string;
}

// ============================================================
// Section Card (Collapsible Apple-style)
// ============================================================
const SectionCard: React.FC<{
  icon: React.ReactNode;
  emoji?: string;
  title: string;
  subtitle?: string;
  status?: 'loading' | 'success' | 'error' | 'empty';
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}> = ({ icon, emoji, title, subtitle, status, badge, children, defaultOpen = true, accentColor = 'primary' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-500/10 text-amber-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    purple: 'bg-purple-500/10 text-purple-600',
    red: 'bg-red-500/10 text-red-600',
    indigo: 'bg-indigo-500/10 text-indigo-600',
    cyan: 'bg-cyan-500/10 text-cyan-600',
    pink: 'bg-pink-500/10 text-pink-600',
    blue: 'bg-blue-500/10 text-blue-600',
    slate: 'bg-slate-500/10 text-slate-600',
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-card rounded-2xl border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl", colorMap[accentColor])}>
              {status === 'loading' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : emoji ? (
                <span>{emoji}</span>
              ) : (
                icon
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-base">{title}</h3>
                {badge}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {status === 'success' && <Check className="h-5 w-5 text-emerald-500" />}
              {status === 'error' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground/50 transition-transform duration-300",
                isOpen && "rotate-180"
              )} />
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <div className="border-t border-border/30 pt-4">
              {children}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// ============================================================
// Info Row
// ============================================================
const InfoRow: React.FC<{
  label: string;
  value: string | number | React.ReactNode | undefined | null;
  copyable?: boolean;
  highlight?: boolean;
}> = ({ label, value, copyable, highlight }) => {
  const handleCopy = () => {
    if (typeof value === 'string' || typeof value === 'number') {
      navigator.clipboard.writeText(String(value));
      toast.success('Copié');
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between py-2.5 border-b border-border/20 last:border-0",
      highlight && "bg-primary/5 -mx-3 px-3 rounded-lg"
    )}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn("text-sm font-medium text-right", highlight && "text-primary")}>
          {value ?? '—'}
        </span>
        {copyable && value && (
          <button onClick={handleCopy} className="p-1 hover:bg-muted rounded transition-colors">
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Risk Badge
// ============================================================
const RiskBadge: React.FC<{ level: 'low' | 'medium' | 'high' | string; label: string }> = ({ level, label }) => {
  const colors = {
    low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    high: 'bg-red-500/10 text-red-600 border-red-500/30',
  };
  const icons = { low: '✓', medium: '⚠', high: '⚠' };
  
  return (
    <Badge variant="outline" className={cn("gap-1", colors[level as keyof typeof colors] || colors.medium)}>
      <span>{icons[level as keyof typeof icons] || '?'}</span>
      {label}: {level === 'low' ? 'Faible' : level === 'medium' ? 'Moyen' : 'Élevé'}
    </Badge>
  );
};

// ============================================================
// Score Bar
// ============================================================
const ScoreBar: React.FC<{ label: string; score: number; icon: React.ReactNode }> = ({ label, score, icon }) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
          )} 
          style={{ width: `${score}%` }} 
        />
      </div>
    </div>
  </div>
);

// ============================================================
// Loading Skeleton
// ============================================================
const SectionSkeleton: React.FC = () => (
  <div className="bg-card rounded-2xl border border-border/40 p-4 space-y-3">
    <div className="flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
    <div className="space-y-2 pt-3 border-t border-border/30">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================
export const PropertyEnrichmentView: React.FC<PropertyEnrichmentViewProps> = ({
  address,
  postalCode,
  city,
  latitude,
  longitude,
  projectId,
  className,
}) => {
  const { data, isLoading, error, enrichProperty, getSourceStatusSummary } = usePropertyEnrichment();
  const { 
    analysis: externalAnalysis, 
    isLoading: isAnalyzing, 
    error: analysisError,
    analyzeBuilding,
    getStateColor,
    getStateBgColor,
    getConditionLabel,
    getConditionColor,
  } = useExternalBuildingAnalysis();
  const {
    estimation: workEstimation,
    isLoading: isEstimating,
    error: estimationError,
    estimateWorks,
    getPriorityColor,
    getPriorityBgColor,
    getPriorityLabel,
    getComplexityLabel,
    getComplexityColor,
    formatCurrency,
  } = useExteriorWorkEstimation();
  const {
    tasks: ftCtStTasks,
    isGenerating: isGeneratingTasks,
    isLoading: isLoadingTasks,
    error: tasksError,
    generateTasks,
    loadTasks,
    getPriorityColor: getTaskPriorityColor,
    getPriorityBgColor: getTaskPriorityBgColor,
    getPriorityLabel: getTaskPriorityLabel,
    formatCurrency: formatTaskCurrency,
  } = useExteriorFtCtStTasks();
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showWorkPlanningDialog, setShowWorkPlanningDialog] = useState(false);
  const [showEstimationDetails, setShowEstimationDetails] = useState(false);
  const [estimationId, setEstimationId] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    if (address || (latitude && longitude)) {
      const fullAddress = [address, postalCode, city].filter(Boolean).join(' ');
      enrichProperty({
        address: fullAddress || undefined,
        latitude,
        longitude,
        projectId,
      });
    }
  }, [address, latitude, longitude, projectId]);

  const handleRefresh = () => {
    const fullAddress = [address, postalCode, city].filter(Boolean).join(' ');
    enrichProperty({
      address: fullAddress || undefined,
      latitude,
      longitude,
      projectId,
      refresh: true,
    });
  };

  const statusSummary = getSourceStatusSummary();

  // Show loading state
  if (isLoading && !data) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between px-2 mb-4">
          <div>
            <h1 className="text-xl font-bold">Fiche Bien Premium</h1>
            <p className="text-sm text-muted-foreground">{address}</p>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
        {[...Array(5)].map((_, i) => <SectionSkeleton key={i} />)}
      </div>
    );
  }

  // Show error state
  if (error && !data) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-20 px-6", className)}>
        <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
        <p className="text-muted-foreground text-center max-w-md mb-4">{error}</p>
        <Button onClick={handleRefresh}>Réessayer</Button>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-20 px-6", className)}>
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
          <MapPin className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Fiche Bien Premium</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Saisissez une adresse pour générer automatiquement la fiche complète du bien.
        </p>
      </div>
    );
  }

  const { aiSummary, sourceStatus } = data;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 mb-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Fiche Bien Premium
          </h1>
          <p className="text-sm text-muted-foreground">{data.address?.normalized || address}</p>
          {statusSummary && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">10 sections</Badge>
              <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                <Check className="h-3 w-3 mr-1" />
                {statusSummary.successRate}% sources OK
              </Badge>
              {data.cached && (
                <Badge variant="outline" className="text-xs">Cache</Badge>
              )}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="gap-2 rounded-full"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualiser
        </Button>
      </div>

      {/* 0. RESUME IA */}
      <SectionCard
        emoji="🤖"
        icon={<Bot className="h-6 w-6" />}
        title="Résumé Expert"
        subtitle={aiSummary?.headline || 'Analyse IA du bien'}
        status={sourceStatus?.ai === 'OK' ? 'success' : sourceStatus?.ai === 'ERROR' ? 'error' : 'loading'}
        badge={aiSummary && <Badge className="bg-primary/10 text-primary border-0">IA</Badge>}
        accentColor="purple"
      >
        {aiSummary ? (
          <div className="space-y-4">
            {/* Headline */}
            <p className="text-lg font-semibold text-foreground leading-relaxed">
              {aiSummary.headline}
            </p>
            
            {/* Bullet Points */}
            <ul className="space-y-2">
              {aiSummary.bulletPoints?.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            
            {/* Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              <RiskBadge level={aiSummary.riskLevelGlobal} label="Risque global" />
              <RiskBadge level={aiSummary.renovationPotential} label="Potentiel travaux" />
            </div>

            {/* Strengths / Weaknesses */}
            {(aiSummary.strengths?.length || aiSummary.weaknesses?.length) && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                {aiSummary.strengths?.length > 0 && (
                  <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                    <h4 className="text-xs font-semibold text-emerald-600 mb-2">Points forts</h4>
                    <ul className="space-y-1 text-xs">
                      {aiSummary.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500">✓</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiSummary.weaknesses?.length > 0 && (
                  <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
                    <h4 className="text-xs font-semibold text-amber-600 mb-2">Points de vigilance</h4>
                    <ul className="space-y-1 text-xs">
                      {aiSummary.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500">⚠</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {/* Visit Recommendations Button */}
            {aiSummary.commentsForTechnicalVisit && (
              <Dialog open={showVisitDialog} onOpenChange={setShowVisitDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2 mt-2">
                    <MessageSquare className="h-4 w-4" />
                    Recommandations visite technique
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Recommandations pour la visite technique
                    </DialogTitle>
                  </DialogHeader>
                  <div className="p-4 bg-muted/30 rounded-xl text-sm leading-relaxed whitespace-pre-line">
                    {aiSummary.commentsForTechnicalVisit}
                  </div>
                  {aiSummary.recommendations?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">Actions recommandées</h4>
                      <ul className="space-y-2">
                        {aiSummary.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm p-2 bg-primary/5 rounded-lg">
                            <span className="text-primary font-bold">{i + 1}.</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Analyse IA non disponible</p>
        )}
      </SectionCard>

      {/* 1. LOCALISATION & ADRESSE */}
      <SectionCard
        emoji="📍"
        icon={<MapPin className="h-6 w-6" />}
        title="Localisation & Adresse"
        subtitle={data.address?.city || city}
        status={sourceStatus?.ban === 'OK' ? 'success' : 'error'}
        accentColor="blue"
      >
        <div className="space-y-1">
          <InfoRow label="Adresse normalisée" value={data.address?.normalized} copyable />
          <InfoRow label="Ville" value={data.address?.city} />
          <InfoRow label="Code postal" value={data.address?.postalCode} copyable />
          <InfoRow label="Code INSEE" value={data.address?.codeInsee} copyable />
          <InfoRow label="Latitude" value={data.address?.latitude?.toFixed(6)} copyable />
          <InfoRow label="Longitude" value={data.address?.longitude?.toFixed(6)} copyable />
          <InfoRow label="Altitude" value={data.address?.altitude ? `${data.address.altitude} m` : undefined} />
          <InfoRow label="GPS" value={data.address?.formattedGps} copyable />
        </div>
        
        {/* Mini Map */}
        {data.address?.latitude && data.address?.longitude && (
          <div className="mt-4 rounded-xl overflow-hidden border h-40">
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.address.longitude - 0.003},${data.address.latitude - 0.002},${data.address.longitude + 0.003},${data.address.latitude + 0.002}&layer=mapnik&marker=${data.address.latitude},${data.address.longitude}`}
              className="w-full h-full"
              title="Carte"
            />
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 gap-2"
          onClick={() => window.open(`https://www.google.com/maps?q=${data.address?.latitude},${data.address?.longitude}`, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir dans Google Maps
        </Button>
      </SectionCard>

      {/* 2. CADASTRE & FONCIER */}
      <SectionCard
        emoji="📑"
        icon={<FileText className="h-6 w-6" />}
        title="Cadastre & Foncier"
        subtitle={data.cadastre?.section && data.cadastre?.parcelle 
          ? `Section ${data.cadastre.section} - Parcelle ${data.cadastre.parcelle}` 
          : 'Références cadastrales'}
        status={sourceStatus?.cadastre === 'OK' ? 'success' : sourceStatus?.cadastre === 'EMPTY' ? 'empty' : 'error'}
        accentColor="amber"
      >
        {data.cadastre ? (
          <>
            <div className="space-y-1">
              <InfoRow label="Section" value={data.cadastre.section} copyable />
              <InfoRow label="Numéro parcelle" value={data.cadastre.parcelle} copyable />
              <InfoRow label="Surface parcelle" value={data.cadastre.surfaceM2 ? `${data.cadastre.surfaceM2.toLocaleString('fr-FR')} m²` : undefined} highlight />
              <InfoRow label="Commune" value={data.cadastre.commune} />
            </div>
            
            {/* Cadastral Map */}
            {data.address?.latitude && data.address?.longitude && (
              <div className="mt-4 rounded-xl overflow-hidden border h-40">
                <iframe
                  src={`https://cadastre.data.gouv.fr/map#18/${data.address.latitude}/${data.address.longitude}`}
                  className="w-full h-full"
                  title="Plan cadastral"
                />
              </div>
            )}
            
            {data.cadastre.planUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 gap-2"
                onClick={() => window.open(data.cadastre?.planUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Voir plan cadastral
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Données cadastrales non disponibles</p>
        )}
      </SectionCard>

      {/* 3. PROPRIETAIRES & STRUCTURES JURIDIQUES */}
      <SectionCard
        emoji="🏠"
        icon={<Users className="h-6 w-6" />}
        title="Propriétaires & Structures juridiques"
        subtitle={data.owners?.type === 'company' ? 'Personne morale' : data.owners?.type === 'person' ? 'Particulier' : 'Type inconnu'}
        status={sourceStatus?.pappers === 'OK' ? 'success' : sourceStatus?.pappers === 'SKIPPED' ? 'empty' : 'error'}
        accentColor="indigo"
      >
        {data.owners ? (
          <>
            <InfoRow label="Type de propriétaire" value={
              data.owners.type === 'company' ? 'Personne morale / Société' :
              data.owners.type === 'person' ? 'Particulier' :
              data.owners.type === 'coownership' ? 'Copropriété' :
              data.owners.type === 'public' ? 'Collectivité publique' :
              'Type inconnu'
            } />
            {data.owners.estimationType && (
              <InfoRow label="Estimation type" value={data.owners.estimationType} />
            )}
            
            {data.owners.companies && data.owners.companies.length > 0 && (
              <div className="mt-4 space-y-3">
                {data.owners.companies.map((company, i) => (
                  <div key={i} className="p-3 bg-muted/30 rounded-xl space-y-1">
                    <p className="font-semibold text-sm">{company.name}</p>
                    {company.siren && <InfoRow label="SIREN" value={company.siren} copyable />}
                    {company.siret && <InfoRow label="SIRET" value={company.siret} copyable />}
                    {company.legalForm && <InfoRow label="Forme juridique" value={company.legalForm} />}
                    {company.representative && <InfoRow label="Représentant" value={company.representative} />}
                    {company.registeredAddress && <InfoRow label="Siège" value={company.registeredAddress} />}
                    {company.pappersUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 gap-2"
                        onClick={() => window.open(company.pappersUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Voir sur Pappers
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Informations limitées (données non publiques ou non disponibles)
          </p>
        )}
      </SectionCard>

      {/* 4. MARCHE IMMO & DVF */}
      <SectionCard
        emoji="💶"
        icon={<Euro className="h-6 w-6" />}
        title="Marché Immobilier & DVF"
        subtitle={data.market?.pricePerM2Estimated ? `~${data.market.pricePerM2Estimated.toLocaleString('fr-FR')} €/m²` : 'Valeurs foncières'}
        status={sourceStatus?.dvf === 'OK' ? 'success' : sourceStatus?.dvf === 'EMPTY' ? 'empty' : 'error'}
        accentColor="emerald"
      >
        {data.market ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-emerald-500/5 rounded-xl text-center border border-emerald-500/20">
                <p className="text-2xl font-bold text-emerald-600">
                  {data.market.pricePerM2Estimated?.toLocaleString('fr-FR') || '—'}
                </p>
                <p className="text-xs text-muted-foreground">€/m² estimé</p>
              </div>
              <div className="p-3 bg-blue-500/5 rounded-xl text-center border border-blue-500/20">
                <p className="text-2xl font-bold text-blue-600">
                  {data.market.transactionCount || 0}
                </p>
                <p className="text-xs text-muted-foreground">transactions</p>
              </div>
            </div>
            
            {data.market.medianPricePerM2Local && (
              <InfoRow label="Prix médian local" value={`${data.market.medianPricePerM2Local.toLocaleString('fr-FR')} €/m²`} />
            )}
            
            {/* Transactions récentes */}
            {data.market.lastTransactions && data.market.lastTransactions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Transactions récentes
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data.market.lastTransactions.slice(0, 5).map((t, i) => (
                    <div key={i} className="p-3 bg-muted/30 rounded-xl text-sm">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{t.type}</span>
                        <span className="text-emerald-600 font-semibold">
                          {t.price.toLocaleString('fr-FR')} €
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t.surfaceM2} m² • {new Date(t.date).toLocaleDateString('fr-FR')}
                        {t.pricePerM2 && ` • ${t.pricePerM2.toLocaleString('fr-FR')} €/m²`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Données de marché non disponibles</p>
        )}
      </SectionCard>

      {/* 5. RISQUES & ENVIRONNEMENT */}
      <SectionCard
        emoji="⚠️"
        icon={<AlertTriangle className="h-6 w-6" />}
        title="Risques & Environnement"
        subtitle={`Niveau global: ${data.risks?.globalRiskLevel === 'low' ? 'Faible' : data.risks?.globalRiskLevel === 'medium' ? 'Moyen' : 'Élevé'}`}
        status={sourceStatus?.georisques === 'OK' ? 'success' : 'error'}
        badge={data.risks?.globalRiskLevel && (
          <Badge className={cn(
            "border-0",
            data.risks.globalRiskLevel === 'low' ? 'bg-emerald-500/10 text-emerald-600' :
            data.risks.globalRiskLevel === 'medium' ? 'bg-amber-500/10 text-amber-600' :
            'bg-red-500/10 text-red-600'
          )}>
            {data.risks.globalRiskLevel === 'low' ? 'Faible' : 
             data.risks.globalRiskLevel === 'medium' ? 'Moyen' : 'Élevé'}
          </Badge>
        )}
        accentColor="red"
      >
        {data.risks ? (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {data.risks.flood?.level && data.risks.flood.level !== 'unknown' && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                  <Waves className="h-3 w-3 mr-1" />
                  Inondation: {data.risks.flood.level}
                </Badge>
              )}
              {data.risks.clay?.level && data.risks.clay.level !== 'unknown' && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  <Mountain className="h-3 w-3 mr-1" />
                  Argiles: {data.risks.clay.level}
                </Badge>
              )}
              {data.risks.seismic?.zone > 0 && (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                  Sismique: Zone {data.risks.seismic.zone}
                </Badge>
              )}
              {data.risks.radon?.level && data.risks.radon.level !== 'unknown' && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                  Radon: {data.risks.radon.level}
                </Badge>
              )}
              {data.risks.industrial?.seveso && (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                  ⚠ SEVESO
                </Badge>
              )}
              {data.risks.industrial?.icpe && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  ICPE à proximité
                </Badge>
              )}
              {data.risks.forestFire?.level && data.risks.forestFire.level !== 'unknown' && (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                  Feu forêt: {data.risks.forestFire.level}
                </Badge>
              )}
            </div>
            
            {data.risks.industrial?.sites && data.risks.industrial.sites.length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Sites industriels proches</h4>
                <div className="space-y-1">
                  {data.risks.industrial.sites.slice(0, 3).map((site, i) => (
                    <div key={i} className="text-sm flex justify-between">
                      <span>{site.name}</span>
                      <span className="text-muted-foreground">{site.distance}m</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 gap-2"
              onClick={() => window.open(`https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi`, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Voir rapport Géorisques
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Données de risques non disponibles</p>
        )}
      </SectionCard>

      {/* 6. URBANISME & PLU - MODULE GPU */}
      <UrbanismBlock 
        urbanismData={data.urbanism}
        isLoading={isLoading}
      />

      {/* 7. VIE DE QUARTIER & SERVICES */}
      <SectionCard
        emoji="🏙"
        icon={<Building2 className="h-6 w-6" />}
        title="Vie de Quartier & Services"
        subtitle={data.district?.walkScore ? `Walk Score: ${data.district.walkScore}/100` : 'Analyse du quartier'}
        status={sourceStatus?.osm === 'OK' ? 'success' : 'error'}
        accentColor="pink"
      >
        {data.district ? (
          <>
            {data.district.walkScore && (
              <div className="p-4 bg-primary/5 rounded-xl text-center mb-4 border border-primary/20">
                <p className="text-3xl font-bold text-primary">{data.district.walkScore}</p>
                <p className="text-sm text-muted-foreground">Walk Score</p>
              </div>
            )}
            
            {data.district.scores && (
              <div className="space-y-3">
                {data.district.scores.shops !== undefined && (
                  <ScoreBar label="Commerces" score={data.district.scores.shops} icon={<ShoppingCart className="h-4 w-4" />} />
                )}
                {data.district.scores.schools !== undefined && (
                  <ScoreBar label="Écoles" score={data.district.scores.schools} icon={<GraduationCap className="h-4 w-4" />} />
                )}
                {data.district.scores.transport !== undefined && (
                  <ScoreBar label="Transports" score={data.district.scores.transport} icon={<Train className="h-4 w-4" />} />
                )}
                {data.district.scores.greenAreas !== undefined && (
                  <ScoreBar label="Espaces verts" score={data.district.scores.greenAreas} icon={<Trees className="h-4 w-4" />} />
                )}
                {data.district.scores.health !== undefined && (
                  <ScoreBar label="Santé" score={data.district.scores.health} icon={<Heart className="h-4 w-4" />} />
                )}
              </div>
            )}
            
            {data.district.airQuality && (
              <div className="mt-4 p-3 bg-muted/30 rounded-xl">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Qualité de l'air</h4>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Indice européen</span>
                  <Badge variant={data.district.airQuality.index < 50 ? 'default' : 'destructive'}>
                    {data.district.airQuality.index}
                  </Badge>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Données de quartier non disponibles</p>
        )}
      </SectionCard>

      {/* 8. CLIMAT */}
      <SectionCard
        emoji="🌤"
        icon={<Cloud className="h-6 w-6" />}
        title="Climat & Conditions locales"
        subtitle={data.climate?.currentWeather?.description || 'Données météo'}
        status={sourceStatus?.climate === 'OK' ? 'success' : 'error'}
        accentColor="cyan"
      >
        {data.climate ? (
          <>
            {data.climate.currentWeather && (
              <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl mb-4 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{data.climate.currentWeather.temperature}°C</p>
                    <p className="text-sm text-muted-foreground">{data.climate.currentWeather.description}</p>
                  </div>
                  <Sun className="h-12 w-12 text-amber-500" />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              {data.climate.avgTempYear && (
                <div className="p-3 bg-muted/30 rounded-xl text-center">
                  <Thermometer className="h-5 w-5 mx-auto mb-1 text-red-500" />
                  <p className="text-lg font-bold">{data.climate.avgTempYear}°C</p>
                  <p className="text-xs text-muted-foreground">Temp. moy./an</p>
                </div>
              )}
              {data.climate.sunHoursYear && (
                <div className="p-3 bg-muted/30 rounded-xl text-center">
                  <Sun className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                  <p className="text-lg font-bold">{data.climate.sunHoursYear}h</p>
                  <p className="text-xs text-muted-foreground">Ensoleillement/an</p>
                </div>
              )}
              {data.climate.avgRainMmYear && (
                <div className="p-3 bg-muted/30 rounded-xl text-center">
                  <Droplets className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-lg font-bold">{data.climate.avgRainMmYear}mm</p>
                  <p className="text-xs text-muted-foreground">Précipitations/an</p>
                </div>
              )}
              {data.climate.prevailingWind && (
                <div className="p-3 bg-muted/30 rounded-xl text-center">
                  <Wind className="h-5 w-5 mx-auto mb-1 text-slate-500" />
                  <p className="text-lg font-bold">{data.climate.prevailingWind}</p>
                  <p className="text-xs text-muted-foreground">Vent dominant</p>
                </div>
              )}
            </div>
            
            {data.climate.solarExposure && (
              <InfoRow 
                label="Exposition solaire" 
                value={data.climate.solarExposure === 'high' ? '☀️ Élevée' : 
                       data.climate.solarExposure === 'medium' ? '🌤 Moyenne' : '☁️ Faible'} 
              />
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Données climatiques non disponibles</p>
        )}
      </SectionCard>

      {/* 9. IMAGES & VUES */}
      <SectionCard
        emoji="🗺"
        icon={<Image className="h-6 w-6" />}
        title="Images & Vues"
        subtitle="Vue rue et aérienne"
        status={sourceStatus?.imagery === 'OK' ? 'success' : sourceStatus?.imagery === 'EMPTY' ? 'empty' : 'error'}
        accentColor="slate"
      >
        {data.imagery ? (
          <div className="space-y-4">
            {/* Vue rue (Mapillary) */}
            {data.imagery.streetViewUrl && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Vue rue (Mapillary)
                </h4>
                <div className="rounded-xl overflow-hidden border">
                  <img 
                    src={data.imagery.streetViewUrl} 
                    alt="Vue rue" 
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Vue aérienne */}
            {data.imagery.aerialImageUrl && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Vue aérienne
                </h4>
                <div className="rounded-xl overflow-hidden border">
                  <img 
                    src={data.imagery.aerialImageUrl} 
                    alt="Vue aérienne" 
                    className="w-full h-48 object-cover"
                  />
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              {data.imagery.streetViewUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => window.open(`https://www.mapillary.com/app/?lat=${data.address?.latitude}&lng=${data.address?.longitude}&z=17`, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                  Mapillary
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => window.open(`https://www.google.com/maps/@${data.address?.latitude},${data.address?.longitude},18z`, '_blank')}
              >
                <Map className="h-4 w-4" />
                Google Maps
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Images non disponibles</p>
        )}
      </SectionCard>

      {/* 10. ANALYSE EXTERIEURE (IA) */}
      <SectionCard
        emoji="🏗️"
        icon={<ScanLine className="h-6 w-6" />}
        title="Analyse Extérieure (IA)"
        subtitle={externalAnalysis?.analysis?.buildingType 
          ? `${externalAnalysis.analysis.buildingType} • ${externalAnalysis.analysis.floorsEstimated} étages`
          : 'Diagnostic façade, toiture, pathologies'}
        status={isAnalyzing ? 'loading' : externalAnalysis ? 'success' : undefined}
        badge={externalAnalysis && <Badge className="bg-purple-500/10 text-purple-600 border-0">IA Vision</Badge>}
        accentColor="indigo"
      >
        {/* Trigger Analysis Button */}
        {!externalAnalysis && !isAnalyzing && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Analysez automatiquement les façades, toiture et pathologies visibles via les images Mapillary et aériennes.
            </p>
            <Button
              onClick={() => analyzeBuilding({
                projectId,
                imageUrl: data.imagery?.streetViewUrl,
                lat: data.address?.latitude,
                lon: data.address?.longitude,
                address: data.address?.normalized,
              })}
              disabled={isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="h-4 w-4" />
              )}
              Lancer l'analyse IA
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Analyse des images en cours...</p>
          </div>
        )}

        {/* Error State */}
        {analysisError && !isAnalyzing && (
          <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/30">
            <p className="text-sm text-destructive">{analysisError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyzeBuilding({
                projectId,
                imageUrl: data.imagery?.streetViewUrl,
                lat: data.address?.latitude,
                lon: data.address?.longitude,
                address: data.address?.normalized,
              })}
              className="mt-2"
            >
              Réessayer
            </Button>
          </div>
        )}

        {/* Analysis Results */}
        {externalAnalysis && (
          <div className="space-y-4">
            {/* Building Type & Floors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/30 rounded-xl text-center">
                <Home className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-sm font-semibold capitalize">{externalAnalysis.analysis.buildingType}</p>
                <p className="text-xs text-muted-foreground">Type bâtiment</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-xl text-center">
                <Layers className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-sm font-semibold">{externalAnalysis.analysis.floorsEstimated}</p>
                <p className="text-xs text-muted-foreground">Étages estimés</p>
              </div>
            </div>

            {/* Global Condition Badge */}
            <div className="flex justify-center">
              <Badge 
                variant="outline" 
                className={cn("px-4 py-2 text-sm", getConditionColor(externalAnalysis.analysis.globalExteriorCondition))}
              >
                {externalAnalysis.analysis.globalExteriorCondition === 'low' ? '✓' : '⚠'}{' '}
                {getConditionLabel(externalAnalysis.analysis.globalExteriorCondition)}
              </Badge>
            </div>

            {/* Facade Analysis */}
            <div className={cn("p-4 rounded-xl border", getStateBgColor(externalAnalysis.analysis.facadeState))}>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Façade
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Matériau:</span>
                  <span className="ml-2 font-medium capitalize">{externalAnalysis.analysis.facadeMaterial}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">État:</span>
                  <span className={cn("ml-2 font-medium capitalize", getStateColor(externalAnalysis.analysis.facadeState))}>
                    {externalAnalysis.analysis.facadeState}
                  </span>
                </div>
              </div>
              
              {externalAnalysis.analysis.facadePathologies.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground">Pathologies détectées:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {externalAnalysis.analysis.facadePathologies.map((pathology, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-background/50">
                        {pathology}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Roof Analysis */}
            <div className={cn("p-4 rounded-xl border", getStateBgColor(externalAnalysis.analysis.roofState))}>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Home className="h-4 w-4" />
                Toiture
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Matériau:</span>
                  <span className="ml-2 font-medium capitalize">{externalAnalysis.analysis.roofMaterial}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">État:</span>
                  <span className={cn("ml-2 font-medium capitalize", getStateColor(externalAnalysis.analysis.roofState))}>
                    {externalAnalysis.analysis.roofState}
                  </span>
                </div>
              </div>
            </div>

            {/* Other Details */}
            <div className="space-y-2">
              <InfoRow label="Balcons" value={externalAnalysis.analysis.balconies} />
              <InfoRow label="Menuiseries" value={externalAnalysis.analysis.windowsType} />
            </div>

            {/* Thermal Weaknesses */}
            {externalAnalysis.analysis.externalThermalWeaknesses.length > 0 && 
             !externalAnalysis.analysis.externalThermalWeaknesses.includes('aucune information') && (
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
                <h4 className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1.5">
                  <Thermometer className="h-3.5 w-3.5" />
                  Faiblesses thermiques
                </h4>
                <ul className="text-sm space-y-1">
                  {externalAnalysis.analysis.externalThermalWeaknesses.map((weakness, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-500">•</span>
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Structural Alerts */}
            {externalAnalysis.analysis.potentialStructuralAlerts.length > 0 && 
             !externalAnalysis.analysis.potentialStructuralAlerts.includes('aucune alerte') && (
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/30">
                <h4 className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Alertes structurelles potentielles
                </h4>
                <ul className="text-sm space-y-1">
                  {externalAnalysis.analysis.potentialStructuralAlerts.map((alert, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-red-500">⚠</span>
                      <span>{alert}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Work Planning Comments Dialog */}
            {externalAnalysis.analysis.commentsForWorkPlanning?.length > 0 && (
              <Dialog open={showWorkPlanningDialog} onOpenChange={setShowWorkPlanningDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <HardHat className="h-4 w-4" />
                    Recommandations chantier
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-primary" />
                      Recommandations pour le chantier
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    {externalAnalysis.analysis.commentsForWorkPlanning.map((comment, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                          {i + 1}
                        </span>
                        <p className="text-sm flex-1">{comment}</p>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Images Analyzed */}
            {externalAnalysis.imagesAnalyzed?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Images analysées ({externalAnalysis.imagesAnalyzed.length})
                </h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {externalAnalysis.imagesAnalyzed.map((url, i) => (
                    <img 
                      key={i}
                      src={url} 
                      alt={`Image analysée ${i + 1}`}
                      className="h-20 w-32 object-cover rounded-lg border flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Re-analyze Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 mt-2"
              onClick={() => analyzeBuilding({
                projectId,
                imageUrl: data.imagery?.streetViewUrl,
                lat: data.address?.latitude,
                lon: data.address?.longitude,
                address: data.address?.normalized,
              })}
              disabled={isAnalyzing}
            >
              <RefreshCw className="h-4 w-4" />
              Relancer l'analyse
            </Button>
          </div>
        )}
      </SectionCard>

      {/* 10. PRE-ESTIMATION DES TRAVAUX EXTERIEURS */}
      <SectionCard
        emoji="💰"
        icon={<Calculator className="h-6 w-6" />}
        title="Pré-estimation Travaux Extérieurs"
        subtitle={workEstimation?.estimation ? 
          `Budget: ${formatCurrency(workEstimation.estimation.globalBudgetMin)} - ${formatCurrency(workEstimation.estimation.globalBudgetMax)}` : 
          'Estimation des coûts de rénovation'}
        status={isEstimating ? 'loading' : workEstimation ? 'success' : undefined}
        badge={workEstimation?.estimation && (
          <Badge className={cn("text-xs", getComplexityColor(workEstimation.estimation.complexityLevel))}>
            {getComplexityLabel(workEstimation.estimation.complexityLevel)}
          </Badge>
        )}
        accentColor="emerald"
        defaultOpen={!!workEstimation}
      >
        {!workEstimation ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Calculator className="h-8 w-8 text-emerald-600" />
            </div>
            <h4 className="font-semibold mb-2">Estimer les travaux extérieurs</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Générez une estimation basée sur l'analyse de façade, toiture et l'état du bâtiment
            </p>
            <Button
              onClick={() => estimateWorks({
                projectId,
                snapshotId: data.snapshotId,
              })}
              disabled={isEstimating || !externalAnalysis}
              className="gap-2"
            >
              {isEstimating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Banknote className="h-4 w-4" />
              )}
              Lancer l'estimation
            </Button>
            {!externalAnalysis && (
              <p className="text-xs text-amber-600 mt-3">
                ⚠️ Lancez d'abord l'analyse extérieure ci-dessus
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Budget Global Bar */}
            <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl border border-emerald-500/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  Budget global estimé
                </h4>
                <Badge className={cn("text-xs", getComplexityColor(workEstimation.estimation.complexityLevel))}>
                  Complexité: {getComplexityLabel(workEstimation.estimation.complexityLevel)}
                </Badge>
              </div>
              
              <div className="relative pt-2">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(workEstimation.estimation.globalBudgetMin)}
                  </span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(workEstimation.estimation.globalBudgetMax)}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden relative">
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500 opacity-30"
                  />
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Fourchette indicative HT (hors maîtrise d'œuvre et imprévus)
                </p>
              </div>
            </div>

            {/* Works List */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Postes de travaux ({workEstimation.estimation.works.length})
              </h4>
              
              {workEstimation.estimation.works.map((work, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "p-3 rounded-xl border",
                    getPriorityBgColor(work.priority)
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-bold">
                        {i + 1}
                      </span>
                      <h5 className="font-medium text-sm">{work.name}</h5>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getPriorityColor(work.priority))}
                    >
                      Priorité: {getPriorityLabel(work.priority)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    <div className="flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Quantité:</span>
                      <span className="font-medium">{work.quantity}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Coût:</span>
                      <span className="font-medium">
                        {formatCurrency(work.costMin)} - {formatCurrency(work.costMax)}
                      </span>
                    </div>
                  </div>
                  
                  {work.reason && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Raison:</span> {work.reason}
                    </p>
                  )}
                  
                  {work.dependencies && work.dependencies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {work.dependencies.map((dep, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Context Info */}
            {workEstimation.buildingContext && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Contexte de l'estimation
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {workEstimation.buildingContext.address && (
                    <div>
                      <span className="text-muted-foreground">Adresse:</span>
                      <span className="ml-1 font-medium">{workEstimation.buildingContext.address}</span>
                    </div>
                  )}
                  {workEstimation.buildingContext.surface && (
                    <div>
                      <span className="text-muted-foreground">Surface cadastrale:</span>
                      <span className="ml-1 font-medium">{workEstimation.buildingContext.surface} m²</span>
                    </div>
                  )}
                  {workEstimation.buildingContext.floorsEstimated && (
                    <div>
                      <span className="text-muted-foreground">Étages estimés:</span>
                      <span className="ml-1 font-medium">{workEstimation.buildingContext.floorsEstimated}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Re-estimate Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2"
              onClick={async () => {
                const result = await estimateWorks({
                  projectId,
                  snapshotId: data.snapshotId,
                });
                if (result?.savedId) {
                  setEstimationId(result.savedId);
                }
              }}
              disabled={isEstimating}
            >
              <RefreshCw className="h-4 w-4" />
              Relancer l'estimation
            </Button>
          </div>
        )}
      </SectionCard>

      {/* 11. TÂCHES FT/CT/ST EXTÉRIEURES */}
      <SectionCard
        emoji="📋"
        icon={<FolderTree className="h-6 w-6" />}
        title="Tâches FT/CT/ST Extérieures"
        subtitle={ftCtStTasks.length > 0 
          ? `${ftCtStTasks.length} tâches classifiées` 
          : 'Classification DSC des travaux'}
        status={isGeneratingTasks ? 'loading' : ftCtStTasks.length > 0 ? 'success' : undefined}
        badge={ftCtStTasks.length > 0 && (
          <Badge className="bg-blue-500/10 text-blue-600 border-0">DSC</Badge>
        )}
        accentColor="blue"
        defaultOpen={ftCtStTasks.length > 0}
      >
        {!ftCtStTasks.length ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <ListTodo className="h-8 w-8 text-blue-600" />
            </div>
            <h4 className="font-semibold mb-2">Générer les tâches FT/CT/ST</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Convertissez les postes de travaux en tâches classifiées selon le référentiel FT/CT/ST
            </p>
            <Button
              onClick={async () => {
                if (!workEstimation?.savedId && !estimationId) {
                  toast.error('Lancez d\'abord l\'estimation des travaux');
                  return;
                }
                const result = await generateTasks({
                  exteriorWorkEstimationId: estimationId || workEstimation?.savedId || '',
                  projectId,
                });
                if (result?.success) {
                  toast.success(`${result.tasksCount} tâches FT/CT/ST générées`);
                }
              }}
              disabled={isGeneratingTasks || (!workEstimation && !estimationId)}
              className="gap-2"
            >
              {isGeneratingTasks ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderTree className="h-4 w-4" />
              )}
              Générer les tâches FT/CT/ST
            </Button>
            {!workEstimation && !estimationId && (
              <p className="text-xs text-amber-600 mt-3">
                ⚠️ Lancez d'abord l'estimation des travaux ci-dessus
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tasks Summary Header */}
            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-blue-600" />
                  Tâches classifiées DSC
                </h4>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                  {ftCtStTasks.length} tâches
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Classification automatique selon le référentiel Famille / Catégorie / Sous-catégorie
              </p>
            </div>

            {/* Tasks List - Timeline Style */}
            <div className="space-y-3">
              {ftCtStTasks.map((task, i) => (
                <div 
                  key={task.id} 
                  className={cn(
                    "p-4 rounded-xl border bg-card",
                    getTaskPriorityBgColor(task.priority)
                  )}
                >
                  {/* Task Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 text-sm font-bold">
                        {i + 1}
                      </span>
                      <div>
                        <h5 className="font-semibold text-sm">{task.work_name}</h5>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs flex-shrink-0", getTaskPriorityColor(task.priority))}
                    >
                      {getTaskPriorityLabel(task.priority)}
                    </Badge>
                  </div>

                  {/* FT / CT / ST Path */}
                  <div className="p-3 bg-muted/30 rounded-lg mb-3">
                    <div className="text-xs text-muted-foreground mb-1.5">Chemin tâche DSC</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                        FT: {task.ft_family}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                        CT: {task.ct_category}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge className="bg-pink-500/10 text-pink-600 border-pink-500/30">
                        ST: {task.st_subcategory}
                      </Badge>
                    </div>
                  </div>

                  {/* Quantities & Costs */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Quantité:</span>
                      <span className="font-medium">{task.work_quantity || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Coût:</span>
                      <span className="font-medium">
                        {task.cost_min && task.cost_max 
                          ? `${formatTaskCurrency(task.cost_min)} - ${formatTaskCurrency(task.cost_max)}`
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Reason */}
                  {task.reason && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <span className="text-xs text-muted-foreground">Raison: </span>
                      <span className="text-xs">{task.reason}</span>
                    </div>
                  )}

                  {/* Dependencies */}
                  {Array.isArray(task.dependencies) && task.dependencies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(task.dependencies as string[]).map((dep, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Regenerate Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2"
              onClick={async () => {
                if (!workEstimation?.savedId && !estimationId) {
                  toast.error('Aucune estimation disponible');
                  return;
                }
                const result = await generateTasks({
                  exteriorWorkEstimationId: estimationId || workEstimation?.savedId || '',
                  projectId,
                });
                if (result?.success) {
                  toast.success(`${result.tasksCount} tâches régénérées`);
                }
              }}
              disabled={isGeneratingTasks}
            >
              <RefreshCw className="h-4 w-4" />
              Régénérer les tâches
            </Button>
          </div>
        )}

        {/* Error State */}
        {tasksError && (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30 mt-3">
            <p className="text-sm text-destructive">{tasksError}</p>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default PropertyEnrichmentView;
