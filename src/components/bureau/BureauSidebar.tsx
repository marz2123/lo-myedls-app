import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardList, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  HelpCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BureauSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "edls", label: "EDLs & Rapports", icon: FileText },
  { id: "tasks", label: "Tâches", icon: ClipboardList },
  { id: "daily", label: "Suivi Chantier", icon: Calendar },
];

export function BureauSidebar({ 
  collapsed, 
  onToggle, 
  activeTab, 
  onTabChange 
}: BureauSidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className={cn(
      "h-screen border-r bg-card flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="h-16 border-b flex items-center justify-between px-4">
        {!collapsed && (
          <span className="font-bold text-lg text-primary">MyEDLs</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                collapsed && "justify-center px-0"
              )}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              {!collapsed && (
                <span className={cn(isActive && "font-medium")}>{item.label}</span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t space-y-1">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3",
            collapsed && "justify-center px-0"
          )}
          onClick={() => navigate("/")}
        >
          <Home className="h-5 w-5" />
          {!collapsed && <span>Accueil</span>}
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3",
            collapsed && "justify-center px-0"
          )}
          onClick={() => navigate("/settings")}
        >
          <Settings className="h-5 w-5" />
          {!collapsed && <span>Paramètres</span>}
        </Button>
      </div>
    </aside>
  );
}
