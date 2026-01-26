import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Check, 
  X, 
  Edit2, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Home,
  Thermometer,
  CheckCircle2,
  Circle,
  ListTodo,
  Camera,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaptureAnalysis, GeneratedTask } from './useCaptureAI';
import { useAutoFillIntelligence, ANOMALY_ICONS } from './useAutoFillIntelligence';

interface AutoFillResultPanelProps {
  analysis: CaptureAnalysis;
  isOpen: boolean;
  onClose: () => void;
  onSave: (edits?: Partial<CaptureAnalysis>, selectedTaskIndices?: number[]) => Promise<void>;
  onRetake: () => void;
  onAddMorePhotos?: () => void;
  isSaving?: boolean;
  projectId?: string;
  mode?: 'manual' | 'ai';
  enableAutoSave?: boolean;
  onRunAI?: () => Promise<void>;
  isAnalyzingAI?: boolean;
}

export function AutoFillResultPanel({
  analysis,
  isOpen,
  onClose,
  onSave,
  onRetake,
  onAddMorePhotos,
  isSaving = false,
  projectId,
  mode = 'ai',
  enableAutoSave = true,
  onRunAI,
  isAnalyzingAI = false,
}: AutoFillResultPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRoom, setEditedRoom] = useState(analysis.room_type);
  const [editedState, setEditedState] = useState(analysis.general_state);
  const [editedDescription, setEditedDescription] = useState(analysis.generated_description);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const {
    isAutoSaving,
    autoSaveCountdown,
    startAutoSaveCountdown,
    cancelAutoSave,
    changedFields,
    clearChangedFields,
    selectedTasks,
    toggleTaskSelection,
    selectAllTasks,
    getAnomalyIcon,
    enhanceAnalysis,
  } = useAutoFillIntelligence(projectId);

  // Enhanced analysis with auto-fill intelligence
  const [enhancedAnalysis, setEnhancedAnalysis] = useState<CaptureAnalysis>(() => 
    enhanceAnalysis(analysis)
  );

  // Update enhanced analysis when analysis changes
  useEffect(() => {
    const enhanced = enhanceAnalysis(analysis);
    setEnhancedAnalysis(enhanced);
    setEditedRoom(enhanced.room_type);
    setEditedState(enhanced.general_state);
    setEditedDescription(enhanced.generated_description);
  }, [analysis, enhanceAnalysis]);

  // Start auto-save countdown when panel opens
  useEffect(() => {
    if (enableAutoSave && isOpen && !isEditing) {
      const cleanup = startAutoSaveCountdown(async () => {
        await handleSave();
      });
      return cleanup;
    }
  }, [enableAutoSave, isOpen, isEditing]);

  // Cancel auto-save when user starts editing
  useEffect(() => {
    if (isEditing) {
      cancelAutoSave();
    }
  }, [isEditing, cancelAutoSave]);

  const handleSave = async () => {
    const selectedIndices = Array.from(selectedTasks);
    
    if (isEditing) {
      await onSave({
        room_type: editedRoom,
        general_state: editedState,
        generated_description: editedDescription,
      }, selectedIndices);
    } else {
      await onSave(undefined, selectedIndices);
    }
    clearChangedFields();
  };

  const handleConfirmAndNext = async () => {
    cancelAutoSave();
    await handleSave();
  };

  const stateConfig = {
    bon: { label: 'Bon', color: 'bg-emerald-500 text-white', icon: CheckCircle2 },
    moyen: { label: 'Moyen', color: 'bg-amber-500 text-white', icon: Circle },
    mauvais: { label: 'Mauvais', color: 'bg-red-500 text-white', icon: AlertTriangle },
  };

  const currentState = stateConfig[editedState] || stateConfig.moyen;
  const StateIcon = currentState.icon;

  const hasAnomalies = enhancedAnalysis.pathologies?.length > 0;
  const tasksCount = enhancedAnalysis.generated_tasks?.length || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl shadow-2xl border-t border-border"
          style={{ maxHeight: '55vh' }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Auto-save countdown */}
          <AnimatePresence>
            {autoSaveCountdown !== null && !isEditing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-6 mb-3"
              >
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="p-2 rounded-full bg-primary/20">
                    <Zap className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Enregistrement automatique</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={(1 - autoSaveCountdown / 1.5) * 100} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground">{autoSaveCountdown.toFixed(1)}s</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      cancelAutoSave();
                      setIsEditing(true);
                    }}
                    className="text-xs"
                  >
                    Modifier
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <motion.div
                className="p-2 rounded-xl bg-primary/10"
                animate={changedFields.size > 0 ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Sparkles className="h-5 w-5 text-primary" />
              </motion.div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {mode === 'manual' ? 'Décrire le problème' : 'Auto-remplissage IA'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {mode === 'manual'
                    ? 'Saisir d’abord • IA optionnelle en contre-avis'
                    : `${changedFields.size} champs pré-remplis • Confiance ${Math.round(
                        enhancedAnalysis.confidence_score * 100
                      )}%`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    cancelAutoSave();
                    setIsEditing(true);
                  }}
                  className="text-muted-foreground"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(55vh - 180px)' }}>
            {/* Room & State - Highlighted when auto-filled */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Room detected */}
              <motion.div 
                className={cn(
                  'p-3 rounded-xl transition-all',
                  changedFields.has('room_type') 
                    ? 'bg-primary/10 ring-2 ring-primary/30' 
                    : 'bg-muted/50'
                )}
                animate={changedFields.has('room_type') ? { scale: [1, 1.02, 1] } : {}}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Home className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Pièce</span>
                  {changedFields.has('room_type') && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary">
                      Auto
                    </Badge>
                  )}
                </div>
                {isEditing ? (
                  <Input
                    value={editedRoom}
                    onChange={(e) => setEditedRoom(e.target.value)}
                    className="h-8 text-sm"
                  />
                ) : (
                  <p className="font-medium text-foreground text-sm">{editedRoom}</p>
                )}
              </motion.div>

              {/* Condition */}
              <motion.div 
                className={cn(
                  'p-3 rounded-xl transition-all',
                  changedFields.has('general_state') 
                    ? 'bg-primary/10 ring-2 ring-primary/30' 
                    : 'bg-muted/50'
                )}
                animate={changedFields.has('general_state') ? { scale: [1, 1.02, 1] } : {}}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">État</span>
                  {changedFields.has('general_state') && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary">
                      Auto
                    </Badge>
                  )}
                </div>
                {isEditing ? (
                  <div className="flex gap-1">
                    {(['bon', 'moyen', 'mauvais'] as const).map((state) => (
                      <button
                        key={state}
                        onClick={() => setEditedState(state)}
                        className={cn(
                          'flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all',
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
              </motion.div>
            </div>

            {/* Anomalies with icons - Always visible if present */}
            {hasAnomalies && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-sm text-red-700 dark:text-red-400">
                    {enhancedAnalysis.pathologies.length} anomalie(s) détectée(s)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {enhancedAnalysis.pathologies.map((anomaly, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="text-xs border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 gap-1.5"
                    >
                      <span>{getAnomalyIcon(anomaly.type)}</span>
                      {anomaly.type}
                      <span className="text-red-500">•</span>
                      {anomaly.severity}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Generated Tasks with toggles */}
            {tasksCount > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Tâches générées</span>
                    <Badge variant="secondary" className="text-xs">
                      {selectedTasks.size}/{tasksCount}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedSection(expandedSection === 'tasks' ? null : 'tasks')}
                    className="text-xs h-7"
                  >
                    {expandedSection === 'tasks' ? 'Réduire' : 'Détails'}
                    {expandedSection === 'tasks' ? (
                      <ChevronUp className="h-3 w-3 ml-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                </div>

                <AnimatePresence>
                  {expandedSection === 'tasks' ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {enhancedAnalysis.generated_tasks.map((task, idx) => (
                        <TaskCardWithToggle
                          key={idx}
                          task={task}
                          isSelected={selectedTasks.has(idx)}
                          onToggle={() => toggleTaskSelection(idx)}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {enhancedAnalysis.generated_tasks.map((task, idx) => (
                        <Badge
                          key={idx}
                          variant={selectedTasks.has(idx) ? 'default' : 'outline'}
                          className={cn(
                            'text-xs cursor-pointer transition-all',
                            selectedTasks.has(idx) && 'bg-primary'
                          )}
                          onClick={() => toggleTaskSelection(idx)}
                        >
                          {selectedTasks.has(idx) && <Check className="h-3 w-3 mr-1" />}
                          {task.ft_code}
                        </Badge>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Description */}
            <motion.div 
              className={cn(
                'p-3 rounded-xl transition-all',
                changedFields.has('description') 
                  ? 'bg-primary/5 ring-1 ring-primary/20' 
                  : 'bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-muted-foreground">Description EDL</span>
                {changedFields.has('description') && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary">
                    Auto-générée
                  </Badge>
                )}
              </div>
              {isEditing ? (
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="min-h-[50px] text-sm"
                />
              ) : (
                <p className="text-sm text-foreground leading-relaxed">{editedDescription}</p>
              )}
            </motion.div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-border bg-background">
            {/* Optional AI (contre-avis) */}
            {mode === 'manual' && onRunAI && (
              <Button
                variant="secondary"
                onClick={onRunAI}
                disabled={isSaving || isAutoSaving || isAnalyzingAI}
                className="w-full mb-3"
              >
                {isAnalyzingAI ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="h-4 w-4 border-2 border-foreground/20 border-t-foreground rounded-full mr-2"
                  />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isAnalyzingAI ? 'Analyse IA…' : 'Contre-avis IA (optionnel)'}
              </Button>
            )}

            {/* Add more photos button */}
            {onAddMorePhotos && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAddMorePhotos}
                className="w-full mb-3 text-muted-foreground"
              >
                <Camera className="h-4 w-4 mr-2" />
                Ajouter d'autres photos
              </Button>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onRetake} className="flex-1" disabled={isSaving || isAutoSaving}>
                <X className="h-4 w-4 mr-2" />
                Reprendre
              </Button>
              <Button
                onClick={handleConfirmAndNext}
                disabled={isSaving || isAutoSaving}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {(isSaving || isAutoSaving) ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                  />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Confirmer & Suivant
              </Button>
            </div>

            {/* Anomaly warning */}
            {hasAnomalies && (
              <p className="text-xs text-center text-amber-600 dark:text-amber-400 mt-2">
                ⚠️ {enhancedAnalysis.pathologies.length} anomalie(s) seront enregistrées
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Task Card with Toggle
function TaskCardWithToggle({ 
  task, 
  isSelected, 
  onToggle 
}: { 
  task: GeneratedTask; 
  isSelected: boolean; 
  onToggle: () => void;
}) {
  const priorityConfig = {
    low: { label: 'Faible', color: 'text-muted-foreground' },
    medium: { label: 'Moyen', color: 'text-amber-600 dark:text-amber-400' },
    high: { label: 'Urgent', color: 'text-red-600 dark:text-red-400' },
  };

  const priority = priorityConfig[task.priority];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'p-3 rounded-xl border transition-all cursor-pointer',
        isSelected 
          ? 'bg-primary/5 border-primary/30' 
          : 'bg-muted/30 border-transparent opacity-60'
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={() => onToggle()}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
            <Badge variant="outline" className={cn('text-[10px] shrink-0', priority.color)}>
              {priority.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {task.ft_code}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{task.ft_label}</span>
            {task.estimated_cost && (
              <span className="text-[10px] text-primary font-medium ml-auto">
                {task.estimated_cost}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
