// Module Registry Service
// Registers MyEDLs as a module within the MyHome ecosystem

import type { Permission, MyHomeRole } from '@/contexts/MyHomeContext';

interface ModuleRoute {
  path: string;
  name: string;
  icon?: string;
  requiredPermissions: Permission[];
  requiredRoles?: MyHomeRole[];
}

interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  routes: ModuleRoute[];
  defaultRoute: string;
  permissions: Permission[];
  supportedRoles: MyHomeRole[];
}

// MyEDLs Module Configuration
export const MYEDLS_MODULE: ModuleConfig = {
  id: 'myedls',
  name: 'MyEDLs – États des lieux & IA Chantier',
  description: 'Module intelligent de capture et d\'extraction de tâches pour les inspections de chantier',
  icon: 'ClipboardCheck',
  version: '2.0.0',
  defaultRoute: '/myedls/dashboard',
  
  routes: [
    {
      path: '/myedls/dashboard',
      name: 'Tableau de bord',
      icon: 'LayoutDashboard',
      requiredPermissions: ['read'],
    },
    {
      path: '/myedls/edl/:id',
      name: 'EDL Détail',
      icon: 'FileText',
      requiredPermissions: ['read'],
    },
    {
      path: '/myedls/report/:id',
      name: 'Rapport EDL',
      icon: 'FileOutput',
      requiredPermissions: ['read'],
    },
    {
      path: '/myedls/capture',
      name: 'Capture',
      icon: 'Video',
      requiredPermissions: ['capture'],
    },
    {
      path: '/myedls/capture/guided',
      name: 'Mode Guidé',
      icon: 'Navigation',
      requiredPermissions: ['capture'],
    },
    {
      path: '/myedls/capture/ultra-guided',
      name: 'Mode Ultra-Guidé',
      icon: 'Sparkles',
      requiredPermissions: ['capture'],
    },
    {
      path: '/myedls/capture/libre',
      name: 'Capture Libre',
      icon: 'Video',
      requiredPermissions: ['capture'],
    },
    {
      path: '/myedls/tasks',
      name: 'Tâches',
      icon: 'ListTodo',
      requiredPermissions: ['read'],
    },
    {
      path: '/myedls/kanban',
      name: 'Kanban',
      icon: 'Trello',
      requiredPermissions: ['read', 'write'],
    },
    {
      path: '/myedls/bureau',
      name: 'Mode Bureau',
      icon: 'Monitor',
      requiredPermissions: ['read', 'write'],
      requiredRoles: ['admin', 'chef_de_chantier', 'conducteur_travaux', 'economiste'],
    },
    {
      path: '/myedls/client',
      name: 'Espace Client',
      icon: 'Users',
      requiredPermissions: ['read'],
      requiredRoles: ['clientASL', 'maitre_ouvrage', 'viewer'],
    },
    {
      path: '/myedls/admin',
      name: 'Administration',
      icon: 'Settings',
      requiredPermissions: ['admin'],
      requiredRoles: ['admin'],
    },
  ],
  
  permissions: ['read', 'write', 'capture', 'review', 'validate', 'assign', 'delete', 'admin'],
  
  supportedRoles: [
    'admin',
    'chef_de_chantier',
    'conducteur_travaux',
    'economiste',
    'architecte',
    'maitre_ouvrage',
    'clientASL',
    'sous_traitant',
    'viewer',
  ],
};

// Role to MyEDLs access mapping
export const ROLE_ACCESS_MAP: Record<MyHomeRole, {
  allowedRoutes: string[];
  defaultRoute: string;
  features: string[];
}> = {
  admin: {
    allowedRoutes: ['*'],
    defaultRoute: '/myedls/dashboard',
    features: ['capture', 'review', 'validate', 'assign', 'delete', 'admin', 'bureau', 'reports'],
  },
  chef_de_chantier: {
    allowedRoutes: [
      '/myedls/dashboard',
      '/myedls/edl/*',
      '/myedls/report/*',
      '/myedls/capture/*',
      '/myedls/tasks',
      '/myedls/kanban',
      '/myedls/bureau',
    ],
    defaultRoute: '/myedls/dashboard',
    features: ['capture', 'review', 'validate', 'bureau', 'reports'],
  },
  conducteur_travaux: {
    allowedRoutes: [
      '/myedls/dashboard',
      '/myedls/edl/*',
      '/myedls/report/*',
      '/myedls/capture/*',
      '/myedls/tasks',
      '/myedls/kanban',
      '/myedls/bureau',
    ],
    defaultRoute: '/myedls/dashboard',
    features: ['capture', 'review', 'validate', 'assign', 'bureau', 'reports'],
  },
  economiste: {
    allowedRoutes: [
      '/myedls/dashboard',
      '/myedls/edl/*',
      '/myedls/report/*',
      '/myedls/tasks',
      '/myedls/bureau',
    ],
    defaultRoute: '/myedls/bureau',
    features: ['review', 'validate', 'bureau', 'reports'],
  },
  architecte: {
    allowedRoutes: [
      '/myedls/dashboard',
      '/myedls/edl/*',
      '/myedls/report/*',
      '/myedls/tasks',
    ],
    defaultRoute: '/myedls/dashboard',
    features: ['review', 'reports'],
  },
  maitre_ouvrage: {
    allowedRoutes: [
      '/myedls/dashboard',
      '/myedls/edl/*',
      '/myedls/report/*',
      '/myedls/client',
    ],
    defaultRoute: '/myedls/client',
    features: ['review', 'validate', 'reports'],
  },
  clientASL: {
    allowedRoutes: ['/myedls/client'],
    defaultRoute: '/myedls/client',
    features: ['read'],
  },
  sous_traitant: {
    allowedRoutes: [
      '/myedls/tasks',
      '/myedls/capture/*',
    ],
    defaultRoute: '/myedls/tasks',
    features: ['capture', 'read'],
  },
  viewer: {
    allowedRoutes: [
      '/myedls/dashboard',
      '/myedls/edl/*',
      '/myedls/report/*',
    ],
    defaultRoute: '/myedls/dashboard',
    features: ['read'],
  },
  guest: {
    allowedRoutes: ['/myedls/client'],
    defaultRoute: '/myedls/client',
    features: ['read'],
  },
};

class ModuleRegistry {
  private modules: Map<string, ModuleConfig> = new Map();
  
  constructor() {
    // Register MyEDLs by default
    this.register(MYEDLS_MODULE);
  }
  
  // Register a module
  register(config: ModuleConfig): void {
    this.modules.set(config.id, config);
    
    // Notify parent if embedded
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'MODULE_REGISTERED',
        module: config,
      }, '*');
    }
  }
  
  // Get module config
  getModule(id: string): ModuleConfig | undefined {
    return this.modules.get(id);
  }
  
  // Check if route is allowed for role
  isRouteAllowed(route: string, role: MyHomeRole): boolean {
    const access = ROLE_ACCESS_MAP[role];
    if (!access) return false;
    
    // Admin has access to everything
    if (access.allowedRoutes.includes('*')) return true;
    
    // Check exact match or wildcard
    return access.allowedRoutes.some(allowed => {
      if (allowed.endsWith('/*')) {
        const prefix = allowed.slice(0, -2);
        return route.startsWith(prefix);
      }
      return route === allowed;
    });
  }
  
  // Get default route for role
  getDefaultRoute(role: MyHomeRole): string {
    return ROLE_ACCESS_MAP[role]?.defaultRoute || '/myedls/dashboard';
  }
  
  // Get allowed features for role
  getFeatures(role: MyHomeRole): string[] {
    return ROLE_ACCESS_MAP[role]?.features || [];
  }
  
  // Check if feature is allowed for role
  hasFeature(role: MyHomeRole, feature: string): boolean {
    const features = this.getFeatures(role);
    return features.includes('*') || features.includes(feature);
  }
  
  // Get navigation items for role
  getNavigationItems(role: MyHomeRole): ModuleRoute[] {
    const module = this.getModule('myedls');
    if (!module) return [];
    
    return module.routes.filter(route => {
      // Check role restriction
      if (route.requiredRoles && !route.requiredRoles.includes(role)) {
        return false;
      }
      
      // Check if route is allowed
      return this.isRouteAllowed(route.path, role);
    });
  }
}

export const moduleRegistry = new ModuleRegistry();
export default moduleRegistry;
