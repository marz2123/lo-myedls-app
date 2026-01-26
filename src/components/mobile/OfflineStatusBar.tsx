import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Database,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useOfflineMode } from "@/hooks/useOfflineMode";

interface OfflineStatusBarProps {
  compact?: boolean;
}

export const OfflineStatusBar = ({ compact = false }: OfflineStatusBarProps) => {
  const {
    isOnline,
    isOfflineReady,
    isSyncing,
    offlineStats,
    syncProgress,
    manualSync
  } = useOfflineMode();

  const hasPendingData = 
    offlineStats.pendingVisits > 0 || 
    offlineStats.pendingBlocks > 0 || 
    offlineStats.pendingFrames > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge 
          variant={isOnline ? "default" : "secondary"}
          className="gap-1"
        >
          {isOnline ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </Badge>
        
        {hasPendingData && (
          <Badge variant="outline" className="gap-1">
            <Database className="w-3 h-3" />
            {offlineStats.pendingVisits}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4 bg-background/95 backdrop-blur-sm border-2">
      <div className="space-y-4">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isOnline ? 'bg-green-500/10' : 'bg-amber-500/10'
            }`}>
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {isOnline ? 'Connecté' : 'Mode Offline'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isOnline 
                  ? 'Synchronisation automatique active'
                  : 'Données sauvegardées localement'
                }
              </p>
            </div>
          </div>
          
          <Badge variant={isOfflineReady ? "default" : "secondary"}>
            {isOfflineReady ? (
              <>
                <Database className="w-3 h-3 mr-1" />
                Prêt
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 mr-1" />
                Init...
              </>
            )}
          </Badge>
        </div>

        {/* Pending Data */}
        {hasPendingData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Données en attente
              </span>
              <span className="font-medium">
                {offlineStats.pendingVisits} visites
              </span>
            </div>
            
            {offlineStats.pendingBlocks > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Blocs</span>
                <span>{offlineStats.pendingBlocks}</span>
              </div>
            )}
            
            {offlineStats.pendingFrames > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Photos</span>
                <span>{offlineStats.pendingFrames}</span>
              </div>
            )}
          </div>
        )}

        {/* Sync Progress */}
        {isSyncing && syncProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Synchronisation
              </span>
              <span className="font-medium">
                {syncProgress.completed}/{syncProgress.total}
              </span>
            </div>
            
            <Progress 
              value={(syncProgress.completed / syncProgress.total) * 100} 
              className="h-2"
            />
            
            {syncProgress.current && (
              <p className="text-xs text-muted-foreground">
                {syncProgress.current}
              </p>
            )}
          </div>
        )}

        {/* Manual Sync Button */}
        {isOnline && hasPendingData && !isSyncing && (
          <Button
            onClick={manualSync}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Synchroniser maintenant
          </Button>
        )}

        {/* Success State */}
        {isOnline && !hasPendingData && isOfflineReady && (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-500/10 rounded-lg p-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Toutes les données sont synchronisées</span>
          </div>
        )}
      </div>
    </Card>
  );
};
