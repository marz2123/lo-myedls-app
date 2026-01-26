import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface DraggableSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onDelete: () => void;
}

export const DraggableSection = ({ id, title, children, onDelete }: DraggableSectionProps) => {
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
      className={`space-y-2 p-3 border rounded-lg bg-background ${
        isDragging ? 'shadow-lg ring-2 ring-primary' : ''
      }`}
    >
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <h4 className="font-semibold text-sm flex-1">{title}</h4>
        <button
          className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
          onClick={onDelete}
          title="Supprimer la section"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  );
};