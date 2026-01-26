export type VoiceIntent = 
  | 'navigate_room'
  | 'take_photo'
  | 'describe_anomaly'
  | 'note_condition'
  | 'next_room'
  | 'previous_room'
  | 'finish_visit'
  | 'repeat'
  | 'help'
  | 'confirm'
  | 'cancel'
  | 'generate_report'
  | 'unknown';

export interface VoiceCommand {
  id: string;
  sessionId: string;
  edlId?: string;
  roomId?: string;
  audioUrl?: string;
  transcription?: string;
  intent: VoiceIntent;
  executedAction?: Record<string, unknown>;
  confidenceScore?: number;
  processingTimeMs?: number;
  createdAt: string;
}

export interface LiveNarrationSession {
  id: string;
  userId: string;
  projectId: string;
  edlId?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  durationSeconds?: number;
  totalCommands: number;
  totalPhotos: number;
  totalAnomaliesDetected: number;
  totalTasksGenerated: number;
  roomsVisited: string[];
  autoActions: AutoAction[];
  resultsJson?: SessionResults;
  autostoryVideoId?: string;
  startedAt: string;
  endedAt?: string;
}

export interface AutoAction {
  type: 'photo_taken' | 'anomaly_detected' | 'task_created' | 'room_changed' | 'condition_noted';
  timestamp: string;
  roomId?: string;
  details: Record<string, unknown>;
}

export interface SessionResults {
  summary: string;
  roomsCount: number;
  anomaliesCount: number;
  tasksCount: number;
  photosCount: number;
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

export interface LiveNarrationState {
  isListening: boolean;
  isProcessing: boolean;
  currentRoom?: string;
  lastCommand?: VoiceCommand;
  liveTranscription?: string;
  currentWaveform: number[];
  sessionStatus: 'idle' | 'active' | 'paused' | 'generating';
}

export interface NarrationFeedback {
  type: 'success' | 'error' | 'info' | 'suggestion';
  message: string;
  audioResponse?: string;
}
