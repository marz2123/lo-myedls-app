import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface DraggableFieldProps {
  id: string;
  label: string;
  language: 'fr' | 'en';
  onDelete: () => void;
}

export const DraggableField = ({ id, label, language, onDelete }: DraggableFieldProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`space-y-1 ${isDragging ? 'z-50' : ''}`}
    >
      <div className="flex items-center gap-2">
        <button
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </button>
        <Label className="text-xs text-muted-foreground flex-1">{label}</Label>
        <button
          className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
          onClick={onDelete}
          title="Supprimer le champ"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div className="ml-7 p-2 border rounded bg-muted/50 min-h-[36px] text-sm text-muted-foreground italic">
        {language === 'fr' ? 'Champ vide' : 'Empty field'}
      </div>
    </div>
  );
};