import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, AlertTriangle, Home, Camera, ListTodo, 
  FileText, Download, Edit, Star, ChevronRight, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { AutopilotSession, AutopilotSegment } from '@/hooks/useAutopilot';

interface AutopilotReportProps {
  session: AutopilotSession;
  segments: AutopilotSegment[];
  onValidate: () => void;
  onEdit: () => void;
  onExportPDF: () => void;
  onExpertReview: () => void;
}

export const AutopilotReport: React.FC<AutopilotReportProps> = ({
  session,
  segments,
  onValidate,
  onEdit,
  onExportPDF,
  onExpertReview
}) => {
  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 80) return 'text-blue-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getConfidenceBg = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/10';
    if (score >= 80) return 'bg-blue-500/10';
    if (score >= 60) return 'bg-amber-500/10';
    return 'bg-red-500/10';
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'neuf': return 'bg-emerald-500';
      case 'bon': return 'bg-blue-500';
      case 'moyen': return 'bg-amber-500';
      case 'mauvais': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'neuf': return 'Neuf';
      case 'bon': return 'Bon état';
      case 'moyen': return 'État moyen';
      case 'mauvais': return 'Mauvais état';
      case 'a_refaire': return 'À refaire';
      default: return state;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-6"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Rapport Autopilot</h2>
              <p className="text-muted-foreground">EDL généré automatiquement par IA</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <StatCard
              icon={Home}
              label="Pièces"
              value={session.total_rooms_detected}
              color="blue"
            />
            <StatCard
              icon={Camera}
              label="Photos"
              value={session.total_photos_extracted}
              color="purple"
            />
            <StatCard
              icon={AlertTriangle}
              label="Anomalies"
              value={session.total_anomalies_detected}
              color="amber"
            />
            <StatCard
              icon={ListTodo}
              label="Tâches"
              value={session.total_tasks_generated}
              color="emerald"
            />
            <StatCard
              icon={Star}
              label="Confiance"
              value={`${Math.round(session.overall_confidence_score)}%`}
              color="primary"
            />
          </div>
        </div>
      </motion.div>

      {/* Confidence Score */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Score de confiance IA</h3>
            <span className={cn("text-3xl font-bold", getConfidenceColor(session.overall_confidence_score))}>
              {Math.round(session.overall_confidence_score)}%
            </span>
          </div>
          <Progress value={session.overall_confidence_score} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {session.overall_confidence_score >= 90 
              ? "Excellent ! L'analyse est très fiable."
              : session.overall_confidence_score >= 80
              ? "Bon niveau de confiance. Quelques vérifications recommandées."
              : session.overall_confidence_score >= 60
              ? "Niveau moyen. Revue manuelle conseillée."
              : "Faible confiance. Vérification manuelle requise."}
          </p>
        </CardContent>
      </Card>

      {/* Rooms List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Pièces analysées ({segments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {segments.map((segment, index) => (
                <motion.div
                  key={segment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {/* Preview Image */}
                    {segment.preview_frame_url ? (
                      <img
                        src={segment.preview_frame_url}
                        alt={segment.room_label}
                        className="w-20 h-14 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-14 bg-muted rounded-lg flex items-center justify-center">
                        <Home className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}

                    {/* Room Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{segment.room_label}</h4>
                        <Badge variant="secondary" className={cn("text-xs", getStateColor(segment.global_state), "text-white")}>
                          {getStateLabel(segment.global_state)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {segment.description_generated || 'Aucune description'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{(segment.elements_detected as any[])?.length || 0} éléments</span>
                        <span>•</span>
                        <span>{(segment.anomalies_detected as any[])?.length || 0} anomalies</span>
                        <span>•</span>
                        <span className={getConfidenceColor(segment.confidence_score)}>
                          {Math.round(segment.confidence_score)}% confiance
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          size="lg"
          onClick={onValidate}
          className="bg-emerald-600 hover:bg-emerald-500"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          Tout valider
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onEdit}
        >
          <Edit className="h-5 w-5 mr-2" />
          Modifier
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onExportPDF}
        >
          <Download className="h-5 w-5 mr-2" />
          Exporter PDF
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onExpertReview}
        >
          <FileText className="h-5 w-5 mr-2" />
          Expert Review
        </Button>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    amber: 'bg-amber-500/10 text-amber-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    primary: 'bg-primary/10 text-primary'
  };

  return (
    <div className="p-4 rounded-2xl bg-background/50 backdrop-blur border">
      <div className={cn("p-2 rounded-xl w-fit mb-2", colorClasses[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
};

export default AutopilotReport;
