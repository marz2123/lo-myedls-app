import React from 'react';
import { 
  X, Star, Download, Share2, ExternalLink, 
  FileText, BookOpen, Video, Copy, Sparkles 
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { LibraryDocument } from '@/hooks/useLibrary';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LibraryDocumentSheetProps {
  document: LibraryDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  isFavorite: boolean;
  onAskMyAladin?: (question: string, context: string) => void;
}

export const LibraryDocumentSheet: React.FC<LibraryDocumentSheetProps> = ({
  document,
  isOpen,
  onClose,
  onToggleFavorite,
  isFavorite,
  onAskMyAladin
}) => {
  if (!document) return null;

  const handleCopyContent = () => {
    if (document.content_md) {
      navigator.clipboard.writeText(document.content_md);
      toast.success('Contenu copié dans le presse-papier');
    }
  };

  const handleDownload = () => {
    if (document.file_url) {
      window.open(document.file_url, '_blank');
    } else if (document.content_md) {
      const blob = new Blob([document.content_md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document.title}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleAskMyAladin = () => {
    if (onAskMyAladin) {
      onAskMyAladin(
        `Explique-moi le document "${document.title}"`,
        document.content_md || document.description || ''
      );
    }
    toast.info('Question envoyée à MyAladin');
  };

  const renderContent = () => {
    if (document.document_type === 'video' && document.file_url) {
      return (
        <div className="aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={document.file_url}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    if (document.document_type === 'pdf' && document.file_url) {
      return (
        <div className="aspect-[3/4] rounded-xl overflow-hidden border">
          <iframe
            src={document.file_url}
            className="w-full h-full"
            title={document.title}
          />
        </div>
      );
    }

    if (document.content_md) {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap font-mono text-sm bg-muted/50 p-4 rounded-xl">
            {document.content_md}
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Aucun contenu disponible</p>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-xl p-0">
        {/* Header Actions */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFavorite(document.id)}
            >
              <Star className={cn(
                "h-5 w-5",
                isFavorite ? "fill-yellow-400 text-yellow-400" : ""
              )} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCopyContent}>
              <Copy className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDownload}>
              <Download className="h-5 w-5" />
            </Button>
            {document.file_url && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => window.open(document.file_url!, '_blank')}
              >
                <ExternalLink className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Document Header */}
            <div>
              <div className="flex items-start gap-4 mb-4">
                <div className={cn(
                  "p-3 rounded-2xl",
                  document.is_norm ? "bg-amber-500/10 text-amber-600" :
                  document.is_template ? "bg-blue-500/10 text-blue-600" :
                  "bg-muted text-muted-foreground"
                )}>
                  {document.document_type === 'video' ? <Video className="h-6 w-6" /> :
                   document.is_norm ? <BookOpen className="h-6 w-6" /> :
                   <FileText className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{document.title}</h2>
                  {document.category && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {document.category.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {document.is_norm && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
                    Norme
                  </Badge>
                )}
                {document.is_template && (
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">
                    Modèle
                  </Badge>
                )}
                {document.norm_reference && (
                  <Badge variant="outline">{document.norm_reference}</Badge>
                )}
                {document.ft_family_code && (
                  <Badge variant="secondary">{document.ft_family_code}</Badge>
                )}
              </div>

              {/* Description */}
              {document.description && (
                <p className="text-muted-foreground mt-4">{document.description}</p>
              )}
            </div>

            <Separator />

            {/* Content */}
            <div>
              <h3 className="font-medium mb-4">Contenu</h3>
              {renderContent()}
            </div>

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {document.tags.map(tag => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* MyAladin Button */}
            {onAskMyAladin && (
              <>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleAskMyAladin}
                >
                  <Sparkles className="h-4 w-4" />
                  Demander à MyAladin
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default LibraryDocumentSheet;
