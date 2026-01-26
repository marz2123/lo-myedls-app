import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseTextCorrectionOptions {
  debounceMs?: number;
  context?: string;
  autoCorrect?: boolean;
}

export const useTextCorrection = (options: UseTextCorrectionOptions = {}) => {
  const { debounceMs = 1500, context = 'description problème bâtiment', autoCorrect = true } = options;
  
  const [isCorreecting, setIsCorrecting] = useState(false);
  const [lastCorrectedText, setLastCorrectedText] = useState('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTextRef = useRef('');

  const correctText = useCallback(async (text: string): Promise<string> => {
    if (!text || text.trim().length < 5) return text;
    
    try {
      setIsCorrecting(true);
      
      const { data, error } = await supabase.functions.invoke('correct-text', {
        body: { text, context }
      });

      if (error) {
        console.error('Correction error:', error);
        return text;
      }

      const correctedText = data?.correctedText || text;
      setLastCorrectedText(correctedText);
      return correctedText;
      
    } catch (err) {
      console.error('Failed to correct text:', err);
      return text;
    } finally {
      setIsCorrecting(false);
    }
  }, [context]);

  const correctTextDebounced = useCallback((text: string, onCorrected: (corrected: string) => void) => {
    if (!autoCorrect) return;
    
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Don't correct if text is too short or same as last
    if (text.trim().length < 10 || text === lastTextRef.current) return;

    debounceTimer.current = setTimeout(async () => {
      lastTextRef.current = text;
      const corrected = await correctText(text);
      
      // Only update if text actually changed
      if (corrected !== text && corrected.trim() !== text.trim()) {
        onCorrected(corrected);
      }
    }, debounceMs);
  }, [autoCorrect, debounceMs, correctText]);

  const correctImmediately = useCallback(async (text: string): Promise<string> => {
    // Clear any pending debounced correction
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    return correctText(text);
  }, [correctText]);

  const cancelPendingCorrection = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  return {
    correctText,
    correctTextDebounced,
    correctImmediately,
    cancelPendingCorrection,
    isCorreecting,
    lastCorrectedText
  };
};
