// Mode-Adaptive UI Components
// Components that automatically adapt to Beginner/Expert mode

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useUserMode, useModeText } from '@/contexts/UserModeContext';
import { Button, ButtonProps } from '@/components/ui/button';
import { SimpleHint } from '@/components/capture/SimpleHint';
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Adaptive Button with verbose/short labels
interface AdaptiveButtonProps extends ButtonProps {
  verboseLabel: string;
  shortLabel: string;
  icon?: ReactNode;
}

export const AdaptiveButton: React.FC<AdaptiveButtonProps> = ({
  verboseLabel,
  shortLabel,
  icon,
  className,
  ...props
}) => {
  const getText = useModeText();
  
  return (
    <Button className={cn("gap-2", className)} {...props}>
      {icon}
      {getText(verboseLabel, shortLabel)}
    </Button>
  );
};

// Hint that only shows in Beginner mode
interface BeginnerHintProps {
  text: string;
  className?: string;
}

export const BeginnerHint: React.FC<BeginnerHintProps> = ({ text, className }) => {
  const { showHints } = useUserMode();
  
  if (!showHints) return null;
  
  return <SimpleHint text={text} className={className} />;
};

// Section that collapses in Expert mode
interface AdaptiveSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const AdaptiveSection: React.FC<AdaptiveSectionProps> = ({
  title,
  children,
  defaultOpen = true,
  className,
}) => {
  const { isExpert } = useUserMode();
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  // In beginner mode, always show expanded
  if (!isExpert) {
    return (
      <div className={className}>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
        {children}
      </div>
    );
  }

  // In expert mode, make collapsible
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        {title}
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
};

// Advanced Options Section (hidden by default in Beginner mode)
interface AdvancedOptionsProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  children,
  label = "Options avancées",
  className,
}) => {
  const { showAdvancedFilters, isExpert } = useUserMode();
  const [isOpen, setIsOpen] = React.useState(isExpert);

  // In expert mode, show directly
  if (showAdvancedFilters) {
    return <div className={className}>{children}</div>;
  }

  // In beginner mode, hide behind collapsible
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Settings2 className="h-4 w-4" />
          {label}
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

// Density wrapper
interface DensityWrapperProps {
  children: ReactNode;
  className?: string;
}

export const DensityWrapper: React.FC<DensityWrapperProps> = ({ children, className }) => {
  const { density } = useUserMode();
  
  return (
    <div className={cn(
      density === 'compact' ? 'space-y-2' : 'space-y-4',
      className
    )}>
      {children}
    </div>
  );
};

// Card with adaptive padding
export const AdaptiveCard: React.FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  const { density } = useUserMode();
  
  return (
    <div className={cn(
      "bg-card rounded-xl border",
      density === 'compact' ? 'p-3' : 'p-4',
      className
    )}>
      {children}
    </div>
  );
};

// List with adaptive density
export const AdaptiveList: React.FC<{ 
  items: ReactNode[];
  className?: string;
}> = ({ items, className }) => {
  const { density } = useUserMode();
  
  return (
    <div className={cn(
      "flex flex-col",
      density === 'compact' ? 'gap-1.5' : 'gap-3',
      className
    )}>
      {items}
    </div>
  );
};

// Expert-only shortcut buttons
interface ExpertShortcutsProps {
  shortcuts: Array<{
    label: string;
    icon: ReactNode;
    onClick: () => void;
  }>;
  className?: string;
}

export const ExpertShortcuts: React.FC<ExpertShortcutsProps> = ({ shortcuts, className }) => {
  const { isExpert } = useUserMode();
  
  if (!isExpert) return null;
  
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {shortcuts.map((shortcut, idx) => (
        <Button
          key={idx}
          variant="outline"
          size="sm"
          onClick={shortcut.onClick}
          className="gap-1.5 h-7 text-xs"
        >
          {shortcut.icon}
          {shortcut.label}
        </Button>
      ))}
    </div>
  );
};
