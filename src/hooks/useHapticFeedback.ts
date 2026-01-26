import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

type HapticEvent = 
  | 'piece_complete'
  | 'zone_complete'
  | 'edl_complete'
  | 'critical_observation'
  | 'recording_start'
  | 'recording_stop'
  | 'error'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'notification';

/**
 * useHapticFeedback - Mobile haptic feedback for key events
 * 
 * Triggers vibration for:
 * - Piece completion
 * - Critical observation added
 * - EDL analysis finished
 * 
 * Does NOT vibrate on every tap to avoid overload
 */
export function useHapticFeedback() {
  const isNative = Capacitor.isNativePlatform();

  const trigger = useCallback(async (event: HapticEvent) => {
    if (!isNative) return;

    try {
      switch (event) {
        case 'piece_complete':
          // Success pattern: short-short-long
          await Haptics.notification({ type: NotificationType.Success });
          break;
          
        case 'zone_complete':
          // Light tap
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
          
        case 'edl_complete':
          // Strong success
          await Haptics.notification({ type: NotificationType.Success });
          await new Promise(r => setTimeout(r, 100));
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
          
        case 'critical_observation':
          // Warning pattern
          await Haptics.notification({ type: NotificationType.Warning });
          break;
          
        case 'recording_start':
          // Medium impact
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
          
        case 'recording_stop':
          // Heavy impact
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
          
        case 'error':
          // Error notification
          await Haptics.notification({ type: NotificationType.Error });
          break;

        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;

        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;

        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;

        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          break;

        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;

        case 'notification':
          await Haptics.notification({ type: NotificationType.Success });
          break;
          
        default:
          await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (error) {
      // Haptics not available or permission denied
      console.debug('[Haptics] Not available:', error);
    }
  }, [isNative]);

  const selectionChanged = useCallback(async () => {
    if (!isNative) return;
    try {
      await Haptics.selectionChanged();
    } catch (error) {
      // Ignore
    }
  }, [isNative]);

  return {
    trigger,
    selectionChanged,
    isSupported: isNative,
  };
}
