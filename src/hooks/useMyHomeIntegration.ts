// MyHome Integration Hook
// Provides navigation, permission checking, and cross-module functionality

import { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMyHome, ModuleId } from '@/contexts/MyHomeContext';
import { moduleRegistry, ROLE_ACCESS_MAP } from '@/services/moduleRegistry';
import { useSessionStore } from '@/hooks/useSessionStore';
import { eventLogger } from '@/services/eventLogger';

interface NavigationOptions {
  preserveContext?: boolean;
  newTab?: boolean;
  context?: Record<string, any>;
}

export const useMyHomeIntegration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, 
    currentModule, 
    moduleContext,
    hasPermission, 
    hasRole,
    navigateToModule,
    navigateBack,
    updateModuleContext,
    getMyAladinContext,
  } = useMyHome();
  
  const { session, setProject, getAIContext } = useSessionStore();

  // Check if current route is allowed
  const isCurrentRouteAllowed = useMemo(() => {
    if (!user) return false;
    return moduleRegistry.isRouteAllowed(location.pathname, user.role);
  }, [user, location.pathname]);

  // Get navigation items for current user
  const navigationItems = useMemo(() => {
    if (!user) return [];
    return moduleRegistry.getNavigationItems(user.role);
  }, [user]);

  // Navigate to MyHome project
  const navigateToMyHomeProject = useCallback((
    projectId: string,
    options: NavigationOptions = {}
  ) => {
    const route = `/projects/${projectId}`;
    
    eventLogger.log({
      category: 'navigation',
      action: 'navigate_to_myhome',
      label: 'project',
      metadata: { projectId },
    });
    
    if (options.newTab) {
      window.open(route, '_blank');
    } else {
      navigateToModule('myhome', route, {
        projectId,
        fromModule: 'myedls',
        ...options.context,
      });
    }
  }, [navigateToModule]);

  // Navigate to MyEDLs from MyHome
  const openMyEDLsForProject = useCallback((
    projectId: string,
    projectName: string,
    options: NavigationOptions = {}
  ) => {
    // Update context
    setProject(projectId, projectName);
    updateModuleContext({
      projectId,
      projectName,
      module: 'myedls',
    });
    
    eventLogger.log({
      category: 'navigation',
      action: 'open_myedls',
      label: 'from_myhome',
      projectId,
    });
    
    // Navigate to MyEDLs dashboard for the project
    const route = `/project/${projectId}`;
    
    if (options.newTab) {
      window.open(route, '_blank');
    } else {
      navigate(route);
    }
  }, [navigate, setProject, updateModuleContext]);

  // Navigate to specific EDL
  const openEDL = useCallback((
    edlId: string,
    projectId?: string,
    options: NavigationOptions = {}
  ) => {
    if (projectId) {
      updateModuleContext({ projectId, ongoingEDLId: edlId });
    }
    
    eventLogger.log({
      category: 'navigation',
      action: 'open_edl',
      metadata: { edlId, projectId },
    });
    
    const route = `/myedls/edl/${edlId}`;
    
    if (options.newTab) {
      window.open(route, '_blank');
    } else {
      navigate(route);
    }
  }, [navigate, updateModuleContext]);

  // Navigate to EDL report
  const openEDLReport = useCallback((
    reportId: string,
    options: NavigationOptions = {}
  ) => {
    eventLogger.log({
      category: 'navigation',
      action: 'open_report',
      metadata: { reportId },
    });
    
    const route = `/myedls/report/${reportId}`;
    
    if (options.newTab) {
      window.open(route, '_blank');
    } else {
      navigate(route);
    }
  }, [navigate]);

  // Open capture mode
  const startCapture = useCallback((
    mode: 'guided' | 'ultra-guided' | 'libre' | 'myaladin',
    projectId?: string
  ) => {
    if (!hasPermission('capture')) {
      console.warn('User does not have capture permission');
      return false;
    }
    
    updateModuleContext({ captureMode: mode });
    
    eventLogger.log({
      category: 'capture',
      action: 'start_capture',
      label: mode,
      projectId,
    });
    
    const modeRoutes: Record<string, string> = {
      'guided': '/myedls/capture/guided',
      'ultra-guided': '/myedls/capture/ultra-guided',
      'libre': '/myedls/capture/libre',
      'myaladin': '/myedls/capture/myaladin',
    };
    
    navigate(modeRoutes[mode] || '/myedls/capture');
    return true;
  }, [hasPermission, navigate, updateModuleContext]);

  // Open Bureau mode
  const openBureau = useCallback((projectId?: string) => {
    if (!moduleRegistry.hasFeature(user?.role || 'viewer', 'bureau')) {
      console.warn('User does not have bureau access');
      return false;
    }
    
    eventLogger.log({
      category: 'navigation',
      action: 'open_bureau',
      projectId,
    });
    
    navigate('/bureau');
    return true;
  }, [user, navigate]);

  // Open Client space
  const openClientSpace = useCallback((projectId?: string) => {
    eventLogger.log({
      category: 'navigation',
      action: 'open_client_space',
      projectId,
    });
    
    navigate('/client');
    return true;
  }, [navigate]);

  // Return to previous context
  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateBack();
    }
  }, [navigateBack]);

  // Get breadcrumb items for current route
  const getBreadcrumbs = useCallback(() => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs: Array<{ label: string; path: string }> = [];
    
    // Add MyHome root if coming from there
    if (session.projectId) {
      breadcrumbs.push({
        label: 'MyHome',
        path: '/projects',
      });
    }
    
    // Add MyEDLs
    breadcrumbs.push({
      label: 'MyEDLs',
      path: '/',
    });
    
    // Add project if available
    if (moduleContext.projectName) {
      breadcrumbs.push({
        label: moduleContext.projectName,
        path: `/project/${moduleContext.projectId}`,
      });
    }
    
    // Map route segments to labels
    const segmentLabels: Record<string, string> = {
      'myedls': 'MyEDLs',
      'dashboard': 'Tableau de bord',
      'edl': 'EDL',
      'report': 'Rapport',
      'capture': 'Capture',
      'tasks': 'Tâches',
      'kanban': 'Kanban',
      'bureau': 'Mode Bureau',
      'client': 'Espace Client',
      'admin': 'Administration',
    };
    
    let currentPath = '';
    for (const segment of segments) {
      currentPath += `/${segment}`;
      const label = segmentLabels[segment] || segment;
      
      // Skip if already added
      if (!breadcrumbs.some(b => b.label === label)) {
        breadcrumbs.push({
          label,
          path: currentPath,
        });
      }
    }
    
    return breadcrumbs;
  }, [location.pathname, session.projectId, moduleContext]);

  // Check if user can access a specific feature
  const canAccess = useCallback((feature: string): boolean => {
    if (!user) return false;
    return moduleRegistry.hasFeature(user.role, feature);
  }, [user]);

  // Get combined context for AI
  const getCombinedAIContext = useCallback(() => {
    return {
      ...getAIContext(),
      ...getMyAladinContext(),
      currentRoute: location.pathname,
      breadcrumbs: getBreadcrumbs(),
    };
  }, [getAIContext, getMyAladinContext, location.pathname, getBreadcrumbs]);

  return {
    // User info
    user,
    currentModule,
    moduleContext,
    
    // Permissions
    hasPermission,
    hasRole,
    canAccess,
    isCurrentRouteAllowed,
    
    // Navigation
    navigationItems,
    navigateToMyHomeProject,
    openMyEDLsForProject,
    openEDL,
    openEDLReport,
    startCapture,
    openBureau,
    openClientSpace,
    goBack,
    getBreadcrumbs,
    
    // Context
    updateModuleContext,
    getCombinedAIContext,
  };
};

export default useMyHomeIntegration;
