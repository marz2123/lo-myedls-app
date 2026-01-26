import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Loader2, 
  Printer, 
  MessageCircle, 
  Mail, 
  Share2,
  Download 
} from 'lucide-react';
import { generateEDLPDF } from '@/utils/pdfGenerator';

interface EDLReportEditorProps {
  visitSessionId: string | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EDLReportEditor: React.FC<EDLReportEditorProps> = ({
  visitSessionId,
  projectId,
  open,
  onOpenChange
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if ((visitSessionId || projectId) && open) {
      fetchData();
    }
  }, [visitSessionId, projectId, open]);

  const fetchProjectData = async () => {
    const { data: project } = await supabase
      .from('projects')
      .select(`
        *,
        extracted_tasks(
          *,
          task_families(name, code),
          task_categories(name, code),
          task_subcategories(name, code)
        )
      `)
      .eq('id', projectId)
      .single();

    if (!project) return null;

    return {
      title: `État des Lieux - ${project.address}`,
      project: {
        address: project.address,
        postalCode: project.postal_code,
        city: project.city,
        propertyType: project.property_type,
      },
      visitInfo: {
        date: new Date().toLocaleDateString('fr-FR'),
        duration: 0,
        blocksCount: 0,
      },
      blocks: [],
      tasks: project.extracted_tasks || [],
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let data = null;

      if (visitSessionId) {
        // Try to fetch visit session data via edge function
        const { data: { session } } = await supabase.auth.getSession();
        const response = await supabase.functions.invoke('generate-edl-pdf', {
          body: { sessionId: visitSessionId },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (response.error) throw response.error;
        
        // If session not found, fallback to project data
        if (response.data?.noData) {
          data = await fetchProjectData();
        } else {
          data = response.data.data;
        }
      } else if (projectId) {
        data = await fetchProjectData();
      }

      setReportData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!reportData) return;
    
    setGenerating(true);
    try {
      const blob = await generateEDLPDF({
        ...reportData,
        notes, // Include user notes
      });
      setPdfBlob(blob);
      
      toast({
        title: '✅ Rapport généré',
        description: 'Votre rapport EDL est prêt',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le rapport',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfBlob) return;
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EDL_${reportData?.project.address.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    if (!pdfBlob) return;
    
    const url = URL.createObjectURL(pdfBlob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 100);
    };
  };

  const shareViaEmail = () => {
    if (!reportData) return;
    
    const subject = encodeURIComponent(`Rapport EDL - ${reportData.project.address}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint le rapport d'état des lieux pour :\n${reportData.project.address}\n${reportData.project.postalCode} ${reportData.project.city}\n\nCordialement`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaSMS = () => {
    if (!reportData) return;
    
    const message = encodeURIComponent(
      `Rapport EDL disponible pour ${reportData.project.address}`
    );
    window.location.href = `sms:?body=${message}`;
  };

  const shareViaWhatsApp = () => {
    if (!reportData) return;
    
    const message = encodeURIComponent(
      `Rapport EDL - ${reportData.project.address}\n${reportData.project.postalCode} ${reportData.project.city}\n\nNombre de zones: ${reportData.visitInfo.blocksCount}\nTâches détectées: ${reportData.blocks?.reduce((acc: number, b: any) => acc + (b.tasks?.length || 0), 0) || 0}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareGeneric = async () => {
    if (!pdfBlob) return;
    
    try {
      const file = new File([pdfBlob], `EDL_${Date.now()}.pdf`, { type: 'application/pdf' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Rapport EDL - ${reportData?.project.address}`,
          text: 'Rapport d\'état des lieux',
          files: [file],
        });
      } else {
        // Fallback: download
        downloadPDF();
        toast({
          title: 'Partage non supporté',
          description: 'Le fichier a été téléchargé',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rapport EDL - Édition & Partage</DialogTitle>
          <DialogDescription>
            Personnalisez votre rapport, générez le PDF et partagez-le
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Info */}
          {reportData && (
            <Card className="p-4">
              <div className="space-y-2">
                <div className="text-lg font-semibold">{reportData.project.address}</div>
                <div className="text-sm text-muted-foreground">
                  {reportData.project.postalCode} {reportData.project.city} • {reportData.project.propertyType}
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground">Zones</div>
                    <div className="text-xl font-bold">{reportData.visitInfo.blocksCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Tâches</div>
                    <div className="text-xl font-bold">
                      {reportData.blocks?.reduce((acc: number, b: any) => acc + (b.tasks?.length || 0), 0) || reportData.tasks?.length || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Photos</div>
                    <div className="text-xl font-bold">
                      {reportData.blocks?.reduce((acc: number, b: any) => acc + (b.photos?.length || 0), 0) || 0}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes additionnelles (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Ajoutez des notes ou commentaires qui apparaîtront dans le rapport PDF..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={generatePDF}
              disabled={generating || !reportData}
              size="lg"
              className="h-16"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Générer le PDF
                </>
              )}
            </Button>

            <Button
              onClick={downloadPDF}
              disabled={!pdfBlob}
              variant="outline"
              size="lg"
              className="h-16"
            >
              <Download className="w-5 h-5 mr-2" />
              Télécharger
            </Button>
          </div>

          {/* Share & Print */}
          {pdfBlob && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Partager & Imprimer</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Button
                  onClick={printPDF}
                  variant="outline"
                  size="sm"
                  className="h-12"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </Button>

                <Button
                  onClick={shareViaEmail}
                  variant="outline"
                  size="sm"
                  className="h-12"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>

                <Button
                  onClick={shareViaSMS}
                  variant="outline"
                  size="sm"
                  className="h-12"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  SMS
                </Button>

                <Button
                  onClick={shareViaWhatsApp}
                  variant="outline"
                  size="sm"
                  className="h-12"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>

                <Button
                  onClick={shareGeneric}
                  variant="outline"
                  size="sm"
                  className="h-12"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager
                </Button>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
