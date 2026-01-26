import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Save, X, Filter, Search, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

interface TaxonomyItem {
  id: string;
  code: string;
  name: string;
  family_code?: string;
  category_code?: string;
  subcategory_code?: string;
  family_name?: string;
  category_name?: string;
  subcategory_name?: string;
  description?: string;
}

export function TaxonomyEditor() {
  const [taxonomyType, setTaxonomyType] = useState<"families" | "categories" | "subcategories" | "tasks">("categories");
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TaxonomyItem | null>(null);
  const [newName, setNewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideGeneric, setHideGeneric] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const { t } = useLanguage();
  const isFrench = t('cancel') === 'Annuler';

  const isGenericName = (name: string): boolean => {
    return /^(Compléments?|Postes?)\s*\d+$/i.test(name.trim());
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      let data: TaxonomyItem[] = [];

      if (taxonomyType === "families") {
        const { data: familiesData, error } = await supabase
          .from('ft_familles')
          .select('*')
          .order('ft_code');
        if (error) throw error;
        data = (familiesData || []).map(f => ({
          id: f.id,
          code: f.ft_code,
          name: f.ft_label,
          description: f.ft_description
        }));
      } else if (taxonomyType === "categories") {
        const { data: categoriesData, error } = await supabase
          .from('ct_categories')
          .select('*, ft_familles(ft_label)')
          .order('ct_code');
        if (error) throw error;
        data = (categoriesData || []).map(c => ({
          id: c.id,
          code: c.ct_code,
          name: c.ct_label,
          family_code: c.ft_code,
          family_name: (c.ft_familles as any)?.ft_label
        }));
      } else if (taxonomyType === "subcategories") {
        const { data: subcategoriesData, error } = await supabase
          .from('sc_sous_categories')
          .select('*, ct_categories(ct_label, ft_familles(ft_label))')
          .order('sc_code');
        if (error) throw error;
        data = (subcategoriesData || []).map(s => ({
          id: s.id,
          code: s.sc_code,
          name: s.sc_label,
          category_code: s.ct_code,
          category_name: (s.ct_categories as any)?.ct_label,
          family_name: (s.ct_categories as any)?.ft_familles?.ft_label
        }));
      } else if (taxonomyType === "tasks") {
        const { data: tasksData, error } = await supabase
          .from('t_taches')
          .select('*, sc_sous_categories(sc_label, ct_categories(ct_label, ft_familles(ft_label)))')
          .order('t_code')
          .limit(500);
        if (error) throw error;
        data = (tasksData || []).map(t => ({
          id: t.id,
          code: t.t_code,
          name: t.t_label,
          description: t.description_detaillee,
          subcategory_code: t.sc_code,
          subcategory_name: (t.sc_sous_categories as any)?.sc_label,
          category_name: (t.sc_sous_categories as any)?.ct_categories?.ct_label,
          family_name: (t.sc_sous_categories as any)?.ct_categories?.ft_familles?.ft_label
        }));
      }

      setItems(data);
    } catch (error) {
      console.error('Error loading taxonomy items:', error);
      toast.error(isFrench ? 'Erreur de chargement' : 'Loading error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [taxonomyType]);

  const openEditDialog = (item: TaxonomyItem) => {
    setSelectedItem(item);
    setNewName(item.name);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedItem || !newName.trim()) {
      toast.error(isFrench ? 'Le nom ne peut pas être vide' : 'Name cannot be empty');
      return;
    }

    setSubmitting(true);
    try {
      const tableName = 
        taxonomyType === "families" ? 'ft_familles' :
        taxonomyType === "categories" ? 'ct_categories' :
        taxonomyType === "subcategories" ? 'sc_sous_categories' :
        't_taches';
      
      const fieldName = 
        taxonomyType === "families" ? 'ft_label' :
        taxonomyType === "categories" ? 'ct_label' :
        taxonomyType === "subcategories" ? 'sc_label' :
        't_label';

      const { error } = await supabase
        .from(tableName)
        .update({ [fieldName]: newName.trim() })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success(isFrench ? 'Nom mis à jour avec succès' : 'Name updated successfully');
      setEditDialogOpen(false);
      setSelectedItem(null);
      loadItems();
    } catch (error) {
      console.error('Error updating taxonomy item:', error);
      toast.error(isFrench ? 'Erreur de mise à jour' : 'Update error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items
    .filter(item => {
      if (hideGeneric && isGenericName(item.name)) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.code.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.family_name?.toLowerCase().includes(query) ||
        item.category_name?.toLowerCase().includes(query)
      );
    });

  const genericCount = items.filter(item => isGenericName(item.name)).length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="truncate">{isFrench ? 'Éditeur de taxonomie' : 'Taxonomy Editor'}</span>
              </CardTitle>
              <CardDescription className="mt-1">
                {isFrench 
                  ? 'Renommer les catégories et sous-catégories génériques'
                  : 'Rename generic categories and subcategories'}
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button onClick={loadItems} variant="outline" size="sm" disabled={loading} className="w-full sm:w-auto">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {isFrench ? 'Actualiser' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-xs mb-2 block">
                {isFrench ? 'Type de taxonomie' : 'Taxonomy Type'}
              </Label>
              <Select value={taxonomyType} onValueChange={(v: any) => setTaxonomyType(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="families">{isFrench ? 'Familles (FT)' : 'Families (FT)'}</SelectItem>
                  <SelectItem value="categories">{isFrench ? 'Catégories (CT)' : 'Categories (CT)'}</SelectItem>
                  <SelectItem value="subcategories">{isFrench ? 'Sous-catégories (SC)' : 'Subcategories (SC)'}</SelectItem>
                  <SelectItem value="tasks">{isFrench ? 'Tâches (T)' : 'Tasks (T)'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-0">
              <Label className="text-xs mb-2 block">
                {isFrench ? 'Rechercher' : 'Search'}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isFrench ? 'Rechercher par code ou nom...' : 'Search by code or name...'}
                  className="pl-9 w-full"
                />
              </div>
            </div>
          </div>

          {/* Hide Generic Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Label htmlFor="hide-generic" className="text-sm cursor-pointer flex-1">
                {isFrench ? 'Masquer les entrées génériques' : 'Hide generic entries'}
              </Label>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {genericCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {genericCount} {isFrench ? 'génériques' : 'generic'}
                </Badge>
              )}
              <Switch
                id="hide-generic"
                checked={hideGeneric}
                onCheckedChange={setHideGeneric}
              />
            </div>
          </div>

          {/* Results count */}
          <div className="text-xs text-muted-foreground">
            {isFrench 
              ? `${filteredItems.length} résultat${filteredItems.length > 1 ? 's' : ''} affiché${filteredItems.length > 1 ? 's' : ''}`
              : `${filteredItems.length} result${filteredItems.length > 1 ? 's' : ''} displayed`}
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">{isFrench ? 'Code' : 'Code'}</TableHead>
                    <TableHead className="min-w-[150px]">{isFrench ? 'Nom actuel' : 'Current Name'}</TableHead>
                    {taxonomyType === "categories" && (
                      <TableHead className="min-w-[120px]">{isFrench ? 'Famille' : 'Family'}</TableHead>
                    )}
                    {taxonomyType === "subcategories" && (
                      <>
                        <TableHead className="min-w-[120px]">{isFrench ? 'Catégorie' : 'Category'}</TableHead>
                        <TableHead className="min-w-[120px]">{isFrench ? 'Famille' : 'Family'}</TableHead>
                      </>
                    )}
                    {taxonomyType === "tasks" && (
                      <>
                        <TableHead className="min-w-[120px]">{isFrench ? 'Sous-cat.' : 'Subcat.'}</TableHead>
                        <TableHead className="min-w-[120px]">{isFrench ? 'Catégorie' : 'Category'}</TableHead>
                      </>
                    )}
                  <TableHead className="text-right">{isFrench ? 'Actions' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={taxonomyType === "families" ? 3 : taxonomyType === "tasks" ? 5 : taxonomyType === "categories" ? 4 : 5} className="text-center py-8 text-muted-foreground">
                      {isFrench ? 'Aucun résultat trouvé' : 'No results found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{item.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.name}
                          {isGenericName(item.name) && (
                            <Badge variant="secondary" className="text-xs">
                              {isFrench ? 'Générique' : 'Generic'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {taxonomyType === "categories" && (
                        <TableCell className="text-xs text-muted-foreground">{item.family_name}</TableCell>
                      )}
                      {taxonomyType === "subcategories" && (
                        <>
                          <TableCell className="text-xs text-muted-foreground">{item.category_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.family_name}</TableCell>
                        </>
                      )}
                      {taxonomyType === "tasks" && (
                        <>
                          <TableCell className="text-xs text-muted-foreground">{item.subcategory_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.category_name}</TableCell>
                        </>
                      )}
                      <TableCell className="text-right">
                        <Button
                          onClick={() => openEditDialog(item)}
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                        >
                          <Edit2 className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">{isFrench ? 'Éditer' : 'Edit'}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isFrench ? 'Modifier le nom' : 'Edit Name'}
            </DialogTitle>
            <DialogDescription>
              {isFrench 
                ? `Modifier le nom de ${selectedItem?.code}`
                : `Edit name for ${selectedItem?.code}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isFrench ? 'Code' : 'Code'}</Label>
              <Input value={selectedItem?.code || ''} disabled />
            </div>

            <div className="space-y-2">
              <Label>{isFrench ? 'Nom actuel' : 'Current Name'}</Label>
              <Input value={selectedItem?.name || ''} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-name">{isFrench ? 'Nouveau nom' : 'New Name'}</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={isFrench ? 'Entrer le nouveau nom...' : 'Enter new name...'}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setEditDialogOpen(false)}
              variant="outline"
              disabled={submitting}
            >
              <X className="w-4 h-4 mr-2" />
              {isFrench ? 'Annuler' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={submitting || !newName.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {submitting ? (isFrench ? 'Sauvegarde...' : 'Saving...') : (isFrench ? 'Sauvegarder' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}