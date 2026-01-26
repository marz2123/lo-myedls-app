import { useState, useEffect, useCallback } from 'react';
import { arScanner, ARScanResult, ARMeasurement } from '@/services/arScanner';
import { toast } from 'sonner';

export const useARScanner = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [arAvailable, setArAvailable] = useState(false);
  const [currentMeasurement, setCurrentMeasurement] = useState<ARMeasurement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const available = await arScanner.initialize();
        setArAvailable(available);
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize AR:', err);
        setError('Failed to initialize AR scanner');
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  const startAutoScan = useCallback(async (
    onMeasurement?: (result: ARScanResult) => void
  ) => {
    if (!arAvailable) {
      toast.error('AR non disponible sur cet appareil');
      return;
    }

    try {
      setIsScanning(true);
      setError(null);

      await arScanner.startAutoScan((result: ARScanResult) => {
        setCurrentMeasurement(result.measurements);
        onMeasurement?.(result);
      });

      toast.success('Scan AR démarré');
    } catch (err: any) {
      console.error('Failed to start AR scan:', err);
      setError(err.message);
      setIsScanning(false);
      toast.error('Erreur lors du démarrage AR');
    }
  }, [arAvailable]);

  const stopAutoScan = useCallback(async () => {
    try {
      await arScanner.stopAutoScan();
      setIsScanning(false);
      toast.success('Scan AR arrêté');
    } catch (err: any) {
      console.error('Failed to stop AR scan:', err);
      setError(err.message);
    }
  }, []);

  const getCurrentMeasurements = useCallback(async () => {
    try {
      const measurements = await arScanner.getCurrentMeasurements();
      if (measurements) {
        setCurrentMeasurement(measurements);
      }
      return measurements;
    } catch (err) {
      console.error('Failed to get measurements:', err);
      return null;
    }
  }, []);

  return {
    isInitialized,
    isScanning,
    arAvailable,
    currentMeasurement,
    error,
    startAutoScan,
    stopAutoScan,
    getCurrentMeasurements
  };
};
