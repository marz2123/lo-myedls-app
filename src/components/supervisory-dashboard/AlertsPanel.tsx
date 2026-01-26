import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  Check,
  ExternalLink,
  Bell
} from 'lucide-react';
import { DashboardAlert } from '@/hooks/useSupervisoryDashboard';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AlertsPanelProps {
  alerts: DashboardAlert[];
  onMarkAsRead: (id: string) => void;
  onViewProject?: (projectId: string) => void;
}

const alertTypeConfig = {
  critical: {
    icon: AlertOctagon,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    badge: 'bg-red-500 text-white',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    badge: 'bg-orange-500 text-white',
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    badge: 'bg-blue-500 text-white',
  },
};

export function AlertsPanel({ alerts, onMarkAsRead, onViewProject }: AlertsPanelProps) {
  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            Alertes Intelligentes
          </CardTitle>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {unreadCount} non lues
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
              <Check className="h-10 w-10 mb-2 text-green-500" />
              <p className="text-sm">Aucune alerte active</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map(alert => {
                const config = alertTypeConfig[alert.type];
                const Icon = config.icon;
                
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'p-4 hover:bg-muted/50 transition-colors',
                      !alert.isRead && 'bg-muted/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-lg', config.bg)}>
                        <Icon className={cn('h-4 w-4', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn('text-xs', config.badge)}>
                            {alert.type === 'critical' ? 'Critique' : 
                             alert.type === 'warning' ? 'Attention' : 'Info'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(alert.createdAt), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">
                          {alert.message}
                        </p>
                        {alert.projectName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Projet: {alert.projectName}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {!alert.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => onMarkAsRead(alert.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Marquer lu
                            </Button>
                          )}
                          {alert.projectId && onViewProject && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => onViewProject(alert.projectId!)}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Voir projet
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
