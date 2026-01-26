import React from 'react';
import { 
  Home, 
  Building2, 
  User, 
  Calendar, 
  MapPin, 
  FileText, 
  ExternalLink,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Users,
  Clock,
  Euro,
  CheckCircle2,
  XCircle,
  Database,
  Bot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { PropertyOwnerData } from '@/hooks/usePappersData';

interface PropertyOwnersBlockProps {
  data: PropertyOwnerData | null;
  isLoading: boolean;
  error: string | null;
}

const DataRow: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  value: React.ReactNode;
  className?: string;
}> = ({ icon, label, value, className }) => (
  <div className={cn("flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0", className)}>
    <div className="text-muted-foreground mt-0.5">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  </div>
);

const SubSection: React.FC<{ 
  title: string; 
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4 last:mb-0">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-1 pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const APIStatusBadge: React.FC<{ status: string; name: string }> = ({ status, name }) => {
  const statusConfig = {
    success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    no_key: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    no_data: { icon: Database, color: 'text-muted-foreground', bg: 'bg-muted/30' },
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.no_data;
  const Icon = config.icon;
  
  return (
    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded text-xs", config.bg)}>
      <Icon className={cn("h-3 w-3", config.color)} />
      <span className={config.color}>{name}</span>
    </div>
  );
};

export const PropertyOwnersBlock: React.FC<PropertyOwnersBlockProps> = ({
  data,
  isLoading,
  error,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  if (isLoading) {
    return (
      <Card className="bg-card border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-48" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border-destructive/30 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="h-5 w-5 text-destructive" />
            Informations Propriétaires & Foncier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-card border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="h-5 w-5 text-primary" />
            Informations Propriétaires & Foncier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Saisissez une adresse pour charger les données propriétaires
          </p>
        </CardContent>
      </Card>
    );
  }

  const { pappers_entreprise, pappers_immobilier, majic_data, dvf_data, cadastre_data, ai_estimation, data_source, data_sources, api_status } = data;

  return (
    <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-5 w-5 text-primary" />
                Informations Propriétaires & Foncier
              </CardTitle>
              <div className="flex items-center gap-2">
                {data_source === 'pappers' && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <FileText className="h-3 w-3 mr-1" />
                    Pappers
                  </Badge>
                )}
                {data_source === 'majic' && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    <Database className="h-3 w-3 mr-1" />
                    MAJIC
                  </Badge>
                )}
                {data_source === 'cadastre_only' && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    <MapPin className="h-3 w-3 mr-1" />
                    Cadastre
                  </Badge>
                )}
                {data_source === 'ai_estimation' && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                    <Bot className="h-3 w-3 mr-1" />
                    Estimation IA
                  </Badge>
                )}
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* API Status Summary */}
            {api_status && (
              <div className="flex flex-wrap gap-2 pb-3 border-b border-border/30">
                <APIStatusBadge status={api_status.pappers} name="Pappers" />
                <APIStatusBadge status={api_status.dvf} name="DVF" />
                <APIStatusBadge status={api_status.cadastre} name="Cadastre" />
                <APIStatusBadge status={api_status.ai || 'no_data'} name="IA" />
              </div>
            )}

            {/* Proprietaires Section */}
            <SubSection 
              title="Propriétaires" 
              icon={<Users className="h-4 w-4 text-blue-500" />}
            >
              {pappers_immobilier?.proprietaires && pappers_immobilier.proprietaires.length > 0 ? (
                <div className="space-y-3">
                  {pappers_immobilier.proprietaires.map((prop, idx) => (
                    <div key={idx} className="bg-muted/20 rounded-lg p-4 border border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        {prop.type === 'morale' ? (
                          <Building2 className="h-5 w-5 text-indigo-500" />
                        ) : (
                          <User className="h-5 w-5 text-blue-500" />
                        )}
                        <span className="font-semibold text-base">
                          {prop.type === 'morale' 
                            ? (prop.denomination || prop.nom)
                            : `${prop.prenom || ''} ${prop.nom || ''}`.trim() || 'Non renseigné'}
                        </span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {prop.type === 'morale' ? 'Société' : 'Particulier'}
                        </Badge>
                      </div>
                      
                      {prop.type === 'morale' && (
                        <div className="ml-7 space-y-1.5 text-sm">
                          {prop.forme_juridique && (
                            <p className="text-muted-foreground">
                              <span className="text-foreground font-medium">Forme juridique:</span> {prop.forme_juridique}
                            </p>
                          )}
                          {prop.siren && (
                            <p className="text-muted-foreground">
                              <span className="text-foreground font-medium">SIREN:</span> {prop.siren}
                              {prop.siret && ` / SIRET: ${prop.siret}`}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="ml-7 mt-2 space-y-1.5 text-sm">
                        {(prop.adresse || prop.ville) && (
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <span>
                              {[prop.adresse, prop.code_postal, prop.ville].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                        {prop.date_acquisition && (
                          <p className="text-muted-foreground mt-2">
                            <Calendar className="h-3.5 w-3.5 inline mr-1" />
                            Acquisition: {new Date(prop.date_acquisition).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : majic_data?.proprietaires_moraux && majic_data.proprietaires_moraux.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Données MAJIC - Personnes morales uniquement
                  </p>
                  {majic_data.proprietaires_moraux.map((prop, idx) => (
                    <div key={idx} className="bg-muted/20 rounded-lg p-4 border border-border/30">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-indigo-500" />
                        <span className="font-semibold">{prop.denomination}</span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {prop.type_personne_morale}
                        </Badge>
                      </div>
                      {prop.siren && (
                        <p className="ml-7 text-sm text-muted-foreground mt-1">
                          SIREN: {prop.siren}
                        </p>
                      )}
                      <p className="ml-7 text-sm text-muted-foreground">
                        Droit: {prop.droit_propriete}
                      </p>
                    </div>
                  ))}
                </div>
              ) : ai_estimation ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg p-4 border border-purple-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="h-5 w-5 text-purple-500" />
                      <span className="font-semibold text-base">Estimation IA</span>
                      <Badge variant="outline" className="ml-auto text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                        Confiance: {Math.round((ai_estimation.confidence || 0) * 100)}%
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {ai_estimation.probable_owner_type === 'sci' || ai_estimation.probable_owner_type === 'fonciere' ? (
                          <Building2 className="h-4 w-4 text-indigo-500" />
                        ) : ai_estimation.probable_owner_type === 'copropriete' ? (
                          <Users className="h-4 w-4 text-blue-500" />
                        ) : (
                          <User className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-medium">
                          Type probable: {
                            ai_estimation.probable_owner_type === 'particulier' ? 'Particulier' :
                            ai_estimation.probable_owner_type === 'sci' ? 'SCI' :
                            ai_estimation.probable_owner_type === 'fonciere' ? 'Foncière immobilière' :
                            ai_estimation.probable_owner_type === 'copropriete' ? 'Copropriété' :
                            ai_estimation.probable_owner_type === 'collectivite' ? 'Collectivité' :
                            'Non déterminé'
                          }
                        </span>
                      </div>

                      {ai_estimation.property_profile && (
                        <div className="text-sm text-muted-foreground">
                          <Home className="h-3.5 w-3.5 inline mr-1.5" />
                          {ai_estimation.property_profile}
                        </div>
                      )}

                      {ai_estimation.estimated_acquisition_year && (
                        <div className="text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 inline mr-1.5" />
                          Acquisition estimée: {ai_estimation.estimated_acquisition_year}
                          {ai_estimation.estimated_acquisition_price && (
                            <span className="ml-2">
                              ({ai_estimation.estimated_acquisition_price.toLocaleString('fr-FR')} €)
                            </span>
                          )}
                        </div>
                      )}

                      {ai_estimation.market_context && (
                        <div className="text-sm text-muted-foreground">
                          <Euro className="h-3.5 w-3.5 inline mr-1.5" />
                          {ai_estimation.market_context}
                        </div>
                      )}

                      {ai_estimation.reasoning && (
                        <div className="mt-3 pt-3 border-t border-purple-500/20">
                          <p className="text-xs text-muted-foreground italic">
                            💡 {ai_estimation.reasoning}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Cette estimation est générée par IA à partir des données cadastrales et DVF disponibles
                  </p>
                </div>
              ) : (
                <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground mb-1">
                        Données propriétaires non disponibles
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        {api_status?.pappers === 'no_key' 
                          ? "Clé API Pappers non configurée. Les données propriétaires nécessitent un abonnement Pappers Immobilier."
                          : "Aucune donnée propriétaire trouvée pour cette adresse."}
                      </p>
                      <a 
                        href="https://www.pappers.fr/api" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        En savoir plus sur Pappers
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </SubSection>

            {/* Société Section */}
            {pappers_entreprise && (
              <SubSection 
                title="Société" 
                icon={<Building2 className="h-4 w-4 text-indigo-500" />}
              >
                <DataRow
                  icon={<Building2 className="h-4 w-4" />}
                  label="Raison sociale"
                  value={pappers_entreprise.denomination}
                />
                <DataRow
                  icon={<FileText className="h-4 w-4" />}
                  label="SIREN / SIRET"
                  value={`${pappers_entreprise.siren || '-'} / ${pappers_entreprise.siret || '-'}`}
                />
                <DataRow
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Forme juridique"
                  value={pappers_entreprise.forme_juridique}
                />
                {pappers_entreprise.siege && (
                  <DataRow
                    icon={<MapPin className="h-4 w-4" />}
                    label="Siège social"
                    value={`${pappers_entreprise.siege.adresse_ligne_1}, ${pappers_entreprise.siege.code_postal} ${pappers_entreprise.siege.ville}`}
                  />
                )}
                {pappers_entreprise.dirigeants && pappers_entreprise.dirigeants.length > 0 && (
                  <DataRow
                    icon={<Users className="h-4 w-4" />}
                    label="Dirigeants"
                    value={
                      <div className="space-y-1">
                        {pappers_entreprise.dirigeants.slice(0, 3).map((d, idx) => (
                          <div key={idx} className="text-sm">
                            {d.prenom} {d.nom} - <span className="text-muted-foreground">{d.fonction}</span>
                          </div>
                        ))}
                      </div>
                    }
                  />
                )}
                {pappers_entreprise.capital_social && (
                  <DataRow
                    icon={<Euro className="h-4 w-4" />}
                    label="Capital social"
                    value={`${pappers_entreprise.capital_social.toLocaleString('fr-FR')} €`}
                  />
                )}
              </SubSection>
            )}

            {/* Foncier Section */}
            <SubSection 
              title="Foncier & Cadastre" 
              icon={<MapPin className="h-4 w-4 text-emerald-500" />}
            >
              {cadastre_data ? (
                <>
                  <DataRow
                    icon={<FileText className="h-4 w-4" />}
                    label="Référence cadastrale"
                    value={
                      <span>
                        {cadastre_data.id_parcelle || `Section ${cadastre_data.section} - N°${cadastre_data.numero}`}
                      </span>
                    }
                  />
                  {cadastre_data.commune && (
                    <DataRow
                      icon={<MapPin className="h-4 w-4" />}
                      label="Commune"
                      value={cadastre_data.commune}
                    />
                  )}
                  {(cadastre_data.surface || cadastre_data.contenance) && (
                    <DataRow
                      icon={<Home className="h-4 w-4" />}
                      label="Surface parcelle"
                      value={`${(cadastre_data.surface || cadastre_data.contenance || 0).toLocaleString('fr-FR')} m²`}
                    />
                  )}
                  {cadastre_data.code_commune && (
                    <DataRow
                      icon={<Database className="h-4 w-4" />}
                      label="Code commune"
                      value={cadastre_data.code_commune}
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  Données cadastrales non disponibles
                </p>
              )}
            </SubSection>

            {/* Historique Section */}
            <SubSection 
              title="Historique & Transactions" 
              icon={<Clock className="h-4 w-4 text-orange-500" />}
              defaultOpen={false}
            >
              {dvf_data?.derniere_vente && (
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Dernière vente (DVF)</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-primary">
                      {dvf_data.derniere_vente.prix.toLocaleString('fr-FR')} €
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({dvf_data.derniere_vente.prix_m2.toLocaleString('fr-FR')} €/m²)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(dvf_data.derniere_vente.date).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {dvf_data.derniere_vente.type_local && ` • ${dvf_data.derniere_vente.type_local}`}
                  </p>
                </div>
              )}

              {dvf_data?.prix_moyen_m2 && (
                <DataRow
                  icon={<Euro className="h-4 w-4" />}
                  label="Prix moyen du secteur"
                  value={`${dvf_data.prix_moyen_m2.toLocaleString('fr-FR')} €/m²`}
                />
              )}

              {dvf_data?.historique_ventes && dvf_data.historique_ventes.length > 1 && (
                <div className="space-y-2 mt-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Historique ({dvf_data.nb_transactions || dvf_data.historique_ventes.length} transactions)
                  </p>
                  {dvf_data.historique_ventes.slice(1, 6).map((vente, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                      <div>
                        <span className="text-muted-foreground">
                          {new Date(vente.date).toLocaleDateString('fr-FR')}
                        </span>
                        {vente.type_local && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {vente.type_local}
                          </span>
                        )}
                      </div>
                      <span className="font-medium">
                        {vente.prix.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!dvf_data?.derniere_vente && (
                <p className="text-sm text-muted-foreground py-2">
                  Aucun historique de transaction disponible
                </p>
              )}
            </SubSection>

            {/* Data sources & Last updated */}
            <div className="pt-2 border-t border-border/30 space-y-1">
              {data_sources && data_sources.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Sources: {data_sources.join(', ')}
                </p>
              )}
              <p className="text-xs text-muted-foreground text-right">
                Mise à jour: {new Date(data.last_updated).toLocaleString('fr-FR')}
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PropertyOwnersBlock;
