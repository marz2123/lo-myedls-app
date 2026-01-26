import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileText, ZoomIn } from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfPageSelectorProps {
  file: File;
  onPagesSelected: (selectedPages: number[]) => void;
  onCancel: () => void;
}

interface PagePreview {
  pageNumber: number;
  thumbnail: string;
}

export const PdfPageSelector = ({ file, onPagesSelected, onCancel }: PdfPageSelectorProps) => {
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [pagePreviews, setPagePreviews] = useState<PagePreview[]>([]);
  const [zoomedPage, setZoomedPage] = useState<PagePreview | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    loadPdf();
  }, [file]);

  const loadPdf = async () => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      setTotalPages(pdf.numPages);
      
      // Generate thumbnails for all pages
      const previews: PagePreview[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise;

        previews.push({
          pageNumber: i,
          thumbnail: canvas.toDataURL('image/jpeg', 0.7),
        });
      }
      
      setPagePreviews(previews);
      // Select all pages by default
      setSelectedPages(new Set(Array.from({ length: pdf.numPages }, (_, i) => i + 1)));
      setLoading(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      setLoading(false);
    }
  };

  const togglePage = (pageNumber: number) => {
    setSelectedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageNumber)) {
        newSet.delete(pageNumber);
      } else {
        newSet.add(pageNumber);
      }
      return newSet;
    });
  };

  const handleZoom = (e: React.MouseEvent, preview: PagePreview) => {
    e.stopPropagation();
    setZoomedPage(preview);
  };

  const selectAll = () => {
    setSelectedPages(new Set(Array.from({ length: totalPages }, (_, i) => i + 1)));
  };

  const deselectAll = () => {
    setSelectedPages(new Set());
  };

  const handleConfirm = () => {
    if (selectedPages.size === 0) {
      return;
    }
    onPagesSelected(Array.from(selectedPages).sort((a, b) => a - b));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Chargement du PDF...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">
            Sélectionnez les pages à analyser ({selectedPages.size}/{totalPages})
          </h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Tout sélectionner
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Tout désélectionner
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px] border rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {pagePreviews.map((preview) => (
            <div
              key={preview.pageNumber}
              className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all group ${
                selectedPages.has(preview.pageNumber)
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => togglePage(preview.pageNumber)}
            >
              <img
                src={preview.thumbnail}
                alt={`Page ${preview.pageNumber}`}
                className="w-full h-auto"
              />
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={(e) => handleZoom(e, preview)}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              <div className="absolute top-2 right-2">
                <Checkbox
                  checked={selectedPages.has(preview.pageNumber)}
                  onCheckedChange={() => togglePage(preview.pageNumber)}
                  className="bg-background"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 text-center">
                Page {preview.pageNumber}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button 
          onClick={handleConfirm}
          disabled={selectedPages.size === 0}
        >
          Analyser {selectedPages.size > 0 ? `${selectedPages.size} page${selectedPages.size > 1 ? 's' : ''}` : ''}
        </Button>
      </div>

      <Dialog open={!!zoomedPage} onOpenChange={() => setZoomedPage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Page {zoomedPage?.pageNumber} - Aperçu détaillé</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]">
            {zoomedPage && (
              <div className="flex flex-col items-center">
                <img
                  src={zoomedPage.thumbnail}
                  alt={`Page ${zoomedPage.pageNumber}`}
                  className="w-full h-auto"
                />
                <div className="mt-4 flex gap-2">
                  <Button
                    variant={selectedPages.has(zoomedPage.pageNumber) ? "default" : "outline"}
                    onClick={() => togglePage(zoomedPage.pageNumber)}
                  >
                    {selectedPages.has(zoomedPage.pageNumber) ? 'Page sélectionnée' : 'Sélectionner cette page'}
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
