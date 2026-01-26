import React from 'react';
import { ArrowLeft, FileText, Video, Book, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Document {
  id: string;
  title: string;
  type: string;
  description: string;
  tags?: string[];
}

interface Theme {
  id: string;
  name: string;
  description: string;
  documents: Document[];
}

interface LibraryThemeSectionProps {
  theme: Theme;
  appName: string;
  appColor: string;
  onBack: () => void;
  onSelectDocument: (document: Document) => void;
}

export const LibraryThemeSection: React.FC<LibraryThemeSectionProps> = ({
  theme,
  appName,
  appColor,
  onBack,
  onSelectDocument
}) => {
  const getDocIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-5 w-5 text-red-500" />;
      case 'pdf': return <FileText className="h-5 w-5 text-orange-500" />;
      default: return <Book className="h-5 w-5 text-blue-500" />;
    }
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Vidéo';
      case 'pdf': return 'PDF';
      case 'md': return 'Article';
      case 'embed': return 'Lien';
      default: return 'Document';
    }
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      'construction-orange': 'bg-orange-500',
      'construction-blue': 'bg-blue-500',
      'yellow-500': 'bg-yellow-500',
      'green-500': 'bg-green-500',
      'purple-500': 'bg-purple-500',
      'red-500': 'bg-red-500'
    };
    return colorMap[color] || 'bg-primary';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        <div className="p-4 bg-muted/30 rounded-2xl">
          <p className="text-xs text-muted-foreground mb-1">{appName}</p>
          <h2 className="text-xl font-semibold">{theme.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{theme.description}</p>
          <Badge className={`mt-2 ${getColorClass(appColor)} text-white border-0`}>
            {theme.documents.length} documents
          </Badge>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid gap-3">
        {theme.documents.map((doc, index) => (
          <Card
            key={doc.id}
            className="p-4 hover:shadow-md transition-all duration-200 cursor-pointer animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => onSelectDocument(doc)}
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-muted/50">
                {getDocIcon(doc.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{doc.title}</h3>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {getDocTypeLabel(doc.type)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {doc.description}
                </p>
                
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {doc.tags.map(tag => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="text-[10px] px-1.5 py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {theme.documents.length === 0 && (
        <div className="text-center py-12">
          <Book className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun document dans ce thème</p>
        </div>
      )}
    </div>
  );
};

export default LibraryThemeSection;
