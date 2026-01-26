import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Medal, 
  Award,
  Star,
  Clock,
  AlertTriangle,
  Zap,
  CheckCircle2,
  TrendingUp,
  User
} from 'lucide-react';
import { TechnicianStats } from '@/hooks/useSupervisoryDashboard';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TechniciansViewProps {
  technicians: TechnicianStats[];
  loading?: boolean;
}

const rankIcons = [
  { icon: Trophy, color: 'text-yellow-500' },
  { icon: Medal, color: 'text-gray-400' },
  { icon: Award, color: 'text-amber-600' },
];

export function TechniciansView({ technicians, loading }: TechniciansViewProps) {
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianStats | null>(null);

  const topThree = technicians.slice(0, 3);
  const others = technicians.slice(3);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded-full w-20 mx-auto mb-4" />
                <div className="h-6 bg-muted rounded w-3/4 mx-auto mb-2" />
                <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Podium - Top 3 */}
      <Card className="border-border/50 bg-gradient-to-br from-card to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Classement Techniciens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topThree.map((tech, index) => {
              const RankIcon = rankIcons[index]?.icon || Award;
              const rankColor = rankIcons[index]?.color || 'text-gray-500';
              
              return (
                <div
                  key={tech.id}
                  className={cn(
                    'relative rounded-xl p-6 text-center transition-all cursor-pointer hover:scale-105',
                    index === 0 ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30' :
                    index === 1 ? 'bg-gradient-to-br from-gray-400/20 to-gray-500/10 border border-gray-400/30' :
                    'bg-gradient-to-br from-amber-600/20 to-amber-700/10 border border-amber-600/30'
                  )}
                  onClick={() => setSelectedTechnician(tech)}
                >
                  {/* Rank Badge */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-full',
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                    )}>
                      <RankIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  {/* Avatar */}
                  <Avatar className="w-16 h-16 mx-auto mt-4 mb-3 border-2 border-border">
                    <AvatarFallback className="text-lg font-bold">
                      {tech.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <h3 className="font-semibold text-foreground">{tech.name}</h3>
                  <p className="text-sm text-muted-foreground">{tech.email}</p>

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-background/50 rounded-lg p-2">
                      <Star className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
                      <p className="font-bold">{tech.qualityScore}</p>
                      <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-2">
                      <CheckCircle2 className="h-4 w-4 mx-auto text-green-500 mb-1" />
                      <p className="font-bold">{tech.totalEdlsCompleted}</p>
                      <p className="text-xs text-muted-foreground">EDL</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* All Technicians Table */}
      {others.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              Tous les techniciens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rang</TableHead>
                  <TableHead>Technicien</TableHead>
                  <TableHead className="text-center">Score Qualité</TableHead>
                  <TableHead className="text-center">Temps moyen</TableHead>
                  <TableHead className="text-center">Anomalies non traitées</TableHead>
                  <TableHead className="text-center">EDL complétés</TableHead>
                  <TableHead className="text-center">Cette semaine</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {others.map(tech => (
                  <TableRow 
                    key={tech.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedTechnician(tech)}
                  >
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        #{tech.rank}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {tech.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{tech.name}</p>
                          <p className="text-xs text-muted-foreground">{tech.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Progress value={tech.qualityScore} className="w-16 h-2" />
                        <span className="text-sm font-medium">{tech.qualityScore}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{Math.round(tech.avgTimePerEdl)} min</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={tech.untreatedAnomaliesRate > 20 ? 'destructive' : 'secondary'}>
                        {tech.untreatedAnomaliesRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {tech.totalEdlsCompleted}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-green-500/10 text-green-700">
                        +{tech.edlsThisWeek}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Technician Detail Card */}
      {selectedTechnician && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {selectedTechnician.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span>{selectedTechnician.name}</span>
                  <p className="text-sm text-muted-foreground font-normal">{selectedTechnician.email}</p>
                </div>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTechnician(null)}>
                Fermer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-background rounded-lg p-4 text-center">
                <Star className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-bold">{selectedTechnician.qualityScore}</p>
                <p className="text-sm text-muted-foreground">Score qualité</p>
              </div>
              <div className="bg-background rounded-lg p-4 text-center">
                <Clock className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{Math.round(selectedTechnician.avgTimePerEdl)}</p>
                <p className="text-sm text-muted-foreground">Min. par EDL</p>
              </div>
              <div className="bg-background rounded-lg p-4 text-center">
                <Zap className="h-6 w-6 mx-auto text-orange-500 mb-2" />
                <p className="text-2xl font-bold">{Math.round(selectedTechnician.completionSpeed)}%</p>
                <p className="text-sm text-muted-foreground">Rapidité</p>
              </div>
              <div className="bg-background rounded-lg p-4 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">{selectedTechnician.totalEdlsCompleted}</p>
                <p className="text-sm text-muted-foreground">EDL terminés</p>
              </div>
              <div className="bg-background rounded-lg p-4 text-center">
                <AlertTriangle className="h-6 w-6 mx-auto text-red-500 mb-2" />
                <p className="text-2xl font-bold">{selectedTechnician.untreatedAnomaliesRate}%</p>
                <p className="text-sm text-muted-foreground">Anomalies non traitées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
