// Permission Gate Component
// Protects routes and components based on user permissions and roles

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyHome, Permission, MyHomeRole } from '@/contexts/MyHomeContext';
import { moduleRegistry } from '@/services/moduleRegistry';
import { AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PermissionGateProps {
  children: React.ReactNode;
  requiredPermissions?: Permission[];
  requiredRoles?: MyHomeRole[];
  fallback?: React.ReactNode;
  redirectTo?: string;
  showAccessDenied?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  fallback,
  redirectTo,
  showAccessDenied = true,
}) => {
  const navigate = useNavigate();
  const { user, isLoading, hasPermission, hasRole } = useMyHome();

  // Check permissions
  const hasRequiredPermissions = requiredPermissions.length === 0 ||
    requiredPermissions.every(p => hasPermission(p));
  
  // Check roles
  const hasRequiredRole = requiredRoles.length === 0 ||
    requiredRoles.some(r => hasRole(r));
  
  const hasAccess = hasRequiredPermissions && hasRequiredRole;

  // Redirect if specified and no access
  useEffect(() => {
    if (!isLoading && !hasAccess && redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  }, [isLoading, hasAccess, redirectTo, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // No user
  if (!user) {
    if (fallback) return <>{fallback}</>;
    if (redirectTo) return null;
    
    return (
      <AccessDeniedCard
        title="Connexion requise"
        description="Veuillez vous connecter pour accéder à cette fonctionnalité."
        showLoginButton
      />
    );
  }

  // No access
  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;
    if (redirectTo) return null;
    if (!showAccessDenied) return null;
    
    return (
      <AccessDeniedCard
        title="Accès refusé"
        description="Vous n'avez pas les permissions nécessaires pour accéder à cette section."
        userRole={user.role}
        requiredPermissions={requiredPermissions}
        requiredRoles={requiredRoles}
      />
    );
  }

  return <>{children}</>;
};

// Access denied card component
interface AccessDeniedCardProps {
  title: string;
  description: string;
  userRole?: MyHomeRole;
  requiredPermissions?: Permission[];
  requiredRoles?: MyHomeRole[];
  showLoginButton?: boolean;
}

const AccessDeniedCard: React.FC<AccessDeniedCardProps> = ({
  title,
  description,
  userRole,
  requiredPermissions,
  requiredRoles,
  showLoginButton,
}) => {
  const navigate = useNavigate();
  
  return (
    <Card className="max-w-md mx-auto my-8">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {userRole && (
          <div className="text-sm text-muted-foreground">
            <p>Votre rôle actuel : <strong>{userRole.replace(/_/g, ' ')}</strong></p>
          </div>
        )}
        
        {requiredPermissions && requiredPermissions.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <p>Permissions requises :</p>
            <ul className="list-disc list-inside mt-1">
              {requiredPermissions.map(p => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}
        
        {requiredRoles && requiredRoles.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <p>Rôles autorisés :</p>
            <ul className="list-disc list-inside mt-1">
              {requiredRoles.map(r => (
                <li key={r}>{r.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex justify-center gap-2 pt-4">
          {showLoginButton ? (
            <Button onClick={() => navigate('/auth')}>
              Se connecter
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate(-1)}>
              Retour
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Feature gate - hides content if user doesn't have feature access
interface FeatureGateProps {
  children: React.ReactNode;
  feature: string;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  children,
  feature,
  fallback = null,
}) => {
  const { user } = useMyHome();
  
  if (!user) return null;
  
  const hasFeature = moduleRegistry.hasFeature(user.role, feature);
  
  if (!hasFeature) return <>{fallback}</>;
  
  return <>{children}</>;
};

// Route guard - checks if current route is allowed for user
interface RouteGuardProps {
  children: React.ReactNode;
  path: string;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  path,
}) => {
  const navigate = useNavigate();
  const { user, isLoading } = useMyHome();

  useEffect(() => {
    if (!isLoading && user) {
      const isAllowed = moduleRegistry.isRouteAllowed(path, user.role);
      if (!isAllowed) {
        const defaultRoute = moduleRegistry.getDefaultRoute(user.role);
        navigate(defaultRoute, { replace: true });
      }
    }
  }, [isLoading, user, path, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionGate;
