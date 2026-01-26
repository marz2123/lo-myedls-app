import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Achievement {
  id: string;
  achievement_name: string;
  description: string;
  icon: string;
}

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export const AchievementNotification = ({ achievement, onDismiss }: AchievementNotificationProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setVisible(true);
      
      // Play celebration sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0PLSfTEGHm7A7+OZSA0PVqzn77BdGAg+luLztGMeBSuAzPDck0ULElyw5/CjWBEJPJnh8bllHwUugc3y2Ik3CBlou+3nn00QDFCn4/C2YxwGOJHX8sx5LAUkd8fw3ZBAAhReu+nrqFUUCkaf4PK+ayEFMYfQ8tJ9MQYebsDv45lIDQ9WrOfvsFwXCDyW4vO0Yx4FK4DM8NyTRQsSXLDn8KNYEQk8meHxuWUfBS6BzfLYiTcIGWi77eefTRAMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEACFF676euoVRQKRp/g8r5rIQUxh9Dy0n0xBh5uwO/jmUgND1as5++wXBcIPJbi87RjHgUrgMzw3JNFCxJcsOfwo1gRCTyZ4fG5ZR8FLoHN8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAIUXrvp66hVFApGn+DyvmshBTGH0PLSfTEGHm7A7+OZSA0PVqzn77BcFwg8luLztGMeBSuAzPDck0ULElyw5/CjWBEJPJnh8bllHwUugc3y2Ik3CBlou+3nn00QDFCn4/C2YxwGOJHX8sx5LAUkd8fw3ZBAAhReu+nrqFUUCkaf4PK+ayEFMYfQ8tJ9MQYebsDv45lIDQ9WrOfvsFwXCDyW4vO0Yx4FK4DM8NyTRQsSXLDn8KNYEQk8meHxuWUfBS6BzfLYiTcIGWi77eefTRAMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEACFF676euoVRQKRp/g8r5rIQUxh9Dy0n0xBh5uwO/jmUgND1as5++wXBcIPJbi87RjHgUrgMzw3JNFCxJcsOfwo1gRCTyZ4fG5ZR8FLoHN8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAIUXrvp66hVFApGn+DyvmshBTGH0PLSfTEGHm7A7+OZSA0PVqzn77BcFwg8luLztGMeBSuAzPDck0ULElyw5/CjWBEJPJnh8bllHwU=');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors (browser restrictions)
      });
      
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  return (
    <div
      className={`fixed top-20 right-6 z-[99999] transition-all duration-500 ${
        visible ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95"
      }`}
      style={{ pointerEvents: 'auto' }}
    >
      <Card className="p-4 w-80 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-none shadow-2xl animate-scale-in relative">
        <div className="flex items-start gap-3 pr-10">
          <div className="flex-shrink-0 text-4xl animate-bounce">
            {achievement.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-5 w-5 animate-pulse" />
              <span className="font-bold text-sm">Nouveau badge debloque !</span>
            </div>
            <h3 className="font-bold text-lg mb-1 animate-fade-in">{achievement.achievement_name}</h3>
            <p className="text-sm text-white/90 animate-fade-in">{achievement.description}</p>
          </div>
        </div>
        {/* Close button - larger touch target */}
        <button
          type="button"
          className="absolute -top-3 -right-3 w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all shadow-lg border-2 border-white cursor-pointer z-[100]"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setVisible(false);
            setTimeout(onDismiss, 300);
          }}
          style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
        >
          <X className="h-5 w-5" strokeWidth={3} />
        </button>
        <div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-yellow-400/20 to-transparent animate-pulse" />
        </div>
      </Card>
    </div>
  );
};

