import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectMenu, ProjectMenuBar, ProjectMenuSection } from "./ProjectMenu";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProjectPageLayoutProps {
  projectName: string;
  projectType: string;
  isArchived?: boolean;
  stats?: {
    sequences?: number;
    tasks?: number;
    photos?: number;
    videos?: number;
    documents?: number;
  };
  activeSection: ProjectMenuSection;
  onSectionChange: (section: ProjectMenuSection) => void;
  children: React.ReactNode;
  hideBottomMenu?: boolean;
}

const propertyTypeLabels: Record<string, string> = {
  building: 'Immeuble',
  house: 'Maison',
  apartment: 'Appartement',
  commercial: 'Commercial',
  plateau: 'Plateau',
};

export function ProjectPageLayout({
  projectName,
  projectType,
  isArchived,
  stats,
  activeSection,
  onSectionChange,
  children,
  hideBottomMenu = false
}: ProjectPageLayoutProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Compact Header - No redundancy */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 h-14">
          {/* Back button */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/")}
            className="flex-shrink-0 -ml-2 h-9 w-9 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Project info - 2 lines for clarity */}
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm leading-tight line-clamp-2">{projectName}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0 font-medium">
                {propertyTypeLabels[projectType] || projectType}
              </Badge>
              {isArchived && (
                <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0 bg-amber-50 text-amber-700 border-amber-200">
                  Archivé
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="w-56 border-r border-border bg-background p-3 flex-shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
            <ProjectMenu
              activeSection={activeSection}
              onSectionChange={onSectionChange}
              stats={stats}
            />
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-32">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar - Fixed for stability */}
      {/* z-[9999] ensures it's always above Sheets and their overlays (z-50) */}
      {/* pointer-events-auto ensures clicks work even when Sheet overlay is present */}
      {isMobile && !hideBottomMenu && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-[9999] bg-background border-t border-border shadow-lg pointer-events-auto"
          style={{ isolation: 'isolate' }}
          data-navigation-bar
        >
          <ProjectMenuBar
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            stats={stats}
          />
        </div>
      )}
    </div>
  );
}
