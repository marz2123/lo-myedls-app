import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle, Wrench, FileText, TrendingUp, TrendingDown } from 'lucide-react';

interface EDLSection2GlobalSummaryProps {
  summary: {
    resumeGlobal: string;
    parPieces: Array<{
      piece: string;
      etatGeneral: string;
      pointsForts: string;
      pointsFaibles: string;
    }>;
  };
  taskCount: number;
  urgentCount: number;
}

export const EDLSection2GlobalSummary: React.FC<EDLSection2GlobalSummaryProps> = ({
  summary,
  taskCount,
  urgentCount
}) => {
  // Calculate stats
  const roomCount = summary.parPieces.length;
  const goodRooms = summary.parPieces.filter(p => 
    p.etatGeneral.toLowerCase().includes('bon') || 
    p.etatGeneral.toLowerCase().includes('neuf')
  ).length;
  const badRooms = summary.parPieces.filter(p => 
    p.etatGeneral.toLowerCase().includes('mauvais') || 
    p.etatGeneral.toLowerCase().includes('refaire')
  ).length;

  // Collect all strengths and weaknesses
  const allStrengths = summary.parPieces
    .filter(p => p.pointsForts)
    .map(p => p.pointsForts);
  const allWeaknesses = summary.parPieces
    .filter(p => p.pointsFaibles)
    .map(p => p.pointsFaibles);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Résumé global</h2>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de l'état des lieux</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-primary">{roomCount}</div>
          <div className="text-sm text-muted-foreground">Zone(s)</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-foreground">{taskCount}</div>
          <div className="text-sm text-muted-foreground">Tâche(s)</div>
        </Card>
        <Card className="p-4 text-center border-destructive/50">
          <div className="text-3xl font-bold text-destructive">{urgentCount}</div>
          <div className="text-sm text-muted-foreground">Urgente(s)</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{goodRooms}</div>
          <div className="text-sm text-muted-foreground">Zone(s) OK</div>
        </Card>
      </div>

      {/* Global Summary Text */}
      <Card className="p-6">
        <p className="text-base leading-relaxed text-foreground">
          {summary.resumeGlobal}
        </p>
      </Card>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Points forts */}
        <Card className="p-5 border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-green-800 dark:text-green-200">Points forts</h3>
          </div>
          {allStrengths.length > 0 ? (
            <ul className="space-y-2">
              {allStrengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Aucun point fort noté pour le moment
            </p>
          )}
        </Card>

        {/* Points faibles */}
        <Card className="p-5 border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Points faibles</h3>
          </div>
          {allWeaknesses.length > 0 ? (
            <ul className="space-y-2">
              {allWeaknesses.map((weakness, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <TrendingDown className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Aucun point faible noté pour le moment
            </p>
          )}
        </Card>
      </div>

      {/* Work Overview */}
      {taskCount > 0 && (
        <Card className="p-5 border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900">
              <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">Travaux nécessaires</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {taskCount} intervention(s) identifiée(s) dont {urgentCount} prioritaire(s). 
            Consultez la section "Tâches associées" pour le détail.
          </p>
        </Card>
      )}
    </div>
  );
};
