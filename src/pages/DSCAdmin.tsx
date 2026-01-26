import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Edit, Search, ArrowUpDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ClassificationReviewPanel } from "@/components/admin/ClassificationReviewPanel";

interface ClassificationStats {
  total_classifications: number;
  family_exact_matches: number;
  family_fuzzy_matches: number;
  family_fallback_matches: number;
  family_no_matches: number;
  category_exact_matches: number;
  category_fuzzy_matches: number;
  category_fallback_matches: number;
  category_no_matches: number;
  subcategory_exact_matches: number;
  subcategory_fuzzy_matches: number;
  subcategory_fallback_matches: number;
  subcategory_no_matches: number;
  pending_reviews: number;
  total_reviewed: number;
  family_success_rate: number;
  category_success_rate: number;
  subcategory_success_rate: number;
}

interface FamilyStats {
  family_id: string;
  family_code: string;
  family_name: string;
  total_classifications: number;
  exact_matches: number;
  fuzzy_matches: number;
  fallback_matches: number;
  no_matches: number;
  success_rate: number;
  pending_reviews: number;
}

interface CategoryStats {
  category_id: string;
  category_code: string;
  category_name: string;
  family_code: string;
  family_name: string;
  total_classifications: number;
  exact_matches: number;
  fuzzy_matches: number;
  fallback_matches: number;
  no_matches: number;
  success_rate: number;
  pending_reviews: number;
}

interface SubcategoryStats {
  subcategory_id: string;
  subcategory_code: string;
  subcategory_name: string;
  category_code: string;
  category_name: string;
  family_code: string;
  family_name: string;
  total_classifications: number;
  exact_matches: number;
  fuzzy_matches: number;
  fallback_matches: number;
  no_matches: number;
  success_rate: number;
  pending_reviews: number;
}

interface ClassificationLog {
  id: string;
  created_at: string;
  task_id: string;
  task_title: string;
  ai_family_code: string;
  ai_category_code: string;
  ai_subcategory_code: string;
  family_match_type: string;
  category_match_type: string;
  subcategory_match_type: string;
  needs_review: boolean;
  reviewed: boolean;
  warnings: string[];
  matched_family_id: string;
  matched_category_id: string;
  matched_subcategory_id: string;
}

interface TaxonomyFamily {
  id: string;
  code: string;
  name: string;
}

interface TaxonomyCategory {
  id: string;
  code: string;
  name: string;
  family_id: string;
}

interface TaxonomySubcategory {
  id: string;
  code: string;
  name: string;
  category_id: string;
}

const DSCAdmin = () => {
  const [stats, setStats] = useState<ClassificationStats | null>(null);
  const [familyStats, setFamilyStats] = useState<FamilyStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [subcategoryStats, setSubcategoryStats] = useState<SubcategoryStats[]>([]);
  const [logs, setLogs] = useState<ClassificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [reclassifyDialogOpen, setReclassifyDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ClassificationLog | null>(null);
  const [families, setFamilies] = useState<TaxonomyFamily[]>([]);
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonomySubcategory[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [familySearchQuery, setFamilySearchQuery] = useState<string>("");
  const [familySortBy, setFamilySortBy] = useState<"volume" | "rate">("volume");
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>("");
  const [categorySortBy, setCategorySortBy] = useState<"volume" | "rate">("volume");
  const [subcategorySearchQuery, setSubcategorySearchQuery] = useState<string>("");
  const [subcategorySortBy, setSubcategorySortBy] = useState<"volume" | "rate">("volume");
  const navigate = useNavigate();
  const { t } = useLanguage();

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return false;
    }

    const { data: hasAdminRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      toast.error(t('cancel') === 'Annuler' ? 'Accès refusé' : 'Access denied');
      navigate("/");
      return false;
    }

    return true;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load stats from view
      const { data: statsData, error: statsError } = await supabase
        .from('dsc_classification_stats')
        .select('*')
        .single();

      if (statsError) throw statsError;
      setStats(statsData);

      // Load family stats
      const { data: familyStatsData, error: familyStatsError } = await supabase
        .from('dsc_family_stats')
        .select('*');

      if (familyStatsError) throw familyStatsError;
      setFamilyStats(familyStatsData || []);

      // Load category stats
      const { data: categoryStatsData, error: categoryStatsError } = await supabase
        .from('dsc_category_stats')
        .select('*');

      if (categoryStatsError) throw categoryStatsError;
      setCategoryStats(categoryStatsData || []);

      // Load subcategory stats
      const { data: subcategoryStatsData, error: subcategoryStatsError } = await supabase
        .from('dsc_subcategory_stats')
        .select('*');

      if (subcategoryStatsError) throw subcategoryStatsError;
      setSubcategoryStats(subcategoryStatsData || []);

      // Load recent logs needing review
      const { data: logsData, error: logsError } = await supabase
        .from('dsc_classification_logs')
        .select('*')
        .eq('needs_review', true)
        .eq('reviewed', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) throw logsError;
      setLogs(logsData || []);

      // Load taxonomy data
      const [familiesRes, categoriesRes, subcategoriesRes] = await Promise.all([
        supabase.from('task_families').select('*').order('name'),
        supabase.from('task_categories').select('*').order('name'),
        supabase.from('task_subcategories').select('*').order('name')
      ]);

      if (familiesRes.data) setFamilies(familiesRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (subcategoriesRes.data) setSubcategories(subcategoriesRes.data);
    } catch (error) {
      console.error('Error loading DSC admin data:', error);
      toast.error(t('cancel') === 'Annuler' ? 'Erreur de chargement' : 'Loading error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminAccess().then(hasAccess => {
      if (hasAccess) {
        loadData();
      }
    });
  }, []);

  const openReclassifyDialog = (log: ClassificationLog) => {
    setSelectedLog(log);
    setSelectedFamilyId(log.matched_family_id || "");
    setSelectedCategoryId(log.matched_category_id || "");
    setSelectedSubcategoryId(log.matched_subcategory_id || "");
    setReclassifyDialogOpen(true);
  };

  const handleReclassify = async () => {
    if (!selectedLog || !selectedFamilyId || !selectedCategoryId || !selectedSubcategoryId) {
      toast.error(t('cancel') === 'Annuler' ? 'Veuillez sélectionner tous les champs' : 'Please select all fields');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // Update task with new classifications
      const { error: taskError } = await supabase
        .from('extracted_tasks')
        .update({
          family_id: selectedFamilyId,
          category_id: selectedCategoryId,
          subcategory_id: selectedSubcategoryId
        })
        .eq('id', selectedLog.task_id);

      if (taskError) throw taskError;

      // Mark log as reviewed
      const { error: logError } = await supabase
        .from('dsc_classification_logs')
        .update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          matched_family_id: selectedFamilyId,
          matched_category_id: selectedCategoryId,
          matched_subcategory_id: selectedSubcategoryId
        })
        .eq('id', selectedLog.id);

      if (logError) throw logError;

      toast.success(t('cancel') === 'Annuler' ? 'Classification mise à jour' : 'Classification updated');
      setReclassifyDialogOpen(false);
      setSelectedLog(null);
      loadData();
    } catch (error) {
      console.error('Error reclassifying task:', error);
      toast.error(t('cancel') === 'Annuler' ? 'Erreur de mise à jour' : 'Update error');
    } finally {
      setSubmitting(false);
    }
  };

  const getMatchTypeBadge = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Exact</Badge>;
      case 'fuzzy':
        return <Badge variant="secondary"><TrendingUp className="w-3 h-3 mr-1" />Fuzzy</Badge>;
      case 'fallback':
        return <Badge variant="outline" className="border-orange-500 text-orange-500"><AlertTriangle className="w-3 h-3 mr-1" />Fallback</Badge>;
      case 'none':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />None</Badge>;
      default:
        return <Badge variant="outline">{matchType}</Badge>;
    }
  };

  const filteredAndSortedFamilyStats = familyStats
    .filter(family => {
      if (!familySearchQuery) return true;
      const query = familySearchQuery.toLowerCase();
      return (
        family.family_code.toLowerCase().includes(query) ||
        family.family_name.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (familySortBy === "volume") {
        return b.total_classifications - a.total_classifications;
      } else {
        return b.success_rate - a.success_rate;
      }
    });

  const filteredAndSortedCategoryStats = categoryStats
    .filter(category => {
      if (!categorySearchQuery) return true;
      const query = categorySearchQuery.toLowerCase();
      return (
        category.category_code.toLowerCase().includes(query) ||
        category.category_name.toLowerCase().includes(query) ||
        category.family_name.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (categorySortBy === "volume") {
        return b.total_classifications - a.total_classifications;
      } else {
        return b.success_rate - a.success_rate;
      }
    });

  const filteredAndSortedSubcategoryStats = subcategoryStats
    .filter(subcategory => {
      if (!subcategorySearchQuery) return true;
      const query = subcategorySearchQuery.toLowerCase();
      return (
        subcategory.subcategory_code.toLowerCase().includes(query) ||
        subcategory.subcategory_name.toLowerCase().includes(query) ||
        subcategory.category_name.toLowerCase().includes(query) ||
        subcategory.family_name.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (subcategorySortBy === "volume") {
        return b.total_classifications - a.total_classifications;
      } else {
        return b.success_rate - a.success_rate;
      }
    });

  const filteredCategories = categories.filter(c => c.family_id === selectedFamilyId);
  const filteredSubcategories = subcategories.filter(s => s.category_id === selectedCategoryId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 sm:pt-24 pb-8 sm:pb-12 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 sm:pt-24 pb-8 sm:pb-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {t('cancel') === 'Annuler' ? 'Administration DSC' : 'DSC Administration'}
                </h1>
                <p className="text-muted-foreground">
                  {t('cancel') === 'Annuler' 
                    ? 'Statistiques de classification et qualité des correspondances'
                    : 'Classification statistics and match quality'}
                </p>
              </div>
            </div>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('cancel') === 'Annuler' ? 'Actualiser' : 'Refresh'}
            </Button>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('cancel') === 'Annuler' ? 'Total Classifications' : 'Total Classifications'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stats.total_classifications}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('cancel') === 'Annuler' ? 'Taux Famille' : 'Family Rate'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stats.family_success_rate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.family_exact_matches} exact, {stats.family_fuzzy_matches} fuzzy
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('cancel') === 'Annuler' ? 'Taux Catégorie' : 'Category Rate'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stats.category_success_rate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.category_exact_matches} exact, {stats.category_fuzzy_matches} fuzzy
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('cancel') === 'Annuler' ? 'Taux Sous-catégorie' : 'Subcategory Rate'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stats.subcategory_success_rate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.subcategory_exact_matches} exact, {stats.subcategory_fuzzy_matches} fuzzy
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Classification Review Panel - Tasks needing review */}
          <ClassificationReviewPanel />

          {/* Family Statistics Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                {t('cancel') === 'Annuler' ? 'Statistiques détaillées par famille DSC' : 'Detailed DSC Family Statistics'}
              </CardTitle>
              <CardDescription>
                {t('cancel') === 'Annuler'
                  ? 'Codes les plus utilisés et taux de réussite par famille'
                  : 'Most used codes and success rates by family'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('cancel') === 'Annuler' ? 'Rechercher par code ou nom...' : 'Search by code or name...'}
                    value={familySearchQuery}
                    onChange={(e) => setFamilySearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={familySortBy === "volume" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFamilySortBy("volume")}
                  >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    {t('cancel') === 'Annuler' ? 'Volume' : 'Volume'}
                  </Button>
                  <Button
                    variant={familySortBy === "rate" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFamilySortBy("rate")}
                  >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    {t('cancel') === 'Annuler' ? 'Taux' : 'Rate'}
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Code' : 'Code'}</TableHead>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Famille' : 'Family'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Total' : 'Total'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Exact' : 'Exact'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Fuzzy' : 'Fuzzy'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Fallback' : 'Fallback'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Taux' : 'Rate'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'À réviser' : 'Review'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedFamilyStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {familySearchQuery 
                            ? (t('cancel') === 'Annuler' ? 'Aucun résultat trouvé' : 'No results found')
                            : (t('cancel') === 'Annuler' ? 'Aucune donnée disponible' : 'No data available')
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedFamilyStats.map((family) => (
                        <TableRow key={family.family_id}>
                          <TableCell className="font-mono font-medium">{family.family_code}</TableCell>
                          <TableCell className="max-w-xs truncate">{family.family_name}</TableCell>
                          <TableCell className="text-right font-medium">{family.total_classifications}</TableCell>
                          <TableCell className="text-right text-green-600">{family.exact_matches}</TableCell>
                          <TableCell className="text-right text-blue-600">{family.fuzzy_matches}</TableCell>
                          <TableCell className="text-right text-orange-600">{family.fallback_matches}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={family.success_rate >= 80 ? "default" : family.success_rate >= 60 ? "secondary" : "destructive"}>
                              {family.success_rate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {family.pending_reviews > 0 && (
                              <Badge variant="outline" className="border-orange-500 text-orange-500">
                                {family.pending_reviews}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Category Statistics Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                {t('cancel') === 'Annuler' ? 'Statistiques détaillées par catégorie DSC' : 'Detailed DSC Category Statistics'}
              </CardTitle>
              <CardDescription>
                {t('cancel') === 'Annuler'
                  ? 'Codes les plus utilisés et taux de réussite par catégorie'
                  : 'Most used codes and success rates by category'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('cancel') === 'Annuler' ? 'Rechercher par code ou nom...' : 'Search by code or name...'}
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={categorySortBy === "volume" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategorySortBy("volume")}
                  >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    {t('cancel') === 'Annuler' ? 'Volume' : 'Volume'}
                  </Button>
                  <Button
                    variant={categorySortBy === "rate" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategorySortBy("rate")}
                  >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    {t('cancel') === 'Annuler' ? 'Taux' : 'Rate'}
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Code' : 'Code'}</TableHead>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Catégorie' : 'Category'}</TableHead>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Famille' : 'Family'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Total' : 'Total'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Exact' : 'Exact'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Fuzzy' : 'Fuzzy'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Fallback' : 'Fallback'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Taux' : 'Rate'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'À réviser' : 'Review'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedCategoryStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          {categorySearchQuery 
                            ? (t('cancel') === 'Annuler' ? 'Aucun résultat trouvé' : 'No results found')
                            : (t('cancel') === 'Annuler' ? 'Aucune donnée disponible' : 'No data available')
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedCategoryStats.map((category) => (
                        <TableRow key={category.category_id}>
                          <TableCell className="font-mono font-medium">{category.category_code}</TableCell>
                          <TableCell className="max-w-xs truncate">{category.category_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{category.family_code} - {category.family_name}</TableCell>
                          <TableCell className="text-right font-medium">{category.total_classifications}</TableCell>
                          <TableCell className="text-right text-green-600">{category.exact_matches}</TableCell>
                          <TableCell className="text-right text-blue-600">{category.fuzzy_matches}</TableCell>
                          <TableCell className="text-right text-orange-600">{category.fallback_matches}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={category.success_rate >= 80 ? "default" : category.success_rate >= 60 ? "secondary" : "destructive"}>
                              {category.success_rate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {category.pending_reviews > 0 && (
                              <Badge variant="outline" className="border-orange-500 text-orange-500">
                                {category.pending_reviews}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Subcategory Statistics Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                {t('cancel') === 'Annuler' ? 'Statistiques détaillées par sous-catégorie DSC' : 'Detailed DSC Subcategory Statistics'}
              </CardTitle>
              <CardDescription>
                {t('cancel') === 'Annuler'
                  ? 'Codes les plus utilisés et taux de réussite par sous-catégorie'
                  : 'Most used codes and success rates by subcategory'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('cancel') === 'Annuler' ? 'Rechercher par code ou nom...' : 'Search by code or name...'}
                    value={subcategorySearchQuery}
                    onChange={(e) => setSubcategorySearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={subcategorySortBy === "volume" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSubcategorySortBy("volume")}
                  >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    {t('cancel') === 'Annuler' ? 'Volume' : 'Volume'}
                  </Button>
                  <Button
                    variant={subcategorySortBy === "rate" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSubcategorySortBy("rate")}
                  >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    {t('cancel') === 'Annuler' ? 'Taux' : 'Rate'}
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Code' : 'Code'}</TableHead>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Sous-catégorie' : 'Subcategory'}</TableHead>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Catégorie' : 'Category'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Total' : 'Total'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Exact' : 'Exact'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Fuzzy' : 'Fuzzy'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Fallback' : 'Fallback'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'Taux' : 'Rate'}</TableHead>
                      <TableHead className="text-right">{t('cancel') === 'Annuler' ? 'À réviser' : 'Review'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedSubcategoryStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          {subcategorySearchQuery 
                            ? (t('cancel') === 'Annuler' ? 'Aucun résultat trouvé' : 'No results found')
                            : (t('cancel') === 'Annuler' ? 'Aucune donnée disponible' : 'No data available')
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedSubcategoryStats.map((subcategory) => (
                        <TableRow key={subcategory.subcategory_id}>
                          <TableCell className="font-mono font-medium">{subcategory.subcategory_code}</TableCell>
                          <TableCell className="max-w-xs truncate">{subcategory.subcategory_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {subcategory.category_code} - {subcategory.category_name}
                            <div className="text-xs">{subcategory.family_code} - {subcategory.family_name}</div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{subcategory.total_classifications}</TableCell>
                          <TableCell className="text-right text-green-600">{subcategory.exact_matches}</TableCell>
                          <TableCell className="text-right text-blue-600">{subcategory.fuzzy_matches}</TableCell>
                          <TableCell className="text-right text-orange-600">{subcategory.fallback_matches}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={subcategory.success_rate >= 80 ? "default" : subcategory.success_rate >= 60 ? "secondary" : "destructive"}>
                              {subcategory.success_rate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {subcategory.pending_reviews > 0 && (
                              <Badge variant="outline" className="border-orange-500 text-orange-500">
                                {subcategory.pending_reviews}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pending Reviews Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                {t('cancel') === 'Annuler' ? 'Classifications nécessitant une révision' : 'Classifications Needing Review'}
              </CardTitle>
              <CardDescription>
                {t('cancel') === 'Annuler'
                  ? `${logs.length} classification(s) avec correspondances approximatives`
                  : `${logs.length} classification(s) with fuzzy or fallback matches`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Tâche' : 'Task'}</TableHead>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Codes IA' : 'AI Codes'}</TableHead>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Famille' : 'Family'}</TableHead>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Catégorie' : 'Category'}</TableHead>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Sous-cat.' : 'Subcat.'}</TableHead>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Avertissements' : 'Warnings'}</TableHead>
                      <TableHead>{t('cancel') === 'Annuler' ? 'Actions' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {t('cancel') === 'Annuler' ? 'Aucune révision en attente' : 'No pending reviews'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium max-w-xs truncate">
                            {log.task_title}
                          </TableCell>
                          <TableCell className="text-xs space-y-1">
                            <div>F: {log.ai_family_code}</div>
                            <div>C: {log.ai_category_code}</div>
                            <div>S: {log.ai_subcategory_code}</div>
                          </TableCell>
                          <TableCell>{getMatchTypeBadge(log.family_match_type)}</TableCell>
                          <TableCell>{getMatchTypeBadge(log.category_match_type)}</TableCell>
                          <TableCell>{getMatchTypeBadge(log.subcategory_match_type)}</TableCell>
                          <TableCell className="max-w-xs">
                            {log.warnings && log.warnings.length > 0 && (
                              <div className="text-xs text-muted-foreground space-y-1">
                                {log.warnings.map((warning, idx) => (
                                  <div key={idx}>{warning}</div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReclassifyDialog(log)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              {t('cancel') === 'Annuler' ? 'Réviser' : 'Review'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Reclassification Dialog */}
      <Dialog open={reclassifyDialogOpen} onOpenChange={setReclassifyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t('cancel') === 'Annuler' ? 'Réviser la classification DSC' : 'Review DSC Classification'}
            </DialogTitle>
            <DialogDescription>
              {selectedLog?.task_title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('cancel') === 'Annuler' ? 'Famille' : 'Family'}</Label>
              <Select value={selectedFamilyId} onValueChange={(value) => {
                setSelectedFamilyId(value);
                setSelectedCategoryId("");
                setSelectedSubcategoryId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('cancel') === 'Annuler' ? 'Sélectionner une famille' : 'Select a family'} />
                </SelectTrigger>
                <SelectContent>
                  {families.map((family) => (
                    <SelectItem key={family.id} value={family.id}>
                      {family.code} - {family.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('cancel') === 'Annuler' ? 'Catégorie' : 'Category'}</Label>
              <Select 
                value={selectedCategoryId} 
                onValueChange={(value) => {
                  setSelectedCategoryId(value);
                  setSelectedSubcategoryId("");
                }}
                disabled={!selectedFamilyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('cancel') === 'Annuler' ? 'Sélectionner une catégorie' : 'Select a category'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.code} - {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('cancel') === 'Annuler' ? 'Sous-catégorie' : 'Subcategory'}</Label>
              <Select 
                value={selectedSubcategoryId} 
                onValueChange={setSelectedSubcategoryId}
                disabled={!selectedCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('cancel') === 'Annuler' ? 'Sélectionner une sous-catégorie' : 'Select a subcategory'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.code} - {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReclassifyDialogOpen(false)}>
              {t('cancel') === 'Annuler' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button onClick={handleReclassify} disabled={submitting}>
              {submitting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {t('cancel') === 'Annuler' ? 'Sauvegarder' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DSCAdmin;
