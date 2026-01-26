import React, { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useLiveEDLReport } from '@/hooks/useLiveEDLReport';
import { generateProfessionalEDLPDF } from '@/utils/edlPdfGenerator';
import { cn } from '@/lib/utils';
import {
  FileText,
  Download,
  Share2,
  Loader2,
  ChevronLeft,
  Building2,
  Camera,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Clock,
  ChevronRight,
  Image,
  MapPin,
  CircleAlert,
  Zap
} from 'lucide-react';

interface LiveReportBuilderProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LiveReportBuilder: React.FC<LiveReportBuilderProps> = ({
  projectId,
  open,
  onOpenChange
}) => {
  const { toast } = useToast();
  const { report, loading, lastUpdate, refresh } = useLiveEDLReport(projectId);
  const [generating, setGenerating] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  const handleExportPDF = async () => {
    if (!report) return;

    setGenerating(true);
    try {
      // Convert to EDLReportData format
      const pdfData = {
        project: {
          id: report.projectId,
          name: report.address,
          address: report.address,
          postalCode: report.postalCode,
          city: report.city,
          propertyType: report.propertyType
        },
        edlContext: {
          typeEDL: report.edlType,
          date: report.date,
          performedBy: report.performedBy
        },
        edlSummary: {
          resumeGlobal: report.summary.global,
          parPieces: report.rooms.map(room => ({
            piece: room.name,
            etatGeneral: room.status === 'completed' ? 'Bon état' : 
                        room.status === 'anomalies' ? 'À refaire' : 'À évaluer',
            pointsForts: '',
            pointsFaibles: room.anomalyCount > 0 ? `${room.anomalyCount} anomalie(s) détectée(s)` : ''
          }))
        },
        tasks: report.allTasks.map(task => ({
          id: task.id,
          familyCode: task.familyCode,
          familyName: task.familyName,
          category: task.category,
          subCategory: null,
          taskName: task.title,
          description: '',
          pieceOrZone: '',
          priority: task.priority,
          status: task.validated ? 'validé' : 'à faire'
        })),
        media: report.allPhotos.map(photo => ({
          id: photo.id,
          url: photo.url,
          type: 'photo' as const,
          piece: photo.roomName,
          caption: photo.caption
        }))
      };

      const blob = await generateProfessionalEDLPDF(pdfData);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EDL_Live_${report.city}_${report.address.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: '✅ PDF exporté',
        description: 'Le rapport a été téléchargé'
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le PDF',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!report) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rapport EDL - ${report.address}`,
          text: `État des lieux: ${report.address}, ${report.city}. ${report.completionScore}% complété.`,
          url: window.location.href
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      toast({
        title: 'Partage',
        description: 'Fonction non disponible sur ce navigateur'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'anomalies': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-amber-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold">Rapport EDL (Live Preview)</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mise à jour automatique en temps réel
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </Button>
              <Button
                onClick={handleExportPDF}
                disabled={generating || loading}
                size="sm"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export PDF
              </Button>
            </div>
          </div>

          {/* Live indicator */}
          <div className="px-4 pb-3 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-muted-foreground">
              Live • Dernière màj: {report?.lastUpdated.toLocaleTimeString('fr-FR') || '--:--'}
            </span>
            {lastUpdate && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs animate-pulse",
                  lastUpdate === 'anomaly' && "border-red-500 text-red-500",
                  lastUpdate === 'photo' && "border-blue-500 text-blue-500",
                  lastUpdate === 'task' && "border-amber-500 text-amber-500",
                  lastUpdate === 'room' && "border-green-500 text-green-500"
                )}
              >
                {lastUpdate === 'photo' && '📸 Photo ajoutée'}
                {lastUpdate === 'anomaly' && '⚠️ Anomalie détectée'}
                {lastUpdate === 'task' && '🔧 Tâche générée'}
                {lastUpdate === 'room' && '🏠 Pièce mise à jour'}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-4 space-y-6 pb-24">
            {loading ? (
              <LoadingSkeleton />
            ) : report ? (
              <>
                {/* Synthèse Générale */}
                <section>
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-primary" />
                    Synthèse Générale
                  </h3>

                  <Card className="p-4 space-y-4">
                    {/* Address & Type */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{report.address}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.postalCode} {report.city}
                        </p>
                      </div>
                      <Badge variant="outline">{report.edlType}</Badge>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{report.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>Par: {report.performedBy}</span>
                      </div>
                    </div>

                    {/* Completion Score */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Score de complétude</span>
                        <span className="text-sm font-bold text-primary">{report.completionScore}%</span>
                      </div>
                      <Progress value={report.completionScore} className="h-2" />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      <StatCard 
                        icon={<MapPin className="w-4 h-4" />}
                        value={report.totalRooms}
                        label="Pièces"
                        color="bg-blue-500"
                        highlight={lastUpdate === 'room'}
                      />
                      <StatCard 
                        icon={<Camera className="w-4 h-4" />}
                        value={report.totalPhotos}
                        label="Photos"
                        color="bg-green-500"
                        highlight={lastUpdate === 'photo'}
                      />
                      <StatCard 
                        icon={<AlertTriangle className="w-4 h-4" />}
                        value={report.totalAnomalies}
                        label="Anomalies"
                        color="bg-red-500"
                        highlight={lastUpdate === 'anomaly'}
                      />
                      <StatCard 
                        icon={<Wrench className="w-4 h-4" />}
                        value={report.totalTasks}
                        label="Tâches"
                        color="bg-amber-500"
                        highlight={lastUpdate === 'task'}
                      />
                    </div>
                  </Card>
                </section>

                <Separator />

                {/* Liste des pièces */}
                <section>
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                    Liste des pièces ({report.completedRooms}/{report.totalRooms} terminées)
                  </h3>

                  <div className="space-y-2">
                    {report.rooms.length === 0 ? (
                      <Card className="p-8 text-center text-muted-foreground">
                        <p>Aucune pièce inspectée</p>
                        <p className="text-sm">Commencez la capture pour voir les pièces apparaître ici</p>
                      </Card>
                    ) : (
                      report.rooms.map(room => (
                        <Card 
                          key={room.id}
                          className={cn(
                            "transition-all duration-300",
                            expandedRoom === room.id && "ring-2 ring-primary"
                          )}
                        >
                          <button
                            className="w-full p-4 flex items-center justify-between text-left"
                            onClick={() => setExpandedRoom(
                              expandedRoom === room.id ? null : room.id
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {getStatusIcon(room.status)}
                              <div>
                                <p className="font-medium">{room.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {room.photoCount} photos • {room.anomalyCount} anomalies
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={room.status === 'completed' ? 'default' : 
                                        room.status === 'anomalies' ? 'destructive' : 'outline'}
                              >
                                {room.completionPercent}%
                              </Badge>
                              <ChevronRight className={cn(
                                "w-4 h-4 transition-transform",
                                expandedRoom === room.id && "rotate-90"
                              )} />
                            </div>
                          </button>

                          {expandedRoom === room.id && (
                            <div className="px-4 pb-4 border-t pt-3 space-y-3 animate-in slide-in-from-top-2">
                              <p className="text-sm text-muted-foreground">
                                Détails de la pièce • Dernière mise à jour en temps réel
                              </p>
                              {room.items.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">
                                  Éléments en cours d'analyse...
                                </p>
                              )}
                            </div>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </section>

                <Separator />

                {/* Galerie Photos */}
                <section>
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                    <Image className="w-5 h-5 text-primary" />
                    Galerie Photos ({report.totalPhotos})
                  </h3>

                  {report.allPhotos.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground">
                      <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Aucune photo</p>
                      <p className="text-sm">Les photos apparaîtront ici automatiquement</p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {report.allPhotos.slice(0, 9).map((photo, index) => (
                        <div 
                          key={photo.id}
                          className={cn(
                            "aspect-square rounded-lg bg-muted relative overflow-hidden group",
                            lastUpdate === 'photo' && index === 0 && "ring-2 ring-blue-500 animate-pulse"
                          )}
                        >
                          {photo.url ? (
                            <img 
                              src={photo.url} 
                              alt={photo.caption || 'Photo EDL'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="text-xs text-white truncate">{photo.roomName}</p>
                          </div>
                        </div>
                      ))}
                      {report.allPhotos.length > 9 && (
                        <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium text-muted-foreground">
                            +{report.allPhotos.length - 9}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <Separator />

                {/* Anomalies & Tâches */}
                <section>
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                    <CircleAlert className="w-5 h-5 text-primary" />
                    Anomalies & Tâches
                  </h3>

                  {/* Anomalies */}
                  {report.allAnomalies.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        {report.allAnomalies.length} anomalie(s) détectée(s)
                      </p>
                      <div className="space-y-2">
                        {report.allAnomalies.slice(0, 5).map((anomaly, index) => (
                          <Card 
                            key={anomaly.id}
                            className={cn(
                              "p-3 flex items-start gap-3",
                              lastUpdate === 'anomaly' && index === 0 && "ring-2 ring-red-500 animate-pulse"
                            )}
                          >
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-1.5",
                              getSeverityColor(anomaly.severity)
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium capitalize">{anomaly.type}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {anomaly.description}
                              </p>
                              {anomaly.roomName && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  📍 {anomaly.roomName}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(anomaly.confidence * 100)}%
                            </Badge>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks */}
                  {report.allTasks.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-amber-500" />
                        {report.allTasks.length} tâche(s) générée(s)
                        {report.urgentTasks > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {report.urgentTasks} urgente(s)
                          </Badge>
                        )}
                      </p>
                      <div className="space-y-2">
                        {report.allTasks.slice(0, 5).map((task, index) => (
                          <Card 
                            key={task.id}
                            className={cn(
                              "p-3 flex items-center justify-between",
                              lastUpdate === 'task' && index === 0 && "ring-2 ring-amber-500 animate-pulse"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Zap className={cn(
                                "w-4 h-4 shrink-0",
                                task.priority === 'urgente' && "text-red-500",
                                task.priority === 'haute' && "text-orange-500",
                                task.priority === 'normale' && "text-blue-500",
                                task.priority === 'basse' && "text-muted-foreground"
                              )} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{task.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {task.familyName} • {task.category || 'Non classé'}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {task.priority}
                            </Badge>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.allAnomalies.length === 0 && report.allTasks.length === 0 && (
                    <Card className="p-8 text-center text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p>Aucune anomalie ni tâche</p>
                      <p className="text-sm">Les problèmes détectés apparaîtront ici</p>
                    </Card>
                  )}
                </section>

                {/* Summary texts */}
                <Separator />

                <section>
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary" />
                    Résumés automatiques
                  </h3>

                  <div className="space-y-3">
                    <Card className="p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Résumé global</p>
                      <p className="text-sm">{report.summary.global}</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Anomalies</p>
                      <p className="text-sm">{report.summary.anomaliesSummary}</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Tâches</p>
                      <p className="text-sm">{report.summary.tasksSummary}</p>
                    </Card>
                  </div>
                </section>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune donnée disponible</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Floating export button */}
        <div className="absolute bottom-6 right-6">
          <Button
            onClick={handleExportPDF}
            disabled={generating || loading || !report}
            className="shadow-lg"
            size="lg"
          >
            {generating ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Download className="w-5 h-5 mr-2" />
            )}
            Export PDF
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Sub-components
const StatCard: React.FC<{
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  highlight?: boolean;
}> = ({ icon, value, label, color, highlight }) => (
  <div className={cn(
    "rounded-lg p-2 text-center transition-all duration-300",
    color,
    highlight && "ring-2 ring-offset-2 ring-current animate-pulse scale-105"
  )}>
    <div className="flex justify-center text-white mb-1">{icon}</div>
    <p className="text-lg font-bold text-white">{value}</p>
    <p className="text-xs text-white/80">{label}</p>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Card className="p-4 space-y-4">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-2 w-full" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </Card>
    </div>
    <div className="space-y-4">
      <Skeleton className="h-6 w-36" />
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  </div>
);

export default LiveReportBuilder;
