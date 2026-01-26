import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReportageButtonProps extends ButtonProps {
  icon?: React.ReactNode;
  emoji?: string;
  label: string;
  sublabel?: string;
  selected?: boolean;
  completed?: boolean;
  badge?: React.ReactNode;
}

/**
 * Large touch-friendly button for reportage workflow
 * Minimum 60x60px touch target for jobsite usability
 */
export const ReportageButton = React.forwardRef<HTMLButtonElement, ReportageButtonProps>(
  ({ 
    icon, 
    emoji, 
    label, 
    sublabel, 
    selected, 
    completed, 
    badge,
    className, 
    variant = 'outline',
    ...props 
  }, ref) => {
    return (
      <Button
        ref={ref}
        variant={selected ? 'default' : variant}
        className={cn(
          // Large touch target - minimum 60px height
          'h-auto min-h-[60px] p-4 w-full',
          // Flex layout
          'flex items-center gap-3',
          // Visual feedback
          'transition-all duration-200',
          'active:scale-[0.98]',
          // Selected state
          selected && 'ring-2 ring-primary ring-offset-2 shadow-lg',
          // Completed state
          completed && 'opacity-70',
          className
        )}
        style={{
          // Ensure minimum touch target
          minWidth: '60px',
          minHeight: '60px',
        }}
        {...props}
      >
        {/* Icon or Emoji */}
        {(icon || emoji) && (
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            'transition-colors duration-200',
            selected 
              ? 'bg-primary-foreground/20' 
              : 'bg-muted'
          )}>
            {icon ? (
              <span className="w-6 h-6">{icon}</span>
            ) : (
              <span className="text-2xl">{emoji}</span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 text-left min-w-0">
          <p className={cn(
            'font-semibold truncate',
            selected ? 'text-primary-foreground' : 'text-foreground'
          )}>
            {label}
          </p>
          {sublabel && (
            <p className={cn(
              'text-sm truncate',
              selected ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}>
              {sublabel}
            </p>
          )}
        </div>

        {/* Badge */}
        {badge && (
          <div className="flex-shrink-0">
            {badge}
          </div>
        )}
      </Button>
    );
  }
);

ReportageButton.displayName = 'ReportageButton';

/**
 * Compact zone button for quick selection
 * Minimum 56x56px for touch friendliness
 */
export const ZoneButton = React.forwardRef<HTMLButtonElement, ReportageButtonProps>(
  ({ emoji, label, selected, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={selected ? 'default' : 'outline'}
        className={cn(
          'h-16 min-w-[70px] flex-col gap-1 p-2',
          'transition-all duration-200',
          'active:scale-95',
          selected && 'ring-2 ring-primary ring-offset-2',
          className
        )}
        style={{
          minWidth: '56px',
          minHeight: '56px',
        }}
        {...props}
      >
        {emoji && <span className="text-xl">{emoji}</span>}
        <span className="text-xs font-medium truncate max-w-full">{label}</span>
      </Button>
    );
  }
);

ZoneButton.displayName = 'ZoneButton';

/**
 * Large floating action button for primary actions
 * 64x64px for easy one-handed use
 */
export const ReportageFAB = React.forwardRef<HTMLButtonElement, ButtonProps & { icon: React.ReactNode }>(
  ({ icon, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          'h-16 w-16 rounded-full shadow-xl',
          'transition-all duration-200',
          'active:scale-95 hover:scale-105',
          className
        )}
        style={{
          minWidth: '64px',
          minHeight: '64px',
        }}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

ReportageFAB.displayName = 'ReportageFAB';
