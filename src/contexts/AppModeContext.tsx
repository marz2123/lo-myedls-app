import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AppMode = 'selector' | 'classic' | 'aladin';

interface AppModeContextType {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export const AppModeProvider = ({ children }: { children: ReactNode }) => {
  const [appMode, setAppModeState] = useState<AppMode>('selector');

  useEffect(() => {
    const savedMode = localStorage.getItem('myedls-app-mode') as AppMode | null;
    if (savedMode === 'classic' || savedMode === 'aladin') {
      setAppModeState(savedMode);
    }
  }, []);

  const setAppMode = (mode: AppMode) => {
    if (mode === 'selector') {
      localStorage.removeItem('myedls-app-mode');
    } else {
      localStorage.setItem('myedls-app-mode', mode);
    }
    setAppModeState(mode);
  };

  return (
    <AppModeContext.Provider value={{ appMode, setAppMode }}>
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within AppModeProvider');
  }
  return context;
};
