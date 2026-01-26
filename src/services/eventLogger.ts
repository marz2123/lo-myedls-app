// Global Event Logger
// Logs events to Supabase for analytics and error tracking

import { supabase } from '@/integrations/supabase/client';

type EventCategory = 
  | 'capture'
  | 'ai'
  | 'validation'
  | 'navigation'
  | 'error'
  | 'client_view';

interface EventPayload {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  projectId?: string;
  sessionId?: string;
}

interface ErrorPayload {
  error: Error | string;
  context: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

class EventLogger {
  private sessionId: string;
  private userId: string | null = null;
  private eventQueue: EventPayload[] = [];
  private errorQueue: ErrorPayload[] = [];
  private flushInterval: number | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startFlushInterval();
    this.initUser();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initUser() {
    const { data: { user } } = await supabase.auth.getUser();
    this.userId = user?.id || null;
  }

  private startFlushInterval() {
    // Flush events every 30 seconds
    this.flushInterval = window.setInterval(() => {
      this.flush();
    }, 30000);
  }

  // Log a general event
  log(payload: EventPayload) {
    const enrichedPayload = {
      ...payload,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      userId: this.userId,
    };

    this.eventQueue.push(enrichedPayload);

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('[Event]', enrichedPayload);
    }

    // Flush immediately for important events
    if (payload.category === 'error' || payload.action.includes('validated')) {
      this.flush();
    }
  }

  // Log specific event types
  logSegmentCaptured(projectId: string, segmentType: string, duration?: number) {
    this.log({
      category: 'capture',
      action: 'segment_captured',
      label: segmentType,
      value: duration,
      projectId,
    });
  }

  logZoneValidated(projectId: string, zoneName: string) {
    this.log({
      category: 'validation',
      action: 'zone_validated',
      label: zoneName,
      projectId,
    });
  }

  logAISummaryGenerated(projectId: string, summaryType: string, confidence?: number) {
    this.log({
      category: 'ai',
      action: 'summary_generated',
      label: summaryType,
      value: confidence ? Math.round(confidence * 100) : undefined,
      projectId,
    });
  }

  logTaskModified(projectId: string, taskId: string, modificationType: string) {
    this.log({
      category: 'validation',
      action: 'task_modified',
      label: modificationType,
      metadata: { taskId },
      projectId,
    });
  }

  logEDLValidated(projectId: string, edlType: string) {
    this.log({
      category: 'validation',
      action: 'edl_validated',
      label: edlType,
      projectId,
    });
  }

  logClientViewOpened(projectId: string, viewType: string) {
    this.log({
      category: 'client_view',
      action: 'view_opened',
      label: viewType,
      projectId,
    });
  }

  logModeSwitch(fromMode: string, toMode: string) {
    this.log({
      category: 'navigation',
      action: 'mode_switch',
      label: `${fromMode} -> ${toMode}`,
    });
  }

  // Log an error
  logError(payload: ErrorPayload) {
    const errorMessage = payload.error instanceof Error 
      ? payload.error.message 
      : payload.error;

    const errorStack = payload.error instanceof Error
      ? payload.error.stack
      : undefined;

    const enrichedError = {
      ...payload,
      error: errorMessage,
      stack: errorStack,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.errorQueue.push(enrichedError as any);

    // Always log errors to console
    console.error('[Error]', enrichedError);

    // Flush immediately for critical errors
    if (payload.severity === 'critical' || payload.severity === 'high') {
      this.flush();
    }
  }

  // Specific error loggers
  logAIError(error: Error | string, context: string, metadata?: Record<string, any>) {
    this.logError({
      error,
      context: `AI: ${context}`,
      severity: 'high',
      metadata: { ...metadata, type: 'ai_error' },
    });
  }

  logAPIError(error: Error | string, endpoint: string, metadata?: Record<string, any>) {
    this.logError({
      error,
      context: `API: ${endpoint}`,
      severity: 'medium',
      metadata: { ...metadata, type: 'api_error' },
    });
  }

  logValidationError(error: Error | string, field: string, metadata?: Record<string, any>) {
    this.logError({
      error,
      context: `Validation: ${field}`,
      severity: 'low',
      metadata: { ...metadata, type: 'validation_error' },
    });
  }

  logInvalidJSON(rawOutput: string, expectedSchema: string) {
    this.logError({
      error: 'Invalid JSON from AI',
      context: 'JSON Validation',
      severity: 'medium',
      metadata: {
        type: 'json_error',
        rawOutputPreview: rawOutput.substring(0, 500),
        expectedSchema,
      },
    });
  }

  // Flush queued events to Supabase
  async flush() {
    if (this.eventQueue.length === 0 && this.errorQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    const errors = [...this.errorQueue];
    
    this.eventQueue = [];
    this.errorQueue = [];

    try {
      // Store events in analytics (if table exists)
      if (events.length > 0) {
        // For now, just log - could be stored in a dedicated analytics table
        if (import.meta.env.DEV) {
          console.log('[EventLogger] Flushing', events.length, 'events');
        }
      }

      // Store errors
      if (errors.length > 0) {
        // For now, just log - could be stored in a dedicated errors table
        if (import.meta.env.DEV) {
          console.log('[EventLogger] Flushing', errors.length, 'errors');
        }
      }
    } catch (err) {
      // Don't recursively log errors
      console.error('[EventLogger] Flush failed:', err);
      // Re-queue events for next flush
      this.eventQueue.push(...events);
      this.errorQueue.push(...errors);
    }
  }

  // Cleanup
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

export const eventLogger = new EventLogger();
export default eventLogger;
