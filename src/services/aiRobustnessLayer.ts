// Global AI Robustness Layer
// Automatic retries, fallbacks, JSON validation, and consistency checking

import { supabase } from '@/integrations/supabase/client';

interface AICallOptions {
  maxRetries?: number;
  fallbackModel?: string;
  validateOutput?: boolean;
  addConfidenceScore?: boolean;
}

interface AIResult<T> {
  data: T | null;
  error: string | null;
  confidenceScore?: number;
  usedFallback?: boolean;
  retryCount?: number;
}

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  HIDE_FROM_CLIENT: 0.3,
  NEEDS_VERIFICATION: 0.5,
  TRUSTED: 0.8,
};

class AIRobustnessLayer {
  // Generic AI call with retries and fallbacks
  async callWithRetry<T>(
    primaryCall: () => Promise<T>,
    fallbackCall?: () => Promise<T>,
    options: AICallOptions = {}
  ): Promise<AIResult<T>> {
    const { maxRetries = 2 } = options;
    let lastError: string | null = null;
    let retryCount = 0;

    // Try primary call with retries
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const data = await primaryCall();
        return {
          data,
          error: null,
          retryCount,
          usedFallback: false,
        };
      } catch (error: any) {
        lastError = error.message || 'Unknown error';
        retryCount++;
        
        // Wait before retry (exponential backoff)
        if (i < maxRetries) {
          await this.delay(Math.pow(2, i) * 500);
        }
      }
    }

    // Try fallback if available
    if (fallbackCall) {
      try {
        const data = await fallbackCall();
        return {
          data,
          error: null,
          retryCount,
          usedFallback: true,
        };
      } catch (error: any) {
        lastError = error.message || 'Fallback also failed';
      }
    }

    return {
      data: null,
      error: lastError,
      retryCount,
      usedFallback: false,
    };
  }

  // Validate and auto-correct JSON output
  async validateAndCorrectJSON<T>(
    rawOutput: string,
    expectedSchema: string
  ): Promise<{ valid: boolean; data: T | null; corrected: boolean }> {
    try {
      // First try to parse directly
      const parsed = JSON.parse(rawOutput);
      return { valid: true, data: parsed as T, corrected: false };
    } catch {
      // Try to extract JSON from mixed content
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return { valid: true, data: parsed as T, corrected: true };
        } catch {
          // Continue to AI correction
        }
      }

      // Use AI to correct the JSON
      try {
        const { data, error } = await supabase.functions.invoke('myaladin-chat', {
          body: {
            messages: [{
              role: 'user',
              content: `Corrige ce JSON invalide et retourne UNIQUEMENT le JSON valide, sans explication:\n\n${rawOutput}\n\nSchéma attendu: ${expectedSchema}`
            }],
            mode: 'json-fix'
          }
        });

        if (data?.response) {
          const correctedJson = data.response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (correctedJson) {
            const parsed = JSON.parse(correctedJson[0]);
            return { valid: true, data: parsed as T, corrected: true };
          }
        }
      } catch {
        // AI correction failed
      }

      return { valid: false, data: null, corrected: false };
    }
  }

  // Calculate confidence score for AI output
  calculateConfidenceScore(output: any, context?: any): number {
    let score = 0.7; // Base confidence

    // Adjust based on completeness
    if (output) {
      const requiredFields = ['title', 'description', 'location'];
      const presentFields = requiredFields.filter(f => output[f] && output[f].length > 0);
      score += (presentFields.length / requiredFields.length) * 0.15;
    }

    // Adjust based on context consistency
    if (context?.previousTasks && output?.location) {
      const locationExists = context.previousTasks.some(
        (t: any) => t.location === output.location
      );
      if (locationExists) score += 0.05;
    }

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  // Check if confidence is sufficient for client display
  isClientSafe(confidenceScore: number): boolean {
    return confidenceScore >= CONFIDENCE_THRESHOLDS.HIDE_FROM_CLIENT;
  }

  needsVerification(confidenceScore: number): boolean {
    return confidenceScore < CONFIDENCE_THRESHOLDS.NEEDS_VERIFICATION;
  }

  // Run consistency check on extracted tasks
  async runConsistencyCheck(tasks: any[]): Promise<{
    tasks: any[];
    corrections: string[];
    duplicatesRemoved: number;
    contradictionsFixed: number;
  }> {
    const corrections: string[] = [];
    let duplicatesRemoved = 0;
    let contradictionsFixed = 0;

    // Detect and remove duplicates
    const uniqueTasks: any[] = [];
    const taskHashes = new Set<string>();

    for (const task of tasks) {
      const hash = `${task.location || ''}-${task.title || ''}-${task.zone_type || ''}`.toLowerCase();
      if (!taskHashes.has(hash)) {
        taskHashes.add(hash);
        uniqueTasks.push(task);
      } else {
        duplicatesRemoved++;
        corrections.push(`Doublon supprimé: ${task.title}`);
      }
    }

    // Detect contradictions (same zone with conflicting states)
    const zoneStates = new Map<string, { state: string; taskIndex: number }>();
    
    for (let i = 0; i < uniqueTasks.length; i++) {
      const task = uniqueTasks[i];
      const zoneKey = `${task.location}-${task.zone_type}`;
      
      if (task.description) {
        const stateMatch = task.description.match(/(bon état|mauvais état|neuf|dégradé|fissuré|sain)/i);
        if (stateMatch) {
          const state = stateMatch[1].toLowerCase();
          const existing = zoneStates.get(zoneKey);
          
          if (existing && this.areContradictoryStates(existing.state, state)) {
            contradictionsFixed++;
            corrections.push(`Contradiction détectée pour ${task.location}: ${existing.state} vs ${state}`);
            // Mark the task for verification
            uniqueTasks[i].needsVerification = true;
            uniqueTasks[i].confidenceScore = Math.min(
              uniqueTasks[i].confidenceScore || 1,
              0.4
            );
          } else {
            zoneStates.set(zoneKey, { state, taskIndex: i });
          }
        }
      }
    }

    return {
      tasks: uniqueTasks,
      corrections,
      duplicatesRemoved,
      contradictionsFixed,
    };
  }

  private areContradictoryStates(state1: string, state2: string): boolean {
    const positiveStates = ['bon état', 'neuf', 'sain'];
    const negativeStates = ['mauvais état', 'dégradé', 'fissuré'];
    
    const isState1Positive = positiveStates.some(s => state1.includes(s));
    const isState2Positive = positiveStates.some(s => state2.includes(s));
    const isState1Negative = negativeStates.some(s => state1.includes(s));
    const isState2Negative = negativeStates.some(s => state2.includes(s));
    
    return (isState1Positive && isState2Negative) || (isState1Negative && isState2Positive);
  }

  // Transcription with Whisper -> Gemini fallback
  async transcribeWithFallback(audioBlob: Blob): Promise<AIResult<string>> {
    return this.callWithRetry(
      async () => {
        const { data, error } = await supabase.functions.invoke('transcribe-visit-audio', {
          body: { audio: await this.blobToBase64(audioBlob) }
        });
        if (error) throw error;
        return data.transcript;
      },
      async () => {
        // Fallback to Gemini via Lovable AI
        const { data, error } = await supabase.functions.invoke('myaladin-chat', {
          body: {
            messages: [{
              role: 'user',
              content: 'Transcris cet audio (format base64 attaché)'
            }],
            audio: await this.blobToBase64(audioBlob),
            mode: 'transcription'
          }
        });
        if (error) throw error;
        return data.response;
      }
    );
  }

  // Vision analysis with fallback
  async analyzeFrameWithFallback(imageData: string): Promise<AIResult<any>> {
    return this.callWithRetry(
      async () => {
        const { data, error } = await supabase.functions.invoke('analyze-video-frame', {
          body: { imageBase64: imageData }
        });
        if (error) throw error;
        return data;
      },
      async () => {
        // Fallback to simpler model
        const { data, error } = await supabase.functions.invoke('analyze-video-frame', {
          body: { imageBase64: imageData, useFallbackModel: true }
        });
        if (error) throw error;
        return data;
      }
    );
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const aiRobustnessLayer = new AIRobustnessLayer();
export { CONFIDENCE_THRESHOLDS };
export default aiRobustnessLayer;
