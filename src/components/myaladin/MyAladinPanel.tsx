import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  X, Send, Loader2, Mic, MicOff, Camera, FileText, ListChecks,
  AlertTriangle, CheckCircle2, Lightbulb, Sparkles, ChevronRight,
  Image, PenTool, MapPin, Wand2, Eye, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProactiveSuggestion } from '@/hooks/useMyAladinProactive';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ActionButton[];
}

interface ActionButton {
  id: string;
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
}

interface MyAladinPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  sessionId?: string;
  context?: 'reportage' | 'checklist' | 'report' | 'comparison';
  suggestions?: ProactiveSuggestion[];
  onAction?: (action: string, payload?: any) => void;
  onDismissSuggestion?: (id: string) => void;
  isOffline?: boolean;
}

const QUICK_ACTIONS = [
  { id: 'describe', label: 'Écrire description', icon: PenTool },
  { id: 'create_task', label: 'Créer tâche', icon: ListChecks },
  { id: 'analyze', label: 'Analyser photo', icon: Eye },
  { id: 'missing', label: 'Ce qui manque', icon: AlertTriangle },
  { id: 'summary', label: 'Résumer l\'EDL', icon: FileText },
  { id: 'auto_complete', label: 'Auto-compléter', icon: Wand2 },
];

export const MyAladinPanel: React.FC<MyAladinPanelProps> = ({
  isOpen,
  onClose,
  projectId,
  sessionId,
  context = 'reportage',
  suggestions = [],
  onAction,
  onDismissSuggestion,
  isOffline = false
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [descriptionVersions, setDescriptionVersions] = useState<string[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { trigger } = useHapticFeedback();

  // Initial welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getWelcomeMessage(),
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getWelcomeMessage = () => {
    switch (context) {
      case 'checklist':
        return "Je suis là pour vous aider avec cette pièce. Que puis-je faire pour vous ?";
      case 'report':
        return "Je peux vous aider à compléter et améliorer votre rapport EDL.";
      case 'comparison':
        return "Je peux analyser les différences entre l'entrée et la sortie.";
      default:
        return "Bonjour ! Je suis MyAladin, votre coach EDL. Comment puis-je vous aider ?";
    }
  };

  const handleQuickAction = async (actionId: string) => {
    trigger('light');
    setIsLoading(true);

    try {
      switch (actionId) {
        case 'describe':
          await generateDescriptions();
          break;
        case 'create_task':
          onAction?.('open_task_creator');
          break;
        case 'analyze':
          await analyzeCurrentMedia();
          break;
        case 'missing':
          onAction?.('show_missing_items');
          break;
        case 'summary':
          await generateEDLSummary();
          break;
        case 'auto_complete':
          await autoComplete();
          break;
      }
    } catch (error) {
      console.error('Action error:', error);
      toast.error('Erreur lors de l\'action');
    } finally {
      setIsLoading(false);
    }
  };

  const generateDescriptions = async () => {
    const response = await supabase.functions.invoke('myaladin-chat', {
      body: {
        message: 'Génère 3 versions de description EDL professionnelle pour l\'élément actuel',
        context_type: 'description',
        context_data: { projectId, sessionId }
      }
    });

    if (response.data?.versions) {
      setDescriptionVersions(response.data.versions);
      setShowVersions(true);
    } else {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.data?.response || "Voici mes suggestions de descriptions...",
        timestamp: new Date(),
        actions: [
          { id: 'v1', label: 'Version 1', onClick: () => selectVersion(0) },
          { id: 'v2', label: 'Version 2', onClick: () => selectVersion(1) },
          { id: 'v3', label: 'Version 3', onClick: () => selectVersion(2) },
        ]
      }]);
    }
  };

  const selectVersion = (index: number) => {
    if (descriptionVersions[index]) {
      onAction?.('apply_description', { text: descriptionVersions[index] });
      toast.success('Description appliquée');
      trigger('medium');
    }
  };

  const analyzeCurrentMedia = async () => {
    const response = await supabase.functions.invoke('ai-unified-analysis', {
      body: { projectId, type: 'current_media' }
    });

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.data?.analysis || "J'ai analysé le média actuel. Voici ce que j'ai détecté...",
      timestamp: new Date()
    }]);
  };

  const generateEDLSummary = async () => {
    const response = await supabase.functions.invoke('myaladin-orchestrator', {
      body: { action: 'summarize', projectId, context: 'edl' }
    });

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.data?.response || "Voici le résumé de votre EDL...",
      timestamp: new Date()
    }]);
  };

  const autoComplete = async () => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: "Je lance l'auto-complétion des éléments manquants...",
      timestamp: new Date()
    }]);

    const response = await supabase.functions.invoke('myaladin-chat', {
      body: {
        message: 'Auto-complète les descriptions et états manquants',
        context_type: 'auto_complete',
        context_data: { projectId, sessionId }
      }
    });

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.data?.response || "Auto-complétion terminée !",
      timestamp: new Date(),
      actions: [
        { id: 'review', label: 'Voir les modifications', onClick: () => onAction?.('review_changes') }
      ]
    }]);
    
    trigger('success');
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('myaladin-chat', {
        body: {
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          context: { projectId, sessionId, type: context }
        }
      });

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.data?.response || "Je n'ai pas pu traiter votre demande.",
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Erreur de communication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionAction = (suggestion: ProactiveSuggestion) => {
    trigger('medium');
    if (suggestion.action) {
      onAction?.(suggestion.action.type, suggestion.action.payload);
    }
    onDismissSuggestion?.(suggestion.id);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 border-red-500/30 text-red-600';
      case 'warning': return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
      default: return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 z-[9999] max-h-[80vh] bg-background rounded-t-3xl shadow-2xl border-t border-border"
        >
          {/* Handle bar */}
          <div className="flex justify-center py-2">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <span className="text-xl">🧞</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">MyAladin</h3>
                <p className="text-xs text-muted-foreground">Coach EDL</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Proactive suggestions */}
          {suggestions.length > 0 && (
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Suggestions
              </p>
              <div className="space-y-2">
                {suggestions.slice(0, 3).map(suggestion => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-xl border",
                      getSeverityColor(suggestion.severity)
                    )}
                  >
                    <p className="text-sm flex-1">{suggestion.message}</p>
                    {suggestion.action && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2 h-7 text-xs"
                        onClick={() => handleSuggestionAction(suggestion)}
                      >
                        {suggestion.action.label}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_ACTIONS.map(action => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-full h-8"
                  onClick={() => handleQuickAction(action.id)}
                  disabled={isLoading}
                >
                  <action.icon className="w-3.5 h-3.5 mr-1.5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="h-[35vh] px-4 py-3" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5",
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.actions.map(action => (
                          <Button
                            key={action.id}
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs rounded-full"
                            onClick={action.onClick}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border bg-background">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className={cn("shrink-0 rounded-xl", isRecording && "bg-red-500 text-white")}
                onClick={() => setIsRecording(!isRecording)}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Posez votre question..."
                className="flex-1 rounded-xl"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
