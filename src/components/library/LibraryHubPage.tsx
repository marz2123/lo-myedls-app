import React, { useState, useMemo } from 'react';
import { 
  Search, Star, FileText, BookOpen, Layers, HardHat, 
  Package, Map, Video, Building, ChevronRight, X, 
  Filter, Sparkles, ArrowLeft
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLibrary, LibraryDocument, LibraryCategory } from '@/hooks/useLibrary';
import { LibraryDocumentSheet } from './LibraryDocumentSheet';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  Layers: <Layers className="h-5 w-5" />,
  HardHat: <HardHat className="h-5 w-5" />,
  Package: <Package className="h-5 w-5" />,
  Map: <Map className="h-5 w-5" />,
  Video: <Video className="h-5 w-5" />,
  Building: <Building className="h-5 w-5" />
};

export const LibraryHubPage: React.FC = () => {
  const { categories, documents, loading, searchDocuments, toggleFavorite, isFavorite, getFavoriteDocuments } = useLibrary();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LibraryDocument[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LibraryCategory | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<LibraryDocument | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [favoriteDocuments, setFavoriteDocuments] = useState<LibraryDocument[]>([]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const results = await searchDocuments(query);
    setSearchResults(results.map(r => r.document));
  };

  const loadFavorites = async () => {
    const favs = await getFavoriteDocuments();
    setFavoriteDocuments(favs);
  };

  React.useEffect(() => {
    if (activeTab === 'favorites') {
      loadFavorites();
    }
  }, [activeTab]);

  const filteredDocuments = useMemo(() => {
    if (isSearching && searchResults.length > 0) {
      return searchResults;
    }
    if (selectedCategory) {
      return documents.filter(d => d.category_id === selectedCategory.id);
    }
    return documents;
  }, [documents, selectedCategory, isSearching, searchResults]);

  const categoryDocumentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach(doc => {
      if (doc.category_id) {
        counts[doc.category_id] = (counts[doc.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [documents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            {selectedCategory && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedCategory(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">
                {selectedCategory ? selectedCategory.name : 'Bibliothèque MyHome'}
              </h1>
              {selectedCategory && (
                <p className="text-sm text-muted-foreground">{selectedCategory.description}</p>
              )}
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Rechercher documents, normes, DTU, guides..."
              className="pl-10 pr-10 h-12 rounded-2xl bg-muted/50 border-0"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); setIsSearching(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">Tout</TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Star className="h-4 w-4" />
              Favoris
            </TabsTrigger>
            <TabsTrigger value="templates">Modèles</TabsTrigger>
            <TabsTrigger value="norms">Normes</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {!selectedCategory && !isSearching ? (
              /* Categories Grid */
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map(category => (
                  <Card
                    key={category.id}
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                          {iconMap[category.icon || 'FileText']}
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{category.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {categoryDocumentCounts[category.id] || 0} documents
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* Documents List */
              <DocumentsGrid
                documents={filteredDocuments}
                onSelect={setSelectedDocument}
                onToggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            )}
          </TabsContent>

          <TabsContent value="favorites">
            <DocumentsGrid
              documents={favoriteDocuments}
              onSelect={setSelectedDocument}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
              emptyMessage="Aucun favori. Ajoutez des documents à vos favoris pour les retrouver ici."
            />
          </TabsContent>

          <TabsContent value="templates">
            <DocumentsGrid
              documents={documents.filter(d => d.is_template)}
              onSelect={setSelectedDocument}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
              emptyMessage="Aucun modèle disponible."
            />
          </TabsContent>

          <TabsContent value="norms">
            <DocumentsGrid
              documents={documents.filter(d => d.is_norm)}
              onSelect={setSelectedDocument}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
              emptyMessage="Aucune norme disponible."
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Document Sheet */}
      <LibraryDocumentSheet
        document={selectedDocument}
        isOpen={!!selectedDocument}
        onClose={() => setSelectedDocument(null)}
        onToggleFavorite={toggleFavorite}
        isFavorite={selectedDocument ? isFavorite(selectedDocument.id) : false}
      />
    </div>
  );
};

interface DocumentsGridProps {
  documents: LibraryDocument[];
  onSelect: (doc: LibraryDocument) => void;
  onToggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  emptyMessage?: string;
}

const DocumentsGrid: React.FC<DocumentsGridProps> = ({
  documents,
  onSelect,
  onToggleFavorite,
  isFavorite,
  emptyMessage = "Aucun document trouvé."
}) => {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {documents.map(doc => (
        <Card
          key={doc.id}
          className="cursor-pointer hover:shadow-md transition-all"
          onClick={() => onSelect(doc)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-2 rounded-xl",
                doc.is_norm ? "bg-amber-500/10 text-amber-600" :
                doc.is_template ? "bg-blue-500/10 text-blue-600" :
                "bg-muted text-muted-foreground"
              )}>
                {doc.document_type === 'video' ? <Video className="h-5 w-5" /> :
                 doc.is_norm ? <BookOpen className="h-5 w-5" /> :
                 <FileText className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium truncate">{doc.title}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(doc.id);
                    }}
                  >
                    <Star className={cn(
                      "h-4 w-4",
                      isFavorite(doc.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    )} />
                  </Button>
                </div>
                {doc.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {doc.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {doc.is_norm && (
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                      Norme
                    </Badge>
                  )}
                  {doc.is_template && (
                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                      Modèle
                    </Badge>
                  )}
                  {doc.ft_family_code && (
                    <Badge variant="secondary">{doc.ft_family_code}</Badge>
                  )}
                  {doc.tags?.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default LibraryHubPage;
