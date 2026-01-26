import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

type BiometricType = 'face' | 'fingerprint' | 'none';

interface BiometricState {
  isAvailable: boolean;
  biometricType: BiometricType;
  isLocked: boolean;
  isAuthenticating: boolean;
}

const BIOMETRIC_ENABLED_KEY = 'myedls_biometric_enabled';
const LAST_AUTH_KEY = 'myedls_last_auth_time';
const AUTH_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const useBiometricAuth = () => {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    biometricType: 'none',
    isLocked: false,
    isAuthenticating: false
  });

  const isBiometricEnabled = useCallback(() => {
    return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
  }, []);

  const setBiometricEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled.toString());
  }, []);

  // Check if biometric is available
  useEffect(() => {
    const checkAvailability = async () => {
      if (Capacitor.isNativePlatform()) {
        // On native, we'd use Capacitor Biometric plugin
        // For now, simulate availability
        const isAvailable = true;
        const biometricType: BiometricType = 
          Capacitor.getPlatform() === 'ios' ? 'face' : 'fingerprint';
        
        setState(prev => ({
          ...prev,
          isAvailable,
          biometricType
        }));
      } else {
        // Web - check for Web Authentication API
        const isAvailable = 
          typeof PublicKeyCredential !== 'undefined' &&
          typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
        
        if (isAvailable) {
          try {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            setState(prev => ({
              ...prev,
              isAvailable: available,
              biometricType: available ? 'fingerprint' : 'none'
            }));
          } catch {
            setState(prev => ({
              ...prev,
              isAvailable: false,
              biometricType: 'none'
            }));
          }
        }
      }
    };

    checkAvailability();
  }, []);

  // Check if should be locked
  useEffect(() => {
    if (!isBiometricEnabled()) {
      setState(prev => ({ ...prev, isLocked: false }));
      return;
    }

    const lastAuth = localStorage.getItem(LAST_AUTH_KEY);
    if (lastAuth) {
      const elapsed = Date.now() - parseInt(lastAuth, 10);
      if (elapsed < AUTH_TIMEOUT) {
        setState(prev => ({ ...prev, isLocked: false }));
        return;
      }
    }

    setState(prev => ({ ...prev, isLocked: true }));
  }, [isBiometricEnabled]);

  // Authenticate
  const authenticate = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isAuthenticating: true }));

    try {
      if (Capacitor.isNativePlatform()) {
        // Native biometric authentication would go here
        // For now, simulate success
        await new Promise(resolve => setTimeout(resolve, 500));
        
        localStorage.setItem(LAST_AUTH_KEY, Date.now().toString());
        setState(prev => ({ 
          ...prev, 
          isLocked: false, 
          isAuthenticating: false 
        }));
        return true;
      } else {
        // Web fallback - use simple password prompt
        // In production, this would use Web Authentication API
        const passcode = prompt('Enter your passcode:');
        if (passcode === '1234') { // Demo passcode
          localStorage.setItem(LAST_AUTH_KEY, Date.now().toString());
          setState(prev => ({ 
            ...prev, 
            isLocked: false, 
            isAuthenticating: false 
          }));
          return true;
        }
        throw new Error('Invalid passcode');
      }
    } catch (error) {
      console.error('[Biometric] Authentication failed:', error);
      setState(prev => ({ ...prev, isAuthenticating: false }));
      return false;
    }
  }, []);

  // Lock the app
  const lock = useCallback(() => {
    if (isBiometricEnabled()) {
      localStorage.removeItem(LAST_AUTH_KEY);
      setState(prev => ({ ...prev, isLocked: true }));
    }
  }, [isBiometricEnabled]);

  // Unlock without biometric (passcode fallback)
  const unlockWithPasscode = useCallback(async (passcode: string): Promise<boolean> => {
    // In production, verify against stored passcode hash
    if (passcode === '1234') { // Demo passcode
      localStorage.setItem(LAST_AUTH_KEY, Date.now().toString());
      setState(prev => ({ ...prev, isLocked: false }));
      return true;
    }
    return false;
  }, []);

  return {
    ...state,
    isBiometricEnabled: isBiometricEnabled(),
    setBiometricEnabled,
    authenticate,
    lock,
    unlockWithPasscode
  };
};
