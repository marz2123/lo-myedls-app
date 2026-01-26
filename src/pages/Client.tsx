import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, ChevronRight, Users, Shield } from 'lucide-react';
import { ClientProjectViewer } from '@/components/client/ClientProjectViewer';

interface ClientProject {
  id: string;
  property_type: string;
  address: string;
  city: string;
  postal_code: string;
  created_at: string;
  status?: string;
}

const Client = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    searchParams.get('project')
  );

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth?redirect=/client');
        return;
      }
      setUser(user);
      loadClientProjects(user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/auth?redirect=/client');
      } else if (session?.user) {
        setUser(session.user);
        loadClientProjects(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadClientProjects = async (userId: string) => {
    setLoading(true);
    try {
      // Get projects the client has access to via project_client_access
      const { data: accessData, error: accessError } = await supabase
        .from('project_client_access')
        .select('project_id')
        .eq('user_id', userId);

      if (accessError) throw accessError;

      if (!accessData || accessData.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      const projectIds = accessData.map(a => a.project_id);

      const { data: projectsData, error: projectsError } = await supabase
        .from('edl_projects')
        .select('id, property_type, address, city, postal_code, created_at')
        .in('id', projectIds)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading client projects:', error);
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

  if (selectedProjectId) {
    return (
      <ClientProjectViewer 
        projectId={selectedProjectId} 
        onBack={() => setSelectedProjectId(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Espace Clients</h1>
                <p className="text-xs text-muted-foreground">MyHome</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                Accès sécurisé
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Bienvenue dans votre espace client
          </h2>
          <p className="text-muted-foreground">
            Suivez l'avancement de vos projets de rénovation en toute transparence.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : projects.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Aucun projet accessible
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Vous n'avez pas encore accès à des projets. Contactez votre gestionnaire de projet pour obtenir l'accès.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card 
                key={project.id}
                className="hover:shadow-lg transition-all cursor-pointer group border-slate-200"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="secondary" className="mb-2">
                      {getPropertyTypeLabel(project.property_type)}
                    </Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="text-lg line-clamp-2">
                    {project.address}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{project.postal_code} {project.city}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2024 MyHome. Tous droits réservés.</p>
            <p className="mt-1">Espace client sécurisé - Consultation uniquement</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Client;
