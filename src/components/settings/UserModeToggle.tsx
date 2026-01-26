// User Mode Toggle Component
// Quick switch between Beginner and Expert modes

import React from 'react';
import { cn } from '@/lib/utils';
import { useUserMode } from '@/contexts/UserModeContext';
import { GraduationCap, Zap, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Compact toggle for headers/menus
export const UserModeSwitch: React.FC<{ className?: string }> = ({ className }) => {
  const { mode, isBeginner, toggleMode } = useUserMode();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <GraduationCap className={cn(
        "h-4 w-4 transition-colors",
        isBeginner ? "text-primary" : "text-muted-foreground"
      )} />
      <Switch
        checked={mode === 'expert'}
        onCheckedChange={toggleMode}
        className="data-[state=checked]:bg-amber-500"
      />
      <Zap className={cn(
        "h-4 w-4 transition-colors",
        !isBeginner ? "text-amber-500" : "text-muted-foreground"
      )} />
    </div>
  );
};

// Dropdown selector for settings
export const UserModeSelector: React.FC<{ className?: string }> = ({ className }) => {
  const { mode, setMode, isBeginner } = useUserMode();

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-sm font-medium">Mode d'utilisation</Label>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setMode('beginner')}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
            isBeginner 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50"
          )}
        >
          <div className={cn(
            "p-2.5 rounded-full",
            isBeginner ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-medium">Débutant</span>
          <span className="text-xs text-muted-foreground text-center">
            Guidage complet, interface simplifiée
          </span>
        </button>

        <button
          onClick={() => setMode('expert')}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
            !isBeginner 
              ? "border-amber-500 bg-amber-500/5" 
              : "border-border hover:border-amber-500/50"
          )}
        >
          <div className={cn(
            "p-2.5 rounded-full",
            !isBeginner ? "bg-amber-500 text-white" : "bg-muted"
          )}>
            <Zap className="h-5 w-5" />
          </div>
          <span className="font-medium">Expert</span>
          <span className="text-xs text-muted-foreground text-center">
            Interface dense, accès rapide
          </span>
        </button>
      </div>
    </div>
  );
};

// Badge showing current mode
export const UserModeBadge: React.FC<{ className?: string }> = ({ className }) => {
  const { isBeginner } = useUserMode();

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
      isBeginner 
        ? "bg-primary/10 text-primary"
        : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      className
    )}>
      {isBeginner ? (
        <>
          <GraduationCap className="h-3 w-3" />
          Débutant
        </>
      ) : (
        <>
          <Zap className="h-3 w-3" />
          Expert
        </>
      )}
    </div>
  );
};

// Quick toggle dropdown for profile menu
export const UserModeQuickToggle: React.FC = () => {
  const { mode, setMode, isBeginner } = useUserMode();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-8">
          {isBeginner ? (
            <GraduationCap className="h-4 w-4 text-primary" />
          ) : (
            <Zap className="h-4 w-4 text-amber-500" />
          )}
          <span className="text-sm">{isBeginner ? 'Débutant' : 'Expert'}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={() => setMode('beginner')}
          className={cn(isBeginner && "bg-primary/10")}
        >
          <GraduationCap className="h-4 w-4 mr-2" />
          Mode Débutant
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setMode('expert')}
          className={cn(!isBeginner && "bg-amber-500/10")}
        >
          <Zap className="h-4 w-4 mr-2" />
          Mode Expert
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserModeSelector;
