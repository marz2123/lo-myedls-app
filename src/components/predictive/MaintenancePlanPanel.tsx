import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Wrench, 
  Calendar,
  Euro,
  Clock,
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { MaintenancePlan, ScheduledMaintenance } from '@/types/predictive';
import { format, parseISO, isAfter, isBefore, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MaintenancePlanPanelProps {
  plan: MaintenancePlan | null;
  isLoading?: boolean;
  onExport?: () => void;
}

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Faible', color: 'text-green-600', bgColor: 'bg-green-100' },
  medium: { label: 'Moyen', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  high: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' }
};

export const MaintenancePlanPanel: React.FC<MaintenancePlanPanelProps> = ({
  plan,
  isLoading,
  onExport
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Plan de Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Plan de Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Aucun plan de maintenance</p>
            <p className="text-sm">Lancez une analyse prédictive pour générer un plan</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const urgentActions = plan.maintenance_schedule.filter(m => {
    try {
      const nextDate = parseISO(m.next_date);
      return isBefore(nextDate, addMonths(now, 3));
    } catch {
      return false;
    }
  });

  const upcomingActions = plan.maintenance_schedule.filter(m => {
    try {
      const nextDate = parseISO(m.next_date);
      return isAfter(nextDate, addMonths(now, 3)) && isBefore(nextDate, addMonths(now, 12));
    } catch {
      return false;
    }
  });

  const renderMaintenanceItem = (item: ScheduledMaintenance, index: number) => {
    const priority = priorityConfig[item.priority] || priorityConfig.medium;
    let nextDateStr = 'Non défini';
    let isOverdue = false;

    try {
      const nextDate = parseISO(item.next_date);
      nextDateStr = format(nextDate, 'dd MMM yyyy', { locale: fr });
      isOverdue = isBefore(nextDate, now);
    } catch {}

    return (
      <div key={index} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h5 className="font-medium text-sm">{item.action}</h5>
            <p className="text-xs text-muted-foreground">{item.element}</p>
          </div>
          <Badge className={`${priority.bgColor} ${priority.color} border-0 text-xs`}>
            {priority.label}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {item.interval}
            </span>
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
              <Calendar className="h-3 w-3" />
              {nextDateStr}
              {isOverdue && <AlertCircle className="h-3 w-3" />}
            </span>
          </div>
          <span className="flex items-center gap-1 font-medium">
            <Euro className="h-3 w-3" />
            {item.estimated_cost.toLocaleString()}€
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Plan de Maintenance Préventive
        </CardTitle>
        {onExport && (
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            Exporter
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{plan.maintenance_schedule.length}</p>
            <p className="text-xs text-muted-foreground">Actions</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{plan.timeline_months}</p>
            <p className="text-xs text-muted-foreground">Mois</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{plan.total_estimated_cost.toLocaleString()}€</p>
            <p className="text-xs text-muted-foreground">Coût total</p>
          </div>
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {/* Urgent Actions */}
            {urgentActions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Actions Urgentes (3 prochains mois)
                </h4>
                <div className="space-y-2">
                  {urgentActions.map(renderMaintenanceItem)}
                </div>
              </div>
            )}

            {/* Upcoming Actions */}
            {upcomingActions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Actions à Venir (3-12 mois)
                </h4>
                <div className="space-y-2">
                  {upcomingActions.map(renderMaintenanceItem)}
                </div>
              </div>
            )}

            {/* AI Optimizations */}
            {plan.ai_optimizations && plan.ai_optimizations.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Optimisations IA
                  </h4>
                  <div className="space-y-2">
                    {plan.ai_optimizations.map((opt, i) => (
                      <div key={i} className="text-sm p-2 bg-green-50 border border-green-200 rounded">
                        <p>{opt.suggestion}</p>
                        {opt.potential_savings > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            Économie potentielle: {opt.potential_savings.toLocaleString()}€
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
