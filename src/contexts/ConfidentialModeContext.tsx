import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface ConfidentialModeContextType {
  isConfidential: boolean;
  toggleConfidential: () => void;
  setConfidential: (value: boolean) => void;
  blurIntensity: number;
  setBlurIntensity: (value: number) => void;
}

const ConfidentialModeContext = createContext<ConfidentialModeContextType | undefined>(undefined);

const CONFIDENTIAL_KEY = 'myedls_confidential_mode';
const BLUR_INTENSITY_KEY = 'myedls_blur_intensity';

export const ConfidentialModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConfidential, setIsConfidential] = useState(false);
  const [blurIntensity, setBlurIntensityState] = useState(8);

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem(CONFIDENTIAL_KEY);
    if (saved) setIsConfidential(saved === 'true');

    const savedBlur = localStorage.getItem(BLUR_INTENSITY_KEY);
    if (savedBlur) setBlurIntensityState(parseInt(savedBlur, 10));
  }, []);

  const toggleConfidential = useCallback(() => {
    setIsConfidential(prev => {
      const newValue = !prev;
      localStorage.setItem(CONFIDENTIAL_KEY, newValue.toString());
      return newValue;
    });
  }, []);

  const setConfidential = useCallback((value: boolean) => {
    setIsConfidential(value);
    localStorage.setItem(CONFIDENTIAL_KEY, value.toString());
  }, []);

  const setBlurIntensity = useCallback((value: number) => {
    setBlurIntensityState(value);
    localStorage.setItem(BLUR_INTENSITY_KEY, value.toString());
  }, []);

  return (
    <ConfidentialModeContext.Provider
      value={{
        isConfidential,
        toggleConfidential,
        setConfidential,
        blurIntensity,
        setBlurIntensity
      }}
    >
      {children}
    </ConfidentialModeContext.Provider>
  );
};

export const useConfidentialMode = () => {
  const context = useContext(ConfidentialModeContext);
  if (!context) {
    throw new Error('useConfidentialMode must be used within ConfidentialModeProvider');
  }
  return context;
};
