// Auto-Backup Service with encryption and integrity verification

import { encryptionService } from './encryptionService';
import { supabase } from '@/integrations/supabase/client';

interface BackupMetadata {
  id: string;
  timestamp: number;
  version: number;
  checksum: string;
  type: 'local' | 'cloud';
  tables: string[];
  size: number;
}

interface BackupData {
  metadata: BackupMetadata;
  data: Record<string, any[]>;
}

const MAX_LOCAL_BACKUPS = 10;
const BACKUP_STORAGE_KEY = 'myedls_backups';
const BACKUP_METADATA_KEY = 'myedls_backup_metadata';

class BackupService {
  private isBackingUp = false;

  // Create a local encrypted backup
  async createLocalBackup(projectId?: string): Promise<BackupMetadata | null> {
    if (this.isBackingUp) {
      console.log('[Backup] Already backing up, skipping...');
      return null;
    }

    this.isBackingUp = true;

    try {
      console.log('[Backup] Starting local backup...');
      
      // Collect data from IndexedDB
      const backupData = await this.collectBackupData(projectId);
      
      // Generate checksum
      const dataString = JSON.stringify(backupData);
      const checksum = await encryptionService.generateChecksum(dataString);
      
      // Create metadata
      const metadata: BackupMetadata = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        version: this.getNextVersion(),
        checksum,
        type: 'local',
        tables: Object.keys(backupData),
        size: new Blob([dataString]).size
      };

      // Encrypt backup
      const key = await encryptionService.getDeviceKey();
      const encryptedData = await encryptionService.encrypt(dataString, key);

      // Store backup
      await this.storeLocalBackup(metadata, encryptedData);
      
      // Clean old backups
      await this.cleanOldBackups();

      console.log('[Backup] Local backup completed:', metadata.id);
      return metadata;
    } catch (error) {
      console.error('[Backup] Failed to create local backup:', error);
      return null;
    } finally {
      this.isBackingUp = false;
    }
  }

  // Create a cloud backup (encrypted)
  async createCloudBackup(projectId: string): Promise<BackupMetadata | null> {
    if (this.isBackingUp) return null;
    this.isBackingUp = true;

    try {
      console.log('[Backup] Starting cloud backup...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Collect and encrypt data
      const backupData = await this.collectBackupData(projectId);
      const dataString = JSON.stringify(backupData);
      const checksum = await encryptionService.generateChecksum(dataString);
      
      const key = await encryptionService.getDeviceKey();
      const encryptedData = await encryptionService.encrypt(dataString, key);

      // Upload to Supabase Storage
      const fileName = `backups/${user.id}/${projectId}/${Date.now()}.encrypted`;
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, new Blob([encryptedData]), {
          contentType: 'application/octet-stream'
        });

      if (uploadError) throw uploadError;

      const metadata: BackupMetadata = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        version: this.getNextVersion(),
        checksum,
        type: 'cloud',
        tables: Object.keys(backupData),
        size: new Blob([encryptedData]).size
      };

      console.log('[Backup] Cloud backup completed:', metadata.id);
      return metadata;
    } catch (error) {
      console.error('[Backup] Failed to create cloud backup:', error);
      return null;
    } finally {
      this.isBackingUp = false;
    }
  }

  // Restore from a local backup
  async restoreLocalBackup(backupId: string): Promise<boolean> {
    try {
      console.log('[Backup] Restoring backup:', backupId);
      
      const backups = this.getLocalBackups();
      const backup = backups.find(b => b.metadata.id === backupId);
      
      if (!backup) throw new Error('Backup not found');

      // Decrypt
      const key = await encryptionService.getDeviceKey();
      const decryptedData = await encryptionService.decrypt(backup.encryptedData, key);
      
      // Verify checksum
      const isValid = await encryptionService.verifyChecksum(
        decryptedData, 
        backup.metadata.checksum
      );
      
      if (!isValid) {
        console.error('[Backup] Checksum verification failed!');
        return false;
      }

      // Parse and restore data
      const data = JSON.parse(decryptedData);
      await this.restoreData(data);

      console.log('[Backup] Restore completed successfully');
      return true;
    } catch (error) {
      console.error('[Backup] Restore failed:', error);
      return false;
    }
  }

  // Get all backup metadata
  getBackupMetadata(): BackupMetadata[] {
    const stored = localStorage.getItem(BACKUP_METADATA_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Get last backup info
  getLastBackup(): BackupMetadata | null {
    const metadata = this.getBackupMetadata();
    return metadata.length > 0 ? metadata[0] : null;
  }

  // Verify data integrity
  async verifyIntegrity(data: string, expectedChecksum: string): Promise<boolean> {
    return encryptionService.verifyChecksum(data, expectedChecksum);
  }

  // Delete a backup
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const backups = this.getLocalBackups();
      const filtered = backups.filter(b => b.metadata.id !== backupId);
      
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(filtered));
      this.updateMetadataStore(filtered.map(b => b.metadata));
      
      return true;
    } catch (error) {
      console.error('[Backup] Delete failed:', error);
      return false;
    }
  }

  // Clear all local data
  async clearAllLocalData(): Promise<void> {
    localStorage.removeItem(BACKUP_STORAGE_KEY);
    localStorage.removeItem(BACKUP_METADATA_KEY);
    
    // Clear IndexedDB
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name?.startsWith('myedls')) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  }

  private async collectBackupData(projectId?: string): Promise<Record<string, any[]>> {
    // Collect from localStorage/IndexedDB
    const data: Record<string, any[]> = {};
    
    // Get offline queue data
    const offlineQueue = localStorage.getItem('myedls_offline_queue');
    if (offlineQueue) {
      data['offline_queue'] = JSON.parse(offlineQueue);
    }

    // Get settings
    const settings = localStorage.getItem('myedls_security_settings');
    if (settings) {
      data['security_settings'] = [JSON.parse(settings)];
    }

    // Add project-specific data if available
    if (projectId) {
      data['project_id'] = [projectId];
    }

    return data;
  }

  private async restoreData(data: Record<string, any[]>): Promise<void> {
    // Restore to localStorage/IndexedDB
    for (const [table, records] of Object.entries(data)) {
      if (table === 'offline_queue') {
        localStorage.setItem('myedls_offline_queue', JSON.stringify(records));
      } else if (table === 'security_settings' && records[0]) {
        localStorage.setItem('myedls_security_settings', JSON.stringify(records[0]));
      }
    }
  }

  private getLocalBackups(): Array<{ metadata: BackupMetadata; encryptedData: string }> {
    const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private async storeLocalBackup(metadata: BackupMetadata, encryptedData: string): Promise<void> {
    const backups = this.getLocalBackups();
    backups.unshift({ metadata, encryptedData });
    
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backups));
    this.updateMetadataStore(backups.map(b => b.metadata));
  }

  private updateMetadataStore(metadata: BackupMetadata[]): void {
    localStorage.setItem(BACKUP_METADATA_KEY, JSON.stringify(metadata));
  }

  private async cleanOldBackups(): Promise<void> {
    const backups = this.getLocalBackups();
    
    if (backups.length > MAX_LOCAL_BACKUPS) {
      const trimmed = backups.slice(0, MAX_LOCAL_BACKUPS);
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(trimmed));
      this.updateMetadataStore(trimmed.map(b => b.metadata));
    }
  }

  private getNextVersion(): number {
    const metadata = this.getBackupMetadata();
    return metadata.length > 0 ? Math.max(...metadata.map(m => m.version)) + 1 : 1;
  }
}

export const backupService = new BackupService();
