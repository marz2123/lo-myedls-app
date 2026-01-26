/**
 * IndexedDB-based Media Store for Offline Mode
 * 
 * Stores media files (photos, videos, audio) locally when offline,
 * and syncs them to Supabase Storage when connection is restored.
 */

export type MediaType = 'photo' | 'video' | 'audio' | 'annotation';
export type MediaSyncStatus = 'pending' | 'uploading' | 'synced' | 'failed';

export interface OfflineMediaItem {
  id: string;
  projectId: string;
  sessionId?: string;
  locationId?: string;
  zoneId?: string;
  type: MediaType;
  fileName: string;
  mimeType: string;
  blob: Blob;
  thumbnailBlob?: Blob;
  metadata: Record<string, any>;
  status: MediaSyncStatus;
  retryCount: number;
  lastError?: string;
  uploadedUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = 'myedls_offline_media';
const DB_VERSION = 1;
const MEDIA_STORE = 'media_files';
const METADATA_STORE = 'media_metadata';

class OfflineMediaStoreService {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        console.log('[OfflineMedia] IndexedDB not available');
        resolve(false);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineMedia] Failed to open database');
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[OfflineMedia] Initialized successfully');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for media blobs
        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
          const store = db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store for metadata only (lighter queries)
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const store = db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Database not available');
    }
  }

  /**
   * Save media file locally
   */
  async saveMedia(
    projectId: string,
    type: MediaType,
    file: Blob,
    options?: {
      sessionId?: string;
      locationId?: string;
      zoneId?: string;
      fileName?: string;
      metadata?: Record<string, any>;
      thumbnail?: Blob;
    }
  ): Promise<string> {
    await this.ensureInitialized();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const fileName = options?.fileName || `${type}_${Date.now()}.${this.getExtension(file.type)}`;

    const mediaItem: OfflineMediaItem = {
      id,
      projectId,
      sessionId: options?.sessionId,
      locationId: options?.locationId,
      zoneId: options?.zoneId,
      type,
      fileName,
      mimeType: file.type,
      blob: file,
      thumbnailBlob: options?.thumbnail,
      metadata: options?.metadata || {},
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEDIA_STORE, METADATA_STORE], 'readwrite');
      
      // Store full item with blob
      const mediaStore = transaction.objectStore(MEDIA_STORE);
      mediaStore.add(mediaItem);

      // Store metadata separately for quick queries
      const metaStore = transaction.objectStore(METADATA_STORE);
      const { blob, thumbnailBlob, ...metaOnly } = mediaItem;
      metaStore.add({ ...metaOnly, hasBlob: true, blobSize: blob.size });

      transaction.oncomplete = () => {
        console.log('[OfflineMedia] Saved media:', id, type);
        resolve(id);
      };
      transaction.onerror = () => reject(new Error('Failed to save media'));
    });
  }

  /**
   * Get media item with blob
   */
  async getMedia(id: string): Promise<OfflineMediaItem | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEDIA_STORE], 'readonly');
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get media'));
    });
  }

  /**
   * Get all pending media items (metadata only for performance)
   */
  async getPendingMedia(): Promise<Omit<OfflineMediaItem, 'blob' | 'thumbnailBlob'>[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get pending media'));
    });
  }

  /**
   * Get media items by project
   */
  async getMediaByProject(projectId: string): Promise<Omit<OfflineMediaItem, 'blob' | 'thumbnailBlob'>[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get media by project'));
    });
  }

  /**
   * Update media status
   */
  async updateStatus(
    id: string,
    status: MediaSyncStatus,
    options?: { uploadedUrl?: string; error?: string }
  ): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEDIA_STORE, METADATA_STORE], 'readwrite');
      const mediaStore = transaction.objectStore(MEDIA_STORE);
      const metaStore = transaction.objectStore(METADATA_STORE);

      const getRequest = mediaStore.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result as OfflineMediaItem;
        if (!item) {
          resolve();
          return;
        }

        item.status = status;
        item.updatedAt = new Date().toISOString();
        if (options?.uploadedUrl) item.uploadedUrl = options.uploadedUrl;
        if (options?.error) {
          item.lastError = options.error;
          item.retryCount += 1;
        }

        mediaStore.put(item);

        // Update metadata store
        const { blob, thumbnailBlob, ...metaOnly } = item;
        metaStore.put({ ...metaOnly, hasBlob: true, blobSize: blob.size });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error('Failed to update status'));
      };
      getRequest.onerror = () => reject(new Error('Failed to get item'));
    });
  }

  /**
   * Delete media item
   */
  async deleteMedia(id: string): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEDIA_STORE, METADATA_STORE], 'readwrite');
      
      transaction.objectStore(MEDIA_STORE).delete(id);
      transaction.objectStore(METADATA_STORE).delete(id);

      transaction.oncomplete = () => {
        console.log('[OfflineMedia] Deleted media:', id);
        resolve();
      };
      transaction.onerror = () => reject(new Error('Failed to delete media'));
    });
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    pending: number;
    uploading: number;
    synced: number;
    failed: number;
    totalSize: number;
  }> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result || [];
        const stats = {
          pending: 0,
          uploading: 0,
          synced: 0,
          failed: 0,
          totalSize: 0,
        };

        items.forEach((item: any) => {
          stats[item.status as keyof typeof stats]++;
          if (item.blobSize) stats.totalSize += item.blobSize;
        });

        resolve(stats);
      };
      request.onerror = () => reject(new Error('Failed to get stats'));
    });
  }

  /**
   * Clear synced media older than specified days
   */
  async clearSyncedMedia(olderThanDays: number = 7): Promise<number> {
    await this.ensureInitialized();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const cutoffStr = cutoff.toISOString();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEDIA_STORE, METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.getAll();

      let deleted = 0;

      request.onsuccess = () => {
        const items = request.result || [];
        const toDelete = items.filter(
          (item: any) => item.status === 'synced' && item.updatedAt < cutoffStr
        );

        toDelete.forEach((item: any) => {
          transaction.objectStore(MEDIA_STORE).delete(item.id);
          transaction.objectStore(METADATA_STORE).delete(item.id);
          deleted++;
        });

        transaction.oncomplete = () => {
          console.log('[OfflineMedia] Cleared', deleted, 'synced items');
          resolve(deleted);
        };
      };
      request.onerror = () => reject(new Error('Failed to clear synced media'));
    });
  }

  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'audio/webm': 'webm',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
    };
    return map[mimeType] || 'bin';
  }
}

export const offlineMediaStore = new OfflineMediaStoreService();
