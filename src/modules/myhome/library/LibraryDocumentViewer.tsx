import React, { useState } from 'react';
import { ArrowLeft, Download, Share2, Maximize2, Minimize2, MessageSquare, FileText, Video, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

interface Document {
  id: string;
  title: string;
  type: string;
  description: string;
  tags?: string[];
  file?: string;
  content?: string;
  url?: string;
}

interface LibraryDocumentViewerProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onAskAladin?: (question: string, context: string) => void;
  breadcrumb?: string[];
}

export const LibraryDocumentViewer: React.FC<LibraryDocumentViewerProps> = ({
  document,
  isOpen,
  onClose,
  onAskAladin,
  breadcrumb = []
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!document) return null;

  const handleDownload = () => {
    if (document.file) {
      window.open(document.file, '_blank');
    } else {
      toast.info('Document disponible uniquement en lecture');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: document.title,
        text: document.description,
        url: window.location.href
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié dans le presse-papiers');
    }
  };

  const handleAskAladin = () => {
    if (onAskAladin) {
      const context = document.content || document.description;
      onAskAladin(`Explique-moi le document "${document.title}"`, context);
      toast.success('Question envoyée à MyAladin');
    }
  };

  const renderContent = () => {
    switch (document.type) {
      case 'md':
        return (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-transparent p-0">
              {document.content?.split('\n').map((line, i) => {
                if (line.startsWith('# ')) {
                  return <h1 key={i} className="text-2xl font-bold mt-6 mb-4">{line.slice(2)}</h1>;
                }
                if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-xl font-semibold mt-5 mb-3">{line.slice(3)}</h2>;
                }
                if (line.startsWith('### ')) {
                  return <h3 key={i} className="text-lg font-medium mt-4 mb-2">{line.slice(4)}</h3>;
                }
                if (line.startsWith('- ')) {
                  return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
                }
                if (line.startsWith('- [ ] ')) {
                  return <li key={i} className="ml-4 list-none flex items-center gap-2">
                    <span className="w-4 h-4 border rounded" /> {line.slice(6)}
                  </li>;
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
                }
                if (line.trim() === '') {
                  return <br key={i} />;
                }
                return <p key={i} className="mb-2">{line}</p>;
              })}
            </pre>
          </div>
        );

      case 'pdf':
        return (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <FileText className="h-16 w-16 text-orange-500" />
            <p className="text-muted-foreground">Document PDF</p>
            <Button onClick={handleDownload} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Ouvrir le PDF
            </Button>
          </div>
        );

      case 'video':
        return (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Video className="h-16 w-16 text-red-500" />
            <p className="text-muted-foreground">Vidéo tutoriel</p>
            {document.url ? (
              <video controls className="w-full max-w-lg rounded-xl">
                <source src={document.url} type="video/mp4" />
              </video>
            ) : (
              <Button onClick={() => window.open(document.file, '_blank')} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Regarder la vidéo
              </Button>
            )}
          </div>
        );

      case 'embed':
        return (
          <iframe
            src={document.url}
            className="w-full h-96 rounded-xl border"
            title={document.title}
          />
        );

      default:
        return (
          <div className="p-6 text-center text-muted-foreground">
            Type de document non supporté
          </div>
        );
    }
  };

  const getTypeIcon = () => {
    switch (document.type) {
      case 'pdf': return <FileText className="h-4 w-4 text-orange-500" />;
      case 'video': return <Video className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className={`${isFullscreen ? 'w-full max-w-full' : 'w-full sm:max-w-2xl'} p-0 flex flex-col`}
      >
        <SheetHeader className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleAskAladin}>
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {breadcrumb.length > 0 && (
            <p className="text-xs text-muted-foreground px-2">
              {breadcrumb.join(' → ')}
            </p>
          )}
          
          <div className="flex items-center gap-3 px-2 mt-2">
            {getTypeIcon()}
            <SheetTitle className="text-lg">{document.title}</SheetTitle>
          </div>
          
          <p className="text-sm text-muted-foreground px-2">{document.description}</p>
          
          {document.tags && document.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap px-2 mt-2">
              {document.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {renderContent()}
          </div>
        </ScrollArea>

        {onAskAladin && (
          <div className="p-4 border-t shrink-0">
            <Button 
              onClick={handleAskAladin}
              className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80"
            >
              <MessageSquare className="h-4 w-4" />
              Demander à MyAladin
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default LibraryDocumentViewer;
