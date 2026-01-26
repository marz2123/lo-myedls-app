import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  FileText
} from 'lucide-react';
import { ProjectSummary } from '@/hooks/useSupervisoryDashboard';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectsViewProps {
  projects: ProjectSummary[];
  loading?: boolean;
  onViewProject?: (projectId: string) => void;
}

const anomalyLevelConfig = {
  low: { label: 'Faible', color: 'bg-green-500' },
  medium: { label: 'Moyen', color: 'bg-yellow-500' },
  high: { label: 'Élevé', color: 'bg-orange-500' },
  critical: { label: 'Critique', color: 'bg-red-500' },
};

const companyColors: Record<string, string> = {
  'Archi Home': 'bg-blue-500/10 text-blue-700 border-blue-200',
  'Bati Home': 'bg-orange-500/10 text-orange-700 border-orange-200',
  'Opti Home': 'bg-green-500/10 text-green-700 border-green-200',
  'Déco Home': 'bg-purple-500/10 text-purple-700 border-purple-200',
  'MyHome': 'bg-gray-500/10 text-gray-700 border-gray-200',
};

export function ProjectsView({ projects, loading, onViewProject }: ProjectsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'anomalies' | 'completion'>('name');
  const [filterCompany, setFilterCompany] = useState<string>('all');

  const filteredProjects = projects
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCompany = filterCompany === 'all' || p.company === filterCompany;
      return matchesSearch && matchesCompany;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.avgScore - a.avgScore;
        case 'anomalies':
          const levelOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return levelOrder[a.anomaliesLevel] - levelOrder[b.anomaliesLevel];
        case 'completion':
          return b.completionPercentage - a.completionPercentage;
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const companies = [...new Set(projects.map(p => p.company))];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un projet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCompany} onValueChange={setFilterCompany}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Société" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sociétés</SelectItem>
            {companies.map(company => (
              <SelectItem key={company} value={company}>{company}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nom</SelectItem>
            <SelectItem value="score">Score qualité</SelectItem>
            <SelectItem value="anomalies">Anomalies</SelectItem>
            <SelectItem value="completion">Complétion</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun projet trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(project => {
            const anomalyConfig = anomalyLevelConfig[project.anomaliesLevel];
            const companyClass = companyColors[project.company] || companyColors['MyHome'];
            
            return (
              <Card 
                key={project.id}
                className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => onViewProject?.(project.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{project.address || 'Adresse non renseignée'}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-xs', companyClass)}>
                      {project.company}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground">{project.edlsInProgress}</p>
                      <p className="text-xs text-muted-foreground">EDL en cours</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground">{project.avgScore}</p>
                      <p className="text-xs text-muted-foreground">Score moyen</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-lg font-bold text-foreground">{project.tasksGenerated}</p>
                      <p className="text-xs text-muted-foreground">Tâches</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Complétion</span>
                      <span className="font-medium">{project.completionPercentage}%</span>
                    </div>
                    <Progress value={project.completionPercentage} className="h-2" />
                  </div>

                  {/* Anomalies Level */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={cn(
                        'h-4 w-4',
                        project.anomaliesLevel === 'critical' ? 'text-red-500' :
                        project.anomaliesLevel === 'high' ? 'text-orange-500' :
                        project.anomaliesLevel === 'medium' ? 'text-yellow-500' : 'text-green-500'
                      )} />
                      <span className="text-sm text-muted-foreground">Niveau anomalies</span>
                    </div>
                    <Badge className={cn('text-xs', anomalyConfig.color, 'text-white')}>
                      {anomalyConfig.label}
                    </Badge>
                  </div>

                  {/* Tasks Validated */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">Tâches validées</span>
                    </div>
                    <span className="font-medium">
                      {project.tasksValidated}/{project.tasksGenerated}
                    </span>
                  </div>

                  {/* Actions */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Voir les détails
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
