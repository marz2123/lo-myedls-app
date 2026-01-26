import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ActionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  title: string;
  description?: string;
  variant?: "default" | "primary" | "success" | "warning" | "accent";
  size?: "sm" | "md" | "lg";
  isActive?: boolean;
  badge?: string | number;
  disabled?: boolean;
}

const variantStyles = {
  default: {
    card: "bg-card hover:bg-muted/50 border-border hover:border-primary/30",
    icon: "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
    title: "text-foreground",
    description: "text-muted-foreground",
  },
  primary: {
    card: "bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/40",
    icon: "bg-primary/10 text-primary",
    title: "text-primary",
    description: "text-primary/70",
  },
  success: {
    card: "bg-success/5 hover:bg-success/10 border-success/20 hover:border-success/40",
    icon: "bg-success/10 text-success",
    title: "text-success",
    description: "text-success/70",
  },
  warning: {
    card: "bg-warning/5 hover:bg-warning/10 border-warning/20 hover:border-warning/40",
    icon: "bg-warning/10 text-warning",
    title: "text-foreground",
    description: "text-muted-foreground",
  },
  accent: {
    card: "bg-accent/5 hover:bg-accent/10 border-accent/20 hover:border-accent/40",
    icon: "bg-accent/10 text-accent",
    title: "text-accent",
    description: "text-accent/70",
  },
};

const sizeStyles = {
  sm: {
    card: "p-3",
    icon: "w-8 h-8",
    iconInner: "w-4 h-4",
    title: "text-sm",
    description: "text-xs",
  },
  md: {
    card: "p-4",
    icon: "w-10 h-10",
    iconInner: "w-5 h-5",
    title: "text-base",
    description: "text-sm",
  },
  lg: {
    card: "p-5",
    icon: "w-12 h-12",
    iconInner: "w-6 h-6",
    title: "text-lg",
    description: "text-base",
  },
};

const ActionCard = React.forwardRef<HTMLDivElement, ActionCardProps>(
  (
    {
      className,
      icon: Icon,
      title,
      description,
      variant = "default",
      size = "md",
      isActive,
      badge,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    return (
      <div
        ref={ref}
        className={cn(
          "group relative flex items-center gap-4 rounded-xl border cursor-pointer transition-all duration-300",
          "hover:-translate-y-0.5 hover:shadow-lg",
          sizeStyle.card,
          variantStyle.card,
          isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
        {...props}
      >
        {/* Icon container */}
        <div
          className={cn(
            "flex-shrink-0 rounded-lg flex items-center justify-center transition-colors duration-300",
            sizeStyle.icon,
            variantStyle.icon
          )}
        >
          <Icon className={sizeStyle.iconInner} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              "font-semibold truncate transition-colors duration-300",
              sizeStyle.title,
              variantStyle.title
            )}
          >
            {title}
          </h3>
          {description && (
            <p
              className={cn(
                "truncate transition-colors duration-300",
                sizeStyle.description,
                variantStyle.description
              )}
            >
              {description}
            </p>
          )}
        </div>

        {/* Badge */}
        {badge !== undefined && (
          <div className="flex-shrink-0">
            <span
              className={cn(
                "inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-medium bg-primary text-primary-foreground"
              )}
            >
              {badge}
            </span>
          </div>
        )}
      </div>
    );
  }
);
ActionCard.displayName = "ActionCard";

export { ActionCard };
