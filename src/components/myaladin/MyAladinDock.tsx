import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Sparkles,
  FileText,
  ListChecks,
  AlertTriangle,
  Send,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  Brain,
  Camera,
  ClipboardCheck,
  FileCheck,
  Search,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MyAladinDockProps {
  projectId?: string;
  context?: 'project' | 'reportage' | 'tasks' | 'report';
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  action: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Context-specific suggestions
const CONTEXT_SUGGESTIONS: Record<string, string[]> = {
  project: [
    "Où en est ce projet ?",
    "Quelles tâches sont prioritaires ?",
    "Résume l'état actuel",
    "Y a-t-il des risques ?",
  ],
  reportage: [
    "Résumer le reportage",
    "Lister les anomalies importantes",
    "Proposer des tâches manquantes",
    "Préparer une section EDL",
  ],
  tasks: [
    "Quelles tâches semblent manquer ?",
    "Quelles sont les urgences ?",
    "Tâches par ordre de priorité",
    "Vérifier les classifications DSC",
  ],
  report: [
    "Relire et proposer des corrections",
    "Vérifier cohérence rapport ↔ tâches",
    "Compléter les sections vides",
    "Générer le PDF final",
  ],
};

export const MyAladinDock: React.FC<MyAladinDockProps> = ({ 
  projectId,
  context = 'project'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Context-aware quick actions
  const quickActions: QuickAction[] = useMemo(() => {
    const baseActions: QuickAction[] = [
      {
        id: 'summarize',
        label: 'Résumer l\'EDL',
        icon: FileText,
        description: 'Génère un résumé de l\'état actuel',
        action: () => handleQuickAction('summarize'),
      },
      {
        id: 'missing-tasks',
        label: 'Tâches manquantes',
        icon: ListChecks,
        description: 'Détecte les tâches non créées',
        action: () => handleQuickAction('missing-tasks'),
      },
    ];

    // Context-specific actions
    switch (context) {
      case 'reportage':
        return [
          ...baseActions,
          {
            id: 'analyze-reportage',
            label: 'Analyser séquences',
            icon: Camera,
            description: 'Analyse IA des séquences vidéo',
            action: () => handleQuickAction('analyze-reportage'),
          },
          {
            id: 'generate-edl-section',
            label: 'Préparer section EDL',
            icon: FileCheck,
            description: 'Génère une section de rapport',
            action: () => handleQuickAction('generate-edl-section'),
          },
        ];
      case 'tasks':
        return [
          ...baseActions,
          {
            id: 'find-urgencies',
            label: 'Urgences',
            icon: AlertTriangle,
            description: 'Identifie les tâches urgentes',
            action: () => handleQuickAction('find-urgencies'),
          },
          {
            id: 'check-classifications',
            label: 'Vérifier DSC',
            icon: ClipboardCheck,
            description: 'Vérifie les classifications',
            action: () => handleQuickAction('check-classifications'),
          },
        ];
      case 'report':
        return [
          ...baseActions,
          {
            id: 'review-report',
            label: 'Relire rapport',
            icon: Search,
            description: 'Propose des corrections',
            action: () => handleQuickAction('review-report'),
          },
          {
            id: 'check-coherence',
            label: 'Vérifier cohérence',
            icon: Lightbulb,
            description: 'Vérifie rapport ↔ tâches ↔ médias',
            action: () => handleQuickAction('check-coherence'),
          },
        ];
      default:
        return [
          ...baseActions,
          {
            id: 'generate-report',
            label: 'Générer rapport',
            icon: FileText,
            description: 'Prépare le rapport EDL',
            action: () => handleQuickAction('generate-report'),
          },
          {
            id: 'analyze',
            label: 'Analyser projet',
            icon: Brain,
            description: 'Analyse IA complète',
            action: () => handleQuickAction('analyze'),
          },
        ];
    }
  }, [context]);

  const suggestions = CONTEXT_SUGGESTIONS[context] || CONTEXT_SUGGESTIONS.project;

  const handleQuickAction = async (actionId: string) => {
    if (!projectId) {
      toast.error('Aucun projet sélectionné');
      return;
    }

    setIsProcessing(actionId);
    
    try {
      let response;
      let actionDescription = '';
      
      switch (actionId) {
        case 'summarize':
          actionDescription = 'Résumé de l\'EDL';
          response = await supabase.functions.invoke('myaladin-orchestrator', {
            body: { action: 'summarize', projectId, context: 'edl' }
          });
          break;
          
        case 'missing-tasks':
          actionDescription = 'Détection des tâches manquantes';
          response = await supabase.functions.invoke('detect-missing-tasks', {
            body: { projectId }
          });
          break;
          
        case 'generate-report':
          actionDescription = 'Préparation du rapport';
          response = await supabase.functions.invoke('generate-edl-pdf', {
            body: { projectId, prepare: true }
          });
          break;
          
        case 'analyze':
        case 'analyze-reportage':
          actionDescription = 'Analyse IA du reportage';
          response = await supabase.functions.invoke('ai-unified-analysis', {
            body: { projectId, type: context === 'reportage' ? 'sequences' : 'full' }
          });
          break;

        case 'generate-edl-section':
          actionDescription = 'Génération section EDL';
          response = await supabase.functions.invoke('myaladin-chat', {
            body: { 
              message: 'Génère une section de rapport EDL structurée à partir du reportage',
              context_type: 'reportage',
              context_data: { projectId }
            }
          });
          break;

        case 'find-urgencies':
          actionDescription = 'Recherche des urgences';
          response = await supabase.functions.invoke('myaladin-chat', {
            body: { 
              message: 'Liste les tâches urgentes et critiques par ordre de priorité',
              context_type: 'tasks',
              context_data: { projectId }
            }
          });
          break;

        case 'check-classifications':
          actionDescription = 'Vérification des classifications DSC';
          response = await supabase.functions.invoke('myaladin-chat', {
            body: { 
              message: 'Vérifie les classifications DSC (FT/CT/ST) des tâches et signale les incohérences',
              context_type: 'tasks',
              context_data: { projectId }
            }
          });
          break;

        case 'review-report':
          actionDescription = 'Relecture du rapport';
          response = await supabase.functions.invoke('myaladin-chat', {
            body: { 
              message: 'Relis le rapport EDL et propose des corrections et améliorations',
              context_type: 'report',
              context_data: { projectId }
            }
          });
          break;

        case 'check-coherence':
          actionDescription = 'Vérification de cohérence';
          response = await supabase.functions.invoke('myaladin-chat', {
            body: { 
              message: 'Vérifie la cohérence entre le rapport, les tâches et les médias du reportage',
              context_type: 'report',
              context_data: { projectId }
            }
          });
          break;
      }

      if (response?.error) throw response.error;

      const resultMessage = response?.data?.response || response?.data?.message || `${actionDescription} terminé avec succès`;
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: resultMessage,
        timestamp: new Date()
      }]);

      toast.success(`${actionDescription} terminé`);
      
    } catch (error) {
      console.error('Quick action error:', error);
      toast.error('Erreur lors de l\'action IA');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSendMessage = useCallback(async (message?: string) => {
    const text = message || inputValue.trim();
    if (!text) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('myaladin-chat', {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          context: { projectId, type: context }
        }
      });

      if (response.error) throw response.error;

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.data?.response || 'Je n\'ai pas pu traiter votre demande.',
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Désolé, une erreur s\'est produite. Veuillez réessayer.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, messages, projectId, context]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-24 right-4 z-50 md:bottom-8",
          "h-14 w-14 rounded-full shadow-xl",
          "bg-gradient-to-r from-primary to-primary/80",
          "hover:shadow-2xl hover:scale-105 transition-all duration-300"
        )}
      >
        <Sparkles className="w-6 h-6" />
      </Button>
    );
  }

  // Mobile: Sheet, Desktop: Floating card
  const DockContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">MyAladin</h3>
            <p className="text-xs text-muted-foreground">
              {context === 'reportage' ? 'Expert Reportage' : 
               context === 'tasks' ? 'Expert Tâches' : 
               context === 'report' ? 'Expert Rapport' : 'Assistant EDL'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Actions */}
          <div className="p-3 border-b border-border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Actions rapides</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 px-3 flex-col gap-1 text-left justify-start rounded-xl hover:bg-muted/50"
                  onClick={action.action}
                  disabled={isProcessing === action.id}
                >
                  <div className="flex items-center gap-2 w-full">
                    {isProcessing === action.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <action.icon className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-xs font-medium truncate">{action.label}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Posez une question ou utilisez une action rapide
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5",
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Quick Suggestions */}
          <div className="px-3 pb-2">
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap rounded-full text-xs h-7"
                    onClick={() => handleSendMessage(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-background">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Posez votre question..."
                className="flex-1 rounded-xl"
                disabled={isLoading}
              />
              <Button onClick={() => handleSendMessage()} disabled={!inputValue.trim() || isLoading} className="rounded-xl">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Desktop: Floating Card
  return (
    <>
      <Card className="hidden md:flex fixed bottom-8 right-4 z-50 w-96 h-[32rem] flex-col shadow-2xl border-border/50 overflow-hidden">
        {DockContent}
      </Card>

      {/* Mobile: Bottom Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-0 md:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>MyAladin Assistant</SheetTitle>
          </SheetHeader>
          {DockContent}
        </SheetContent>
      </Sheet>
    </>
  );
};
