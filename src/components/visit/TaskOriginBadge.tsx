import { Badge } from "@/components/ui/badge";
import { Bot, User, FileText } from "lucide-react";

interface TaskOriginBadgeProps {
  origin: "ai" | "user" | "pdf";
  size?: "sm" | "md";
}

export const TaskOriginBadge = ({ origin, size = "sm" }: TaskOriginBadgeProps) => {
  const configs = {
    ai: {
      icon: Bot,
      label: "AI",
      variant: "default" as const,
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20"
    },
    user: {
      icon: User,
      label: "User",
      variant: "secondary" as const,
      className: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"
    },
    pdf: {
      icon: FileText,
      label: "PDF",
      variant: "outline" as const,
      className: "bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20"
    }
  };

  const config = configs[origin];
  const Icon = config.icon;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  return (
    <Badge variant={config.variant} className={`${config.className} flex items-center gap-1`}>
      <Icon className={iconSize} />
      <span className={size === "sm" ? "text-xs" : "text-sm"}>{config.label}</span>
    </Badge>
  );
};
