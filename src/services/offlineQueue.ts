/**
 * IndexedDB-based Offline Queue for Web
 * 
 * Stores pending operations (media uploads, notes, metadata updates)
 * for sync when network is available.
 */

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface QueueItem {
  id: string;
  type: 'media' | 'note' | 'sequence' | 'location' | 'task' | 'metadata';
  operation: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, any>;
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  itemId?: string; // Reference to the actual item for UI status display
}

const DB_NAME = 'myedls_offline_queue';
const DB_VERSION = 1;
const STORE_NAME = 'sync_queue';

class OfflineQueueService {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        console.log('[OfflineQueue] IndexedDB not available');
        resolve(false);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to open database');
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[OfflineQueue] Initialized successfully');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('itemId', 'itemId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
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

  async addToQueue(item: Omit<QueueItem, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.ensureInitialized();
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const queueItem: QueueItem = {
      ...item,
      id,
      status: 'pending',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(queueItem);

      request.onsuccess = () => {
        console.log('[OfflineQueue] Added item:', id, item.type, item.operation);
        resolve(id);
      };
      request.onerror = () => reject(new Error('Failed to add item to queue'));
    });
  }

  async updateStatus(id: string, status: SyncStatus, error?: string): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result as QueueItem;
        if (!item) {
          resolve();
          return;
        }

        item.status = status;
        item.updatedAt = new Date().toISOString();
        if (error) {
          item.lastError = error;
          item.retryCount += 1;
        }

        const putRequest = store.put(item);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error('Failed to update status'));
      };
      getRequest.onerror = () => reject(new Error('Failed to get item'));
    });
  }

  async removeFromQueue(id: string): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[OfflineQueue] Removed item:', id);
        resolve();
      };
      request.onerror = () => reject(new Error('Failed to remove item'));
    });
  }

  async getPendingItems(): Promise<QueueItem[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get pending items'));
    });
  }

  async getAllItems(): Promise<QueueItem[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get items'));
    });
  }

  async getItemsByItemId(itemId: string): Promise<QueueItem[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('itemId');
      const request = index.getAll(itemId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get items by itemId'));
    });
  }

  async getStats(): Promise<{
    pending: number;
    syncing: number;
    failed: number;
    total: number;
  }> {
    const items = await this.getAllItems();
    
    return {
      pending: items.filter(i => i.status === 'pending').length,
      syncing: items.filter(i => i.status === 'syncing').length,
      failed: items.filter(i => i.status === 'failed').length,
      total: items.length,
    };
  }

  async clearSynced(): Promise<void> {
    await this.ensureInitialized();

    const items = await this.getAllItems();
    const syncedItems = items.filter(i => i.status === 'synced');

    for (const item of syncedItems) {
      await this.removeFromQueue(item.id);
    }

    console.log('[OfflineQueue] Cleared', syncedItems.length, 'synced items');
  }

  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[OfflineQueue] Cleared all items');
        resolve();
      };
      request.onerror = () => reject(new Error('Failed to clear queue'));
    });
  }
}

export const offlineQueue = new OfflineQueueService();
