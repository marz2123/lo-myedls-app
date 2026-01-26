import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database, Trash2, RefreshCw } from "lucide-react";

interface CacheStats {
  total_entries: number;
  total_hits: number;
  cache_efficiency: number;
  storage_used_kb: number;
}

export const AdvancedCacheSettings = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('cache_predictions')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error loading cache stats:', error);
      setLoading(false);
      return;
    }

    const entries = data || [];
    const totalHits = entries.reduce((sum, e) => sum + (e.hit_count || 0), 0);
    const storageSize = new Blob([JSON.stringify(entries)]).size / 1024;

    setStats({
      total_entries: entries.length,
      total_hits: totalHits,
      cache_efficiency: entries.length > 0 ? (totalHits / entries.length) * 100 : 0,
      storage_used_kb: Math.round(storageSize)
    });
    setLoading(false);
  };

  const clearCache = async () => {
    const confirmed = confirm("Voulez-vous vraiment vider le cache ? Cela pourrait ralentir temporairement l'application.");
    if (!confirmed) return;

    setClearing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('cache_predictions')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      toast.error("Erreur lors du vidage du cache");
    } else {
      toast.success("Cache vidé avec succès");
      loadCacheStats();
    }
    setClearing(false);
  };

  const clearExpiredCache = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('cache_predictions')
      .delete()
      .eq('user_id', user.id)
      .lt('expires_at', new Date().toISOString());

    if (error) {
      toast.error("Erreur lors du nettoyage");
    } else {
      toast.success("Entrées expirées supprimées");
      loadCacheStats();
    }
  };

  if (loading) {
    return <div className="animate-pulse">Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Cache Intelligent
        </CardTitle>
        <CardDescription>
          Optimisation automatique des performances avec cache prédictif
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Entrées en cache</div>
                <div className="text-2xl font-bold">{stats.total_entries}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Hits totaux</div>
                <div className="text-2xl font-bold">{stats.total_hits}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Efficacité du cache</span>
                <Badge variant="outline">
                  {stats.cache_efficiency.toFixed(1)}%
                </Badge>
              </div>
              <Progress value={stats.cache_efficiency} className="h-2" />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stockage utilisé</span>
              <span className="font-medium">{stats.storage_used_kb} KB</span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearExpiredCache}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Nettoyer expirés
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={clearCache}
                disabled={clearing}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {clearing ? "Vidage..." : "Vider tout"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};