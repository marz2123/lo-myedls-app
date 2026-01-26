import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SystemicError } from '@/hooks/useEdlQuality';

interface SystemicErrorsPanelProps {
  errors: SystemicError[];
}

export function SystemicErrorsPanel({ errors }: SystemicErrorsPanelProps) {
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { 
          icon: AlertTriangle, 
          color: 'text-red-500', 
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          label: 'Critique'
        };
      case 'important':
        return { 
          icon: AlertCircle, 
          color: 'text-amber-500', 
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          label: 'Important'
        };
      default:
        return { 
          icon: Info, 
          color: 'text-blue-500', 
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          label: 'Mineur'
        };
    }
  };

  const sortedErrors = [...errors].sort((a, b) => {
    const severityOrder = { critical: 0, important: 1, minor: 2 };
    return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Détection d'erreurs systémiques
          {errors.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {errors.length} pattern{errors.length > 1 ? 's' : ''} détecté{errors.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun pattern d'erreur détecté</p>
            <p className="text-sm">L'IA analyse automatiquement vos habitudes de travail</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {sortedErrors.map((error, index) => {
                const config = getSeverityConfig(error.severity);
                const Icon = config.icon;

                return (
                  <motion.div
                    key={error.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${config.bg} ${config.border}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`${config.color} border-current`}>
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {error.occurrence_count} occurrence{error.occurrence_count > 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="font-medium text-foreground">{error.description}</p>
                        {error.examples && error.examples.length > 0 && (
                          <div className="mt-2 pl-3 border-l-2 border-muted">
                            <p className="text-xs text-muted-foreground mb-1">Exemples:</p>
                            {error.examples.slice(0, 2).map((ex: any, i: number) => (
                              <p key={i} className="text-xs text-muted-foreground">
                                • {ex.type || ex.id}
                              </p>
                            ))}
                          </div>
                        )}
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
