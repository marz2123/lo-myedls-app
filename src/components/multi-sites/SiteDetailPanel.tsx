import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Plus,
  FileCheck,
  RefreshCw,
  Settings,
  Users,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Site, 
  Edl,
  COMPANY_LABELS, 
  COMPANY_COLORS,
  EDL_TYPE_LABELS,
  EDL_STATUS_LABELS
} from '@/hooks/useMultiSites';
import { useMyHomeSync, MyHomeSyncOptions } from '@/hooks/useMyHomeSync';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SiteDetailPanelProps {
  site: Site;
  edls: Edl[];
  onBack: () => void;
  onCreateEdl: (edlType: string) => void;
  onSelectEdl: (edl: Edl) => void;
  onManageAccess: () => void;
}

export function SiteDetailPanel({
  site,
  edls,
  onBack,
  onCreateEdl,
  onSelectEdl,
  onManageAccess,
}: SiteDetailPanelProps) {
  const { isSyncing, syncProgress, syncEdlToMyHome } = useMyHomeSync();
  const [syncOptions] = useState<MyHomeSyncOptions>({
    dpgf: true,
    planning: true,
    tasks: true,
    documents: true,
    notice: true,
  });

  const handleSync = async (edl: Edl) => {
    await syncEdlToMyHome(edl, site, syncOptions);
  };

  const completedEdls = edls.filter(e => e.status === 'completed' || e.status === 'signed');
  const inProgressEdls = edls.filter(e => e.status === 'in_progress' || e.status === 'draft');

  return (
    <div className="space-y-6">
      {/* Site Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-4 rounded-xl ${COMPANY_COLORS[site.company]} bg-opacity-20`}>
              <Building2 className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{site.name}</h1>
                <Badge className={COMPANY_COLORS[site.company]}>
                  {COMPANY_LABELS[site.company]}
                </Badge>
              </div>
              {site.address && (
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  {site.address}, {site.postal_code} {site.city}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {site.building_type && (
                  <Badge variant="outline">{site.building_type}</Badge>
                )}
                {site.rooms_count && (
                  <Badge variant="secondary">{site.rooms_count} pièces</Badge>
                )}
                {site.surface_m2 && (
                  <Badge variant="secondary">{site.surface_m2} m²</Badge>
                )}
                {site.units_count && (
                  <Badge variant="secondary">{site.units_count} lots</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={onManageAccess}>
                <Users className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* MyHome Sync Status */}
          {site.myhome_sync_enabled && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium">Synchronisation MyHome</span>
                </div>
                {site.last_synced_at && (
                  <span className="text-xs text-muted-foreground">
                    Dernière sync: {formatDistanceToNow(new Date(site.last_synced_at), { addSuffix: true, locale: fr })}
                  </span>
                )}
              </div>
              {syncProgress && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">{syncProgress.current}</p>
                  <Progress value={(syncProgress.progress / syncProgress.total) * 100} className="h-1" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button 
          variant="outline" 
          className="h-auto py-4 flex-col gap-2"
          onClick={() => onCreateEdl('entree')}
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs">EDL Entrée</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex-col gap-2"
          onClick={() => onCreateEdl('sortie')}
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs">EDL Sortie</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex-col gap-2"
          onClick={() => onCreateEdl('technique')}
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs">Visite Technique</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex-col gap-2"
          onClick={() => onCreateEdl('comparatif')}
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs">Comparatif</span>
        </Button>
      </div>

      {/* EDLs List */}
      <div className="space-y-4">
        {/* In Progress */}
        {inProgressEdls.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                En cours ({inProgressEdls.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {inProgressEdls.map((edl, index) => (
                <motion.div
                  key={edl.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => onSelectEdl(edl)}
                >
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{EDL_TYPE_LABELS[edl.edl_type]}</span>
                      <Badge variant="outline" className="text-xs">
                        {EDL_STATUS_LABELS[edl.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {edl.tasks_count > 0 && <span>{edl.tasks_count} tâches</span>}
                      {edl.anomalies_count > 0 && <span>{edl.anomalies_count} anomalies</span>}
                      {edl.photos_count > 0 && <span>{edl.photos_count} photos</span>}
                    </div>
                  </div>
                  {edl.score !== null && (
                    <div className="text-right">
                      <span className="text-lg font-bold">{edl.score}%</span>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Completed */}
        {completedEdls.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Terminés ({completedEdls.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedEdls.map((edl, index) => (
                <motion.div
                  key={edl.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{EDL_TYPE_LABELS[edl.edl_type]}</span>
                      <Badge variant="secondary" className="text-xs">
                        {EDL_STATUS_LABELS[edl.status]}
                      </Badge>
                      {edl.sync_state === 'synced' && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Synchronisé
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(edl.updated_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSync(edl);
                      }}
                      disabled={isSyncing}
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                      Sync
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onSelectEdl(edl)}
                    >
                      Ouvrir
                    </Button>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {edls.length === 0 && (
          <Card className="p-8 text-center">
            <FileCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Aucun EDL pour ce site</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Créez votre premier état des lieux pour ce bien.
            </p>
            <Button onClick={() => onCreateEdl('entree')}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un EDL
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
