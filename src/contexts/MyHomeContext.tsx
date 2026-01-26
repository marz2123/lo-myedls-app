// MyHome Integration Context
// Provides unified session, permissions, and module context across the ecosystem

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Module types
type ModuleId = 'myhome' | 'myedls' | 'mychantiers' | 'myplanning';

// Role types from MyHome
type MyHomeRole = 
  | 'admin'
  | 'chef_de_chantier'
  | 'economiste'
  | 'architecte'
  | 'conducteur_travaux'
  | 'maitre_ouvrage'
  | 'clientASL'
  | 'sous_traitant'
  | 'viewer'
  | 'guest';

// Permission types
type Permission = 
  | 'read'
  | 'write'
  | 'capture'
  | 'review'
  | 'validate'
  | 'assign'
  | 'delete'
  | 'admin';

// Company context
interface CompanyContext {
  id: string;
  name: string;
  logo?: string;
  type: 'archi_home' | 'bati_home' | 'deco_home' | 'opti_home' | 'cabinet_riviere' | 'other';
}

// User context from MyHome
interface UserContext {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: MyHomeRole;
  company?: CompanyContext;
  projectAccess: string[]; // List of project IDs user can access
}

// Module context for MyAladin
interface ModuleContext {
  module: ModuleId;
  projectId: string | null;
  projectName: string | null;
  captureMode: 'guided' | 'ultra-guided' | 'libre' | 'myaladin' | null;
  lastAction: string | null;
  lastPiece: string | null;
  pendingTasks: number;
  missingZones: string[];
  ongoingEDLId: string | null;
}

// Navigation state for seamless transitions
interface NavigationState {
  previousModule: ModuleId | null;
  previousRoute: string | null;
  returnContext: Record<string, any> | null;
}

// Full MyHome context
interface MyHomeContextType {
  // User session
  user: UserContext | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Module context
  currentModule: ModuleId;
  moduleContext: ModuleContext;
  
  // Permissions
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: MyHomeRole) => boolean;
  
  // Navigation
  navigation: NavigationState;
  navigateToModule: (module: ModuleId, route?: string, context?: Record<string, any>) => void;
  navigateBack: () => void;
  
  // Module context updates
  updateModuleContext: (updates: Partial<ModuleContext>) => void;
  setProject: (projectId: string, projectName: string) => void;
  
  // MyAladin context
  getMyAladinContext: () => Record<string, any>;
}

const MyHomeContext = createContext<MyHomeContextType | undefined>(undefined);

// Role to permissions mapping
const ROLE_PERMISSIONS: Record<MyHomeRole, Permission[]> = {
  admin: ['read', 'write', 'capture', 'review', 'validate', 'assign', 'delete', 'admin'],
  chef_de_chantier: ['read', 'write', 'capture', 'review', 'validate'],
  conducteur_travaux: ['read', 'write', 'capture', 'review', 'validate', 'assign'],
  economiste: ['read', 'review', 'validate'],
  architecte: ['read', 'write', 'review'],
  maitre_ouvrage: ['read', 'review', 'validate'],
  clientASL: ['read'],
  sous_traitant: ['read', 'write', 'capture'],
  viewer: ['read'],
  guest: ['read'],
};

export const MyHomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentModule, setCurrentModule] = useState<ModuleId>('myedls');
  
  const [moduleContext, setModuleContext] = useState<ModuleContext>({
    module: 'myedls',
    projectId: null,
    projectName: null,
    captureMode: null,
    lastAction: null,
    lastPiece: null,
    pendingTasks: 0,
    missingZones: [],
    ongoingEDLId: null,
  });
  
  const [navigation, setNavigation] = useState<NavigationState>({
    previousModule: null,
    previousRoute: null,
    returnContext: null,
  });

  // Load user from session or MyHome parent frame
  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      
      try {
        // Check if running inside MyHome iframe
        const isEmbedded = window.parent !== window;
        
        if (isEmbedded) {
          // Request session from parent MyHome
          window.parent.postMessage({ type: 'REQUEST_SESSION' }, '*');
        } else {
          // Standalone mode - use Supabase auth
          const { data: { user: authUser } } = await supabase.auth.getUser();
          
          if (authUser) {
            // Fetch user role from user_roles table
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', authUser.id)
              .single();
            
            // Fetch projects user has access to
            const { data: projects } = await supabase
              .from('projects')
              .select('id')
              .eq('user_id', authUser.id);
            
            setUser({
              id: authUser.id,
              email: authUser.email || '',
              name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
              avatar: authUser.user_metadata?.avatar_url,
              role: (roleData?.role as MyHomeRole) || 'viewer',
              projectAccess: projects?.map(p => p.id) || [],
            });
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
    
    // Listen for MyHome session messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'SESSION_DATA') {
        setUser(event.data.user);
        setIsLoading(false);
      }
      if (event.data.type === 'NAVIGATE_TO') {
        setCurrentModule(event.data.module);
        if (event.data.context) {
          setModuleContext(prev => ({ ...prev, ...event.data.context }));
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Compute permissions based on role
  const permissions = useMemo(() => {
    if (!user) return [];
    return ROLE_PERMISSIONS[user.role] || [];
  }, [user]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const hasRole = useCallback((role: MyHomeRole): boolean => {
    return user?.role === role;
  }, [user]);

  // Navigate between modules
  const navigateToModule = useCallback((
    module: ModuleId,
    route?: string,
    context?: Record<string, any>
  ) => {
    // Save current state for return
    setNavigation({
      previousModule: currentModule,
      previousRoute: window.location.pathname,
      returnContext: { ...moduleContext },
    });
    
    // Check if embedded
    const isEmbedded = window.parent !== window;
    
    if (isEmbedded) {
      // Send navigation request to parent
      window.parent.postMessage({
        type: 'NAVIGATE',
        module,
        route,
        context,
      }, '*');
    } else {
      // Standalone navigation
      setCurrentModule(module);
      if (context) {
        setModuleContext(prev => ({ ...prev, ...context }));
      }
      
      // Build route
      const targetRoute = route || `/${module}`;
      window.history.pushState({ module, context }, '', targetRoute);
    }
  }, [currentModule, moduleContext]);

  const navigateBack = useCallback(() => {
    if (navigation.previousModule) {
      navigateToModule(
        navigation.previousModule,
        navigation.previousRoute || undefined,
        navigation.returnContext || undefined
      );
    }
  }, [navigation, navigateToModule]);

  // Update module context
  const updateModuleContext = useCallback((updates: Partial<ModuleContext>) => {
    setModuleContext(prev => {
      const updated = { ...prev, ...updates };
      
      // Notify parent if embedded
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'CONTEXT_UPDATE',
          context: updated,
        }, '*');
      }
      
      return updated;
    });
  }, []);

  const setProject = useCallback((projectId: string, projectName: string) => {
    updateModuleContext({ projectId, projectName });
  }, [updateModuleContext]);

  // Get context for MyAladin
  const getMyAladinContext = useCallback(() => ({
    // Module info
    module: currentModule,
    moduleContext,
    
    // User info
    userId: user?.id,
    userRole: user?.role,
    userName: user?.name,
    company: user?.company?.name,
    
    // Project info
    projectId: moduleContext.projectId,
    projectName: moduleContext.projectName,
    
    // Capture context
    captureMode: moduleContext.captureMode,
    lastAction: moduleContext.lastAction,
    lastPiece: moduleContext.lastPiece,
    
    // Task context
    pendingTasks: moduleContext.pendingTasks,
    missingZones: moduleContext.missingZones,
    ongoingEDLId: moduleContext.ongoingEDLId,
    
    // Permissions
    permissions,
    
    // Navigation
    canNavigateBack: !!navigation.previousModule,
  }), [currentModule, moduleContext, user, permissions, navigation]);

  const value: MyHomeContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    currentModule,
    moduleContext,
    permissions,
    hasPermission,
    hasRole,
    navigation,
    navigateToModule,
    navigateBack,
    updateModuleContext,
    setProject,
    getMyAladinContext,
  };

  return (
    <MyHomeContext.Provider value={value}>
      {children}
    </MyHomeContext.Provider>
  );
};

export const useMyHome = () => {
  const context = useContext(MyHomeContext);
  if (!context) {
    throw new Error('useMyHome must be used within a MyHomeProvider');
  }
  return context;
};

export type { ModuleId, MyHomeRole, Permission, UserContext, ModuleContext, CompanyContext };
