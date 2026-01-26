import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Lightbulb, X } from "lucide-react";

interface Tip {
  id: string;
  tip_type: string;
  context: string;
}

interface ContextualTipProps {
  tip: Tip | null;
  onDismiss: () => void;
}

export const ContextualTip = ({ tip, onDismiss }: ContextualTipProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (tip) {
      setVisible(true);
    }
  }, [tip]);

  if (!tip) return null;

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed bottom-28 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-[99999] transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
      style={{ pointerEvents: 'auto' }}
    >
      <Card className="p-4 bg-card border-2 border-primary/20 shadow-xl relative">
        <div className="flex items-start gap-3 pr-12">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{tip.context}</p>
          </div>
        </div>
        {/* Close button - larger touch target for mobile */}
        <button
          type="button"
          className="absolute -top-3 -right-3 w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all shadow-lg border-2 border-background cursor-pointer z-[100]"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleDismiss();
          }}
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
        >
          <X className="h-5 w-5" strokeWidth={3} />
        </button>
      </Card>
    </div>
  );
};
