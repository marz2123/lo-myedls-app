import React, { useState, useCallback } from 'react';
import { Book, Camera, HardHat, Folders, Users, ShoppingCart, Shield, ArrowLeft, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LibrarySearch } from './LibrarySearch';
import { LibraryAppSection } from './LibraryAppSection';
import { LibraryThemeSection } from './LibraryThemeSection';
import { LibraryDocumentViewer } from './LibraryDocumentViewer';
import { libraryConnector } from './LibraryAIConnector';
import libraryData from './libraryIndex.json';

interface Document {
  id: string;
  title: string;
  type: string;
  description: string;
  tags?: string[];
  content?: string;
  file?: string;
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

type ViewState = 
  | { type: 'home' }
  | { type: 'app'; app: Application }
  | { type: 'theme'; app: Application; theme: Theme };

const iconMap: Record<string, React.ElementType> = {
  Camera,
  HardHat,
  Folders,
  Users,
  ShoppingCart,
  Shield
};

interface LibraryHomeProps {
  onAskAladin?: (question: string, context: string) => void;
}

export const LibraryHome: React.FC<LibraryHomeProps> = ({ onAskAladin }) => {
  const [viewState, setViewState] = useState<ViewState>({ type: 'home' });
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentBreadcrumb, setDocumentBreadcrumb] = useState<string[]>([]);

  const applications = libraryData.applications as Application[];
  const stats = libraryConnector.getLibraryStats();

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

  const handleSearchSelect = useCallback((result: { type: string; id: string; path: string[] }) => {
    if (result.type === 'application') {
      const app = applications.find(a => a.id === result.id);
      if (app) setViewState({ type: 'app', app });
    } else if (result.type === 'theme') {
      for (const app of applications) {
        const theme = app.themes.find(t => t.id === result.id);
        if (theme) {
          setViewState({ type: 'theme', app, theme });
          break;
        }
      }
    } else if (result.type === 'document') {
      for (const app of applications) {
        for (const theme of app.themes) {
          const doc = theme.documents.find(d => d.id === result.id);
          if (doc) {
            setDocumentBreadcrumb([app.name, theme.name]);
            setSelectedDocument(doc);
            break;
          }
        }
      }
    }
  }, [applications]);

  const handleSelectApp = (app: Application) => {
    setViewState({ type: 'app', app });
  };

  const handleSelectTheme = (theme: Theme) => {
    if (viewState.type === 'app') {
      setViewState({ type: 'theme', app: viewState.app, theme });
    }
  };

  const handleSelectDocument = (doc: Document, theme?: Theme) => {
    const app = viewState.type === 'app' ? viewState.app : 
                viewState.type === 'theme' ? viewState.app : null;
    const themeName = theme?.name || (viewState.type === 'theme' ? viewState.theme.name : '');
    
    if (app) {
      setDocumentBreadcrumb([app.name, themeName]);
    }
    setSelectedDocument(doc);
  };

  const handleBack = () => {
    if (viewState.type === 'theme') {
      setViewState({ type: 'app', app: viewState.app });
    } else if (viewState.type === 'app') {
      setViewState({ type: 'home' });
    }
  };

  const renderHome = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-2">
          <Book className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Bibliothèque MyHome</h1>
        <p className="text-muted-foreground">
          Votre base de connaissances BTP & Immobilier
        </p>
      </div>

      {/* Search */}
      <LibrarySearch 
        onSelect={handleSearchSelect}
        placeholder="Rechercher un document, thème ou process..."
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center bg-muted/30">
          <p className="text-2xl font-bold text-primary">{stats.totalApps}</p>
          <p className="text-xs text-muted-foreground">Applications</p>
        </Card>
        <Card className="p-3 text-center bg-muted/30">
          <p className="text-2xl font-bold text-primary">{stats.totalThemes}</p>
          <p className="text-xs text-muted-foreground">Thèmes</p>
        </Card>
        <Card className="p-3 text-center bg-muted/30">
          <p className="text-2xl font-bold text-primary">{stats.totalDocs}</p>
          <p className="text-xs text-muted-foreground">Documents</p>
        </Card>
      </div>

      {/* AI Assistant hint */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">MyAladin connaît la bibliothèque</p>
            <p className="text-xs text-muted-foreground">
              Posez vos questions, il trouvera les documents pertinents
            </p>
          </div>
        </div>
      </Card>

      {/* Applications Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground px-1">Applications</h2>
        <div className="grid grid-cols-2 gap-3">
          {applications.map((app, index) => {
            const IconComponent = iconMap[app.icon] || Book;
            return (
              <Card
                key={app.id}
                className="p-4 hover:shadow-md transition-all duration-200 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleSelectApp(app)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${getColorClass(app.color)} text-white`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{app.name.split(' – ')[0]}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {app.description}
                    </p>
                    <Badge variant="secondary" className="text-[10px] mt-2">
                      {app.themes.length} thèmes
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-20">
        {viewState.type === 'home' && renderHome()}
        
        {viewState.type === 'app' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <LibraryAppSection
              application={viewState.app}
              onSelectTheme={handleSelectTheme}
              onSelectDocument={(doc, theme) => handleSelectDocument(doc, theme)}
            />
          </div>
        )}

        {viewState.type === 'theme' && (
          <LibraryThemeSection
            theme={viewState.theme}
            appName={viewState.app.name}
            appColor={viewState.app.color}
            onBack={handleBack}
            onSelectDocument={(doc) => handleSelectDocument(doc)}
          />
        )}

        <LibraryDocumentViewer
          document={selectedDocument}
          isOpen={selectedDocument !== null}
          onClose={() => setSelectedDocument(null)}
          onAskAladin={onAskAladin}
          breadcrumb={documentBreadcrumb}
        />
      </div>
    </ScrollArea>
  );
};

export default LibraryHome;
