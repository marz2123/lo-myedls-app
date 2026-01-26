import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ImportRecord {
  id: string;
  status: string;
  progress_percentage: number;
  total_rows: number;
  processed_rows: number;
  families_count: number;
  categories_count: number;
  subcategories_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export const ImportHistory = () => {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImports = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('import_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching import history:', error);
      } else if (data) {
        setImports(data);
      }
      
      setLoading(false);
    };

    fetchImports();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('import-history-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'import_progress'
        },
        () => {
          fetchImports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-500">Terminé</Badge>;
      case 'failed':
        return <Badge variant="outline" className="border-red-500 text-red-500">Échoué</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">En cours</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (imports.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground text-center">
          Aucun historique d'import disponible
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-foreground mb-4">Historique des imports</h3>
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {imports.map((record) => (
            <div
              key={record.id}
              className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(record.status)}
                  {getStatusBadge(record.status)}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(record.created_at), {
                    addSuffix: true,
                    locale: fr
                  })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Lignes totales:</span>
                  <span className="ml-2 font-medium">{record.total_rows}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Progression:</span>
                  <span className="ml-2 font-medium">{record.progress_percentage}%</span>
                </div>
              </div>

              {record.status === 'completed' && (
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{record.families_count} familles</span>
                  <span>{record.categories_count} catégories</span>
                  <span>{record.subcategories_count} sous-catégories</span>
                </div>
              )}

              {record.error_message && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-400">
                  {record.error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
