import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Sparkles, 
  FileText,
  Star,
  ArrowRight
} from 'lucide-react';
import { useEdlTemplates, EdlTemplate } from '@/hooks/useEdlTemplates';
import { TemplateCard } from './TemplateCard';
import { cn } from '@/lib/utils';

interface TemplateSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: EdlTemplate) => void;
  recommendedTemplateId?: string;
  propertyType?: string;
}

export function TemplateSelectorDialog({ 
  open, 
  onOpenChange, 
  onSelect,
  recommendedTemplateId,
  propertyType
}: TemplateSelectorDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('recommended');

  const {
    templates,
    featuredTemplates,
    loading,
  } = useEdlTemplates();

  const filteredTemplates = templates.filter(t => {
    if (!searchQuery) return true;
    return t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           t.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const recommendedTemplate = recommendedTemplateId 
    ? templates.find(t => t.id === recommendedTemplateId)
    : null;

  // Auto-suggest based on property type
  const suggestedTemplates = propertyType
    ? templates.filter(t => t.property_type === propertyType)
    : featuredTemplates;

  const handleSelect = (template: EdlTemplate) => {
    onSelect(template);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-6 w-6 text-primary" />
            Créer un EDL depuis un modèle
          </DialogTitle>
          <DialogDescription>
            Gagnez 80% de temps en utilisant un modèle pré-configuré
          </DialogDescription>
        </DialogHeader>

        {/* AI Recommendation Banner */}
        {recommendedTemplate && (
          <div className="mx-6 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">IA recommande</span>
                  <Badge className="bg-primary">
                    Meilleur choix
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>{recommendedTemplate.name}</strong> — {recommendedTemplate.description}
                </p>
              </div>
              <Button onClick={() => handleSelect(recommendedTemplate)}>
                Utiliser
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un modèle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 pt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recommended" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Recommandés
            </TabsTrigger>
            <TabsTrigger value="featured" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Populaires
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Tous
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <ScrollArea className="h-[400px] px-6 py-4">
          <Tabs value={activeTab}>
            <TabsContent value="recommended" className="mt-0">
              {suggestedTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucune suggestion disponible</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestedTemplates.slice(0, 6).map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={handleSelect}
                      isRecommended={template.id === recommendedTemplateId}
                      compact
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="featured" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredTemplates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleSelect}
                    compact
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="all" className="mt-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={handleSelect}
                      compact
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 pt-4 border-t">
          <Button variant="ghost" onClick={handleSkip}>
            Créer sans modèle
          </Button>
          <p className="text-sm text-muted-foreground">
            {templates.length} modèles disponibles
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
