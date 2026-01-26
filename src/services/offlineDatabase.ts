import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

interface OfflineVisit {
  id: string;
  project_id: string;
  user_id: string;
  started_at: string;
  status: string;
  video_path?: string;
  audio_path?: string;
  metadata?: string;
  sync_status: 'pending' | 'syncing' | 'synced' | 'error';
  created_at: string;
}

interface OfflineBlock {
  id: string;
  visit_session_id: string;
  block_number: number;
  detected_room_type?: string;
  timestamp_start?: number;
  timestamp_end?: number;
  volume_data?: string;
  sync_status: 'pending' | 'syncing' | 'synced' | 'error';
}

interface OfflineFrame {
  id: string;
  visit_session_id: string;
  block_id?: string;
  frame_path: string;
  timestamp_seconds: number;
  analysis_result?: string;
  sync_status: 'pending' | 'syncing' | 'synced' | 'error';
}

/**
 * OfflineDatabase - SQLite local storage for offline mode
 * 
 * Provides local persistence for visit recording when no network connection
 * Automatically syncs data to Supabase when connection is restored
 * 
 * Features:
 * - Local SQLite database for visits, blocks, frames
 * - File system storage for media (video, audio, photos)
 * - Automatic sync queue management
 * - Conflict resolution
 * - Progress tracking
 */
class OfflineDatabaseService {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;
  private dbName = 'myedls_offline.db';
  
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    if (!Capacitor.isNativePlatform()) {
      console.log('[Offline DB] Not on native platform, skipping initialization');
      return false;
    }
    
    try {
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
      
      // Create database connection
      this.db = await this.sqlite.createConnection(
        this.dbName,
        false, // encrypted
        'no-encryption',
        1, // version
        false // readonly
      );
      
      await this.db.open();
      
      // Create tables
      await this.createTables();
      
      this.isInitialized = true;
      console.log('[Offline DB] Initialized successfully');
      return true;
      
    } catch (error) {
      console.error('[Offline DB] Initialization failed:', error);
      return false;
    }
  }
  
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const queries = [
      // Visit sessions table
      `CREATE TABLE IF NOT EXISTS visit_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        status TEXT NOT NULL DEFAULT 'recording',
        video_path TEXT,
        audio_path TEXT,
        duration_seconds INTEGER,
        metadata TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        sync_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      
      // Detected blocks table
      `CREATE TABLE IF NOT EXISTS detected_blocks (
        id TEXT PRIMARY KEY,
        visit_session_id TEXT NOT NULL,
        block_number INTEGER NOT NULL,
        detected_room_type TEXT,
        confidence_score REAL,
        timestamp_start REAL,
        timestamp_end REAL,
        transition_detected INTEGER DEFAULT 0,
        manual_label TEXT,
        volume_data TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        FOREIGN KEY (visit_session_id) REFERENCES visit_sessions(id)
      )`,
      
      // Extracted frames table
      `CREATE TABLE IF NOT EXISTS extracted_frames (
        id TEXT PRIMARY KEY,
        visit_session_id TEXT NOT NULL,
        block_id TEXT,
        frame_path TEXT NOT NULL,
        timestamp_seconds REAL NOT NULL,
        is_key_frame INTEGER DEFAULT 1,
        transition_score REAL,
        analysis_result TEXT,
        detected_elements TEXT,
        detected_materials TEXT,
        detected_pathologies TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        FOREIGN KEY (visit_session_id) REFERENCES visit_sessions(id),
        FOREIGN KEY (block_id) REFERENCES detected_blocks(id)
      )`,
      
      // Audio segments table
      `CREATE TABLE IF NOT EXISTS audio_segments (
        id TEXT PRIMARY KEY,
        visit_session_id TEXT NOT NULL,
        block_id TEXT,
        transcription TEXT NOT NULL,
        confidence_score REAL,
        timestamp_start REAL NOT NULL,
        timestamp_end REAL NOT NULL,
        speaker_detected TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        FOREIGN KEY (visit_session_id) REFERENCES visit_sessions(id),
        FOREIGN KEY (block_id) REFERENCES detected_blocks(id)
      )`,
      
      // Sync queue table
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      
      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_visit_sync_status 
       ON visit_sessions(sync_status)`,
      `CREATE INDEX IF NOT EXISTS idx_blocks_sync_status 
       ON detected_blocks(sync_status)`,
      `CREATE INDEX IF NOT EXISTS idx_frames_sync_status 
       ON extracted_frames(sync_status)`,
      `CREATE INDEX IF NOT EXISTS idx_queue_created 
       ON sync_queue(created_at)`
    ];
    
    for (const query of queries) {
      await this.db.execute(query);
    }
    
    console.log('[Offline DB] Tables created successfully');
  }
  
  // ========== Visit Sessions ==========
  
  async createVisit(visit: Omit<OfflineVisit, 'sync_status' | 'created_at'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    const query = `
      INSERT INTO visit_sessions (
        id, project_id, user_id, started_at, status,
        video_path, audio_path, metadata,
        sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(query, [
      visit.id,
      visit.project_id,
      visit.user_id,
      visit.started_at,
      visit.status,
      visit.video_path || null,
      visit.audio_path || null,
      visit.metadata || null,
      'pending',
      now,
      now
    ]);
    
    console.log('[Offline DB] Visit created:', visit.id);
    return visit.id;
  }
  
  async updateVisit(id: string, updates: Partial<OfflineVisit>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    const query = `UPDATE visit_sessions SET ${fields.join(', ')} WHERE id = ?`;
    await this.db.run(query, values);
  }
  
  async getVisit(id: string): Promise<OfflineVisit | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.query(
      'SELECT * FROM visit_sessions WHERE id = ?',
      [id]
    );
    
    return result.values?.[0] as OfflineVisit || null;
  }
  
  async getPendingVisits(): Promise<OfflineVisit[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.query(
      `SELECT * FROM visit_sessions 
       WHERE sync_status = 'pending' 
       ORDER BY created_at ASC`
    );
    
    return (result.values || []) as OfflineVisit[];
  }
  
  // ========== Blocks ==========
  
  async createBlock(block: Omit<OfflineBlock, 'sync_status'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const query = `
      INSERT INTO detected_blocks (
        id, visit_session_id, block_number, detected_room_type,
        timestamp_start, timestamp_end, volume_data,
        sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(query, [
      block.id,
      block.visit_session_id,
      block.block_number,
      block.detected_room_type || null,
      block.timestamp_start || null,
      block.timestamp_end || null,
      block.volume_data || null,
      'pending',
      new Date().toISOString()
    ]);
    
    return block.id;
  }
  
  async getBlocksByVisit(visitId: string): Promise<OfflineBlock[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.query(
      'SELECT * FROM detected_blocks WHERE visit_session_id = ? ORDER BY block_number',
      [visitId]
    );
    
    return (result.values || []) as OfflineBlock[];
  }
  
  // ========== Frames ==========
  
  async createFrame(frame: Omit<OfflineFrame, 'sync_status'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const query = `
      INSERT INTO extracted_frames (
        id, visit_session_id, block_id, frame_path,
        timestamp_seconds, analysis_result,
        sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(query, [
      frame.id,
      frame.visit_session_id,
      frame.block_id || null,
      frame.frame_path,
      frame.timestamp_seconds,
      frame.analysis_result || null,
      'pending',
      new Date().toISOString()
    ]);
    
    return frame.id;
  }
  
  async getFramesByVisit(visitId: string): Promise<OfflineFrame[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.query(
      'SELECT * FROM extracted_frames WHERE visit_session_id = ? ORDER BY timestamp_seconds',
      [visitId]
    );
    
    return (result.values || []) as OfflineFrame[];
  }
  
  // ========== Sync Queue ==========
  
  async addToSyncQueue(
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const query = `
      INSERT INTO sync_queue (
        id, entity_type, entity_id, operation, data,
        retry_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(query, [
      id,
      entityType,
      entityId,
      operation,
      JSON.stringify(data),
      0,
      now,
      now
    ]);
  }
  
  async getSyncQueue(limit: number = 50): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.query(
      `SELECT * FROM sync_queue 
       ORDER BY created_at ASC 
       LIMIT ?`,
      [limit]
    );
    
    return (result.values || []).map(item => ({
      ...item,
      data: JSON.parse(item.data)
    }));
  }
  
  async removeSyncItem(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.run('DELETE FROM sync_queue WHERE id = ?', [id]);
  }
  
  async updateSyncItemRetry(id: string, error: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.run(
      `UPDATE sync_queue 
       SET retry_count = retry_count + 1, 
           last_error = ?,
           updated_at = ?
       WHERE id = ?`,
      [error, new Date().toISOString(), id]
    );
  }
  
  // ========== Statistics ==========
  
  async getOfflineStats(): Promise<{
    pendingVisits: number;
    pendingBlocks: number;
    pendingFrames: number;
    syncQueueSize: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');
    
    const [visits, blocks, frames, queue] = await Promise.all([
      this.db.query(`SELECT COUNT(*) as count FROM visit_sessions WHERE sync_status = 'pending'`),
      this.db.query(`SELECT COUNT(*) as count FROM detected_blocks WHERE sync_status = 'pending'`),
      this.db.query(`SELECT COUNT(*) as count FROM extracted_frames WHERE sync_status = 'pending'`),
      this.db.query(`SELECT COUNT(*) as count FROM sync_queue`)
    ]);
    
    return {
      pendingVisits: visits.values?.[0]?.count || 0,
      pendingBlocks: blocks.values?.[0]?.count || 0,
      pendingFrames: frames.values?.[0]?.count || 0,
      syncQueueSize: queue.values?.[0]?.count || 0
    };
  }
  
  // ========== Cleanup ==========
  
  async clearSyncedData(olderThanDays: number = 7): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoff = cutoffDate.toISOString();
    
    await this.db.execute(`
      DELETE FROM visit_sessions 
      WHERE sync_status = 'synced' 
      AND updated_at < '${cutoff}'
    `);
    
    console.log('[Offline DB] Cleaned synced data older than', olderThanDays, 'days');
  }
  
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
    
    if (this.sqlite) {
      await this.sqlite.closeConnection(this.dbName, false);
      this.sqlite = null;
    }
    
    this.isInitialized = false;
  }
  
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      dbName: this.dbName
    };
  }
}

export const offlineDatabase = new OfflineDatabaseService();
export type { OfflineVisit, OfflineBlock, OfflineFrame };
