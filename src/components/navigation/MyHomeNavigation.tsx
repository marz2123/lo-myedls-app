// MyHome Navigation Component
// Provides seamless navigation between MyHome and MyEDLs modules

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, 
  Home, 
  ExternalLink, 
  ChevronDown,
  LayoutDashboard,
  FileText,
  Video,
  ListTodo,
  Trello,
  Monitor,
  Users,
  Settings,
} from 'lucide-react';
import { useMyHomeIntegration } from '@/hooks/useMyHomeIntegration';
import { cn } from '@/lib/utils';

interface MyHomeNavigationProps {
  showBreadcrumbs?: boolean;
  showModuleSwitcher?: boolean;
  showBackButton?: boolean;
  className?: string;
}

const iconMap: Record<string, React.ElementType> = {
  'LayoutDashboard': LayoutDashboard,
  'FileText': FileText,
  'Video': Video,
  'ListTodo': ListTodo,
  'Trello': Trello,
  'Monitor': Monitor,
  'Users': Users,
  'Settings': Settings,
};

export const MyHomeNavigation: React.FC<MyHomeNavigationProps> = ({
  showBreadcrumbs = true,
  showModuleSwitcher = true,
  showBackButton = true,
  className,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    currentModule,
    moduleContext,
    navigationItems,
    getBreadcrumbs,
    goBack,
    navigateToMyHomeProject,
  } = useMyHomeIntegration();

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Back button */}
      {showBackButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Module switcher */}
      {showModuleSwitcher && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">MyEDLs</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Navigation</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {navigationItems.map((item) => {
              const IconComponent = iconMap[item.icon || 'FileText'] || FileText;
              const isActive = location.pathname === item.path || 
                (item.path.includes(':') && location.pathname.startsWith(item.path.split(':')[0]));
              
              return (
                <DropdownMenuItem
                  key={item.path}
                  onClick={() => navigate(item.path.replace(/:[\w]+/g, ''))}
                  className={cn(isActive && 'bg-accent')}
                >
                  <IconComponent className="mr-2 h-4 w-4" />
                  {item.name}
                </DropdownMenuItem>
              );
            })}
            
            <DropdownMenuSeparator />
            
            {/* Return to MyHome */}
            {moduleContext.projectId && (
              <DropdownMenuItem
                onClick={() => navigateToMyHomeProject(moduleContext.projectId!)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Voir dans MyHome
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Breadcrumbs */}
      {showBreadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {index === breadcrumbs.length - 1 ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(crumb.path);
                      }}
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Current module badge */}
      <Badge variant="secondary" className="hidden lg:flex">
        {currentModule === 'myedls' ? 'MyEDLs' : currentModule}
      </Badge>

      {/* User role badge */}
      {user && (
        <Badge variant="outline" className="hidden xl:flex text-xs">
          {user.role.replace(/_/g, ' ')}
        </Badge>
      )}
    </div>
  );
};

// Quick action buttons for cross-module navigation
export const MyHomeQuickActions: React.FC<{ projectId?: string; className?: string }> = ({
  projectId,
  className,
}) => {
  const { 
    navigateToMyHomeProject, 
    openBureau, 
    openClientSpace, 
    startCapture,
    canAccess,
  } = useMyHomeIntegration();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {projectId && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToMyHomeProject(projectId)}
          className="gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          <span className="hidden sm:inline">Retour au projet</span>
        </Button>
      )}
      
      {canAccess('capture') && (
        <Button
          variant="default"
          size="sm"
          onClick={() => startCapture('guided', projectId)}
          className="gap-1"
        >
          <Video className="h-3 w-3" />
          <span className="hidden sm:inline">Nouveau reportage</span>
        </Button>
      )}
      
      {canAccess('bureau') && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openBureau(projectId)}
          className="gap-1"
        >
          <Monitor className="h-3 w-3" />
          <span className="hidden sm:inline">Bureau</span>
        </Button>
      )}
    </div>
  );
};

export default MyHomeNavigation;
