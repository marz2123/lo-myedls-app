import React from 'react';
import { ChevronRight, FileText, Video, Book, Camera, HardHat, Folders, Users, ShoppingCart, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface Application {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  themes: Theme[];
}

interface LibraryAppSectionProps {
  application: Application;
  onSelectTheme: (theme: Theme) => void;
  onSelectDocument: (document: Document, theme: Theme) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Camera,
  HardHat,
  Folders,
  Users,
  ShoppingCart,
  Shield
};

export const LibraryAppSection: React.FC<LibraryAppSectionProps> = ({
  application,
  onSelectTheme,
  onSelectDocument
}) => {
  const IconComponent = iconMap[application.icon] || FileText;

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-3.5 w-3.5 text-red-500" />;
      case 'pdf': return <FileText className="h-3.5 w-3.5 text-orange-500" />;
      default: return <Book className="h-3.5 w-3.5 text-blue-500" />;
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
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl">
        <div className={`p-3 rounded-xl ${getColorClass(application.color)} text-white`}>
          <IconComponent className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{application.name}</h2>
          <p className="text-sm text-muted-foreground">{application.description}</p>
        </div>
      </div>

      {/* Themes Grid */}
      <div className="space-y-4">
        {application.themes.map((theme, index) => (
          <Card 
            key={theme.id}
            className="overflow-hidden hover:shadow-md transition-all duration-200 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Theme Header */}
            <button
              onClick={() => onSelectTheme(theme)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-1 h-8 rounded-full ${getColorClass(application.color)}`} />
                <div className="text-left">
                  <h3 className="font-medium">{theme.name}</h3>
                  <p className="text-sm text-muted-foreground">{theme.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {theme.documents.length} docs
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>

            {/* Documents Preview */}
            <ScrollArea className="border-t">
              <div className="p-3 flex gap-2">
                {theme.documents.slice(0, 4).map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => onSelectDocument(doc, theme)}
                    className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg transition-colors shrink-0"
                  >
                    {getDocIcon(doc.type)}
                    <span className="text-xs font-medium truncate max-w-32">{doc.title}</span>
                  </button>
                ))}
                {theme.documents.length > 4 && (
                  <button
                    onClick={() => onSelectTheme(theme)}
                    className="px-3 py-2 text-xs text-primary hover:underline shrink-0"
                  >
                    +{theme.documents.length - 4} autres
                  </button>
                )}
              </div>
            </ScrollArea>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LibraryAppSection;
