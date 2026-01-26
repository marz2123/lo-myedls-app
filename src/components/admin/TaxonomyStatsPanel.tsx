import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Loader2, FolderTree, Grid3x3, Layers, TrendingUp, Award, Filter, Wand2, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FamilyStats {
  family_code: string;
  family_name: string;
  categories_count: number;
  subcategories_count: number;
  total_tasks: number;
}

interface CategoryStats {
  family_name: string;
  category_code: string;
  category_name: string;
  subcategories_count: number;
  total_tasks: number;
}

interface SubcategoryStats {
  family_name: string;
  category_name: string;
  subcategory_code: string;
  subcategory_name: string;
  task_count: number;
}

const COLORS = [
  'hsl(220, 90%, 56%)',   // Blue
  'hsl(160, 84%, 39%)',   // Green
  'hsl(38, 100%, 59%)',   // Orange
  'hsl(10, 100%, 63%)',   // Red
  'hsl(260, 60%, 65%)',   // Purple
  'hsl(180, 77%, 64%)',   // Cyan
  'hsl(45, 93%, 58%)',    // Yellow
  'hsl(320, 85%, 62%)',   // Pink
  'hsl(200, 98%, 48%)',   // Light Blue
  'hsl(140, 70%, 45%)',   // Dark Green
  'hsl(25, 95%, 53%)',    // Dark Orange
  'hsl(280, 67%, 55%)',   // Violet
];

const isGenericName = (name: string): boolean => {
  return /^(Compléments?|Postes?)\s*\d+$/i.test(name?.trim() || '');
};

export const TaxonomyStatsPanel = () => {
  const [familyStats, setFamilyStats] = useState<FamilyStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [subcategoryStats, setSubcategoryStats] = useState<SubcategoryStats[]>([]);
  const [officialTotalTasks, setOfficialTotalTasks] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [hideGeneric, setHideGeneric] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const [isFixingTaxonomy, setIsFixingTaxonomy] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceOperation, setEnhanceOperation] = useState<'all' | 'taxonomy' | 'tasks' | 'duplicates' | 'enhance'>('all');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch actual counts from DSC tables (ft_familles, ct_categories, sc_sous_categories, t_taches)
      // Note: Default Supabase limit is 1000, so we need pagination for larger tables
      const [
        { data: ftFamilles, error: ftError },
        { data: ctCategories, error: ctError },
        { count: tachesCount, error: tError },
        { count: scCount, error: scCountError }
      ] = await Promise.all([
        supabase.from('ft_familles').select('ft_code, ft_label'),
        supabase.from('ct_categories').select('ct_code, ct_label, ft_code'),
        supabase.from('t_taches').select('*', { count: 'exact', head: true }),
        supabase.from('sc_sous_categories').select('*', { count: 'exact', head: true })
      ]);

      if (ftError) throw ftError;
      if (ctError) throw ctError;
      if (tError) throw tError;
      if (scCountError) throw scCountError;

      // Store official counts
      setOfficialTotalTasks(tachesCount || 0);

      // Fetch all sous-categories with pagination (1008 items, need 2 pages)
      let allScSousCategories: { sc_code: string; sc_label: string; ct_code: string }[] = [];
      let scPage = 0;
      const scPageSize = 1000;
      let scHasMore = true;
      
      while (scHasMore) {
        const { data: scBatch, error: scError } = await supabase
          .from('sc_sous_categories')
          .select('sc_code, sc_label, ct_code')
          .range(scPage * scPageSize, (scPage + 1) * scPageSize - 1);
        
        if (scError) throw scError;
        
        if (scBatch && scBatch.length > 0) {
          allScSousCategories = [...allScSousCategories, ...scBatch];
          scHasMore = scBatch.length === scPageSize;
          scPage++;
        } else {
          scHasMore = false;
        }
      }
      
      const scSousCategories = allScSousCategories;
      console.log(`Fetched ${scSousCategories.length} sous-categories (official count: ${scCount})`);

      // Count tasks per sous-category - need to fetch all (default limit is 1000)
      // Use pagination with 1000 page size (Supabase default limit)
      let allTaskCounts: { sc_code: string | null }[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data: taskBatch, error: tcError } = await supabase
          .from('t_taches')
          .select('sc_code')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (tcError) throw tcError;
        
        if (taskBatch && taskBatch.length > 0) {
          allTaskCounts = [...allTaskCounts, ...taskBatch];
          hasMore = taskBatch.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`Fetched ${allTaskCounts.length} tasks for distribution (official count: ${tachesCount})`);
      
      const taskCounts = allTaskCounts;

      // Build task count map by sc_code
      const taskCountMap: Record<string, number> = {};
      taskCounts?.forEach(t => {
        if (t.sc_code) {
          taskCountMap[t.sc_code] = (taskCountMap[t.sc_code] || 0) + 1;
        }
      });

      // Build sc count map by ct_code
      const scCountMap: Record<string, number> = {};
      scSousCategories?.forEach(sc => {
        if (sc.ct_code) {
          scCountMap[sc.ct_code] = (scCountMap[sc.ct_code] || 0) + 1;
        }
      });

      // Build ct count map by ft_code
      const ctCountMap: Record<string, number> = {};
      ctCategories?.forEach(ct => {
        if (ct.ft_code) {
          ctCountMap[ct.ft_code] = (ctCountMap[ct.ft_code] || 0) + 1;
        }
      });

      // Process family stats
      const familyStatsData: FamilyStats[] = ftFamilles?.map(ft => {
        const ftCode = ft.ft_code;
        const categoriesCount = ctCountMap[ftCode] || 0;
        
        // Count subcategories for this family
        const relatedCts = ctCategories?.filter(ct => ct.ft_code === ftCode).map(ct => ct.ct_code) || [];
        const subcategoriesCount = relatedCts.reduce((sum, ctCode) => sum + (scCountMap[ctCode] || 0), 0);
        
        // Count tasks for this family
        const relatedScs = scSousCategories?.filter(sc => relatedCts.includes(sc.ct_code)).map(sc => sc.sc_code) || [];
        const totalTasks = relatedScs.reduce((sum, scCode) => sum + (taskCountMap[scCode] || 0), 0);
        
        return {
          family_code: ftCode,
          family_name: ft.ft_label,
          categories_count: categoriesCount,
          subcategories_count: subcategoriesCount,
          total_tasks: totalTasks
        };
      }) || [];

      setFamilyStats(familyStatsData.sort((a, b) => b.total_tasks - a.total_tasks));

      // Process category stats
      const categoryStatsData: CategoryStats[] = ctCategories?.map(ct => {
        const ctCode = ct.ct_code;
        const family = ftFamilles?.find(ft => ft.ft_code === ct.ft_code);
        const subcategoriesCount = scCountMap[ctCode] || 0;
        
        // Count tasks for this category
        const relatedScs = scSousCategories?.filter(sc => sc.ct_code === ctCode).map(sc => sc.sc_code) || [];
        const totalTasks = relatedScs.reduce((sum, scCode) => sum + (taskCountMap[scCode] || 0), 0);
        
        return {
          family_name: family?.ft_label || '',
          category_code: ctCode,
          category_name: ct.ct_label,
          subcategories_count: subcategoriesCount,
          total_tasks: totalTasks
        };
      }) || [];

      setCategoryStats(categoryStatsData.sort((a, b) => b.total_tasks - a.total_tasks));

      // Process subcategory stats
      const subcategoryStatsData: SubcategoryStats[] = scSousCategories?.map(sc => {
        const category = ctCategories?.find(ct => ct.ct_code === sc.ct_code);
        const family = category ? ftFamilles?.find(ft => ft.ft_code === category.ft_code) : null;
        
        return {
          family_name: family?.ft_label || '',
          category_name: category?.ct_label || '',
          subcategory_code: sc.sc_code,
          subcategory_name: sc.sc_label,
          task_count: taskCountMap[sc.sc_code] || 0
        };
      }) || [];

      setSubcategoryStats(subcategoryStatsData.sort((a, b) => b.task_count - a.task_count));

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFixLabels = async () => {
    setIsFixing(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-fix-dsc-labels', {
        body: {}
      });

      if (error) throw error;

      toast.success(data.message || 'Correction automatique terminée', {
        description: `${data.corrected} tâche(s) corrigée(s) sur ${data.total_analyzed} analysée(s)`
      });

      // Refresh stats after correction
      await fetchStats();
    } catch (error) {
      console.error('Error auto-fixing labels:', error);
      toast.error('Erreur lors de la correction automatique', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue'
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleFixTaxonomyLabels = async () => {
    setIsFixingTaxonomy(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-taxonomy-labels', {
        body: {}
      });

      if (error) throw error;

      toast.success('Taxonomie DSC corrigée avec succès', {
        description: `${data.corrected_categories} catégorie(s) et ${data.corrected_subcategories} sous-catégorie(s) corrigées`
      });

      // Refresh stats after correction
      await fetchStats();
    } catch (error) {
      console.error('Error fixing taxonomy labels:', error);
      toast.error('Erreur lors de la correction de la taxonomie', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue'
      });
    } finally {
      setIsFixingTaxonomy(false);
    }
  };

  const handleEnhanceDSC = async () => {
    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-dsc-data', {
        body: { operation: enhanceOperation }
      });

      if (error) throw error;

      toast.success('Perfectionnement DSC terminé', {
        description: `${data.results.total} améliorations: ${data.results.taxonomyFixed} taxonomie, ${data.results.tasksFixed} tâches, ${data.results.duplicatesRemoved} doublons, ${data.results.descriptionsEnhanced} descriptions`
      });

      // Refresh stats after enhancement
      await fetchStats();
    } catch (error) {
      console.error('Error enhancing DSC data:', error);
      toast.error('Erreur lors du perfectionnement', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue'
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const filteredFamilyStats = hideGeneric
    ? familyStats.filter(f => !isGenericName(f.family_name))
    : familyStats;
  
  const filteredCategoryStats = hideGeneric
    ? categoryStats.filter(c => !isGenericName(c.category_name))
    : categoryStats;
  
  const filteredSubcategoryStats = hideGeneric
    ? subcategoryStats.filter(s => !isGenericName(s.subcategory_name))
    : subcategoryStats;

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  // Use official count for total, but calculated count for distribution stats
  const calculatedTasks = filteredFamilyStats.reduce((sum, f) => sum + f.total_tasks, 0);
  const totalTasks = officialTotalTasks || calculatedTasks;
  const totalFamilies = filteredFamilyStats.length;
  const totalCategories = filteredCategoryStats.length;
  const totalSubcategories = filteredSubcategoryStats.length;
  
  const avgTasksPerFamily = totalFamilies > 0 ? (totalTasks / totalFamilies).toFixed(1) : 0;
  const avgCategoriesPerFamily = totalFamilies > 0 ? (totalCategories / totalFamilies).toFixed(1) : 0;
  const avgSubcategoriesPerCategory = totalCategories > 0 ? (totalSubcategories / totalCategories).toFixed(1) : 0;
  const topFamily = filteredFamilyStats[0];
  const topCategory = filteredCategoryStats[0];

  const hiddenCount = {
    families: familyStats.length - filteredFamilyStats.length,
    categories: categoryStats.length - filteredCategoryStats.length,
    subcategories: subcategoryStats.length - filteredSubcategoryStats.length
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Filter Toggle and Auto-Fix Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg bg-muted/30">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2">
            <Select value={enhanceOperation} onValueChange={(v: any) => setEnhanceOperation(v)}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout</SelectItem>
                <SelectItem value="taxonomy">Taxonomie</SelectItem>
                <SelectItem value="tasks">Tâches</SelectItem>
                <SelectItem value="duplicates">Doublons</SelectItem>
                <SelectItem value="enhance">Descriptions</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={handleEnhanceDSC}
              disabled={isEnhancing}
              variant="default"
              size="sm"
              className="flex items-center gap-2"
            >
              {isEnhancing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span className="text-xs sm:text-sm">
                {isEnhancing ? 'Perfectionnement...' : 'Perfectionner DSC'}
              </span>
            </Button>
          </div>
          
          <Button
            onClick={handleFixTaxonomyLabels}
            disabled={isFixingTaxonomy}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isFixingTaxonomy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            <span className="text-xs sm:text-sm">
              {isFixingTaxonomy ? 'Correction taxonomie...' : 'Corriger taxonomie'}
            </span>
          </Button>
          
          <Button
            onClick={handleAutoFixLabels}
            disabled={isFixing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isFixing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            <span className="text-xs sm:text-sm">
              {isFixing ? 'Correction tâches...' : 'Corriger tâches'}
            </span>
          </Button>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Label htmlFor="hide-generic-stats" className="text-xs md:text-sm cursor-pointer flex-1">
            Masquer entrées génériques
          </Label>
          {(hiddenCount.families > 0 || hiddenCount.categories > 0 || hiddenCount.subcategories > 0) && (
            <Badge variant="outline" className="text-xs">
              {hiddenCount.families + hiddenCount.categories + hiddenCount.subcategories} masqués
            </Badge>
          )}
          <Switch
            id="hide-generic-stats"
            checked={hideGeneric}
            onCheckedChange={setHideGeneric}
            className="flex-shrink-0"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2 md:p-3 rounded-lg bg-primary/10">
                <FolderTree className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <Badge variant="secondary" className="text-xs">
                {avgTasksPerFamily} moy/famille
              </Badge>
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Tâches</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{totalTasks.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Réparties sur {totalFamilies} familles
                {hiddenCount.families > 0 && ` (${hiddenCount.families} masqués)`}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2 md:p-3 rounded-lg bg-blue-500/10">
                <FolderTree className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <Badge variant="secondary" className="text-xs">
                {avgCategoriesPerFamily} cat/famille
              </Badge>
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Familles DSC</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{totalFamilies}</p>
              {topFamily && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Top: {topFamily.family_name} ({topFamily.total_tasks} tâches)
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2 md:p-3 rounded-lg bg-green-500/10">
                <Grid3x3 className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              </div>
              <Badge variant="secondary" className="text-xs">
                {avgSubcategoriesPerCategory} sous-cat
              </Badge>
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Catégories</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{totalCategories}</p>
              {topCategory && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Top: {topCategory.category_name} ({topCategory.total_tasks} tâches)
                  {hiddenCount.categories > 0 && ` (${hiddenCount.categories} masqués)`}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2 md:p-3 rounded-lg bg-orange-500/10">
                <Layers className="w-5 h-5 md:w-6 md:h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Award className="w-3 h-3" />
                Détails
              </Badge>
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Sous-catégories</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{totalSubcategories}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Structure complète DSC
                {hiddenCount.subcategories > 0 && ` (${hiddenCount.subcategories} masqués)`}
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Key Insights */}
      <Card className="p-4 md:p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start gap-2 md:gap-3">
          <div className="p-2 rounded-lg bg-primary/20 flex-shrink-0">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm md:text-base text-foreground mb-2">Indicateurs clés</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Moyenne tâches/famille</p>
                <p className="text-xl md:text-2xl font-bold text-primary">{avgTasksPerFamily}</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Catégories/famille</p>
                <p className="text-xl md:text-2xl font-bold text-primary">{avgCategoriesPerFamily}</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Sous-cat/catégorie</p>
                <p className="text-xl md:text-2xl font-bold text-primary">{avgSubcategoriesPerCategory}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <Card className="p-3 md:p-6">
        <div className="mb-3 md:mb-4">
          <h3 className="text-base md:text-lg font-semibold text-foreground">Répartition des tâches</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Visualisation détaillée de la distribution des tâches dans la structure DSC
          </p>
        </div>
        <Tabs defaultValue="families" className="space-y-3 md:space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="families" className="gap-1 md:gap-2 text-xs md:text-sm">
              <FolderTree className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Familles</span>
              <span className="sm:hidden">Fam.</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1 md:gap-2 text-xs md:text-sm">
              <Grid3x3 className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Catégories</span>
              <span className="sm:hidden">Cat.</span>
            </TabsTrigger>
            <TabsTrigger value="subcategories" className="gap-1 md:gap-2 text-xs md:text-sm">
              <Layers className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Sous-catégories</span>
              <span className="sm:hidden">S-cat.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="families" className="space-y-4 md:space-y-6">
            <div className="rounded-lg border bg-card p-3 md:p-4">
              <h4 className="text-xs md:text-sm font-medium mb-2 md:mb-3 text-muted-foreground">
                Distribution par volume de tâches
              </h4>
              <div className="h-64 md:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredFamilyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="family_code" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      className="text-[10px] md:text-xs"
                      interval={0}
                    />
                    <YAxis className="text-[10px] md:text-xs" />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const percentage = ((data.total_tasks / totalTasks) * 100).toFixed(1);
                          return (
                            <div className="bg-popover border-2 border-primary/20 p-3 md:p-4 rounded-lg shadow-xl max-w-[280px]">
                              <p className="font-bold text-sm md:text-base mb-2 break-words">{data.family_name}</p>
                              <div className="space-y-1 md:space-y-1.5 text-xs md:text-sm">
                                <div className="flex items-center justify-between gap-2 md:gap-4">
                                  <p className="text-muted-foreground">Code:</p>
                                  <Badge variant="outline" className="text-xs">{data.family_code}</Badge>
                                </div>
                                <div className="flex items-center justify-between gap-2 md:gap-4">
                                  <p className="text-muted-foreground">Tâches:</p>
                                  <p className="font-bold text-primary">{data.total_tasks}</p>
                                </div>
                                <div className="flex items-center justify-between gap-2 md:gap-4">
                                  <p className="text-muted-foreground">Part totale:</p>
                                  <Badge className="bg-primary/10 text-primary text-xs">{percentage}%</Badge>
                                </div>
                                <div className="pt-2 border-t border-border space-y-1 text-xs">
                                  <p className="text-muted-foreground">
                                    {data.categories_count} catégories
                                  </p>
                                  <p className="text-muted-foreground">
                                    {data.subcategories_count} sous-catégories
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="total_tasks" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-3 md:p-4">
              <h4 className="text-xs md:text-sm font-medium mb-2 md:mb-3 text-muted-foreground">
                Répartition proportionnelle
              </h4>
              <ScrollArea className="h-[500px] md:h-[600px]">
                <div className="h-[400px] md:h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredFamilyStats}
                        dataKey="total_tasks"
                        nameKey="family_name"
                        cx="50%"
                        cy="45%"
                        outerRadius={window.innerWidth < 768 ? 100 : 140}
                        innerRadius={window.innerWidth < 768 ? 40 : 60}
                        label={(entry) => {
                          const percentage = (entry.total_tasks / totalTasks) * 100;
                          return percentage > 2 ? `${percentage.toFixed(1)}%` : '';
                        }}
                        labelLine={true}
                        style={{ fontSize: window.innerWidth < 768 ? '11px' : '13px', fontWeight: 600 }}
                      >
                        {filteredFamilyStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const percentage = ((data.total_tasks / totalTasks) * 100).toFixed(1);
                            return (
                              <div className="bg-popover/95 backdrop-blur-sm border-2 border-primary/30 p-3 md:p-4 rounded-lg shadow-2xl max-w-[280px]">
                                <p className="font-bold text-sm md:text-base mb-2 text-foreground break-words">{data.family_name}</p>
                                <div className="space-y-1.5 text-xs md:text-sm">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-muted-foreground">Code:</p>
                                    <Badge variant="outline" className="text-xs font-mono">{data.family_code}</Badge>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-muted-foreground">Tâches:</p>
                                    <p className="font-bold text-primary text-base">{data.total_tasks}</p>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-muted-foreground">Part totale:</p>
                                    <Badge className="bg-primary/10 text-primary font-bold">{percentage}%</Badge>
                                  </div>
                                  <div className="pt-2 border-t border-border mt-2 space-y-1 text-xs">
                                    <p className="text-muted-foreground">📁 {data.categories_count} catégories</p>
                                    <p className="text-muted-foreground">📂 {data.subcategories_count} sous-catégories</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium mb-3">Légende des familles ({filteredFamilyStats.length} familles)</p>
                  <div className="grid grid-cols-1 gap-2">
                    {filteredFamilyStats.map((item, index) => {
                      const percentage = ((item.total_tasks / totalTasks) * 100).toFixed(1);
                      return (
                        <div 
                          key={index} 
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <div 
                            className="w-4 h-4 rounded-sm flex-shrink-0 border border-border" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs md:text-sm font-medium text-foreground truncate">
                              {item.family_code} - {item.family_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.total_tasks} tâches ({percentage}%)
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="categories">
            <div className="rounded-lg border bg-card p-3 md:p-4">
              <h4 className="text-xs md:text-sm font-medium mb-2 md:mb-3 text-muted-foreground">
                Top 15 catégories par volume de tâches
              </h4>
              <ScrollArea className="h-96">
                <ResponsiveContainer width="100%" height={filteredCategoryStats.length * (window.innerWidth < 768 ? 40 : 50) + 50}>
                  <BarChart
                    layout="vertical"
                    data={filteredCategoryStats}
                    margin={{ top: 5, right: window.innerWidth < 768 ? 10 : 30, left: window.innerWidth < 768 ? 100 : 150, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-[10px] md:text-xs" />
                    <YAxis 
                      dataKey="category_name" 
                      type="category" 
                      width={window.innerWidth < 768 ? 100 : 150}
                      className="text-[10px] md:text-xs"
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border-2 border-primary/20 p-2 md:p-3 rounded-lg shadow-xl max-w-[250px]">
                              <p className="font-bold text-xs md:text-sm break-words mb-1">{data.category_name}</p>
                              <p className="text-xs text-muted-foreground">{data.family_name}</p>
                              <div className="mt-2 space-y-1 text-xs">
                                <p><strong>{data.total_tasks}</strong> tâches</p>
                                <p>{data.subcategories_count} sous-catégories</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="total_tasks" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="subcategories">
            <div className="rounded-lg border bg-card p-3 md:p-4">
              <h4 className="text-xs md:text-sm font-medium mb-2 md:mb-3 text-muted-foreground">
                Top 20 sous-catégories par nombre de tâches
              </h4>
              <ScrollArea className="h-96">
                <ResponsiveContainer width="100%" height={filteredSubcategoryStats.length * (window.innerWidth < 768 ? 40 : 50) + 50}>
                  <BarChart
                    layout="vertical"
                    data={filteredSubcategoryStats}
                    margin={{ top: 5, right: window.innerWidth < 768 ? 10 : 30, left: window.innerWidth < 768 ? 100 : 150, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-[10px] md:text-xs" />
                    <YAxis 
                      dataKey="subcategory_name" 
                      type="category" 
                      width={window.innerWidth < 768 ? 100 : 150}
                      className="text-[10px] md:text-xs"
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border-2 border-primary/20 p-2 md:p-3 rounded-lg shadow-xl max-w-[250px]">
                              <p className="font-bold text-xs md:text-sm break-words mb-1">{data.subcategory_name}</p>
                              <p className="text-xs text-muted-foreground">{data.category_name}</p>
                              <p className="text-xs text-muted-foreground">{data.family_name}</p>
                              <p className="mt-2 text-xs"><strong>{data.task_count}</strong> tâches</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="task_count" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};