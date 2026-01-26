import { FileText, AlertTriangle, Shield, MapPin, CheckCircle2, XCircle, ExternalLink, Landmark } from 'lucide-react';
import { SmartBlock, InfoRow, InfoGrid, StatusBadge } from './SmartBlock';
import { UrbanismData } from '@/types/propertyEnrichment';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UrbanismBlockProps {
  urbanismData?: UrbanismData | null;
  isLoading?: boolean;
}

export const UrbanismBlock = ({
  urbanismData,
  isLoading,
}: UrbanismBlockProps) => {
  const hasData = urbanismData && (
    urbanismData.communeCovered || 
    urbanismData.zones?.length || 
    urbanismData.documents?.length ||
    urbanismData.prescriptionsSurf?.length ||
    urbanismData.hasServitudes
  );

  const getDocumentTypeLabel = (typedoc?: string) => {
    if (!typedoc) return 'Document';
    if (typedoc.includes('PLU')) return 'PLU';
    if (typedoc.includes('PLUi')) return 'PLUi';
    if (typedoc.includes('POS')) return 'POS';
    if (typedoc.includes('CC')) return 'Carte Communale';
    return typedoc;
  };

  const getPrescriptionTypeLabel = (typepsc?: string, stypepsc?: string) => {
    if (stypepsc) return stypepsc;
    if (typepsc) return typepsc;
    return 'Prescription';
  };

  return (
    <SmartBlock
      icon={<Landmark className="h-5 w-5" />}
      title="Urbanisme & PLU"
      subtitle="Géoportail de l'Urbanisme (GPU)"
      isLoading={isLoading}
      badge={
        urbanismData?.zone ? (
          <StatusBadge 
            status="info" 
            label={`Zone ${urbanismData.zone}`} 
          />
        ) : undefined
      }
      defaultOpen={false}
    >
      {hasData ? (
        <div className="space-y-6">
          {/* Couverture commune */}
          {urbanismData.communeCovered !== undefined && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Couverture urbanisme
              </p>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                {urbanismData.communeCovered ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {urbanismData.isRNU ? 'Commune au RNU' : 'Commune couverte par un PLU/PLUi'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {urbanismData.isRNU 
                          ? 'Règlement National d\'Urbanisme applicable'
                          : 'Document d\'urbanisme local disponible'
                        }
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-orange-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Données non disponibles</p>
                      <p className="text-xs text-muted-foreground">
                        Commune non couverte par le GPU
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Documents d'urbanisme */}
          {urbanismData.documents && urbanismData.documents.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Documents d'urbanisme applicables
              </p>
              <div className="space-y-2">
                {urbanismData.documents.map((doc, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">
                          {getDocumentTypeLabel(doc.typedoc)}
                        </span>
                        {doc.etat && (
                          <Badge variant={doc.etat === 'opposable' ? 'default' : 'secondary'} className="text-xs">
                            {doc.etat}
                          </Badge>
                        )}
                      </div>
                      {doc.urlpe && (
                        <a 
                          href={doc.urlpe} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-xs flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Consulter
                        </a>
                      )}
                    </div>
                    {doc.nomproc && (
                      <p className="text-xs text-muted-foreground">{doc.nomproc}</p>
                    )}
                    {doc.datappro && (
                      <p className="text-xs text-muted-foreground">
                        Approuvé le {new Date(doc.datappro).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zonage PLU */}
          {urbanismData.zones && urbanismData.zones.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Zonage PLU
              </p>
              <div className="space-y-2">
                {urbanismData.zones.map((zone, idx) => (
                  <div key={idx} className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-sm">
                            Zone {zone.libelle || zone.typezone}
                          </span>
                        </div>
                        {zone.libelong && (
                          <p className="text-sm text-muted-foreground ml-6">
                            {zone.libelong}
                          </p>
                        )}
                        {zone.destdomi && (
                          <p className="text-xs text-muted-foreground ml-6">
                            Destination : {zone.destdomi}
                          </p>
                        )}
                      </div>
                      {zone.urlfic && (
                        <a 
                          href={zone.urlfic} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-xs flex items-center gap-1 flex-shrink-0"
                        >
                          <FileText className="h-3 w-3" />
                          Règlement
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prescriptions */}
          {(urbanismData.prescriptionsSurf?.length || urbanismData.prescriptionsLin?.length || urbanismData.prescriptionsPct?.length) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Prescriptions urbanistiques
              </p>
              <div className="space-y-2">
                {urbanismData.prescriptionsSurf?.map((presc, idx) => (
                  <div key={`surf-${idx}`} className="p-3 bg-orange-50/50 dark:bg-orange-950/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{presc.libelle || 'Prescription surfacique'}</span>
                          <Badge variant="outline" className="text-xs">
                            {getPrescriptionTypeLabel(presc.typepsc, presc.stypepsc)}
                          </Badge>
                        </div>
                        {presc.txt && (
                          <p className="text-xs text-muted-foreground">{presc.txt}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {urbanismData.prescriptionsLin?.map((presc, idx) => (
                  <div key={`lin-${idx}`} className="p-3 bg-orange-50/50 dark:bg-orange-950/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{presc.libelle || 'Prescription linéaire'}</span>
                          <Badge variant="outline" className="text-xs">
                            {getPrescriptionTypeLabel(presc.typepsc, presc.stypepsc)}
                          </Badge>
                        </div>
                        {presc.txt && (
                          <p className="text-xs text-muted-foreground">{presc.txt}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {urbanismData.prescriptionsPct?.map((presc, idx) => (
                  <div key={`pct-${idx}`} className="p-3 bg-orange-50/50 dark:bg-orange-950/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{presc.libelle || 'Prescription ponctuelle'}</span>
                          <Badge variant="outline" className="text-xs">
                            {getPrescriptionTypeLabel(presc.typepsc, presc.stypepsc)}
                          </Badge>
                        </div>
                        {presc.txt && (
                          <p className="text-xs text-muted-foreground">{presc.txt}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Servitudes d'utilité publique */}
          {urbanismData.hasServitudes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Servitudes d'utilité publique (SUP)
              </p>
              <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                <Shield className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm">
                  <span className="font-semibold">
                    {urbanismData.servitudesCount || urbanismData.servitudes?.length || 0} servitude(s) détectée(s)
                  </span>
                  <div className="mt-2 space-y-1">
                    {urbanismData.servitudes?.slice(0, 3).map((sup, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-xs">•</span>
                        <div className="flex-1">
                          <p className="text-xs">{sup.libelle || sup.categorie || 'Servitude'}</p>
                          {sup.urlfic && (
                            <a 
                              href={sup.urlfic} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Document
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {urbanismData.servitudes && urbanismData.servitudes.length > 3 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        ... et {urbanismData.servitudes.length - 3} autre(s)
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Zone ABF */}
          {urbanismData.abfZone && (
            <div>
              <Alert className="border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20">
                <Landmark className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-sm">
                  <span className="font-semibold">Périmètre de protection ABF</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proximité de monument historique ({urbanismData.abfDistance}m)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Avis de l'Architecte des Bâtiments de France requis
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Source */}
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Source : {urbanismData.source || 'API Carto - Géoportail de l\'Urbanisme'}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Landmark className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Données d'urbanisme non disponibles
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Géoportail de l'Urbanisme (GPU)
          </p>
        </div>
      )}
    </SmartBlock>
  );
};
