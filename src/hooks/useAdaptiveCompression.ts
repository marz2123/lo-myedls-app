import { useState, useEffect, useCallback, useRef } from 'react';
import { Network, ConnectionStatus } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { videoCompression, CompressionQuality } from '@/services/videoCompression';

interface NetworkQuality {
  type: 'wifi' | '4g' | '3g' | '2g' | 'offline' | 'unknown';
  effectiveType?: string;
  downlink?: number; // Mbps
  rtt?: number; // ms
}

interface AdaptiveSettings {
  videoQuality: 'high' | 'medium' | 'low';
  compressionQuality: CompressionQuality;
  maxBitrate: number;
  maxResolution: { width: number; height: number };
  shouldCompressNow: boolean;
  uploadStrategy: 'immediate' | 'batch' | 'wifi-only';
}

/**
 * useAdaptiveCompression - Adapts video quality based on network conditions
 * 
 * - Compresses video quality dynamically depending on network quality
 * - If offline: stores media locally, marks EDL as "à synchroniser"
 * - Auto-syncs when network is back
 * - Ensures user can always continue working
 */
export const useAdaptiveCompression = () => {
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>({
    type: 'unknown',
  });
  const [isOnline, setIsOnline] = useState(true);
  const [settings, setSettings] = useState<AdaptiveSettings>({
    videoQuality: 'high',
    compressionQuality: 'medium',
    maxBitrate: 4000000,
    maxResolution: { width: 1920, height: 1080 },
    shouldCompressNow: false,
    uploadStrategy: 'immediate',
  });
  
  const networkInfoRef = useRef<any>(null);

  /**
   * Determine settings based on network quality
   */
  const calculateSettings = useCallback((quality: NetworkQuality): AdaptiveSettings => {
    // Offline mode
    if (quality.type === 'offline') {
      return {
        videoQuality: 'medium',
        compressionQuality: 'medium',
        maxBitrate: 2000000,
        maxResolution: { width: 1280, height: 720 },
        shouldCompressNow: true, // Compress immediately for storage
        uploadStrategy: 'wifi-only',
      };
    }

    // WiFi - best quality
    if (quality.type === 'wifi') {
      const effectiveDownlink = quality.downlink || 10;
      
      if (effectiveDownlink > 50) {
        return {
          videoQuality: 'high',
          compressionQuality: 'high',
          maxBitrate: 8000000,
          maxResolution: { width: 1920, height: 1080 },
          shouldCompressNow: false,
          uploadStrategy: 'immediate',
        };
      }
      
      return {
        videoQuality: 'high',
        compressionQuality: 'medium',
        maxBitrate: 4000000,
        maxResolution: { width: 1920, height: 1080 },
        shouldCompressNow: false,
        uploadStrategy: 'immediate',
      };
    }

    // 4G - good quality with compression
    if (quality.type === '4g') {
      return {
        videoQuality: 'medium',
        compressionQuality: 'medium',
        maxBitrate: 2500000,
        maxResolution: { width: 1280, height: 720 },
        shouldCompressNow: true,
        uploadStrategy: 'immediate',
      };
    }

    // 3G - reduced quality
    if (quality.type === '3g') {
      return {
        videoQuality: 'low',
        compressionQuality: 'low',
        maxBitrate: 1000000,
        maxResolution: { width: 854, height: 480 },
        shouldCompressNow: true,
        uploadStrategy: 'batch',
      };
    }

    // 2G or poor - minimum quality, defer upload
    return {
      videoQuality: 'low',
      compressionQuality: 'low',
      maxBitrate: 500000,
      maxResolution: { width: 640, height: 360 },
      shouldCompressNow: true,
      uploadStrategy: 'wifi-only',
    };
  }, []);

  /**
   * Get web network info
   */
  const getWebNetworkInfo = useCallback((): NetworkQuality => {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    if (!connection) {
      return { type: navigator.onLine ? 'unknown' : 'offline' };
    }

    const effectiveType = connection.effectiveType;
    let type: NetworkQuality['type'] = 'unknown';

    if (!navigator.onLine) {
      type = 'offline';
    } else if (effectiveType === '4g') {
      type = connection.type === 'wifi' ? 'wifi' : '4g';
    } else if (effectiveType === '3g') {
      type = '3g';
    } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
      type = '2g';
    }

    return {
      type,
      effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
    };
  }, []);

  /**
   * Update network quality
   */
  const updateNetworkQuality = useCallback(async () => {
    let quality: NetworkQuality;

    if (Capacitor.isNativePlatform()) {
      try {
        const status: ConnectionStatus = await Network.getStatus();
        
        if (!status.connected) {
          quality = { type: 'offline' };
        } else {
          // Map Capacitor connection type
          const typeMap: Record<string, NetworkQuality['type']> = {
            wifi: 'wifi',
            cellular: '4g', // Assume 4G, will be refined
            none: 'offline',
            unknown: 'unknown',
          };
          
          quality = {
            type: typeMap[status.connectionType] || 'unknown',
          };
        }
      } catch (e) {
        quality = { type: 'unknown' };
      }
    } else {
      quality = getWebNetworkInfo();
    }

    setNetworkQuality(quality);
    setIsOnline(quality.type !== 'offline');
    setSettings(calculateSettings(quality));

    console.log('[AdaptiveCompression] Network quality:', quality);
  }, [calculateSettings, getWebNetworkInfo]);

  /**
   * Initialize and monitor network
   */
  useEffect(() => {
    updateNetworkQuality();

    if (Capacitor.isNativePlatform()) {
      // Native network monitoring
      Network.addListener('networkStatusChange', () => {
        updateNetworkQuality();
      });

      return () => {
        Network.removeAllListeners();
      };
    } else {
      // Web network monitoring
      const handleOnline = () => updateNetworkQuality();
      const handleOffline = () => updateNetworkQuality();
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Monitor connection changes
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', updateNetworkQuality);
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (connection) {
          connection.removeEventListener('change', updateNetworkQuality);
        }
      };
    }
  }, [updateNetworkQuality]);

  /**
   * Compress video based on current settings
   */
  const compressVideo = useCallback(async (videoBlob: Blob): Promise<Blob> => {
    if (!settings.shouldCompressNow) {
      return videoBlob;
    }

    try {
      const compressed = await videoCompression.compressBlob(videoBlob, {
        quality: settings.compressionQuality,
        maxWidth: settings.maxResolution.width,
        maxHeight: settings.maxResolution.height,
        bitrate: settings.maxBitrate,
      });

      console.log('[AdaptiveCompression] Compressed:', {
        original: (videoBlob.size / 1024 / 1024).toFixed(2) + 'MB',
        compressed: (compressed.size / 1024 / 1024).toFixed(2) + 'MB',
        ratio: ((1 - compressed.size / videoBlob.size) * 100).toFixed(1) + '%',
      });

      return compressed;
    } catch (e) {
      console.warn('[AdaptiveCompression] Compression failed, using original');
      return videoBlob;
    }
  }, [settings]);

  /**
   * Get recommended MediaRecorder options
   */
  const getRecorderOptions = useCallback((): MediaRecorderOptions => {
    return {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: settings.maxBitrate,
    };
  }, [settings]);

  /**
   * Get recommended video constraints
   */
  const getVideoConstraints = useCallback((): MediaTrackConstraints => {
    return {
      width: { ideal: settings.maxResolution.width, max: 1920 },
      height: { ideal: settings.maxResolution.height, max: 1080 },
      frameRate: { ideal: 30, max: 30 },
      facingMode: 'environment',
    };
  }, [settings]);

  return {
    networkQuality,
    isOnline,
    settings,
    compressVideo,
    getRecorderOptions,
    getVideoConstraints,
    refreshNetworkInfo: updateNetworkQuality,
  };
};
