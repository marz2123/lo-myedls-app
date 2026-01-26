import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  ExternalLink,
  Image,
  ListTodo
} from 'lucide-react';
import { EdlSummary } from '@/hooks/useSupervisoryDashboard';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RecentEdlsListProps {
  edls: EdlSummary[];
  loading?: boolean;
  onViewEdl?: (edlId: string) => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  draft: { label: 'Brouillon', variant: 'outline', color: 'text-muted-foreground' },
  in_progress: { label: 'En cours', variant: 'default', color: 'text-blue-500' },
  completed: { label: 'Terminé', variant: 'secondary', color: 'text-green-500' },
  signed: { label: 'Signé', variant: 'default', color: 'text-green-600' },
};

export function RecentEdlsList({ edls, loading, onViewEdl }: RecentEdlsListProps) {
  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            EDL récents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-muted-foreground" />
          EDL récents
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {edls.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun EDL récent</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projet / Site</TableHead>
                <TableHead>Technicien</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Anomalies</TableHead>
                <TableHead className="text-center">Tâches</TableHead>
                <TableHead className="text-center">Photos</TableHead>
                <TableHead className="text-center">Complétion</TableHead>
                <TableHead className="text-right">Mis à jour</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {edls.map(edl => {
                const status = statusConfig[edl.status] || statusConfig.draft;
                
                return (
                  <TableRow 
                    key={edl.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewEdl?.(edl.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{edl.projectName}</p>
                        <p className="text-sm text-muted-foreground">{edl.siteName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{edl.technicianName}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={cn(
                          'font-medium',
                          edl.qualityScore >= 80 ? 'text-green-500' :
                          edl.qualityScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                        )}>
                          {edl.qualityScore}
                        </span>
                        <span className="text-muted-foreground text-xs">/100</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <AlertTriangle className={cn(
                          'h-4 w-4',
                          edl.anomaliesCount > 5 ? 'text-red-500' :
                          edl.anomaliesCount > 2 ? 'text-orange-500' : 'text-green-500'
                        )} />
                        <span>{edl.anomaliesCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ListTodo className="h-4 w-4 text-muted-foreground" />
                        <span>{edl.tasksCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Image className="h-4 w-4 text-muted-foreground" />
                        <span>{edl.photosCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={edl.completionPercentage} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-8">
                          {edl.completionPercentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(edl.lastUpdate), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
