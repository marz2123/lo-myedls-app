import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, Home, Warehouse, Car, AlertTriangle, CheckCircle2, Clock, Play } from 'lucide-react';
import type { MultiunitBuilding, BuildingSummaryStats } from '@/types/multiunit';

interface BuildingOverviewProps {
  building: MultiunitBuilding;
  stats: BuildingSummaryStats;
}

export function BuildingOverview({ building, stats }: BuildingOverviewProps) {
  const completionPercent = stats.total_units > 0 
    ? Math.round((stats.completed_units / stats.total_units) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Building Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{building.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {building.address}, {building.postal_code} {building.city}
                </p>
              </div>
            </div>
            <Badge variant={building.global_status === 'completed' ? 'default' : 'secondary'}>
              {building.global_status === 'completed' ? 'Terminé' : 
               building.global_status === 'in_progress' ? 'En cours' : 'En attente'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progression globale</span>
              <span className="text-sm text-muted-foreground">{completionPercent}%</span>
            </div>
            <Progress value={completionPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Home className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_units}</p>
                <p className="text-xs text-muted-foreground">Lots total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed_units}</p>
                <p className="text-xs text-muted-foreground">Terminés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Play className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.in_progress_units}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical_units}</p>
                <p className="text-xs text-muted-foreground">Critiques</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Building Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Étages</p>
              <p className="font-medium">{building.total_floors}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Année construction</p>
              <p className="font-medium">{building.construction_year || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Propriétaire</p>
              <p className="font-medium">{building.owner_company || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Score qualité</p>
              <p className="font-medium">
                {building.global_quality_score 
                  ? `${Math.round(building.global_quality_score)}%` 
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
