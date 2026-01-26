import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Shield, FileText, TrendingUp, Image } from 'lucide-react';
import { ClientSynthese } from './ClientSynthese';
import { ClientEDLs } from './ClientEDLs';
import { ClientProgress } from './ClientProgress';
import { ClientMedias } from './ClientMedias';
import { ClientAIChat } from './ClientAIChat';

interface ClientProjectViewerProps {
  projectId: string;
  onBack: () => void;
}

interface Project {
  id: string;
  property_type: string;
  address: string;
  city: string;
  postal_code: string;
  created_at: string;
}

export const ClientProjectViewer: React.FC<ClientProjectViewerProps> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('synthese');
  const [showAIChat, setShowAIChat] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, property_type, address, city, postal_code, created_at')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'immeuble': 'Immeuble',
      'maison': 'Maison',
      'appartement': 'Appartement',
      'commerce': 'Commerce',
      'asl': 'ASL'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <p className="text-muted-foreground">Projet non trouvé</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground line-clamp-1">
                    {project.address}
                  </h1>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {getPropertyTypeLabel(project.property_type)}
                    </Badge>
                    <span>{project.postal_code} {project.city}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                Lecture seule
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-0 h-12">
              <TabsTrigger 
                value="synthese" 
                className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <FileText className="h-4 w-4" />
                Synthèse
              </TabsTrigger>
              <TabsTrigger 
                value="edls" 
                className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <FileText className="h-4 w-4" />
                États des lieux
              </TabsTrigger>
              <TabsTrigger 
                value="progress" 
                className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <TrendingUp className="h-4 w-4" />
                Avancement
              </TabsTrigger>
              <TabsTrigger 
                value="medias" 
                className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Image className="h-4 w-4" />
                Médias
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="synthese" className="mt-0">
            <ClientSynthese projectId={projectId} />
          </TabsContent>
          <TabsContent value="edls" className="mt-0">
            <ClientEDLs projectId={projectId} />
          </TabsContent>
          <TabsContent value="progress" className="mt-0">
            <ClientProgress projectId={projectId} />
          </TabsContent>
          <TabsContent value="medias" className="mt-0">
            <ClientMedias projectId={projectId} />
          </TabsContent>
        </Tabs>
      </main>

      {/* AI Chat Button */}
      <div className="fixed bottom-6 right-6">
        <Button 
          onClick={() => setShowAIChat(true)}
          className="rounded-full h-14 px-6 shadow-lg"
        >
          <span className="mr-2">💬</span>
          Poser une question
        </Button>
      </div>

      {/* AI Chat Dialog */}
      {showAIChat && (
        <ClientAIChat 
          projectId={projectId} 
          onClose={() => setShowAIChat(false)} 
        />
      )}
    </div>
  );
};
