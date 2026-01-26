import { FileText, ExternalLink, Copy, Check, Map } from 'lucide-react';
import { SmartBlock, InfoGrid, StatusBadge } from './SmartBlock';
import { CadastralData, CadastralParcel } from '@/hooks/useCadastralData';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface CadastreBlockProps {
  cadastralData?: CadastralData | null;
  isLoading?: boolean;
  getCadastralPlanUrl: (communeCode: string, section?: string, numero?: string) => string;
  latitude?: number;
  longitude?: number;
}

export const CadastreBlock = ({
  cadastralData,
  isLoading,
  getCadastralPlanUrl,
  latitude,
  longitude,
}: CadastreBlockProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copié');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const parcelsCount = cadastralData?.parcels?.length || 0;

  // Generate cadastral map iframe URL
  const getCadastralMapIframeUrl = () => {
    if (!latitude || !longitude) return null;
    // Use cadastre.data.gouv.fr map viewer with coordinates
    return `https://cadastre.data.gouv.fr/map#18/${latitude}/${longitude}`;
  };

  return (
    <SmartBlock
      icon={<FileText className="h-5 w-5" />}
      title="Cadastre & parcelle"
      subtitle={parcelsCount > 0 ? `${parcelsCount} parcelle${parcelsCount > 1 ? 's' : ''} identifiée${parcelsCount > 1 ? 's' : ''}` : 'Données cadastrales'}
      isLoading={isLoading}
      badge={parcelsCount > 0 ? <StatusBadge status="success" label="Identifié" /> : undefined}
    >
      {cadastralData?.parcels && cadastralData.parcels.length > 0 ? (
        <div className="space-y-4">
          {/* Cadastral Map Preview */}
          {latitude && longitude && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Map className="h-4 w-4 text-primary" />
                  Plan cadastral
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => window.open(getCadastralMapIframeUrl() || '', '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Agrandir
                </Button>
              </div>
              <div className="rounded-xl overflow-hidden border bg-muted aspect-video relative">
                <iframe
                  src={getCadastralMapIframeUrl() || ''}
                  className="w-full h-full absolute inset-0"
                  title="Plan cadastral"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Parcels list */}
          {cadastralData.parcels.map((parcel, index) => (
            <ParcelCard
              key={parcel.id || index}
              parcel={parcel}
              index={index}
              communeCode={cadastralData.communeCode}
              getCadastralPlanUrl={getCadastralPlanUrl}
              onCopy={(text, field) => copyToClipboard(text, field)}
              copiedField={copiedField}
            />
          ))}
          
          {cadastralData.communeName && (
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                Commune : {cadastralData.communeName} ({cadastralData.communeCode})
              </p>
            </div>
          )}

          {/* External link button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open(`https://www.cadastre.gouv.fr/scpc/accueil.do`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Consulter cadastre.gouv.fr
          </Button>
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucune donnée cadastrale disponible</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Vérifiez l'adresse ou consultez cadastre.gouv.fr
          </p>
        </div>
      )}
    </SmartBlock>
  );
};

interface ParcelCardProps {
  parcel: CadastralParcel;
  index: number;
  communeCode: string;
  getCadastralPlanUrl: (communeCode: string, section?: string, numero?: string) => string;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}

const ParcelCard = ({
  parcel,
  index,
  communeCode,
  getCadastralPlanUrl,
  onCopy,
  copiedField,
}: ParcelCardProps) => {
  const reference = `${parcel.prefixe || ''}${parcel.section}${parcel.numero}`;
  
  return (
    <div className="bg-muted/30 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{index + 1}</span>
          </div>
          <div>
            <p className="font-medium text-sm">Parcelle {parcel.section} {parcel.numero}</p>
            <p className="text-xs text-muted-foreground">{parcel.commune}</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => window.open(getCadastralPlanUrl(communeCode, parcel.section, parcel.numero), '_blank')}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Voir plan
        </Button>
      </div>
      
      {/* Grid data */}
      <InfoGrid
        items={[
          { label: 'Section', value: parcel.section || '-' },
          { label: 'Numéro', value: parcel.numero || '-' },
          { label: 'Préfixe', value: parcel.prefixe || '-' },
          { 
            label: 'Surface', 
            value: parcel.contenance ? `${parcel.contenance.toLocaleString('fr-FR')} m²` : '-'
          },
        ]}
      />
      
      {/* Reference */}
      <div className="flex items-center justify-between bg-background rounded-lg p-3">
        <div>
          <p className="text-xs text-muted-foreground">Référence cadastrale</p>
          <p className="font-mono font-semibold">{reference}</p>
        </div>
        <button
          onClick={() => onCopy(reference, `parcel-${index}`)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {copiedField === `parcel-${index}` ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
};
