import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, Check, Loader2, Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  onForceSave?: () => void;
  className?: string;
  variant?: 'compact' | 'detailed';
}

export const AutoSaveIndicator = ({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  onForceSave,
  className,
  variant = 'compact',
}: AutoSaveIndicatorProps) => {
  const getStatusIcon = () => {
    if (isSaving) return <Loader2 className="w-3 h-3 animate-spin" />;
    if (hasUnsavedChanges) return <CloudOff className="w-3 h-3" />;
    return <Cloud className="w-3 h-3" />;
  };

  const getStatusText = () => {
    if (isSaving) return 'Sauvegarde...';
    if (hasUnsavedChanges) return 'Non sauvegardé';
    if (lastSaved) {
      return `Sauvegardé ${formatDistanceToNow(lastSaved, { addSuffix: true, locale: fr })}`;
    }
    return 'Auto-save actif';
  };

  if (variant === 'compact') {
    return (
      <Badge 
        variant={hasUnsavedChanges ? 'secondary' : 'outline'}
        className={cn(
          'gap-1 text-xs transition-all duration-300',
          isSaving && 'animate-pulse',
          className
        )}
      >
        {getStatusIcon()}
        <span className="hidden sm:inline">{getStatusText()}</span>
      </Badge>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge 
        variant={hasUnsavedChanges ? 'destructive' : 'secondary'}
        className={cn(
          'gap-1.5 py-1',
          isSaving && 'animate-pulse'
        )}
      >
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
      
      {hasUnsavedChanges && onForceSave && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onForceSave}
          disabled={isSaving}
          className="h-7 text-xs gap-1"
        >
          <Save className="w-3 h-3" />
          Sauvegarder
        </Button>
      )}
    </div>
  );
};
