import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Calendar, User, FileText } from 'lucide-react';

interface EDLSection1GeneralInfoProps {
  project: {
    name: string;
    address: string;
    postalCode: string;
    city: string;
    propertyType: string;
  };
  edlContext: {
    typeEDL: string;
    date: string;
    performedBy: string;
  };
}

const propertyTypeLabels: Record<string, string> = {
  immeuble: 'Immeuble',
  maison: 'Maison',
  appartement: 'Appartement',
  local_professionnel: 'Local professionnel',
  commerce: 'Commerce',
};

const edlTypeColors: Record<string, string> = {
  'Avant travaux': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Après travaux': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Entrée': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'Sortie': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export const EDLSection1GeneralInfo: React.FC<EDLSection1GeneralInfoProps> = ({
  project,
  edlContext
}) => {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Informations générales</h2>
          <p className="text-sm text-muted-foreground">Détails du projet et contexte de l'EDL</p>
        </div>
      </div>

      {/* Main Card */}
      <Card className="p-6 bg-gradient-to-br from-background to-muted/30 border-2">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            État des Lieux – {project.name}
          </h1>
          <Badge className={edlTypeColors[edlContext.typeEDL] || 'bg-muted'}>
            {edlContext.typeEDL}
          </Badge>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Address */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Adresse</p>
              <p className="font-medium">{project.address}</p>
              <p className="text-sm text-muted-foreground">{project.postalCode} {project.city}</p>
            </div>
          </div>

          {/* Property Type */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Type de projet</p>
              <p className="font-medium">{propertyTypeLabels[project.propertyType] || project.propertyType}</p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Réalisé le</p>
              <p className="font-medium">{edlContext.date}</p>
            </div>
          </div>

          {/* Performed By */}
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Réalisé par</p>
              <p className="font-medium">{edlContext.performedBy}</p>
            </div>
          </div>
        </div>

        {/* Branding Footer */}
        <div className="mt-8 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">MH</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="font-medium">Groupe MyHome</p>
                <p>Archi Home • Bâti Home • Opti Home • Déco Home</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              MyEDLs
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};
