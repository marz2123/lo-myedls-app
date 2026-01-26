import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  Search, 
  Plus, 
  Star, 
  Building2,
  Home,
  Store,
  Filter,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useEdlTemplates, EdlTemplate } from '@/hooks/useEdlTemplates';
import { TemplateCard } from './TemplateCard';
import { TemplateEditorDialog } from './TemplateEditorDialog';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TemplateManagerPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<EdlTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EdlTemplate | null>(null);

  const {
    templates,
    myTemplates,
    featuredTemplates,
    loading,
    fetchTemplates,
    duplicateTemplate,
    deleteTemplate,
  } = useEdlTemplates();

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || t.template_type === filterType || t.property_type === filterType;
    const matchesCompany = filterCompany === 'all' || t.company === filterCompany;
    return matchesSearch && matchesType && matchesCompany;
  });

  const myhomeTemplates = filteredTemplates.filter(t => t.owner_type === 'myhome');
  const companyTemplates = filteredTemplates.filter(t => t.owner_type === 'company');
  const userTemplates = filteredTemplates.filter(t => t.owner_type === 'user');

  const handleSelect = (template: EdlTemplate) => {
    setSelectedTemplate(template);
    // In real app, this would navigate to EDL creation with template
    console.log('Selected template:', template);
  };

  const handleDuplicate = async (template: EdlTemplate) => {
    const newName = `${template.name} (copie)`;
    await duplicateTemplate(template.id, newName);
  };

  const handleEdit = (template: EdlTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDelete = async (template: EdlTemplate) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
      await deleteTemplate(template.id);
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const companies = [...new Set(templates.map(t => t.company).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <FileText className="h-7 w-7 text-primary" />
                Modèles d'EDL
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Créez des EDL en quelques secondes avec des modèles pré-configurés
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchTemplates()}
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                Actualiser
              </Button>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau modèle
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un modèle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="entree">Entrée</SelectItem>
              <SelectItem value="sortie">Sortie</SelectItem>
              <SelectItem value="technique">Technique</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="studio">Studio</SelectItem>
              <SelectItem value="t2">T2</SelectItem>
              <SelectItem value="t3">T3</SelectItem>
              <SelectItem value="t4">T4</SelectItem>
              <SelectItem value="maison">Maison</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-[180px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Société" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sociétés</SelectItem>
              {companies.map(company => (
                <SelectItem key={company} value={company!}>{company}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Featured Templates */}
        {featuredTemplates.length > 0 && activeTab === 'all' && !searchQuery && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-semibold">Modèles recommandés</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredTemplates.slice(0, 4).map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelect}
                  onDuplicate={handleDuplicate}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-lg grid-cols-4 bg-muted/50 mb-6">
            <TabsTrigger value="all" className="flex items-center gap-2">
              Tous
              <Badge variant="secondary" className="ml-1">{filteredTemplates.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="myhome" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              MyHome
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Sociétés
            </TabsTrigger>
            <TabsTrigger value="mine" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Mes modèles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-24 bg-muted" />
                    <CardContent className="p-4">
                      <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun modèle trouvé</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleSelect}
                    onDuplicate={handleDuplicate}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="myhome">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {myhomeTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelect}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="company">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {companyTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelect}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="mine">
            {userTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Vous n'avez pas encore de modèles personnalisés</p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer mon premier modèle
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {userTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleSelect}
                    onDuplicate={handleDuplicate}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Editor Dialog */}
      <TemplateEditorDialog
        open={showEditor}
        onOpenChange={setShowEditor}
        template={editingTemplate}
        onSave={() => {
          setShowEditor(false);
          fetchTemplates();
        }}
      />
    </div>
  );
}
