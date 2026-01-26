import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: "default" | "primary" | "success" | "warning" | "accent";
}

const variantStyles = {
  default: {
    icon: "bg-muted text-muted-foreground",
    value: "text-foreground",
  },
  primary: {
    icon: "bg-primary/10 text-primary",
    value: "text-primary",
  },
  success: {
    icon: "bg-success/10 text-success",
    value: "text-success",
  },
  warning: {
    icon: "bg-warning/10 text-warning",
    value: "text-foreground",
  },
  accent: {
    icon: "bg-accent/10 text-accent",
    value: "text-accent",
  },
};

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      icon: Icon,
      title,
      value,
      subtitle,
      trend,
      variant = "default",
      ...props
    },
    ref
  ) => {
    const variantStyle = variantStyles[variant];

    const TrendIcon = trend
      ? trend.value > 0
        ? TrendingUp
        : trend.value < 0
        ? TrendingDown
        : Minus
      : null;

    const trendColor = trend
      ? trend.value > 0
        ? "text-success"
        : trend.value < 0
        ? "text-destructive"
        : "text-muted-foreground"
      : "";

    return (
      <div
        ref={ref}
        className={cn(
          "relative p-5 rounded-xl bg-card border border-border shadow-sm",
          "hover:shadow-md hover:border-primary/20 transition-all duration-300",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              variantStyle.icon
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          
          {trend && TrendIcon && (
            <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
              <TrendIcon className="w-4 h-4" />
              <span className="font-medium">
                {trend.value > 0 && "+"}
                {trend.value}%
              </span>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p
            className={cn(
              "text-2xl font-bold tracking-tight",
              variantStyle.value
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend?.label && (
            <p className={cn("text-xs mt-1", trendColor)}>{trend.label}</p>
          )}
        </div>
      </div>
    );
  }
);
StatCard.displayName = "StatCard";

export { StatCard };
