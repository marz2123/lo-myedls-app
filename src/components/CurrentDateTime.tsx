import { useState, useEffect } from "react";
import { useTimezone } from "@/hooks/useTimezone";
import { useClockDisplay } from "@/hooks/useClockDisplay";
import { Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const CurrentDateTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { timezone } = useTimezone();
  const { clockMode } = useClockDisplay();
  const { t } = useLanguage();
  const isFrench = t('cancel') === 'Annuler';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = new Intl.DateTimeFormat(isFrench ? 'fr-FR' : 'en-US', {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(currentTime);

  const formattedTime = new Intl.DateTimeFormat(isFrench ? 'fr-FR' : 'en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: clockMode === 'extended' ? '2-digit' : undefined,
    hour12: !isFrench,
  }).format(currentTime);

  if (clockMode === 'compact') {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 border border-border">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">{formattedTime}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border">
      <Clock className="w-4 h-4 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-xs font-medium text-foreground">{formattedDate}</span>
        <span className="text-xs text-muted-foreground">{formattedTime}</span>
      </div>
    </div>
  );
};
