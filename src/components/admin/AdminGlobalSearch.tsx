import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, X, FileText, BarChart3, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResult {
  id: string;
  type: 'classification' | 'metric' | 'strategy';
  title: string;
  description: string;
  category: string;
  data: any;
}

export function AdminGlobalSearch() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search in DSC classification logs
      const { data: classifications } = await supabase
        .from('dsc_classification_logs')
        .select('*, task_families(*), task_categories(*), task_subcategories(*)')
        .or(`task_title.ilike.%${query}%,ai_family_code.ilike.%${query}%,ai_category_code.ilike.%${query}%`)
        .limit(10);

      if (classifications) {
        classifications.forEach((classification) => {
          searchResults.push({
            id: classification.id,
            type: 'classification',
            title: classification.task_title || 'Untitled Task',
            description: `${classification.task_families?.name || ''} / ${classification.task_categories?.name || ''} / ${classification.task_subcategories?.name || ''}`,
            category: t('cancel') === 'Annuler' ? 'Classifications DSC' : 'DSC Classifications',
            data: classification
          });
        });
      }

      // Search in prediction strategies
      const { data: strategies } = await supabase
        .from('prediction_strategies')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(10);

      if (strategies) {
        strategies.forEach((strategy) => {
          searchResults.push({
            id: strategy.id,
            type: 'strategy',
            title: strategy.name,
            description: strategy.description || 'No description',
            category: t('cancel') === 'Annuler' ? 'Stratégies de Prédiction' : 'Prediction Strategies',
            data: strategy
          });
        });
      }

      // Search in strategy performance metrics
      const { data: metrics } = await supabase
        .from('strategy_performance_metrics')
        .select('*, prediction_strategies(*)')
        .limit(10);

      if (metrics) {
        metrics.forEach((metric) => {
          if (metric.prediction_strategies?.name?.toLowerCase().includes(query.toLowerCase())) {
            searchResults.push({
              id: metric.id,
              type: 'metric',
              title: metric.prediction_strategies?.name || 'Unknown Strategy',
              description: `${metric.accepted_predictions}/${metric.total_predictions} accepted (${((metric.accepted_predictions / metric.total_predictions) * 100).toFixed(1)}%)`,
              category: t('cancel') === 'Annuler' ? 'Métriques de Performance' : 'Performance Metrics',
              data: metric
            });
          }
        });
      }

      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'classification':
        return <FileText className="w-4 h-4" />;
      case 'metric':
        return <BarChart3 className="w-4 h-4" />;
      case 'strategy':
        return <FlaskConical className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const scrollToSection = (type: string) => {
    let sectionId = '';
    if (type === 'classification') sectionId = 'dsc-section';
    if (type === 'strategy') sectionId = 'ab-testing-section';
    if (type === 'metric') sectionId = 'analytics-section';
    
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      setShowResults(false);
      setSearchQuery("");
    }
  };

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('cancel') === 'Annuler' 
            ? 'Rechercher des tâches, classifications ou métriques...'
            : 'Search tasks, classifications or metrics...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setShowResults(false);
            }}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg max-h-96">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {results.length} {t('cancel') === 'Annuler' ? 'résultats trouvés' : 'results found'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              <div className="space-y-1 p-4 pt-0">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => scrollToSection(result.type)}
                    className="w-full text-left p-3 hover:bg-muted/50 rounded-lg transition-colors flex items-start gap-3"
                  >
                    <div className="mt-0.5">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{result.title}</p>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {result.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {showResults && results.length === 0 && searchQuery.length >= 2 && !isSearching && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            {t('cancel') === 'Annuler' 
              ? 'Aucun résultat trouvé'
              : 'No results found'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
