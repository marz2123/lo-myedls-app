import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Wand2,
  Eye,
  Image,
  FileText,
  Scale,
  Camera,
  Bot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { InconsistencyItem } from '@/hooks/useDeepConsistency';

interface InconsistencyListProps {
  items: InconsistencyItem[];
  onApplyCorrection: (id: string, correction: string) => Promise<boolean>;
  onDismiss: (id: string) => Promise<boolean>;
  onViewDetail: (item: InconsistencyItem) => void;
  getTypeLabel: (type: string) => string;
  getCategoryLabel: (category: string) => string;
}

export const InconsistencyList = ({
  items,
  onApplyCorrection,
  onDismiss,
  onViewDetail,
  getTypeLabel,
  getCategoryLabel,
}: InconsistencyListProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'photo_analysis': return <Camera className="h-4 w-4" />;
      case 'semantic_analysis': return <FileText className="h-4 w-4" />;
      case 'state_coherence': return <AlertCircle className="h-4 w-4" />;
      case 'entry_exit': return <Scale className="h-4 w-4" />;
      case 'writing_quality': return <FileText className="h-4 w-4" />;
      case 'coverage': return <Image className="h-4 w-4" />;
      case 'legal': return <Scale className="h-4 w-4" />;
      case 'ai_detection': return <Bot className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'text-red-500',
          bg: 'bg-red-50 dark:bg-red-950/30',
          border: 'border-red-200 dark:border-red-900',
          badge: 'bg-red-500',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'text-orange-500',
          bg: 'bg-orange-50 dark:bg-orange-950/30',
          border: 'border-orange-200 dark:border-orange-900',
          badge: 'bg-orange-500',
        };
      default:
        return {
          icon: <Info className="h-4 w-4" />,
          color: 'text-blue-500',
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          border: 'border-blue-200 dark:border-blue-900',
          badge: 'bg-blue-500',
        };
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleApplyCorrection = async (item: InconsistencyItem) => {
    if (!item.suggested_correction) return;
    
    setApplyingIds(prev => new Set(prev).add(item.id));
    await onApplyCorrection(item.id, item.suggested_correction);
    setApplyingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(item.id);
      return newSet;
    });
  };

  const visibleItems = items.filter(i => !i.is_corrected && !i.is_dismissed);
  const groupedItems = visibleItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, InconsistencyItem[]>);

  if (visibleItems.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Aucune incohérence détectée</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Votre EDL est cohérent et professionnel !
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Incohérences détectées
          </span>
          <Badge variant="secondary">{visibleItems.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-4">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  {getCategoryIcon(category)}
                  {getCategoryLabel(category)}
                  <Badge variant="outline" className="text-xs">
                    {categoryItems.length}
                  </Badge>
                </div>
                
                <AnimatePresence mode="popLayout">
                  {categoryItems.map((item, index) => {
                    const config = getSeverityConfig(item.severity);
                    const isExpanded = expandedItems.has(item.id);
                    const isApplying = applyingIds.has(item.id);

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(item.id)}>
                          <div className={cn(
                            "rounded-lg border p-3 transition-all",
                            config.bg,
                            config.border
                          )}>
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-start gap-3">
                                <div className={cn("mt-0.5", config.color)}>
                                  {config.icon}
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">{item.title}</span>
                                    <Badge className={cn("text-xs", config.badge)}>
                                      {getTypeLabel(item.inconsistency_type)}
                                    </Badge>
                                    {item.auto_correctable && (
                                      <Badge variant="outline" className="text-xs">
                                        <Wand2 className="h-3 w-3 mr-1" />
                                        Auto
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {item.description}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(item.confidence_score * 100)}%
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 pt-3 border-t border-current/10 space-y-3"
                              >
                                {item.original_text && (
                                  <div className="text-xs">
                                    <span className="font-medium">Texte original:</span>
                                    <p className="mt-1 p-2 bg-background rounded text-muted-foreground">
                                      {item.original_text}
                                    </p>
                                  </div>
                                )}

                                {item.suggested_correction && (
                                  <div className="text-xs">
                                    <span className="font-medium text-green-600">Suggestion IA:</span>
                                    <p className="mt-1 p-2 bg-green-50 dark:bg-green-950/30 rounded text-green-700 dark:text-green-300">
                                      {item.suggested_correction}
                                    </p>
                                  </div>
                                )}

                                {item.photo_url && (
                                  <div className="rounded-lg overflow-hidden">
                                    <img 
                                      src={item.photo_url} 
                                      alt="Photo concernée"
                                      className="w-full h-32 object-cover"
                                    />
                                  </div>
                                )}

                                <div className="flex items-center gap-2 pt-2">
                                  {item.auto_correctable && item.suggested_correction && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleApplyCorrection(item)}
                                      disabled={isApplying}
                                      className="flex-1"
                                    >
                                      <Wand2 className={cn("h-4 w-4 mr-1", isApplying && "animate-spin")} />
                                      {isApplying ? 'Application...' : 'Corriger'}
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onViewDetail(item)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Voir
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onDismiss(item.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </motion.div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
