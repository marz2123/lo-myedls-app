// User Mode Context
// Manages Beginner/Expert mode globally with persistence

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type UserMode = 'beginner' | 'expert';

interface UserModeContextType {
  mode: UserMode;
  isBeginner: boolean;
  isExpert: boolean;
  setMode: (mode: UserMode) => void;
  toggleMode: () => void;
  
  // UX helpers based on mode
  showHints: boolean;
  showChecklists: boolean;
  showAdvancedFilters: boolean;
  density: 'comfortable' | 'compact';
  labelStyle: 'verbose' | 'short';
  myAladinVerbosity: 'high' | 'low';
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

const STORAGE_KEY = 'myedls_user_mode';

export const UserModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<UserMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return (saved === 'expert' ? 'expert' : 'beginner') as UserMode;
    }
    return 'beginner';
  });

  // Persist mode changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = useCallback((newMode: UserMode) => {
    setModeState(newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState(prev => prev === 'beginner' ? 'expert' : 'beginner');
  }, []);

  // Derived values based on mode
  const isBeginner = mode === 'beginner';
  const isExpert = mode === 'expert';

  const value: UserModeContextType = {
    mode,
    isBeginner,
    isExpert,
    setMode,
    toggleMode,
    
    // UX configuration based on mode
    showHints: isBeginner,
    showChecklists: isBeginner,
    showAdvancedFilters: isExpert,
    density: isExpert ? 'compact' : 'comfortable',
    labelStyle: isExpert ? 'short' : 'verbose',
    myAladinVerbosity: isBeginner ? 'high' : 'low',
  };

  return (
    <UserModeContext.Provider value={value}>
      {children}
    </UserModeContext.Provider>
  );
};

export const useUserMode = (): UserModeContextType => {
  const context = useContext(UserModeContext);
  if (!context) {
    throw new Error('useUserMode must be used within a UserModeProvider');
  }
  return context;
};

// Hook for getting mode-specific text
export const useModeText = () => {
  const { labelStyle } = useUserMode();
  
  return useCallback((verbose: string, short: string) => {
    return labelStyle === 'verbose' ? verbose : short;
  }, [labelStyle]);
};

// Hook for mode-specific visibility
export const useModeVisibility = () => {
  const { isBeginner, isExpert, showHints, showAdvancedFilters } = useUserMode();
  
  return {
    // Show only in beginner mode
    beginnerOnly: (component: ReactNode) => isBeginner ? component : null,
    // Show only in expert mode
    expertOnly: (component: ReactNode) => isExpert ? component : null,
    // Hints visibility
    hint: (component: ReactNode) => showHints ? component : null,
    // Advanced filters visibility
    advancedFilters: (component: ReactNode) => showAdvancedFilters ? component : null,
  };
};

export default UserModeContext;
