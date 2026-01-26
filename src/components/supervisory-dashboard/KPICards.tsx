import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Star, 
  Clock, 
  BadgeCheck,
  AlertOctagon
} from 'lucide-react';
import { DashboardKPIs } from '@/hooks/useSupervisoryDashboard';
import { cn } from '@/lib/utils';

interface KPICardsProps {
  kpis: DashboardKPIs | null;
  loading?: boolean;
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  trend?: number;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  loading?: boolean;
}

const colorClasses = {
  blue: 'bg-blue-500/10 text-blue-500',
  green: 'bg-green-500/10 text-green-500',
  orange: 'bg-orange-500/10 text-orange-500',
  red: 'bg-red-500/10 text-red-500',
  purple: 'bg-purple-500/10 text-purple-500',
};

function KPICard({ icon, label, value, suffix, trend, color, loading }: KPICardProps) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn('p-2 rounded-lg', colorClasses[color])}>
            {icon}
          </div>
          {trend !== undefined && (
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              trend >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            )}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        <div className="mt-3">
          {loading ? (
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{value}</span>
              {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function KPICards({ kpis, loading }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <KPICard
        icon={<FileText className="h-5 w-5" />}
        label="EDL en cours"
        value={kpis?.totalEdlsInProgress || 0}
        color="blue"
        loading={loading}
      />
      <KPICard
        icon={<CheckCircle2 className="h-5 w-5" />}
        label="EDL complétés"
        value={kpis?.totalEdlsCompleted || 0}
        color="green"
        loading={loading}
      />
      <KPICard
        icon={<AlertTriangle className="h-5 w-5" />}
        label="Points bloquants"
        value={kpis?.blockingIssues || 0}
        color="orange"
        loading={loading}
      />
      <KPICard
        icon={<Star className="h-5 w-5" />}
        label="Score qualité IA"
        value={kpis?.avgQualityScore || 0}
        suffix="/100"
        color="purple"
        loading={loading}
      />
      <KPICard
        icon={<Clock className="h-5 w-5" />}
        label="Temps moyen/EDL"
        value={kpis?.avgTimePerEdl || 0}
        suffix="min"
        color="blue"
        loading={loading}
      />
      <KPICard
        icon={<BadgeCheck className="h-5 w-5" />}
        label="EDL validés"
        value={kpis?.validatedPercentage || 0}
        suffix="%"
        color="green"
        loading={loading}
      />
      <KPICard
        icon={<AlertOctagon className="h-5 w-5" />}
        label="Anomalies majeures"
        value={kpis?.majorAnomaliesPercentage || 0}
        suffix="%"
        color="red"
        loading={loading}
      />
    </div>
  );
}
