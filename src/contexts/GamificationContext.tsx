import { createContext, useContext, ReactNode } from "react";
import { useAchievements } from "@/hooks/useAchievements";
import { useContextualTips } from "@/hooks/useContextualTips";

interface GamificationContextType {
  trackProjectCreation: (userId: string, projectCount: number) => Promise<void>;
  trackTaskExtraction: (userId: string, taskCount: number, sourceType?: string) => Promise<void>;
  trackTemplateCreation: (userId: string, templateCount: number) => Promise<void>;
  trackArchiving: (userId: string, archivedCount: number) => Promise<void>;
  trackClassification: (userId: string) => Promise<void>;
  showTip: (userId: string, tipType: string) => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const GamificationProvider = ({ children }: { children: ReactNode }) => {
  const achievements = useAchievements();
  const tips = useContextualTips();

  return (
    <GamificationContext.Provider
      value={{
        trackProjectCreation: achievements.trackProjectCreation,
        trackTaskExtraction: achievements.trackTaskExtraction,
        trackTemplateCreation: achievements.trackTemplateCreation,
        trackArchiving: achievements.trackArchiving,
        trackClassification: achievements.trackClassification,
        showTip: tips.showTip,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error("useGamification must be used within a GamificationProvider");
  }
  return context;
};
