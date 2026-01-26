import { useState, useCallback, useEffect } from 'react';
import { backupService } from '@/lib/backupService';

interface SecuritySettings {
  biometricEnabled: boolean;
  confidentialModeEnabled: boolean;
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'manual';
  cloudBackupEnabled: boolean;
  screenshotProtection: boolean;
  dataRetentionDays: number;
}

const DEFAULT_SETTINGS: SecuritySettings = {
  biometricEnabled: false,
  confidentialModeEnabled: false,
  autoBackupEnabled: true,
  backupFrequency: 'daily',
  cloudBackupEnabled: false,
  screenshotProtection: false,
  dataRetentionDays: 30
};

const SETTINGS_KEY = 'myedls_security_settings';

export const useSecuritySettings = () => {
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [lastBackup, setLastBackup] = useState<{ timestamp: number; type: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
      
      const backup = backupService.getLastBackup();
      if (backup) {
        setLastBackup({ timestamp: backup.timestamp, type: backup.type });
      }
      
      setIsLoading(false);
    };

    loadSettings();
  }, []);

  // Save settings
  const updateSettings = useCallback((partial: Partial<SecuritySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Toggle biometric
  const toggleBiometric = useCallback(() => {
    updateSettings({ biometricEnabled: !settings.biometricEnabled });
  }, [settings.biometricEnabled, updateSettings]);

  // Toggle confidential mode
  const toggleConfidentialMode = useCallback(() => {
    updateSettings({ confidentialModeEnabled: !settings.confidentialModeEnabled });
  }, [settings.confidentialModeEnabled, updateSettings]);

  // Toggle auto backup
  const toggleAutoBackup = useCallback(() => {
    updateSettings({ autoBackupEnabled: !settings.autoBackupEnabled });
  }, [settings.autoBackupEnabled, updateSettings]);

  // Set backup frequency
  const setBackupFrequency = useCallback((frequency: SecuritySettings['backupFrequency']) => {
    updateSettings({ backupFrequency: frequency });
  }, [updateSettings]);

  // Toggle cloud backup
  const toggleCloudBackup = useCallback(() => {
    updateSettings({ cloudBackupEnabled: !settings.cloudBackupEnabled });
  }, [settings.cloudBackupEnabled, updateSettings]);

  // Toggle screenshot protection
  const toggleScreenshotProtection = useCallback(() => {
    updateSettings({ screenshotProtection: !settings.screenshotProtection });
  }, [settings.screenshotProtection, updateSettings]);

  // Create manual backup
  const createBackup = useCallback(async (projectId?: string) => {
    const metadata = await backupService.createLocalBackup(projectId);
    if (metadata) {
      setLastBackup({ timestamp: metadata.timestamp, type: metadata.type });
    }
    return metadata;
  }, []);

  // Create cloud backup
  const createCloudBackup = useCallback(async (projectId: string) => {
    const metadata = await backupService.createCloudBackup(projectId);
    if (metadata) {
      setLastBackup({ timestamp: metadata.timestamp, type: metadata.type });
    }
    return metadata;
  }, []);

  // Get all backups
  const getBackups = useCallback(() => {
    return backupService.getBackupMetadata();
  }, []);

  // Restore backup
  const restoreBackup = useCallback(async (backupId: string) => {
    return backupService.restoreLocalBackup(backupId);
  }, []);

  // Delete backup
  const deleteBackup = useCallback(async (backupId: string) => {
    return backupService.deleteBackup(backupId);
  }, []);

  // Clear all data
  const clearAllData = useCallback(async () => {
    await backupService.clearAllLocalData();
    setSettings(DEFAULT_SETTINGS);
    setLastBackup(null);
  }, []);

  return {
    settings,
    lastBackup,
    isLoading,
    updateSettings,
    toggleBiometric,
    toggleConfidentialMode,
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
  };
};
