import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  Leaf, 
  Euro, 
  AlertTriangle, 
  CheckCircle2,
  Thermometer,
  Wind,
  Sun,
  Loader2,
  RefreshCw,
  TrendingUp,
  Home
} from 'lucide-react';
import { useEnergyAnalysis } from '@/hooks/useEnergyAnalysis';
import { DPEGauge } from './DPEGauge';
import { EnergyRecommendationCard } from './EnergyRecommendationCard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EnergyDashboardProps {
  projectId: string;
}

export const EnergyDashboard: React.FC<EnergyDashboardProps> = ({ projectId }) => {
  const {
    profile,
    recommendations,
    forecasts,
    isLoading,
    isAnalyzing,
    error,
    loadEnergyProfile,
    runEnergyAnalysis,
    acceptRecommendation,
  } = useEnergyAnalysis(projectId);

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadEnergyProfile();
  }, [loadEnergyProfile]);

  const handleRunAnalysis = async () => {
    try {
      await runEnergyAnalysis();
      toast.success('Analyse énergétique terminée');
    } catch (err) {
      toast.error('Erreur lors de l\'analyse');
    }
  };

  const handleAcceptRecommendation = async (id: string) => {
    try {
      await acceptRecommendation(id);
      toast.success('Recommandation acceptée');
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="p-4 rounded-full bg-primary/10">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-lg">Diagnostic Énergétique</h3>
            <p className="text-muted-foreground text-sm max-w-md mt-1">
              Lancez l'analyse pour obtenir un diagnostic énergétique complet avec 
              estimation DPE, consommation et recommandations de travaux.
            </p>
          </div>
          <Button onClick={handleRunAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Lancer l'analyse énergétique
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Diagnostic Énergétique
          </h2>
          <p className="text-muted-foreground text-sm">
            Analysé le {new Date(profile.analyzed_at || profile.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={profile.ai_confidence_score && profile.ai_confidence_score > 0.7 ? 'default' : 'secondary'}>
            Confiance: {Math.round((profile.ai_confidence_score || 0) * 100)}%
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRunAnalysis} disabled={isAnalyzing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isAnalyzing && 'animate-spin')} />
            Actualiser
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* DPE Gauges */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Étiquette Énergie
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.classe_energie && (
                  <DPEGauge
                    classe={profile.classe_energie}
                    value={profile.consommation_kwh_m2_an}
                    type="energie"
                    size="md"
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Leaf className="h-4 w-4" />
                  Étiquette Climat
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.classe_ges && (
                  <DPEGauge
                    classe={profile.classe_ges}
                    value={profile.emissions_co2_kg_m2_an}
                    type="ges"
                    size="md"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Euro className="h-4 w-4" />
                  Coût annuel
                </div>
                <div className="text-2xl font-bold mt-1">
                  {formatCurrency(profile.cout_annuel_energie)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Zap className="h-4 w-4" />
                  Consommation
                </div>
                <div className="text-2xl font-bold mt-1">
                  {profile.consommation_totale_kwh 
                    ? `${Math.round(profile.consommation_totale_kwh).toLocaleString()} kWh`
                    : '-'
                  }
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Leaf className="h-4 w-4" />
                  Émissions CO₂
                </div>
                <div className="text-2xl font-bold mt-1">
                  {profile.emissions_co2_kg_an 
                    ? `${Math.round(profile.emissions_co2_kg_an).toLocaleString()} kg`
                    : '-'
                  }
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Home className="h-4 w-4" />
                  Surface
                </div>
                <div className="text-2xl font-bold mt-1">
                  {profile.surface_habitable_m2 
                    ? `${profile.surface_habitable_m2} m²`
                    : '-'
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scores */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Isolation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Progress value={profile.isolation_score || 0} className="flex-1" />
                  <span className="font-semibold">{profile.isolation_score || 0}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wind className="h-4 w-4" />
                  Étanchéité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Progress value={profile.etancheite_score || 0} className="flex-1" />
                  <span className="font-semibold">{profile.etancheite_score || 0}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Conformité RE2020
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Progress value={profile.score_re2020 || 0} className="flex-1" />
                  <span className="font-semibold">{profile.score_re2020 || 0}%</span>
                </div>
                {profile.conformite_re2020 ? (
                  <Badge className="mt-2 bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Conforme
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="mt-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Non conforme
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-6 mt-6">
          {/* Equipment Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Équipements détectés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Chauffage</span>
                  <span className="font-medium">{profile.chauffage_type || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Énergie</span>
                  <span className="font-medium">{profile.chauffage_energie || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Rendement</span>
                  <span className="font-medium">
                    {profile.chauffage_rendement ? `${profile.chauffage_rendement}%` : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Ventilation</span>
                  <span className="font-medium">{profile.ventilation_type || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Menuiseries</span>
                  <span className="font-medium">{profile.menuiseries_type || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Qualité menuiseries</span>
                  <span className="font-medium">{profile.menuiseries_qualite || '-'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Répartition consommation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Chauffage</span>
                    <span>{profile.consommation_chauffage_kwh?.toLocaleString() || '-'} kWh</span>
                  </div>
                  <Progress 
                    value={profile.consommation_totale_kwh 
                      ? ((profile.consommation_chauffage_kwh || 0) / profile.consommation_totale_kwh) * 100 
                      : 0
                    } 
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Eau chaude</span>
                    <span>{profile.consommation_ecs_kwh?.toLocaleString() || '-'} kWh</span>
                  </div>
                  <Progress 
                    value={profile.consommation_totale_kwh 
                      ? ((profile.consommation_ecs_kwh || 0) / profile.consommation_totale_kwh) * 100 
                      : 0
                    } 
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Électricité</span>
                    <span>{profile.consommation_electrique_kwh?.toLocaleString() || '-'} kWh</span>
                  </div>
                  <Progress 
                    value={profile.consommation_totale_kwh 
                      ? ((profile.consommation_electrique_kwh || 0) / profile.consommation_totale_kwh) * 100 
                      : 0
                    } 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Thermal Bridges */}
          {profile.ponts_thermiques_detectes && profile.ponts_thermiques_detectes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Ponts thermiques détectés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {profile.ponts_thermiques_detectes.map((pt, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div>
                        <div className="font-medium">{pt.location}</div>
                        <div className="text-sm text-muted-foreground">{pt.type}</div>
                      </div>
                      <Badge variant={
                        pt.severity === 'important' ? 'destructive' :
                        pt.severity === 'moyen' ? 'default' : 'secondary'
                      }>
                        {pt.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4 mt-6">
          {recommendations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  Aucune recommandation disponible
                </p>
              </CardContent>
            </Card>
          ) : (
            recommendations.map((rec) => (
              <EnergyRecommendationCard
                key={rec.id}
                recommendation={rec}
                onAccept={() => handleAcceptRecommendation(rec.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="simulation" className="mt-6">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <h3 className="font-semibold">Simulation Travaux</h3>
                <p className="text-muted-foreground text-sm max-w-md mt-1">
                  Simulez l'impact de différents travaux sur la performance 
                  énergétique de votre bien.
                </p>
              </div>
              <Button variant="outline" disabled>
                Bientôt disponible
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
