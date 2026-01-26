import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { 
  Eye, 
  FileText, 
  GitCompare, 
  Loader2, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EDLReportViewer } from "@/components/edl-report";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BureauEDLsProps {
  projectId: string;
}

interface VisitSession {
  id: string;
  created_at: string;
  edl_type?: string;
  status: string;
  duration_seconds?: number;
}

export function BureauEDLs({ projectId }: BureauEDLsProps) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<VisitSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  useEffect(() => {
    loadSessions();
  }, [projectId]);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'validé':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Validé
          </Badge>
        );
      case 'draft':
      case 'brouillon':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Brouillon
          </Badge>
        );
      case 'review':
      case 'à revoir':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            À revoir
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEDLTypeLabel = (type: string) => {
    switch (type) {
      case 'avant_travaux': return 'Avant travaux';
      case 'apres_travaux': return 'Après travaux';
      case 'location_entree': return 'Entrée locataire';
      case 'location_sortie': return 'Sortie locataire';
      default: return type || 'Non spécifié';
    }
  };

  const handleCompareToggle = (sessionId: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      }
      if (prev.length >= 2) {
        return [prev[1], sessionId];
      }
      return [...prev, sessionId];
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">EDLs & Rapports</h2>
          <p className="text-muted-foreground text-sm">
            {sessions.length} session(s) de visite
          </p>
        </div>
        <Button 
          variant="outline"
          disabled={selectedForCompare.length !== 2}
          onClick={() => setCompareDialogOpen(true)}
        >
          <GitCompare className="h-4 w-4 mr-2" />
          Comparer ({selectedForCompare.length}/2)
        </Button>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">Aucune session EDL</p>
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedForCompare.includes(session.id)}
                        onChange={() => handleCompareToggle(session.id)}
                        className="h-4 w-4 rounded border-muted-foreground/25"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(session.created_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    </TableCell>
                    <TableCell>{getEDLTypeLabel(session.edl_type)}</TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>
                      {session.duration_seconds 
                        ? `${Math.round(session.duration_seconds / 60)} min`
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSession(session.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ouvrir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* EDL Viewer */}
      {selectedSession && (
        <EDLReportViewer
          projectId={projectId}
          open={!!selectedSession}
          onOpenChange={(open) => !open && setSelectedSession(null)}
        />
      )}

      {/* Compare Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Comparaison EDL</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {selectedForCompare.map((sessionId, index) => {
              const session = sessions.find(s => s.id === sessionId);
              return (
                <Card key={sessionId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      EDL {index + 1}: {session ? getEDLTypeLabel(session.edl_type) : ''}
                    </CardTitle>
                    <CardDescription>
                      {session && format(new Date(session.created_at), 'dd MMM yyyy', { locale: fr })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Contenu de comparaison à implémenter
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
