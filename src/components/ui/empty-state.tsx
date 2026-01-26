import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  variant?: "default" | "minimal" | "card";
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      icon: Icon,
      title,
      description,
      action,
      variant = "default",
      ...props
    },
    ref
  ) => {
    const ActionIcon = action?.icon;

    if (variant === "minimal") {
      return (
        <div
          ref={ref}
          className={cn(
            "flex flex-col items-center justify-center py-8 text-center",
            className
          )}
          {...props}
        >
          <Icon className="w-8 h-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center py-12 px-6 text-center",
          variant === "card" && "bg-card rounded-xl border border-border",
          className
        )}
        {...props}
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {description}
          </p>
        )}
        
        {action && (
          <Button onClick={action.onClick} className="gap-2">
            {ActionIcon && <ActionIcon className="w-4 h-4" />}
            {action.label}
          </Button>
        )}
      </div>
    );
  }
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
