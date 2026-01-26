import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff,
  CloudUpload, 
  Database, 
  Trash2, 
  RefreshCw,
  Fingerprint,
  Clock,
  AlertTriangle,
  Check,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSecuritySettings } from '@/hooks/useSecuritySettings';
import { useConfidentialMode } from '@/contexts/ConfidentialModeContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SecuritySettingsPanelProps {
  projectId?: string;
}

export const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({ projectId }) => {
  const {
    settings,
    lastBackup,
    toggleBiometric,
    toggleAutoBackup,
    setBackupFrequency,
    toggleCloudBackup,
    toggleScreenshotProtection,
    createBackup,
    createCloudBackup,
    getBackups,
    restoreBackup,
    deleteBackup,
    clearAllData
  } = useSecuritySettings();

  const { isConfidential, toggleConfidential } = useConfidentialMode();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [showBackupList, setShowBackupList] = useState(false);

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const metadata = await createBackup(projectId);
      if (metadata) {
        toast.success('Sauvegarde créée', {
          description: `Version ${metadata.version} - ${(metadata.size / 1024).toFixed(1)} KB`
        });
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleCloudBackup = async () => {
    if (!projectId) {
      toast.error('Projet non sélectionné');
      return;
    }
    
    setIsCreatingBackup(true);
    try {
      const metadata = await createCloudBackup(projectId);
      if (metadata) {
        toast.success('Sauvegarde cloud créée');
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde cloud');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    const success = await restoreBackup(backupId);
    if (success) {
      toast.success('Restauration réussie');
    } else {
      toast.error('Erreur lors de la restauration');
    }
  };

  const handleClearData = async () => {
    await clearAllData();
    toast.success('Données locales effacées');
  };

  const backups = getBackups();

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sécurité & Protection</h2>
            <p className="text-sm text-muted-foreground">
              Gérez la sécurité de vos données
            </p>
          </div>
        </div>

        <Separator />

        {/* Biometric Lock */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Verrouillage biométrique</CardTitle>
              </div>
              <Switch
                checked={settings.biometricEnabled}
                onCheckedChange={toggleBiometric}
              />
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Protégez l'accès à vos EDL avec Face ID ou Touch ID
            </CardDescription>
          </CardContent>
        </Card>

        {/* Confidential Mode */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isConfidential ? (
                  <EyeOff className="w-4 h-4 text-amber-500" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
                <CardTitle className="text-base">Mode confidentiel</CardTitle>
              </div>
              <Switch
                checked={isConfidential}
                onCheckedChange={toggleConfidential}
              />
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Masque les photos, descriptions et données sensibles
            </CardDescription>
          </CardContent>
        </Card>

        {/* Screenshot Protection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Protection captures</CardTitle>
              </div>
              <Switch
                checked={settings.screenshotProtection}
                onCheckedChange={toggleScreenshotProtection}
              />
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Bloque les captures d'écran (iOS/Android)
            </CardDescription>
          </CardContent>
        </Card>

        <Separator />

        {/* Auto Backup */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Sauvegarde automatique</CardTitle>
              </div>
              <Switch
                checked={settings.autoBackupEnabled}
                onCheckedChange={toggleAutoBackup}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>
              Créez des sauvegardes chiffrées automatiquement
            </CardDescription>
            
            {settings.autoBackupEnabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Fréquence</Label>
                  <Select
                    value={settings.backupFrequency}
                    onValueChange={(value: 'daily' | 'weekly' | 'manual') => 
                      setBackupFrequency(value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Quotidien</SelectItem>
                      <SelectItem value="weekly">Hebdo</SelectItem>
                      <SelectItem value="manual">Manuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {lastBackup && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Dernière: {format(new Date(lastBackup.timestamp), 'dd MMM à HH:mm', { locale: fr })}
                    <span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
                      {lastBackup.type}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cloud Backup */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudUpload className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Sauvegarde cloud</CardTitle>
              </div>
              <Switch
                checked={settings.cloudBackupEnabled}
                onCheckedChange={toggleCloudBackup}
              />
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Synchronisez les sauvegardes chiffrées sur le cloud
            </CardDescription>
          </CardContent>
        </Card>

        <Separator />

        {/* Backup Actions */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Actions</Label>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
            >
              {isCreatingBackup ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Sauvegarder
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCloudBackup}
              disabled={isCreatingBackup || !settings.cloudBackupEnabled}
            >
              <CloudUpload className="w-4 h-4 mr-2" />
              Cloud
            </Button>
          </div>

          {/* Backup List Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setShowBackupList(!showBackupList)}
          >
            <Database className="w-4 h-4 mr-2" />
            Voir les sauvegardes ({backups.length})
          </Button>

          {showBackupList && backups.length > 0 && (
            <div className="space-y-2 pl-2 border-l-2 border-muted">
              {backups.slice(0, 5).map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                >
                  <div>
                    <div className="font-medium">Version {backup.version}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(backup.timestamp), 'dd/MM HH:mm')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRestoreBackup(backup.id)}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteBackup(backup.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <CardTitle className="text-base text-destructive">Zone danger</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Effacer les données locales
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Effacer toutes les données ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action supprimera définitivement toutes les données locales, 
                    sauvegardes et paramètres. Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={handleClearData}
                  >
                    Effacer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* RGPD Notice */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <Check className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
          <p>
            Vos données sont chiffrées localement (AES-256) et conformes au RGPD. 
            Aucune donnée n'est partagée sans votre consentement.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
};
