import React, { useState, useMemo } from 'react';
import { Search, FileText, Video, Book, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import libraryData from './libraryIndex.json';

interface SearchResult {
  type: 'document' | 'theme' | 'application';
  id: string;
  title: string;
  description: string;
  path: string[];
  tags?: string[];
  docType?: string;
}

interface LibrarySearchProps {
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
}

export const LibrarySearch: React.FC<LibrarySearchProps> = ({ 
  onSelect, 
  placeholder = "Rechercher dans la bibliothèque..." 
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const searchResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    libraryData.applications.forEach(app => {
      // Search in application
      if (app.name.toLowerCase().includes(lowerQuery) || 
          app.description.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          type: 'application',
          id: app.id,
          title: app.name,
          description: app.description,
          path: [app.name]
        });
      }

      // Search in themes
      app.themes.forEach(theme => {
        if (theme.name.toLowerCase().includes(lowerQuery) || 
            theme.description.toLowerCase().includes(lowerQuery)) {
          searchResults.push({
            type: 'theme',
            id: theme.id,
            title: theme.name,
            description: theme.description,
            path: [app.name, theme.name]
          });
        }

        // Search in documents
        theme.documents.forEach(doc => {
          const matchesTitle = doc.title.toLowerCase().includes(lowerQuery);
          const matchesDesc = doc.description.toLowerCase().includes(lowerQuery);
          const matchesTags = doc.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
          const matchesContent = 'content' in doc && doc.content?.toLowerCase().includes(lowerQuery);

          if (matchesTitle || matchesDesc || matchesTags || matchesContent) {
            searchResults.push({
              type: 'document',
              id: doc.id,
              title: doc.title,
              description: doc.description,
              path: [app.name, theme.name, doc.title],
              tags: doc.tags,
              docType: doc.type
            });
          }
        });
      });
    });

    return searchResults.slice(0, 10);
  }, [query]);

  const getDocIcon = (type?: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4 text-red-500" />;
      case 'pdf': return <FileText className="h-4 w-4 text-orange-500" />;
      default: return <Book className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className="pl-10 pr-10 h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/20"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {isFocused && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background rounded-2xl shadow-lg border z-50 overflow-hidden animate-fade-in">
          <ScrollArea className="max-h-80">
            <div className="p-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}-${index}`}
                  onClick={() => {
                    onSelect(result);
                    setQuery('');
                    setIsFocused(false);
                  }}
                  className="w-full p-3 flex items-start gap-3 hover:bg-muted/50 rounded-xl transition-colors text-left"
                >
                  <div className="mt-0.5">
                    {result.type === 'document' ? getDocIcon(result.docType) : 
                     result.type === 'theme' ? <Book className="h-4 w-4 text-primary" /> :
                     <FileText className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{result.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {result.path.join(' → ')}
                    </p>
                    {result.tags && result.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {result.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default LibrarySearch;
