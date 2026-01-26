import { supabase } from '@/integrations/supabase/client';

interface ProcessingTask {
  id: string;
  type: 'transcription' | 'frame_extraction' | 'segmentation' | 'analysis';
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: number;
}

interface ProcessingProgress {
  total: number;
  completed: number;
  current?: string;
}

/**
 * BackgroundAIProcessor - Process AI tasks in background while user continues
 * 
 * While the user records the next segment, this service processes previous ones:
 * - Segmentation
 * - Transcription
 * - Basic frame extraction
 * 
 * Reduces perceived waiting time at the end of the reportage.
 */
class BackgroundAIProcessor {
  private queue: ProcessingTask[] = [];
  private isProcessing = false;
  private onProgress?: (progress: ProcessingProgress) => void;
  private batchSize = 2; // Process 2 tasks in parallel

  /**
   * Add task to processing queue
   */
  addTask(type: ProcessingTask['type'], data: any): string {
    const task: ProcessingTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.queue.push(task);
    console.log(`[BackgroundAI] Task added: ${type} (Queue: ${this.queue.length})`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return task.id;
  }

  /**
   * Queue a transcription task
   */
  queueTranscription(audioBlob: Blob, sequenceId: string): string {
    return this.addTask('transcription', { audioBlob, sequenceId });
  }

  /**
   * Queue frame extraction from video
   */
  queueFrameExtraction(videoBlob: Blob, sequenceId: string, interval: number = 5): string {
    return this.addTask('frame_extraction', { videoBlob, sequenceId, interval });
  }

  /**
   * Queue video segmentation
   */
  queueSegmentation(videoBlob: Blob, sequenceId: string): string {
    return this.addTask('segmentation', { videoBlob, sequenceId });
  }

  /**
   * Queue AI analysis of frames
   */
  queueAnalysis(frames: string[], sequenceId: string): string {
    return this.addTask('analysis', { frames, sequenceId });
  }

  /**
   * Process queued tasks
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    console.log('[BackgroundAI] Starting queue processing');

    while (this.queue.some(t => t.status === 'pending')) {
      // Get batch of pending tasks
      const pendingTasks = this.queue
        .filter(t => t.status === 'pending')
        .slice(0, this.batchSize);

      // Mark as processing
      pendingTasks.forEach(t => t.status = 'processing');

      // Report progress
      this.reportProgress();

      // Process in parallel
      await Promise.allSettled(
        pendingTasks.map(task => this.processTask(task))
      );
    }

    this.isProcessing = false;
    console.log('[BackgroundAI] Queue processing complete');
  }

  /**
   * Process a single task
   */
  private async processTask(task: ProcessingTask): Promise<void> {
    console.log(`[BackgroundAI] Processing: ${task.type} (${task.id})`);

    try {
      let result: any;

      switch (task.type) {
        case 'transcription':
          result = await this.processTranscription(task.data);
          break;
        case 'frame_extraction':
          result = await this.processFrameExtraction(task.data);
          break;
        case 'segmentation':
          result = await this.processSegmentation(task.data);
          break;
        case 'analysis':
          result = await this.processAnalysis(task.data);
          break;
      }

      task.status = 'completed';
      task.result = result;
      console.log(`[BackgroundAI] Completed: ${task.type}`);

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[BackgroundAI] Failed: ${task.type}`, error);
    }

    this.reportProgress();
  }

  /**
   * Process transcription via Whisper
   */
  private async processTranscription(data: { audioBlob: Blob; sequenceId: string }): Promise<string> {
    const { audioBlob, sequenceId } = data;

    // Convert blob to base64
    const base64 = await this.blobToBase64(audioBlob);

    // Call transcription edge function
    const { data: result, error } = await supabase.functions.invoke('transcribe-visit-audio', {
      body: {
        audio: base64,
        sequenceId,
        language: 'fr',
      },
    });

    if (error) throw error;
    return result.text || '';
  }

  /**
   * Extract key frames from video
   */
  private async processFrameExtraction(data: { 
    videoBlob: Blob; 
    sequenceId: string;
    interval: number;
  }): Promise<string[]> {
    const { videoBlob, sequenceId, interval } = data;

    // Create video element
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;

    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });

    const duration = video.duration;
    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Set canvas size
    canvas.width = 640;
    canvas.height = 360;

    // Extract frames at interval
    for (let time = 0; time < duration; time += interval) {
      video.currentTime = time;
      
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get as base64
      const frameData = canvas.toDataURL('image/jpeg', 0.7);
      frames.push(frameData);
    }

    // Cleanup
    URL.revokeObjectURL(video.src);

    console.log(`[BackgroundAI] Extracted ${frames.length} frames`);
    return frames;
  }

  /**
   * Segment video into scenes
   */
  private async processSegmentation(data: { 
    videoBlob: Blob; 
    sequenceId: string;
  }): Promise<any> {
    const { videoBlob, sequenceId } = data;

    // Convert to base64
    const base64 = await this.blobToBase64(videoBlob);

    // Call segmentation edge function
    const { data: result, error } = await supabase.functions.invoke('segment-video-capture', {
      body: {
        video: base64,
        sequenceId,
      },
    });

    if (error) throw error;
    return result;
  }

  /**
   * Analyze frames with AI
   */
  private async processAnalysis(data: { 
    frames: string[]; 
    sequenceId: string;
  }): Promise<any> {
    const { frames, sequenceId } = data;

    // Only analyze key frames (every 3rd)
    const keyFrames = frames.filter((_, i) => i % 3 === 0).slice(0, 5);

    const analyses = await Promise.all(
      keyFrames.map(async (frame, index) => {
        const { data: result, error } = await supabase.functions.invoke('analyze-video-frame', {
          body: {
            frame,
            sequenceId,
            frameIndex: index,
          },
        });

        if (error) throw error;
        return result;
      })
    );

    return analyses;
  }

  /**
   * Convert blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Report progress
   */
  private reportProgress() {
    const total = this.queue.length;
    const completed = this.queue.filter(t => 
      t.status === 'completed' || t.status === 'failed'
    ).length;
    const current = this.queue.find(t => t.status === 'processing');

    this.onProgress?.({
      total,
      completed,
      current: current?.type,
    });
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: (progress: ProcessingProgress) => void) {
    this.onProgress = callback;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): ProcessingTask | undefined {
    return this.queue.find(t => t.id === taskId);
  }

  /**
   * Get all completed results
   */
  getCompletedResults(): ProcessingTask[] {
    return this.queue.filter(t => t.status === 'completed');
  }

  /**
   * Clear completed tasks
   */
  clearCompleted() {
    this.queue = this.queue.filter(t => 
      t.status !== 'completed' && t.status !== 'failed'
    );
  }

  /**
   * Get queue stats
   */
  getStats(): { pending: number; processing: number; completed: number; failed: number } {
    return {
      pending: this.queue.filter(t => t.status === 'pending').length,
      processing: this.queue.filter(t => t.status === 'processing').length,
      completed: this.queue.filter(t => t.status === 'completed').length,
      failed: this.queue.filter(t => t.status === 'failed').length,
    };
  }
}

export const backgroundAIProcessor = new BackgroundAIProcessor();
