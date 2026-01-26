import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  Sparkles,
  ArrowLeft,
  Eye
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExportCenter } from './ExportCenter';
import { ExportPreviewPanel } from './ExportPreviewPanel';
import { useExportEngine } from '@/hooks/useExportEngine';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edlId: string;
  projectId: string;
  projectName: string;
}

type View = 'selection' | 'preview';

export function ExportDialog({
  open,
  onOpenChange,
  edlId,
  projectId,
  projectName,
}: ExportDialogProps) {
  const [view, setView] = useState<View>('selection');
  const { 
    result, 
    generateDPGFExcel, 
    generateNoticePDF, 
    generatePlanningPDF,
    generatePurchaseListExcel,
    downloadJSON,
    reset 
  } = useExportEngine();

  const handleClose = () => {
    reset();
    setView('selection');
    onOpenChange(false);
  };

  const handleComplete = () => {
    if (result?.success) {
      setView('preview');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            {view === 'preview' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView('selection')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                {view === 'selection' ? (
                  <Download className="w-5 h-5 text-primary" />
                ) : (
                  <Eye className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg">
                  {view === 'selection' ? 'Export Travaux' : 'Aperçu des exports'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {projectName}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <AnimatePresence mode="wait">
            {view === 'selection' && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ExportCenter
                  edlId={edlId}
                  projectId={projectId}
                  projectName={projectName}
                  onComplete={handleComplete}
                />
              </motion.div>
            )}

            {view === 'preview' && result && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <ExportPreviewPanel
                  result={result}
                  onDownloadDPGF={() => result.data?.exports.dpgf && generateDPGFExcel(result.data.exports.dpgf)}
                  onDownloadNotice={() => result.data?.exports.noticeDescriptive && generateNoticePDF(result.data.exports.noticeDescriptive, projectName)}
                  onDownloadPlanning={() => result.data?.exports.planning && generatePlanningPDF(result.data.exports.planning, projectName)}
                  onDownloadPurchase={() => result.data?.exports.purchaseList && generatePurchaseListExcel(result.data.exports.purchaseList)}
                  onDownloadJSON={() => result.data?.exports.jsonTechnique && downloadJSON(result.data.exports.jsonTechnique, `Export_MyHome_${Date.now()}.json`)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
