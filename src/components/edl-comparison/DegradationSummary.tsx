import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  MapPin, 
  Tag, 
  TrendingUp,
  Euro,
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ComparisonResult } from '@/hooks/useEDLComparison';

interface DegradationSummaryProps {
  result: ComparisonResult;
}

const SEVERITY_CONFIG = {
  faible: { label: 'Faible', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  moyen: { label: 'Moyen', color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' },
  fort: { label: 'Fort', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' }
};

export function DegradationSummary({ result }: DegradationSummaryProps) {
  const { summary, differences, tasks } = result;
  const approvedCount = differences.filter(d => d.approved).length;
  const selectedTasksCount = tasks.filter(t => t.selected).length;
  const severityConfig = SEVERITY_CONFIG[summary.overallSeverity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <span className="text-xs text-muted-foreground">Dégradations</span>
          </div>
          <p className="text-2xl font-bold">{summary.totalDegradations}</p>
          <p className="text-xs text-muted-foreground">
            {approvedCount} approuvées
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-blue-100">
              <ListTodo className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-xs text-muted-foreground">Tâches</span>
          </div>
          <p className="text-2xl font-bold">{tasks.length}</p>
          <p className="text-xs text-muted-foreground">
            {selectedTasksCount} sélectionnées
          </p>
        </div>
      </div>

      {/* Overall Severity */}
      <div className={cn("p-4 rounded-2xl border", severityConfig.bgColor)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Gravité globale</span>
          <Badge className={cn("text-xs", severityConfig.textColor, severityConfig.bgColor)}>
            {severityConfig.label}
          </Badge>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all", severityConfig.color)}
            style={{ 
              width: summary.overallSeverity === 'fort' ? '100%' : 
                     summary.overallSeverity === 'moyen' ? '66%' : '33%' 
            }}
          />
        </div>
      </div>

      {/* Impacted Rooms */}
      <div className="p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Pièces impactées</span>
          <Badge variant="secondary" className="ml-auto">
            {summary.impactedRooms.length}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.impactedRooms.map((room, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {room}
            </Badge>
          ))}
        </div>
      </div>

      {/* Damage Types */}
      <div className="p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Types de dégâts</span>
          <Badge variant="secondary" className="ml-auto">
            {summary.damageTypes.length}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.damageTypes.map((type, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {type}
            </Badge>
          ))}
        </div>
      </div>

      {/* Cost Estimate */}
      {summary.estimatedCost && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Euro className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Estimation des coûts</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">
              {summary.estimatedCost.min}€
            </span>
            <span className="text-muted-foreground">à</span>
            <span className="text-2xl font-bold text-primary">
              {summary.estimatedCost.max}€
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Estimation basée sur les dégradations détectées
          </p>
        </div>
      )}

      {/* Approval Progress */}
      <div className="p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Progression</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {approvedCount}/{summary.totalDegradations}
          </span>
        </div>
        <Progress 
          value={(approvedCount / summary.totalDegradations) * 100} 
          className="h-2"
        />
      </div>
    </motion.div>
  );
}
