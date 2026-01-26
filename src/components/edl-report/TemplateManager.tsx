import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Check,
  Loader2,
  Star,
  StarOff,
  Eye,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EDLTemplate {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  template_data: any;
  created_at: string;
  updated_at: string;
}

interface TemplateManagerProps {
  projectId?: string;
  onSelectTemplate?: (template: EDLTemplate) => void;
  currentTemplateId?: string | null;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  projectId,
  onSelectTemplate,
  currentTemplateId,
  currentReportContent
}) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EDLTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EDLTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EDLTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EDLTemplate | null>(null);
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_data: {} as any,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user templates and default templates
      const { data, error } = await supabase
        .from('edl_templates')
        .select('*')
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom du template est requis',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Use currentReportContent if provided, otherwise use formData.template_data
      const templateData = currentReportContent || formData.template_data || {};

      const { data, error } = await supabase
        .from('edl_templates')
        .insert({
          name: formData.name,
          description: formData.description || null,
          template_data: templateData,
          user_id: user.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: '✅ Template créé',
        description: 'Le template a été créé avec succès',
      });

      setFormData({ name: '', description: '', template_data: {} });
      await loadTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le template',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !formData.name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom du template est requis',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('edl_templates')
        .update({
          name: formData.name,
          description: formData.description || null,
          template_data: formData.template_data || {},
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      toast({
        title: '✅ Template mis à jour',
        description: 'Le template a été modifié avec succès',
      });

      setEditingTemplate(null);
      setFormData({ name: '', description: '', template_data: {} });
      await loadTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le template',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      const { error } = await supabase
        .from('edl_templates')
        .delete()
        .eq('id', templateToDelete.id);

      if (error) throw error;

      toast({
        title: '✅ Template supprimé',
        description: 'Le template a été supprimé avec succès',
      });

      setTemplateToDelete(null);
      setDeleteDialogOpen(false);
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le template',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateTemplate = async (template: EDLTemplate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('edl_templates')
        .insert({
          name: `${template.name} (Copie)`,
          description: template.description,
          template_data: template.template_data,
          user_id: user.id,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: '✅ Template dupliqué',
        description: 'Le template a été dupliqué avec succès',
      });

      await loadTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de dupliquer le template',
        variant: 'destructive',
      });
    }
  };

  const handleApplyTemplate = async (template: EDLTemplate) => {
    if (!projectId) {
      onSelectTemplate?.(template);
      return;
    }

    try {
      const { error } = await supabase
        .from('edl_projects')
        .update({
          last_used_template_id: template.id,
          template_data: template.template_data,
        })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: '✅ Template appliqué',
        description: `Le template "${template.name}" a été appliqué au projet`,
      });

      onSelectTemplate?.(template);
    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'appliquer le template',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (template: EDLTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      template_data: template.template_data || {},
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Templates de rapport</h3>
          <p className="text-sm text-muted-foreground">
            Gérez vos templates personnalisés pour les rapports EDL
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Modifier le template' : 'Créer un nouveau template'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom du template *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Template standard EDL"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description du template..."
                  rows={3}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Le contenu du template sera sauvegardé depuis le rapport actuel lors de la création.
              </p>
            </div>
            <DialogFooter>
              {editingTemplate && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingTemplate(null);
                    setFormData({ name: '', description: '', template_data: {} });
                  }}
                >
                  Annuler
                </Button>
              )}
              <Button
                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                disabled={creating || !formData.name.trim()}
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                {editingTemplate ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">Aucun template disponible</p>
          <p className="text-xs text-muted-foreground mt-1">
            Créez votre premier template pour commencer
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={cn(
                "p-4 transition-all hover:shadow-md",
                currentTemplateId === template.id && "ring-2 ring-primary"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold truncate">{template.name}</h4>
                    {template.is_default && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="w-3 h-3" />
                        Par défaut
                      </Badge>
                    )}
                    {currentTemplateId === template.id && (
                      <Badge variant="default" className="gap-1">
                        <Check className="w-3 h-3" />
                        Actif
                      </Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Créé le {new Date(template.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewTemplate(template)}
                    title="Prévisualiser"
                    className="h-8 w-8"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {!template.is_default && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleApplyTemplate(template)}
                        title="Appliquer"
                        className="h-8 w-8"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicateTemplate(template)}
                        title="Dupliquer"
                        className="h-8 w-8"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(template)}
                        title="Modifier"
                        className="h-8 w-8"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setTemplateToDelete(template);
                          setDeleteDialogOpen(true);
                        }}
                        title="Supprimer"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le template ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer le template "{templateToDelete?.name}" ? 
            Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Prévisualisation : {previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewTemplate && (
              <TemplatePreviewContent template={previewTemplate} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Fermer
            </Button>
            {previewTemplate && (
              <Button onClick={() => {
                handleApplyTemplate(previewTemplate);
                setPreviewTemplate(null);
              }}>
                <Check className="w-4 h-4 mr-2" />
                Appliquer ce template
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Composant de prévisualisation du template
const TemplatePreviewContent: React.FC<{ template: EDLTemplate }> = ({ template }) => {
  const templateData = template.template_data || {};
  
  return (
    <div className="space-y-6 p-4 bg-muted/30 rounded-lg">
      {/* Cover Preview */}
      {templateData.cover && (
        <div className="border rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold mb-2">Page de garde</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Titre:</strong> {templateData.cover.title || '(Non défini)'}</p>
            <p><strong>Client:</strong> {templateData.cover.client || '(Non défini)'}</p>
            <p><strong>Date:</strong> {templateData.cover.date || '(Non défini)'}</p>
            <p><strong>Auteur:</strong> {templateData.cover.author || '(Non défini)'}</p>
          </div>
        </div>
      )}

      {/* Building Description Preview */}
      {templateData.buildingDescription && (
        <div className="border rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold mb-2">Description du bâtiment</h3>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {templateData.buildingDescription.description || '(Aucune description)'}
          </p>
        </div>
      )}

      {/* Family Works Preview */}
      {templateData.familyWorks && Array.isArray(templateData.familyWorks) && templateData.familyWorks.length > 0 && (
        <div className="border rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold mb-4">Travaux par famille ({templateData.familyWorks.length})</h3>
          <div className="space-y-2">
            {templateData.familyWorks.slice(0, 5).map((work: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="font-mono">{work.code || '—'}</Badge>
                <span>{work.name || '(Sans nom)'}</span>
              </div>
            ))}
            {templateData.familyWorks.length > 5 && (
              <p className="text-xs text-muted-foreground">
                + {templateData.familyWorks.length - 5} autre(s) famille(s)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Locations Preview */}
      {templateData.locations && Array.isArray(templateData.locations) && templateData.locations.length > 0 && (
        <div className="border rounded-lg p-6 bg-white">
          <h3 className="text-lg font-bold mb-4">Lieux ({templateData.locations.length})</h3>
          <div className="space-y-2">
            {templateData.locations.slice(0, 5).map((loc: any, idx: number) => (
              <div key={idx} className="text-sm">
                <strong>{loc.name || '(Sans nom)'}</strong>
                {loc.type && <span className="text-muted-foreground ml-2">({loc.type})</span>}
              </div>
            ))}
            {templateData.locations.length > 5 && (
              <p className="text-xs text-muted-foreground">
                + {templateData.locations.length - 5} autre(s) lieu(x)
              </p>
            )}
          </div>
        </div>
      )}

      {!templateData.cover && !templateData.buildingDescription && 
       (!templateData.familyWorks || templateData.familyWorks.length === 0) &&
       (!templateData.locations || templateData.locations.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-sm">Template vide</p>
          <p className="text-xs mt-1">Ce template ne contient pas encore de données</p>
        </div>
      )}
    </div>
  );
};

