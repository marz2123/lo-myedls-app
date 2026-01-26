// IndexedDB Offline Database for MyEDLs
const DB_NAME = 'myedls_offline';
const DB_VERSION = 1;

export interface OfflineRecord {
  id: string;
  data: any;
  table: string;
  pendingSync: boolean;
  syncAction: 'insert' | 'update' | 'delete';
  createdAt: string;
  updatedAt: string;
  conflictStrategy: 'local_first' | 'server_first' | 'timestamp' | 'ask_user';
}

export interface OfflinePhoto {
  id: string;
  localUri: string;
  blob?: Blob;
  projectId: string;
  sessionId?: string;
  roomName?: string;
  elementName?: string;
  pendingSync: boolean;
  createdAt: string;
  metadata: Record<string, any>;
}

export interface SyncQueueItem {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
  priority: number;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
}

class OfflineDatabase {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      console.warn('IndexedDB is not available - offline features disabled');
      this.isInitialized = true;
      this.db = null;
      return;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('Failed to open IndexedDB:', request.error);
          // Disable offline mode gracefully (do not crash app)
          this.isInitialized = true;
          this.db = null;
          resolve();
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.isInitialized = true;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Rooms store
          if (!db.objectStoreNames.contains('rooms')) {
            const roomsStore = db.createObjectStore('rooms', { keyPath: 'id' });
            roomsStore.createIndex('projectId', 'data.projectId', { unique: false });
            roomsStore.createIndex('pendingSync', 'pendingSync', { unique: false });
          }

          // Items store
          if (!db.objectStoreNames.contains('items')) {
            const itemsStore = db.createObjectStore('items', { keyPath: 'id' });
            itemsStore.createIndex('roomId', 'data.roomId', { unique: false });
            itemsStore.createIndex('pendingSync', 'pendingSync', { unique: false });
          }

          // Photos store
          if (!db.objectStoreNames.contains('photos')) {
            const photosStore = db.createObjectStore('photos', { keyPath: 'id' });
            photosStore.createIndex('projectId', 'projectId', { unique: false });
            photosStore.createIndex('pendingSync', 'pendingSync', { unique: false });
          }

          // Anomalies store
          if (!db.objectStoreNames.contains('anomalies')) {
            const anomaliesStore = db.createObjectStore('anomalies', { keyPath: 'id' });
            anomaliesStore.createIndex('projectId', 'data.projectId', { unique: false });
            anomaliesStore.createIndex('pendingSync', 'pendingSync', { unique: false });
          }

          // Tasks store
          if (!db.objectStoreNames.contains('tasks')) {
            const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
            tasksStore.createIndex('projectId', 'data.projectId', { unique: false });
            tasksStore.createIndex('pendingSync', 'pendingSync', { unique: false });
          }

          // Events store
          if (!db.objectStoreNames.contains('events')) {
            const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
            eventsStore.createIndex('projectId', 'data.project_id', { unique: false });
            eventsStore.createIndex('pendingSync', 'pendingSync', { unique: false });
          }

          // MyAladin logs store
          if (!db.objectStoreNames.contains('aladin_logs')) {
            const aladinStore = db.createObjectStore('aladin_logs', { keyPath: 'id' });
            aladinStore.createIndex('projectId', 'projectId', { unique: false });
            aladinStore.createIndex('pendingSync', 'pendingSync', { unique: false });
          }

          // Sync queue store
          if (!db.objectStoreNames.contains('sync_queue')) {
            const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
            syncStore.createIndex('priority', 'priority', { unique: false });
            syncStore.createIndex('table', 'table', { unique: false });
          }
        };
      } catch (error) {
        console.error('Error initializing IndexedDB:', error);
        this.isInitialized = true;
        this.db = null;
        resolve();
      }
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async put<T extends { id: string }>(storeName: string, record: T & { pendingSync?: boolean | number }): Promise<void> {
    await this.init();
    if (!this.db) return;

    const pendingSyncValue = typeof record.pendingSync === 'boolean'
      ? (record.pendingSync ? 1 : 0)
      : (record.pendingSync ?? 1);

    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.put({
        ...record,
        pendingSync: pendingSyncValue,
        updatedAt: new Date().toISOString(),
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    await this.init();
    if (!this.db) return undefined;

    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAllByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    try {
      await this.init();
      if (!this.db) return [];

      // Validate value before querying - IDBKeyRange doesn't accept undefined/null/invalid values
      if (value === undefined || value === null) {
        console.warn(`getAllByIndex called with invalid value for index ${indexName}`);
        return [];
      }

      // IndexedDB keys cannot be boolean on some browsers (notably iOS Safari)
      const queryValue = typeof value === 'boolean' ? (value ? 1 : 0) : value;

      return new Promise((resolve) => {
        try {
          const store = this.getStore(storeName);

          // Check if index exists before querying
          if (!store.indexNames.contains(indexName)) {
            console.warn(`Index ${indexName} not found in store ${storeName}`);
            resolve([]);
            return;
          }

          const index = store.index(indexName);
          const request = index.getAll(queryValue);
          request.onerror = () => {
            console.error(`Error querying index ${indexName}:`, request.error);
            resolve([]); // prevent app crash
          };
          request.onsuccess = () => resolve(request.result);
        } catch (error) {
          console.error(`Error in getAllByIndex:`, error);
          resolve([]);
        }
      });
    } catch (error) {
      console.error(`Failed to get items by index ${indexName}:`, error);
      return [];
    }
  }

  async delete(storeName: string, id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getPendingSync(storeName: string): Promise<OfflineRecord[]> {
    return this.getAllByIndex<OfflineRecord>(storeName, 'pendingSync', true);
  }

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt'>): Promise<void> {
    const queueItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await this.put('sync_queue', queueItem);
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const items = await this.getAll<SyncQueueItem>('sync_queue');
    return items.sort((a, b) => a.priority - b.priority);
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    await this.delete('sync_queue', id);
  }

  async clearPendingSync(storeName: string, id: string): Promise<void> {
    const record = await this.get<OfflineRecord>(storeName, id);
    if (record) {
      await this.put(storeName, { ...record, pendingSync: 0 });
    }
  }

  async savePhoto(photo: OfflinePhoto): Promise<void> {
    await this.put('photos', photo);
  }

  async getOfflinePhotos(projectId: string): Promise<OfflinePhoto[]> {
    return this.getAllByIndex<OfflinePhoto>('photos', 'projectId', projectId);
  }

  async getPendingPhotos(): Promise<OfflinePhoto[]> {
    return this.getAllByIndex<OfflinePhoto>('photos', 'pendingSync', true);
  }

  async clearAllPending(): Promise<void> {
    const stores = ['rooms', 'items', 'photos', 'anomalies', 'tasks', 'events', 'aladin_logs'];
    for (const storeName of stores) {
      const pending = await this.getPendingSync(storeName);
      for (const record of pending) {
        await this.clearPendingSync(storeName, record.id);
      }
    }
  }
}

export const offlineDB = new OfflineDatabase();
