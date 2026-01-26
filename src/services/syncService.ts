import { offlineDatabase } from './offlineDatabase';
import { supabase } from '@/integrations/supabase/client';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
}

type SyncCallback = (progress: SyncProgress) => void;

/**
 * SyncService - Automatic synchronization between local SQLite and Supabase
 * 
 * Handles:
 * - Upload of offline visits to Supabase
 * - Media file upload (video, audio, frames)
 * - Conflict resolution
 * - Retry logic with exponential backoff
 * - Progress tracking
 */
class SyncServiceClass {
  private isSyncing = false;
  private syncCallback: SyncCallback | null = null;
  
  /**
   * Start synchronization process with retry logic
   */
  async startSync(callback?: SyncCallback): Promise<boolean> {
    if (this.isSyncing) {
      console.log('[Sync] Already syncing');
      return false;
    }
    
    try {
      this.isSyncing = true;
      this.syncCallback = callback || null;
      
      console.log('[Sync] Starting synchronization...');
      
      // Get sync statistics
      const stats = await offlineDatabase.getOfflineStats();
      const total = stats.pendingVisits + stats.pendingBlocks + stats.pendingFrames;
      
      if (total === 0) {
        console.log('[Sync] Nothing to sync');
        this.isSyncing = false;
        return true;
      }
      
      let completed = 0;
      let failed = 0;
      
      const updateProgress = (current?: string) => {
        this.syncCallback?.({
          total,
          completed,
          failed,
          current
        });
      };
      
      updateProgress('Synchronisation démarrée');
      
      // Sync visits first
      const pendingVisits = await offlineDatabase.getPendingVisits();
      
      for (const visit of pendingVisits) {
        try {
          updateProgress(`Visite ${visit.id.slice(0, 8)}...`);
          
          await this.syncVisitWithRetry(visit, 3);
          completed++;
          updateProgress();
          
        } catch (error) {
          console.error('[Sync] Failed to sync visit after retries:', error);
          failed++;
          updateProgress();
        }
      }
      
      // Clean up synced data older than 7 days
      await offlineDatabase.clearSyncedData(7);
      
      console.log('[Sync] Completed:', { total, completed, failed });
      
      this.isSyncing = false;
      return failed === 0;
      
    } catch (error) {
      console.error('[Sync] Synchronization failed:', error);
      this.isSyncing = false;
      return false;
    }
  }

  /**
   * Sync visit with exponential backoff retry
   */
  private async syncVisitWithRetry(visit: any, maxRetries: number): Promise<void> {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.syncVisit(visit);
        return; // Success
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[Sync] Retry ${attempt + 1}/${maxRetries} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Sync a single visit with all its data
   */
  private async syncVisit(visit: any): Promise<void> {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Upload video if exists
    let videoUrl: string | null = null;
    if (visit.video_path) {
      videoUrl = await this.uploadMedia(visit.video_path, 'visit-videos', visit.id);
    }
    
    // Upload audio if exists
    let audioUrl: string | null = null;
    if (visit.audio_path) {
      audioUrl = await this.uploadMedia(visit.audio_path, 'visit-audio', visit.id);
    }
    
    // Create visit in Supabase
    const { error: visitError } = await supabase
      .from('visit_sessions')
      .insert({
        id: visit.id,
        project_id: visit.project_id,
        user_id: user.id,
        started_at: visit.started_at,
        completed_at: visit.completed_at,
        status: visit.status,
        video_url: videoUrl,
        audio_url: audioUrl,
        duration_seconds: visit.duration_seconds,
        metadata: visit.metadata ? JSON.parse(visit.metadata) : null
      });
    
    if (visitError) throw visitError;
    
    // Sync blocks
    const blocks = await offlineDatabase.getBlocksByVisit(visit.id);
    for (const block of blocks) {
      await this.syncBlock(block);
    }
    
    // Sync frames
    const frames = await offlineDatabase.getFramesByVisit(visit.id);
    for (const frame of frames) {
      await this.syncFrame(frame);
    }
    
    // Mark as synced
    await offlineDatabase.updateVisit(visit.id, { sync_status: 'synced' });
  }
  
  /**
   * Sync a block
   */
  private async syncBlock(block: any): Promise<void> {
    const { error } = await supabase
      .from('detected_blocks')
      .insert({
        id: block.id,
        visit_session_id: block.visit_session_id,
        block_number: block.block_number,
        detected_room_type: block.detected_room_type,
        confidence_score: block.confidence_score,
        timestamp_start: block.timestamp_start,
        timestamp_end: block.timestamp_end,
        transition_detected: block.transition_detected === 1,
        manual_label: block.manual_label,
        volume_data: block.volume_data ? JSON.parse(block.volume_data) : null
      });
    
    if (error) throw error;
  }
  
  /**
   * Sync a frame
   */
  private async syncFrame(frame: any): Promise<void> {
    // Upload frame image
    const frameUrl = await this.uploadMedia(
      frame.frame_path,
      'visit-frames',
      frame.visit_session_id
    );
    
    const { error } = await supabase
      .from('extracted_frames')
      .insert({
        id: frame.id,
        visit_session_id: frame.visit_session_id,
        block_id: frame.block_id,
        frame_url: frameUrl,
        timestamp_seconds: frame.timestamp_seconds,
        is_key_frame: frame.is_key_frame === 1,
        transition_score: frame.transition_score,
        analysis_result: frame.analysis_result ? JSON.parse(frame.analysis_result) : null,
        detected_elements: frame.detected_elements ? JSON.parse(frame.detected_elements) : null,
        detected_materials: frame.detected_materials ? JSON.parse(frame.detected_materials) : null,
        detected_pathologies: frame.detected_pathologies ? JSON.parse(frame.detected_pathologies) : null
      });
    
    if (error) throw error;
  }
  
  /**
   * Upload media file to Supabase Storage
   */
  private async uploadMedia(
    localPath: string,
    bucket: string,
    sessionId: string
  ): Promise<string> {
    try {
      // Read file from local filesystem
      const fileData = await Filesystem.readFile({
        path: localPath,
        directory: Directory.Data
      });
      
      // Convert base64 to blob
      const base64Data = fileData.data as string;
      const blob = this.base64ToBlob(base64Data);
      
      // Generate unique filename
      const ext = localPath.split('.').pop();
      const filename = `${sessionId}/${Date.now()}.${ext}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filename, blob);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename);
      
      return publicUrl;
      
    } catch (error) {
      console.error('[Sync] Media upload failed:', error);
      throw error;
    }
  }
  
  /**
   * Convert base64 to Blob
   */
  private base64ToBlob(base64: string): Blob {
    const base64Clean = base64.replace(/^data:[^;]+;base64,/, '');
    const byteCharacters = atob(base64Clean);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray]);
  }
  
  /**
   * Cancel ongoing sync
   */
  cancelSync(): void {
    if (this.isSyncing) {
      console.log('[Sync] Cancelling synchronization...');
      this.isSyncing = false;
    }
  }
  
  getStatus() {
    return {
      isSyncing: this.isSyncing
    };
  }
}

export const syncService = new SyncServiceClass();
