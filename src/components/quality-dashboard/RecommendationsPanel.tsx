import { motion } from 'framer-motion';
import { Sparkles, Check, X, Eye, Camera, FileText, AlertCircle, RefreshCw, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QualityRecommendation } from '@/hooks/useEdlQuality';

interface RecommendationsPanelProps {
  recommendations: QualityRecommendation[];
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
  onViewItem: (recommendation: QualityRecommendation) => void;
}

export function RecommendationsPanel({ 
  recommendations, 
  onApply, 
  onDismiss, 
  onViewItem 
}: RecommendationsPanelProps) {
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'missing_photo':
        return { icon: Camera, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case 'missing_task':
        return { icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' };
      case 'correction':
        return { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' };
      case 'reformulation':
        return { icon: Wand2, color: 'text-pink-500', bg: 'bg-pink-500/10' };
      case 'coherence':
        return { icon: RefreshCw, color: 'text-green-500', bg: 'bg-green-500/10' };
      case 'description':
        return { icon: FileText, color: 'text-cyan-500', bg: 'bg-cyan-500/10' };
      case 'rescan':
        return { icon: Camera, color: 'text-orange-500', bg: 'bg-orange-500/10' };
      default:
        return { icon: Sparkles, color: 'text-muted-foreground', bg: 'bg-muted' };
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critique</Badge>;
      case 'important':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Important</Badge>;
      default:
        return <Badge variant="secondary">Mineur</Badge>;
    }
  };

  const sortedRecs = [...recommendations].sort((a, b) => {
    const severityOrder = { critical: 0, important: 1, minor: 2 };
    return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Recommandations MyAladin Pro
          {recommendations.length > 0 && (
            <Badge variant="outline" className="ml-auto">
              {recommendations.length} action{recommendations.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucune recommandation en attente</p>
            <p className="text-sm">Lancez une analyse pour obtenir des suggestions</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {sortedRecs.map((rec, index) => {
                const config = getTypeConfig(rec.recommendation_type);
                const Icon = config.icon;

                return (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border ${config.bg} border-border/50`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getSeverityBadge(rec.severity)}
                        </div>
                        <p className="font-medium text-foreground">{rec.title}</p>
                        {rec.description && (
                          <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <Button 
                            size="sm" 
                            onClick={() => onApply(rec.id)}
                            className="gap-1"
                          >
                            <Check className="h-4 w-4" />
                            Appliquer
                          </Button>
                          {rec.affected_item_id && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onViewItem(rec)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Voir
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => onDismiss(rec.id)}
                            className="gap-1 text-muted-foreground"
                          >
                            <X className="h-4 w-4" />
                            Ignorer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
