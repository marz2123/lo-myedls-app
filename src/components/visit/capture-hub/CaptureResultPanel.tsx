import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Check, 
  X, 
  Edit2, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Home,
  Layers,
  Thermometer,
  CheckCircle2,
  Circle,
  ListTodo,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaptureAnalysis, GeneratedTask } from './useCaptureAI';

interface CaptureResultPanelProps {
  analysis: CaptureAnalysis;
  isOpen: boolean;
  onClose: () => void;
  onSave: (edits?: Partial<CaptureAnalysis>) => void;
  onRetake: () => void;
  isSaving?: boolean;
}

export function CaptureResultPanel({
  analysis,
  isOpen,
  onClose,
  onSave,
  onRetake,
  isSaving = false,
}: CaptureResultPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRoom, setEditedRoom] = useState(analysis.room_type);
  const [editedState, setEditedState] = useState(analysis.general_state);
  const [editedDescription, setEditedDescription] = useState(analysis.generated_description);
  const [expandedSection, setExpandedSection] = useState<string | null>('elements');

  const handleSave = () => {
    if (isEditing) {
      onSave({
        room_type: editedRoom,
        general_state: editedState,
        generated_description: editedDescription,
      });
    } else {
      onSave();
    }
  };

  const stateConfig = {
    bon: { label: 'Bon', color: 'bg-success text-success-foreground', icon: CheckCircle2 },
    moyen: { label: 'Moyen', color: 'bg-warning text-warning-foreground', icon: Circle },
    mauvais: { label: 'Mauvais', color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle },
  };

  const currentState = stateConfig[editedState] || stateConfig.moyen;
  const StateIcon = currentState.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl shadow-2xl"
          style={{ maxHeight: '60vh' }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Analyse IA</h3>
                <p className="text-xs text-muted-foreground">
                  Confiance: {Math.round(analysis.confidence_score * 100)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-muted-foreground"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                {isEditing ? 'Terminer' : 'Modifier'}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(60vh - 140px)' }}>
            {/* Room & State */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Room detected */}
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Pièce détectée</span>
                </div>
                {isEditing ? (
                  <Input
                    value={editedRoom}
                    onChange={(e) => setEditedRoom(e.target.value)}
                    className="h-8 text-sm"
                  />
                ) : (
                  <p className="font-medium text-foreground">{editedRoom}</p>
                )}
              </div>

              {/* Condition */}
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">État général</span>
                </div>
                {isEditing ? (
                  <div className="flex gap-1">
                    {(['bon', 'moyen', 'mauvais'] as const).map((state) => (
                      <button
                        key={state}
                        onClick={() => setEditedState(state)}
                        className={cn(
                          'flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-all',
                          editedState === state
                            ? stateConfig[state].color
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        {stateConfig[state].label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Badge className={cn('gap-1', currentState.color)}>
                    <StateIcon className="h-3 w-3" />
                    {currentState.label}
                  </Badge>
                )}
              </div>
            </div>

            {/* Elements Section */}
            <CollapsibleSection
              title="Éléments détectés"
              icon={<Layers className="h-4 w-4" />}
              count={analysis.elements.length}
              isExpanded={expandedSection === 'elements'}
              onToggle={() => setExpandedSection(expandedSection === 'elements' ? null : 'elements')}
            >
              <div className="space-y-2">
                {analysis.elements.map((element, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-background">
                    <span className="text-sm">{element.name}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        element.etat === 'bon' && 'border-success text-success',
                        element.etat === 'moyen' && 'border-warning text-warning',
                        element.etat === 'mauvais' && 'border-destructive text-destructive'
                      )}
                    >
                      {element.etat}
                    </Badge>
                  </div>
                ))}
                {analysis.elements.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Aucun élément détecté
                  </p>
                )}
              </div>
            </CollapsibleSection>

            {/* Anomalies Section */}
            {analysis.pathologies.length > 0 && (
              <CollapsibleSection
                title="Anomalies"
                icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
                count={analysis.pathologies.length}
                isExpanded={expandedSection === 'anomalies'}
                onToggle={() => setExpandedSection(expandedSection === 'anomalies' ? null : 'anomalies')}
                variant="danger"
              >
                <div className="space-y-2">
                  {analysis.pathologies.map((anomaly, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-destructive">{anomaly.type}</span>
                        <Badge variant="destructive" className="text-xs">
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{anomaly.location}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Generated Tasks */}
            {analysis.generated_tasks.length > 0 && (
              <CollapsibleSection
                title="Tâches générées"
                icon={<ListTodo className="h-4 w-4 text-primary" />}
                count={analysis.generated_tasks.length}
                isExpanded={expandedSection === 'tasks'}
                onToggle={() => setExpandedSection(expandedSection === 'tasks' ? null : 'tasks')}
              >
                <div className="space-y-2">
                  {analysis.generated_tasks.map((task, idx) => (
                    <TaskCard key={idx} task={task} />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Description */}
            <div className="mt-4 p-3 rounded-xl bg-muted/50">
              <label className="text-xs text-muted-foreground mb-2 block">
                Description auto-générée
              </label>
              {isEditing ? (
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
              ) : (
                <p className="text-sm text-foreground">{editedDescription}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-border bg-background flex gap-3">
            <Button variant="outline" onClick={onRetake} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Reprendre
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon,
  count,
  isExpanded,
  onToggle,
  children,
  variant = 'default',
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}) {
  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-3 rounded-xl transition-colors',
          variant === 'danger' ? 'bg-destructive/5 hover:bg-destructive/10' : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Task Card Component
function TaskCard({ task }: { task: GeneratedTask }) {
  const priorityConfig = {
    low: { label: 'Faible', color: 'bg-muted text-muted-foreground' },
    medium: { label: 'Moyen', color: 'bg-warning/10 text-warning border-warning/30' },
    high: { label: 'Urgent', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  };

  const priority = priorityConfig[task.priority];

  return (
    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{task.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
        </div>
        <Badge variant="outline" className={cn('text-xs shrink-0', priority.color)}>
          {priority.label}
        </Badge>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="secondary" className="text-xs">
          {task.ft_code}
        </Badge>
        <span className="text-xs text-muted-foreground">{task.ft_label}</span>
      </div>
    </div>
  );
}
