import React, { useState } from 'react';
import { BookOpen, ExternalLink, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLibrary, LibraryDocument } from '@/hooks/useLibrary';
import { LibraryDocumentSheet } from './LibraryDocumentSheet';
import { cn } from '@/lib/utils';

interface LibraryHotlinkProps {
  context?: string;
  ftCode?: string;
  tags?: string[];
  variant?: 'button' | 'icon' | 'link';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export const LibraryHotlink: React.FC<LibraryHotlinkProps> = ({
  context,
  ftCode,
  tags = [],
  variant = 'button',
  size = 'default',
  className
}) => {
  const { searchDocuments, getDocumentsByFT, getDocumentsByTags, toggleFavorite, isFavorite } = useLibrary();
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<LibraryDocument | null>(null);

  const loadRelevantDocuments = async () => {
    setLoading(true);
    let results: LibraryDocument[] = [];

    // Search by FT code first (highest priority)
    if (ftCode) {
      results = await getDocumentsByFT(ftCode);
    }

    // Then by tags
    if (results.length === 0 && tags.length > 0) {
      results = await getDocumentsByTags(tags);
    }

    // Finally by context search
    if (results.length === 0 && context) {
      const searchResults = await searchDocuments(context);
      results = searchResults.map(r => r.document);
    }

    setDocuments(results.slice(0, 5));
    setLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadRelevantDocuments();
    }
  };

  const renderTrigger = () => {
    if (variant === 'icon') {
      return (
        <Button variant="ghost" size="icon" className={className}>
          <BookOpen className="h-4 w-4" />
        </Button>
      );
    }

    if (variant === 'link') {
      return (
        <button className={cn("text-primary hover:underline inline-flex items-center gap-1 text-sm", className)}>
          <BookOpen className="h-3 w-3" />
          Voir dans la bibliothèque
        </button>
      );
    }

    return (
      <Button 
        variant="outline" 
        size={size}
        className={cn("gap-2", className)}
      >
        <BookOpen className="h-4 w-4" />
        Bibliothèque
        <ExternalLink className="h-3 w-3" />
      </Button>
    );
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          {renderTrigger()}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-3 border-b">
            <h4 className="font-medium text-sm">Documents liés</h4>
            {ftCode && (
              <Badge variant="secondary" className="mt-1">{ftCode}</Badge>
            )}
          </div>
          
          <ScrollArea className="max-h-64">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Aucun document trouvé
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {documents.map(doc => (
                  <button
                    key={doc.id}
                    className="w-full p-2 rounded-lg hover:bg-muted text-left transition-colors"
                    onClick={() => {
                      setSelectedDocument(doc);
                      setIsOpen(false);
                    }}
                  >
                    <p className="font-medium text-sm truncate">{doc.title}</p>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {doc.description}
                      </p>
                    )}
                    <div className="flex gap-1 mt-1">
                      {doc.is_norm && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">Norme</Badge>
                      )}
                      {doc.is_template && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">Modèle</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                setIsOpen(false);
                window.location.href = '/library';
              }}
            >
              <Search className="h-4 w-4" />
              Voir toute la bibliothèque
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <LibraryDocumentSheet
        document={selectedDocument}
        isOpen={!!selectedDocument}
        onClose={() => setSelectedDocument(null)}
        onToggleFavorite={toggleFavorite}
        isFavorite={selectedDocument ? isFavorite(selectedDocument.id) : false}
      />
    </>
  );
};

export default LibraryHotlink;
